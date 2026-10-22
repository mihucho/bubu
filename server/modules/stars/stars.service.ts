import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, eq, sql } from 'drizzle-orm';
import { childProfiles, starLedger } from '@server/database/appSchema';

/**
 * 星星的唯一写入口（`docs/数据模型设计-v2.md §7`）
 *
 * 铁律：**任何地方都不许直接 UPDATE `child_profiles.available_stars`**。
 * 唯一真相是 `star_ledger`；`child_profiles.available_stars / total_stars` 只是缓存，
 * 由本服务在同一事务里跟着改写，随时可用 `recomputeBalance()` 重建。
 */
export type StarReason =
  | 'task'
  | 'egg'
  | 'mood'
  | 'reading'
  | 'exercise'
  | 'quest'
  | 'shop'
  | 'wish'
  | 'refund'
  | 'parent_note'
  | 'adjust'
  | 'opening';

export interface StarMutationInput {
  childId: string;
  familyAccountId: string;
  amount: number;
  reason: StarReason;
  title?: string;
  refTable?: string;
  refId?: string;
  /** 幂等键：同一个键只落一笔（打卡、兑换、彩蛋必须给） */
  idempotencyKey?: string;
  localDate?: string;
}

export interface StarMutationResult {
  ledgerId: string;
  amount: number;
  balance: number;
  duplicated: boolean;
}

/** postgres 唯一约束冲突 */
function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === '23505';
}

@Injectable()
export class StarsService {
  private readonly logger = new Logger(StarsService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /** 今天（业务日，按家庭时区简化处理：服务端本地日） */
  static today(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  async grant(input: StarMutationInput): Promise<StarMutationResult> {
    if (input.amount <= 0) throw new BadRequestException('GRANT_AMOUNT_INVALID');
    return this.mutate(input);
  }

  async spend(input: StarMutationInput): Promise<StarMutationResult> {
    if (input.amount <= 0) throw new BadRequestException('SPEND_AMOUNT_INVALID');
    return this.mutate({ ...input, amount: -input.amount });
  }

  async refund(input: Omit<StarMutationInput, 'reason'>): Promise<StarMutationResult> {
    if (input.amount <= 0) throw new BadRequestException('REFUND_AMOUNT_INVALID');
    return this.mutate({ ...input, reason: 'refund', amount: input.amount });
  }

  /**
   * 写一笔流水 + 同步缓存。
   * 幂等：`idempotency_key` 命中时直接返回已有结果，不重复加星。
   */
  private async mutate(input: StarMutationInput): Promise<StarMutationResult> {
    return this.db.transaction(async (tx) => {
      if (input.idempotencyKey) {
        const [existing] = await tx
          .select()
          .from(starLedger)
          .where(eq(starLedger.idempotencyKey, input.idempotencyKey))
          .limit(1);
        if (existing) {
          return {
            ledgerId: existing.id,
            amount: existing.amount,
            balance: existing.balanceAfter,
            duplicated: true,
          };
        }
      }

      const [child] = await tx
        .select({
          id: childProfiles.id,
          availableStars: childProfiles.availableStars,
          totalStars: childProfiles.totalStars,
        })
        .from(childProfiles)
        .where(eq(childProfiles.id, input.childId))
        .limit(1)
        .for('update');

      if (!child) throw new NotFoundException('CHILD_NOT_FOUND');

      const balanceAfter = child.availableStars + input.amount;
      if (balanceAfter < 0) throw new BadRequestException('INSUFFICIENT_STARS');

      let ledger: typeof starLedger.$inferSelect;
      try {
        const inserted = await tx
          .insert(starLedger)
          .values({
            childId: input.childId,
            familyAccountId: input.familyAccountId,
            amount: input.amount,
            reason: input.reason,
            refTable: input.refTable,
            refId: input.refId,
            title: input.title,
            balanceAfter,
            localDate: input.localDate ?? StarsService.today(),
            idempotencyKey: input.idempotencyKey,
          })
          .returning();
        ledger = inserted[0];
      } catch (err) {
        // 并发同键：唯一索引 23505 —— 回读已有记录，按幂等处理（不能把并发请求打成 500）
        if (input.idempotencyKey && isUniqueViolation(err)) {
          const [existing] = await tx
            .select()
            .from(starLedger)
            .where(eq(starLedger.idempotencyKey, input.idempotencyKey))
            .limit(1);
          if (existing) {
            return {
              ledgerId: existing.id,
              amount: existing.amount,
              balance: existing.balanceAfter,
              duplicated: true,
            };
          }
        }
        throw err;
      }

      await tx
        .update(childProfiles)
        .set({
          availableStars: balanceAfter,
          // 累计获得只统计正数，扣除不减少历史累计
          totalStars: child.totalStars + (input.amount > 0 ? input.amount : 0),
          updatedAt: new Date(),
        })
        .where(eq(childProfiles.id, input.childId));

      this.logger.log(
        `stars ${input.amount > 0 ? '+' : ''}${input.amount} ${input.reason} child=${input.childId} → ${balanceAfter}`,
      );

      return { ledgerId: ledger.id, amount: input.amount, balance: balanceAfter, duplicated: false };
    });
  }

  /** 读余额（以缓存为准，必要时 recompute 校验） */
  async balance(childId: string): Promise<number> {
    const [child] = await this.db
      .select({ availableStars: childProfiles.availableStars })
      .from(childProfiles)
      .where(eq(childProfiles.id, childId))
      .limit(1);
    if (!child) throw new NotFoundException('CHILD_NOT_FOUND');
    return child.availableStars;
  }

  /** 用流水重算余额并回写缓存（对账 / 每日校验用） */
  async recomputeBalance(childId: string): Promise<{ before: number; after: number; ledgerSum: number }> {
    return this.db.transaction(async (tx) => {
      const [child] = await tx
        .select({ availableStars: childProfiles.availableStars, totalStars: childProfiles.totalStars })
        .from(childProfiles)
        .where(eq(childProfiles.id, childId))
        .limit(1)
        .for('update');
      if (!child) throw new NotFoundException('CHILD_NOT_FOUND');

      const [sums] = await tx
        .select({
          all: sql<number>`coalesce(sum(${starLedger.amount}), 0)`.mapWith(Number),
          positive: sql<number>`coalesce(sum(case when ${starLedger.amount} > 0 then ${starLedger.amount} else 0 end), 0)`.mapWith(
            Number,
          ),
        })
        .from(starLedger)
        .where(eq(starLedger.childId, childId));

      await tx
        .update(childProfiles)
        .set({ availableStars: sums.all, totalStars: sums.positive, updatedAt: new Date() })
        .where(eq(childProfiles.id, childId));

      if (child.availableStars !== sums.all) {
        this.logger.warn(`balance drift child=${childId} cache=${child.availableStars} ledger=${sums.all}`);
      }
      return { before: child.availableStars, after: sums.all, ledgerSum: sums.all };
    });
  }

  /** 某个孩子在某个业务日的净得星（首页数据卡用） */
  async todayDelta(childId: string, localDate = StarsService.today()): Promise<number> {
    const [row] = await this.db
      .select({ delta: sql<number>`coalesce(sum(${starLedger.amount}), 0)`.mapWith(Number) })
      .from(starLedger)
      .where(and(eq(starLedger.childId, childId), eq(starLedger.localDate, localDate)));
    return row?.delta ?? 0;
  }
}
