import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import { chatMessages, childProfiles } from '@server/database/appSchema';
import { localDateString } from '../kid-home/kid-home.service';

/** 家长端每天每家庭 30 轮；孩子端不单独限额（只在豆包内开放） */
export const PARENT_DAILY_LIMIT = 30;
/** 单次会话最多 20 轮，超过就提示换个话题 */
export const SESSION_TURN_LIMIT = 20;
/** 一分钟内的请求数上限（防连点） */
export const RATE_LIMIT_PER_MINUTE = 6;

export interface QuotaStatus {
  allowed: boolean;
  reason?: 'AI_UNAVAILABLE' | 'DAILY_LIMIT' | 'RATE_LIMITED';
  used: number;
  limit: number;
  remaining: number;
  /** 孩子端是否在豆包环境（由前端传入，后端只做兜底判断） */
  inDoubao: boolean;
}

@Injectable()
export class AiQuotaService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private async familyChildIds(familyAccountId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: childProfiles.id })
      .from(childProfiles)
      .where(and(eq(childProfiles.familyAccountId, familyAccountId), isNull(childProfiles.archivedAt)));
    return rows.map((r) => r.id);
  }

  /** 今天这个家庭用掉多少轮（以助手消息计，一问一答算 1 轮） */
  async usedToday(familyAccountId: string): Promise<number> {
    const ids = await this.familyChildIds(familyAccountId);
    if (!ids.length) return 0;
    const today = localDateString();
    const [row] = await this.db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(chatMessages)
      .where(
        and(
          inArray(chatMessages.childId, ids),
          eq(chatMessages.role, 'assistant'),
          eq(chatMessages.localDate, today),
        ),
      );
    return row?.n ?? 0;
  }

  /** 最近一分钟的请求数（防连点） */
  private async recentPerMinute(childId: string): Promise<number> {
    const since = new Date(Date.now() - 60_000);
    const [row] = await this.db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.childId, childId),
          gte(chatMessages.createdAt, since),
        ),
      );
    return row?.n ?? 0;
  }

  /**
   * 三道闸（`docs/最终方案-v2.0.md §8.6.2`）
   *  1) 孩子端只在豆包内可用（AI 额度属于应用，豆包外拿不到）
   *  2) 家长端每家庭每天 30 轮
   *  3) 每分钟最多 6 次，防连点
   */
  async check(input: {
    familyAccountId: string;
    childId: string;
    side: 'kid' | 'parent';
    inDoubao: boolean;
  }): Promise<QuotaStatus> {
    const used = await this.usedToday(input.familyAccountId);
    // 额度按「家庭 / 天」算，两端共用同一个池子
    const limit = PARENT_DAILY_LIMIT;
    const remaining = Math.max(0, limit - used);

    if (input.side === 'kid' && !input.inDoubao) {
      return { allowed: false, reason: 'AI_UNAVAILABLE', used, limit, remaining, inDoubao: input.inDoubao };
    }

    const recent = await this.recentPerMinute(input.childId);
    if (recent >= RATE_LIMIT_PER_MINUTE) {
      return { allowed: false, reason: 'RATE_LIMITED', used, limit, remaining, inDoubao: input.inDoubao };
    }

    if (used >= limit) {
      return { allowed: false, reason: 'DAILY_LIMIT', used, limit, remaining: 0, inDoubao: input.inDoubao };
    }

    return { allowed: true, used, limit, remaining, inDoubao: input.inDoubao };
  }

  async status(familyAccountId: string, side: 'kid' | 'parent', inDoubao: boolean): Promise<QuotaStatus> {
    const used = await this.usedToday(familyAccountId);
    const limit = PARENT_DAILY_LIMIT;
    const remaining = Math.max(0, limit - used);
    const allowed = inDoubao || side === 'parent' ? remaining > 0 : false;
    return {
      allowed,
      reason: allowed ? undefined : inDoubao || side === 'parent' ? 'DAILY_LIMIT' : 'AI_UNAVAILABLE',
      used,
      limit,
      remaining,
      inDoubao,
    };
  }
}
