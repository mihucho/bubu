import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CapabilityService, DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { chatMessages, chatSessions, childProfiles } from '@server/database/appSchema';
import { ParentTasksService } from '../parent/parent.service';
import { localDateString } from '../kid-home/kid-home.service';
import { runReAct } from './react';
import { runNativeTools } from './native-tools';
import { sanitizeForKid } from './react-prompt';
import type { ToolSide } from './tools';
import { MemoryService } from './memory.service';

/**
 * 布布对话（v2 · N 步 ReAct）
 *
 * 平台能力插件不支持 function calling，所以：工具清单写进 data_context，
 * 模型输出 <tool_call>/<final>，由 `runReAct` 解析并驱动多步循环。
 * 每一步的 trace 都会落 `chat_messages.tool_payload`，线上可直接复盘模型选错了什么。
 */
@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject(CapabilityService) private readonly capability: CapabilityService,
    private readonly parentTasks: ParentTasksService,
    private readonly memory: MemoryService,
  ) {}

  /**
   * 自检用：拿能力跑一次最小调用，只回 ok / 错误信息。
   * 不走数据库、不落库、不花额度。
   */
  async replyPing(_familyAccountId: string): Promise<{ ok: boolean; error: string | null }> {
    try {
      const executor = this.capability.load('child_learning_ai_chat_1');
      const stream = executor.callStream('textGenerate', {
        chat_role: '布布',
        user_message: '在吗',
        data_context: '{}',
      });
      const normalized =
        stream && typeof stream === 'object' && 'output' in stream
          ? (stream as { output: AsyncIterable<{ content?: string }> }).output
          : (stream as AsyncIterable<{ content?: string }>);
      let text = '';
      for await (const chunk of normalized) text += chunk?.content ?? '';
      if (!text.trim()) return { ok: false, error: '能力返回空内容（插件未真正响应）' };
      return { ok: true, error: null };
    } catch (e) {
      return { ok: false, error: (e as Error).message.slice(0, 200) };
    }
  }

  async reply(childId: string, message: string, side: ToolSide = 'kid') {
    const clean = (message ?? '').trim().slice(0, 200);
    if (!clean) throw new Error('MESSAGE_REQUIRED');

    const [child] = await this.db
      .select({
        id: childProfiles.id,
        nickname: childProfiles.nickname,
        familyAccountId: childProfiles.familyAccountId,
      })
      .from(childProfiles)
      .where(and(eq(childProfiles.id, childId), isNull(childProfiles.archivedAt)))
      .limit(1);
    if (!child) throw new NotFoundException('CHILD_NOT_FOUND');

    // L2 长期记忆：把「最近聊过什么 + 记住的偏好」塞进问题上下文（只读事实，不存原话）
    const memoryLines = await this.memory.longTermContext(childId);
    const questionWithMemory = memoryLines.length
      ? `${clean}\n\n（布布记得：${memoryLines.join('；')}）`
      : clean;

    // 两条路径：接口支持原生 tools 时走 runNativeTools，否则走提示词 ReAct。
    // 用环境变量切换，线上可以先灰度（AI_NATIVE_TOOLS=1）。
    const nativeEnabled = process.env.AI_NATIVE_TOOLS === '1';
    const result = nativeEnabled
      ? await this.runNative(childId, child.familyAccountId, questionWithMemory, side)
      : await runReAct({
          db: this.db,
          capability: this.capability,
          childId,
          familyAccountId: child.familyAccountId,
          question: questionWithMemory,
          side,
          role: '布布',
        });
    if (result.degraded) {
      this.logger.warn(
        `ReAct 降级 child=${childId} calls=${result.modelCalls} trace=${JSON.stringify(result.trace).slice(0, 300)}`,
      );
    }

    const session = await this.saveTurn(childId, clean, result.reply, result.trace, result.modelCalls);

    // L3 画像事实：只从孩子自己的话里抽偏好/情绪（规则法，不调模型）
    if (side === 'kid') {
      await this.memory.extractFromMessage(childId, clean);
    }
    // L1 会话摘要：每轮更新一次，保证跨会话可续
    if (session?.sessionId) {
      await this.memory.summarizeSession({ childId, sessionId: session.sessionId });
    }

    return {
      reply: result.reply,
      degraded: result.degraded,
      modelCalls: result.modelCalls,
      nativeToolCalls: 'nativeToolCalls' in result ? result.nativeToolCalls : 0,
      path: 'nativeToolCalls' in result ? 'native' : 'react',
      trace: result.trace,
    };
  }

  /** 原生 tools 路径；失败自动回落到提示词 ReAct（保证对话不中断） */
  private async runNative(
    childId: string,
    familyAccountId: string,
    question: string,
    side: ToolSide,
  ) {
    try {
      const native = await runNativeTools({
        db: this.db,
        capability: this.capability,
        childId,
        familyAccountId,
        question,
        side,
      });
      // 没拿到任何结构化 tool_calls 且回答为空 → 说明插件没透传 tools，回落
      if (native.modelCalls > 0 && (native.nativeToolCalls > 0 || !native.degraded)) {
        return native;
      }
      this.logger.warn('原生 tools 未生效，回落到提示词 ReAct');
    } catch (e) {
      this.logger.warn(`原生 tools 异常，回落：${(e as Error).message}`);
    }
    return runReAct({
      db: this.db,
      capability: this.capability,
      childId,
      familyAccountId,
      question,
      side,
      role: '布布',
    });
  }

  private async saveTurn(
    childId: string,
    question: string,
    answer: string,
    trace: unknown,
    modelCalls: number,
  ) {
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.childId, childId), isNull(chatSessions.closedAt)))
      .orderBy(desc(chatSessions.lastActiveAt))
      .limit(1);

    const sessionId =
      session?.id ??
      (
        await this.db
          .insert(chatSessions)
          .values({ childId, channel: 'kid' })
          .returning()
      )[0].id;

    const today = localDateString();
    await this.db.insert(chatMessages).values([
      { sessionId, childId, role: 'user', content: question, localDate: today },
      {
        sessionId,
        childId,
        role: 'assistant',
        content: answer,
        localDate: today,
        toolName: `react:${modelCalls}`,
        toolPayload: { trace } as Record<string, unknown>,
      },
    ]);

    await this.db
      .update(chatSessions)
      .set({ lastActiveAt: new Date(), messageCount: (session?.messageCount ?? 0) + 2 })
      .where(eq(chatSessions.id, sessionId));

    return { sessionId };
  }

  /**
   * 确认卡落库：模型只出提议，家长点了才真正建任务。
   * `kind` 目前只有 create_task，后续 price_wish / send_note 同构扩展。
   */
  async applyProposal(input: {
    familyAccountId: string;
    kind: string;
    payload: Record<string, unknown>;
  }) {
    if (input.kind === 'create_task') {
      const p = input.payload as {
        childId?: string;
        name?: string;
        cycleType?: string;
        cycleTarget?: number;
        starReward?: number;
        needConfirm?: boolean;
        photoRequired?: boolean;
      };
      if (!p.childId || !p.name) throw new NotFoundException('PROPOSAL_INVALID');
      const starReward = Math.min(3, Math.max(1, p.starReward ?? 1));
      const created = await this.parentTasks.createTask(input.familyAccountId, {
        childId: p.childId,
        name: p.name,
        cycleType: p.cycleType ?? 'daily',
        cycleTarget: p.cycleTarget ?? 1,
        starReward,
        needConfirm: p.needConfirm ?? false,
        photoRequired: p.photoRequired ?? false,
      });
      return { ok: true, created };
    }
    throw new NotFoundException('PROPOSAL_KIND_UNSUPPORTED');
  }

  async history(childId: string, limit = 30) {
    const rows = await this.db
      .select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.childId, childId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    return rows.reverse();
  }

  /** 家长端：看孩子最近一次对话的工具痕迹（隐私边界内） */
  async lastTrace(childId: string) {
    const [row] = await this.db
      .select({ payload: chatMessages.toolPayload, createdAt: chatMessages.createdAt })
      .from(chatMessages)
      .where(and(eq(chatMessages.childId, childId), eq(chatMessages.role, 'assistant')))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);
    return row ?? null;
  }
}

// 仅供 tools 层复用的兜底话术校验（保持单一来源）
export { sanitizeForKid };
