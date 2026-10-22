import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, desc, eq, gte, isNull } from 'drizzle-orm';
import { chatMemoryFacts, chatMessages, chatSummaries } from '@server/database/appSchema';
import { localDateString } from '../kid-home/kid-home.service';

/**
 * AI 记忆三层（`docs/AI对话-消息压缩机制-v5.md`）
 *
 *   L1 会话摘要   chat_summaries(level='session')  —— 一次会话压成几行
 *   L2 长期摘要   chat_summaries(level='long_term') —— 跨会话的性格与近况
 *   L3 画像事实   chat_memory_facts                 —— 偏好 / 禁忌 / 情绪线索
 *
 * 铁律：**只存偏好、禁忌、情绪线索，不存原话与成绩**；
 * 孩子与家长都能看到、都能删（`deletedAt` 软删）。
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /** 写入一条事实（同 key 覆盖，保留首次出现时间） */
  async upsertFact(input: {
    childId: string;
    key: string;
    value: string;
    confidence?: number;
    sourceMessageId?: string;
  }) {
    const key = input.key.slice(0, 40);
    const value = input.value.slice(0, 200);

    const [existing] = await this.db
      .select({ id: chatMemoryFacts.id })
      .from(chatMemoryFacts)
      .where(
        and(
          eq(chatMemoryFacts.childId, input.childId),
          eq(chatMemoryFacts.key, key),
          isNull(chatMemoryFacts.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      await this.db
        .update(chatMemoryFacts)
        .set({
          value,
          lastSeen: new Date(),
          confidence: input.confidence ?? 60,
          sourceMessageId: input.sourceMessageId,
        })
        .where(eq(chatMemoryFacts.id, existing.id));
      return { id: existing.id, updated: true };
    }

    const [row] = await this.db
      .insert(chatMemoryFacts)
      .values({
        childId: input.childId,
        key,
        value,
        confidence: input.confidence ?? 60,
        sourceMessageId: input.sourceMessageId,
      })
      .returning();
    return { id: row.id, updated: false };
  }

  /** 软删（孩子或家长都可以删） */
  async forget(childId: string, factId: string) {
    await this.db
      .update(chatMemoryFacts)
      .set({ deletedAt: new Date() })
      .where(and(eq(chatMemoryFacts.id, factId), eq(chatMemoryFacts.childId, childId)));
    return { ok: true };
  }

  /** 孩子端/家长端「布布记住的」列表 */
  async facts(childId: string) {
    const rows = await this.db
      .select({
        id: chatMemoryFacts.id,
        key: chatMemoryFacts.key,
        value: chatMemoryFacts.value,
        confidence: chatMemoryFacts.confidence,
        firstSeen: chatMemoryFacts.firstSeen,
        lastSeen: chatMemoryFacts.lastSeen,
      })
      .from(chatMemoryFacts)
      .where(and(eq(chatMemoryFacts.childId, childId), isNull(chatMemoryFacts.deletedAt)))
      .orderBy(desc(chatMemoryFacts.lastSeen))
      .limit(30);
    return rows;
  }

  /**
   * 从一句孩子的话里抽偏好（**规则法，不调模型**）。
   * 只抽三类：喜欢 / 不喜欢 / 心情线索；抽不到就什么都不存。
   */
  async extractFromMessage(childId: string, message: string, sourceMessageId?: string) {
    const text = (message ?? '').trim();
    if (!text) return [];

    const saved: { key: string; value: string }[] = [];

    const like = text.match(/(我)?(喜欢|爱)([^，。！？\s]{1,12})/);
    if (like) {
      const value = like[3];
      await this.upsertFact({ childId, key: '喜欢', value, confidence: 70, sourceMessageId });
      saved.push({ key: '喜欢', value });
    }

    const dislike = text.match(/(我)?(不喜欢|讨厌|害怕)([^，。！？\s]{1,12})/);
    if (dislike) {
      const value = dislike[3];
      await this.upsertFact({ childId, key: '不喜欢', value, confidence: 70, sourceMessageId });
      saved.push({ key: '不喜欢', value });
    }

    const mood = text.match(/(今天|这会儿)?(有点|很|好)?(累|难过|紧张|开心|兴奋)/);
    if (mood) {
      const value = mood[0].slice(0, 20);
      await this.upsertFact({ childId, key: '最近情绪', value, confidence: 50, sourceMessageId });
      saved.push({ key: '最近情绪', value });
    }

    return saved;
  }

  /**
   * L1：把一次会话压成几行。
   * 不用模型，只做「今天聊了什么」的结构化摘要，保证不编造。
   */
  async summarizeSession(input: { childId: string; sessionId: string }) {
    const rows = await this.db
      .select({
        role: chatMessages.role,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, input.sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(40);

    if (!rows.length) return null;

    const asked = rows.filter((r) => r.role === 'user').map((r) => r.content.trim()).filter(Boolean);
    const topics = [...new Set(asked.map((q) => q.slice(0, 16)))].slice(0, 5);

    const [existing] = await this.db
      .select({ id: chatSummaries.id, version: chatSummaries.version })
      .from(chatSummaries)
      .where(and(eq(chatSummaries.childId, input.childId), eq(chatSummaries.sessionId, input.sessionId)))
      .limit(1);

    const payload = {
      date: localDateString(),
      turnCount: rows.length,
      topics,
    };

    if (existing) {
      await this.db
        .update(chatSummaries)
        .set({ payload, version: existing.version + 1 })
        .where(eq(chatSummaries.id, existing.id));
      return { id: existing.id, version: existing.version + 1 };
    }

    const [row] = await this.db
      .insert(chatSummaries)
      .values({
        childId: input.childId,
        sessionId: input.sessionId,
        level: 'session',
        payload,
      })
      .returning();
    return { id: row.id, version: 1 };
  }

  /** L2：把最近 N 条 L1 摘要合成一段「近况」，供提示词使用 */
  async longTermContext(childId: string, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const sessions = await this.db
      .select({ payload: chatSummaries.payload, createdAt: chatSummaries.createdAt })
      .from(chatSummaries)
      .where(
        and(
          eq(chatSummaries.childId, childId),
          eq(chatSummaries.level, 'session'),
          gte(chatSummaries.createdAt, since),
        ),
      )
      .orderBy(desc(chatSummaries.createdAt))
      .limit(10);

    const facts = await this.facts(childId);

    const lines: string[] = [];
    if (sessions.length) {
      const topics = new Set<string>();
      for (const s of sessions) {
        const p = (s.payload ?? {}) as { topics?: string[] };
        for (const t of p.topics ?? []) topics.add(t);
      }
      if (topics.size) lines.push(`最近聊过：${[...topics].slice(0, 6).join('、')}`);
    }
    for (const f of facts.slice(0, 6)) {
      lines.push(`${f.key}：${f.value}`);
    }
    return lines;
  }
}
