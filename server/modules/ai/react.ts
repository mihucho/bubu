import { Logger } from '@nestjs/common';
import type { CapabilityService, PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import {
  buildReActPrompt,
  parseReActStep,
  sanitizeForKid,
  validateAction,
  type ReActStep,
  type ToolSpec,
} from './react-prompt';
import { toolsFor, runTool, type ToolContext, type ToolSide } from './tools';
import { runParentTool, parentToolSpecs } from './parent-tools';

const logger = new Logger('ReActLoop');

export interface ReActTrace {
  step: number;
  kind: 'action' | 'final' | 'invalid' | 'error';
  tool?: string;
  ok?: boolean;
  summary?: string;
  /** 模型原始输出（截断后存库，便于线上复盘） */
  raw?: string;
}

export interface ReActResult {
  reply: string;
  /** D 类提议：前端渲染确认卡，家长点了才落库 */
  proposal?: { kind: string; title: string; payload: Record<string, unknown> };
  trace: ReActTrace[];
  /** 用了几次模型调用 */
  modelCalls: number;
  /** 是否走到了兜底（解析连败 / 超步数） */
  degraded: boolean;
}

const MAX_STEPS = 4;
const MAX_CONSECUTIVE_INVALID = 2;

/** 平台能力调用：把 data_context 当唯一自由槽，聚合流式输出 */
async function callModel(
  capability: CapabilityService,
  capabilityId: string,
  role: string,
  userMessage: string,
  dataContext: string,
): Promise<string> {
  const stream = capability.load(capabilityId).callStream('textGenerate', {
    chat_role: role,
    user_message: userMessage,
    data_context: dataContext,
  });
  const normalized =
    stream && typeof stream === 'object' && 'output' in stream
      ? (stream as { output: AsyncIterable<{ content?: string }> }).output
      : (stream as AsyncIterable<{ content?: string }>);

  let text = '';
  for await (const chunk of normalized) {
    text += chunk?.content ?? '';
  }
  return text.trim();
}

/**
 * 关键词 → 只读工具：模型不可用时的确定性兜底用表（不依赖模型）
 */
const KID_KEYWORD_TOOLS: { test: RegExp; tools: string[] }[] = [
  { test: /(表现|怎么样|今天|完成|做到|打卡)/, tools: ['kid_today_tasks'] },
  { test: /(读|看书|阅读|分钟|书)/, tools: ['kid_reading'] },
  { test: /(星星|积分|攒|兑换)/, tools: ['kid_stars'] },
  { test: /(运动|跑步|跳绳|动起)/, tools: ['kid_exercise'] },
  { test: /(心情|开心|难过|烦)/, tools: ['kid_mood_recent'] },
  { test: /(心愿|想要|许愿|礼物)/, tools: ['kid_wishes'] },
];

const PARENT_KEYWORD_TOOLS: { test: RegExp; tools: string[] }[] = [
  { test: /(孩子|概览|表现|今天)/, tools: ['parent_children_overview'] },
  { test: /(待确认|打卡|审核)/, tools: ['parent_pending_confirm'] },
  { test: /(星星|积分|流水)/, tools: ['parent_stars_recent'] },
  { test: /(任务|安排)/, tools: ['parent_tasks_list'] },
];

/**
 * 模型不可用（应用 AI 额度用尽 / 插件异常）时的确定性兜底。
 *
 * 这时 modelCalls 还是 0、scratchpad 空，如果直接走「无事实兜底」，
 * 家长和孩子都只会看到「这个我暂时看不到」——但实际上数据都在库里，
 * 只读工具根本不需要模型。所以按关键词挑 1~2 个工具，用真实数据拼一句话。
 */
async function deterministicAnswer(input: {
  question: string;
  ctx: ToolContext;
  side: ToolSide;
  step: number;
  trace: ReActTrace[];
}): Promise<string | null> {
  const { question, ctx, side, step, trace } = input;
  const rules = side === 'parent' ? PARENT_KEYWORD_TOOLS : KID_KEYWORD_TOOLS;
  const matched = rules.filter((r) => r.test.test(question)).flatMap((r) => r.tools);
  const names = Array.from(new Set(matched)).slice(0, 2);
  if (!names.length) return null;

  const facts: string[] = [];
  for (const name of names) {
    const result =
      side === 'parent'
        ? await runParentTool(name, {
            db: ctx.db,
            familyAccountId: ctx.familyAccountId,
            today: ctx.today,
            weekStart: ctx.weekStart,
            childId: ctx.childId,
          })
        : await runTool(name, ctx, side);
    if (result.summary) {
      facts.push(result.summary);
      trace.push({ step, kind: 'action', tool: name, summary: result.summary });
    }
  }
  if (!facts.length) return null;
  trace.push({ step: step + 1, kind: 'final', summary: '确定性工具兜底' });

  const body = facts.join('；');
  return side === 'kid'
    ? `${body}。想再聊哪一件？`
    : `${body}（AI 额度暂时用尽，这条是直接查库得到的）`;
}

/**
 * N 步 ReAct：Action → Observation → Action … → Final
 *
 * 这层只做三件事，不做别的：
 *   1. 每步把「工具清单 + 已查到的事实」拼进 data_context
 *   2. 解析模型输出，合法则执行工具，非法则把错误回灌让它重发
 *   3. 到上限或连续失败就强制作答 / 走确定性兜底，**保证一定有一句话返回**
 */
export async function runReAct(input: {
  db: PostgresJsDatabase;
  capability: CapabilityService;
  capabilityId?: string;
  childId: string;
  familyAccountId: string;
  question: string;
  side?: ToolSide;
  role?: string;
  maxSteps?: number;
}): Promise<ReActResult> {
  const {
    db,
    capability,
    capabilityId = 'child_learning_ai_chat_1',
    childId,
    familyAccountId,
    question,
    side = 'kid',
    role = '布布',
  } = input;

  const maxSteps = input.maxSteps ?? MAX_STEPS;
  const specs: ToolSpec[] =
    side === 'parent'
      ? parentToolSpecs()
      : toolsFor(side).map((t) => ({ name: t.name, description: t.description }));
  const ctx: ToolContext = {
    db,
    childId,
    familyAccountId,
    today: '',
    weekStart: '',
  };

  // 业务日上下文由 tools.makeContext 负责，这里直接算，避免 import 环
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  ctx.today = new Date(now.getTime() - offset).toISOString().slice(0, 10);
  const monday = new Date(`${ctx.today}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  ctx.weekStart = monday.toISOString().slice(0, 10);

  const scratchpad: string[] = [];
  const seen = new Set<string>();
  const trace: ReActTrace[] = [];
  let modelCalls = 0;
  let invalidStreak = 0;
  let lastInvalid: string | undefined;
  let degraded = false;

  for (let step = 1; step <= maxSteps; step += 1) {
    const dataContext = buildReActPrompt({
      tools: specs,
      question,
      scratchpad,
      step,
      maxSteps,
      lastInvalid,
    });

    let raw = '';
    try {
      raw = await callModel(capability, capabilityId, role, question, dataContext);
      modelCalls += 1;
    } catch (e) {
      const reason = (e as Error).message ?? '';
      logger.warn(`step ${step} 模型调用失败: ${reason}`);
      trace.push({ step, kind: 'error', raw: String(reason).slice(0, 120) });

      // 第一次就没调通（典型：应用 AI 额度用尽）→ 用只读工具拼真实数据回答，
      // 不让「额度问题」变成一句「这个我暂时看不到」。
      if (modelCalls === 0 && !scratchpad.length) {
        const fallback = await deterministicAnswer({
          question,
          ctx,
          side,
          step,
          trace,
        });
        if (fallback) return { reply: fallback, trace, modelCalls, degraded: true };
      }
      break;
    }

    const parsed: ReActStep = parseReActStep(raw);

    if (parsed.kind === 'final') {
      const reply = side === 'kid' ? sanitizeForKid(parsed.text) : parsed.text;
      trace.push({ step, kind: 'final', summary: reply.slice(0, 60) });
      return { reply, trace, modelCalls, degraded };
    }

    if (parsed.kind === 'invalid') {
      invalidStreak += 1;
      lastInvalid = parsed.reason;
      trace.push({ step, kind: 'invalid', raw: raw.slice(0, 120), summary: parsed.reason });
      if (invalidStreak >= MAX_CONSECUTIVE_INVALID) {
        degraded = true;
        break;
      }
      continue;
    }

    // action
    const check = validateAction(parsed, specs, seen);
    if (!check.ok) {
      invalidStreak += 1;
      lastInvalid = check.reason;
      trace.push({ step, kind: 'action', tool: parsed.tool, ok: false, summary: check.reason });
      if (invalidStreak >= MAX_CONSECUTIVE_INVALID) {
        degraded = true;
        break;
      }
      continue;
    }

    invalidStreak = 0;
    lastInvalid = undefined;
    seen.add(parsed.tool);

    const result =
      side === 'parent'
        ? await runParentTool(parsed.tool, {
            db,
            familyAccountId,
            today: ctx.today,
            weekStart: ctx.weekStart,
            childId,
          })
        : await runTool(parsed.tool, ctx, side);

    trace.push({
      step,
      kind: 'action',
      tool: parsed.tool,
      ok: result.ok,
      summary: result.summary,
    });
    scratchpad.push(`- ${result.summary}`);

    // D 类提议：立刻返回确认卡，不让模型继续瞎编
    const proposal = (result as { proposal?: { kind: string; title: string; payload: Record<string, unknown> } }).proposal;
    if (proposal) {
      trace.push({ step, kind: 'final', summary: `提议：${proposal.title}` });
      return {
        reply: result.summary,
        trace,
        modelCalls,
        degraded: false,
        proposal,
      };
    }
  }

  /* ---------- 兜底：一定给孩子一句话 ---------- */

  // 已经查到事实：最后再问一次模型，只让它组织语言
  if (scratchpad.length) {
    const dataContext = [
      '【已经查到的事实】',
      ...scratchpad,
      '',
      '【要求】直接输出 <final>一句话</final>，不要请求工具，不要提"工具""查询"这些词。',
      `【孩子的问题】${question}`,
    ].join('\n');
    try {
      const raw = await callModel(capability, capabilityId, role, question, dataContext);
      modelCalls += 1;
      const parsed = parseReActStep(raw);
      if (parsed.kind === 'final' && parsed.text) {
        const reply = side === 'kid' ? sanitizeForKid(parsed.text) : parsed.text;
        trace.push({ step: trace.length + 1, kind: 'final', summary: reply.slice(0, 60) });
        return { reply, trace, modelCalls, degraded: true };
      }
    } catch (e) {
      logger.warn(`兜底作答失败: ${(e as Error).message}`);
    }
  }

  // 完全的确定性兜底：事实拼成一段人话
  if (scratchpad.length) {
    const reply = side === 'kid'
      ? `${scratchpad.map((s) => s.replace(/^-\s*/, '')).join('；')}。想再聊哪一件？`
      : scratchpad.map((s) => s.replace(/^-\s*/, '')).join('；');
    trace.push({ step: trace.length + 1, kind: 'final', summary: '确定性兜底' });
    return { reply, trace, modelCalls, degraded: true };
  }

  const fallback = '这个我暂时看不到，等做完一点事再来问我吧';
  trace.push({ step: trace.length + 1, kind: 'final', summary: '无事实兜底' });
  return { reply: side === 'kid' ? sanitizeForKid(fallback) : fallback, trace, modelCalls, degraded: true };
}
