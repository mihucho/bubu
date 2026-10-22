/**
 * AI 工具层（只读）
 *
 * 铁律（`docs/AI工具目录-v1.md`）：
 *   1. **模型永不写库**——工具只读，写操作只能经家长点击确认卡后走正式 service
 *   2. 孩子端只有「自己的」数据，没有任何跨孩子、排名、比较类工具
 *   3. 工具返回结构化事实，不返回可被模型随意发挥的自由文本
 *
 * 本文件只放孩子端 K 类工具（K18 的 v1 子集），家长端 P 类在 `parent-tools.ts`。
 */
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import {
  childProfiles,
  exerciseRecords,
  moodRecords,
  readingRecords,
  starLedger,
  taskCheckins,
  tasks,
  wishItems,
} from '@server/database/appSchema';
import { localDateString, weekStartString } from '../kid-home/kid-home.service';

export interface ToolContext {
  db: PostgresJsDatabase;
  childId: string;
  /** 家长端才有；孩子端永远是当前孩子 */
  familyAccountId: string;
  today: string;
  weekStart: string;
}

export interface ToolResult {
  tool: string;
  ok: boolean;
  data: unknown;
  /** 给模型的一句话摘要（不是可自由发挥的文本，而是事实复述） */
  summary: string;
}

export type ToolSide = 'kid' | 'parent';

export interface ToolDef {
  name: string;
  side: ToolSide;
  description: string;
  run: (ctx: ToolContext) => Promise<ToolResult>;
}

function todayRange(ctx: ToolContext): { from: string; to: string } {
  return { from: ctx.today, to: ctx.today };
}

/* ---------------- K 类：孩子只读自己 ---------------- */

export const kidTools: ToolDef[] = [
  {
    name: 'kid_today_tasks',
    side: 'kid',
    description: '今天/本周的任务完成情况',
    async run(ctx) {
      const rows = await ctx.db
        .select()
        .from(tasks)
        .where(and(eq(tasks.childId, ctx.childId), eq(tasks.isActive, true)));

      const checkins = await ctx.db
        .select({
          taskId: taskCheckins.taskId,
          localDate: taskCheckins.localDate,
          delta: taskCheckins.delta,
          status: taskCheckins.status,
        })
        .from(taskCheckins)
        .where(
          and(
            eq(taskCheckins.childId, ctx.childId),
            gte(taskCheckins.localDate, ctx.weekStart),
            lte(taskCheckins.localDate, ctx.today),
          ),
        );

      const daily = rows.filter((r) => r.cycleType === 'daily' || r.cycleType === 'once');
      const perTask = new Map<string, number>();
      for (const c of checkins) {
        if (c.status === 'rejected') continue;
        perTask.set(c.taskId, (perTask.get(c.taskId) ?? 0) + c.delta);
      }

      const done = daily.filter((t) => (perTask.get(t.id) ?? 0) >= t.cycleTarget).length;
      return {
        tool: 'kid_today_tasks',
        ok: true,
        data: {
          total: daily.length,
          done,
          items: daily.map((t) => ({
            name: t.name,
            count: perTask.get(t.id) ?? 0,
            target: t.cycleTarget,
          })),
        },
        summary: `今天有 ${daily.length} 个任务，完成 ${done} 个`,
      };
    },
  },
  {
    name: 'kid_stars',
    side: 'kid',
    description: '自己现在有多少星星、今天得到多少',
    async run(ctx) {
      const [child] = await ctx.db
        .select({ availableStars: childProfiles.availableStars })
        .from(childProfiles)
        .where(eq(childProfiles.id, ctx.childId))
        .limit(1);

      const [todaySum] = await ctx.db
        .select({ n: sql<number>`coalesce(sum(${starLedger.amount}), 0)`.mapWith(Number) })
        .from(starLedger)
        .where(
          and(
            eq(starLedger.childId, ctx.childId),
            gte(starLedger.localDate, todayRange(ctx).from),
            lte(starLedger.localDate, todayRange(ctx).to),
            sql`${starLedger.amount} > 0`,
          ),
        );

      return {
        tool: 'kid_stars',
        ok: true,
        data: { balance: child?.availableStars ?? 0, today: todaySum?.n ?? 0 },
        summary: `现在有 ${child?.availableStars ?? 0} 颗星，今天得到 ${todaySum?.n ?? 0} 颗`,
      };
    },
  },
  {
    name: 'kid_reading',
    side: 'kid',
    description: '今天与这周的阅读时长与积分',
    async run(ctx) {
      const [today] = await ctx.db
        .select({ minutes: sql<number>`coalesce(sum(${readingRecords.minutes}), 0)`.mapWith(Number) })
        .from(readingRecords)
        .where(and(eq(readingRecords.childId, ctx.childId), eq(readingRecords.localDate, ctx.today)));

      const [week] = await ctx.db
        .select({
          minutes: sql<number>`coalesce(sum(${readingRecords.minutes}), 0)`.mapWith(Number),
          days: sql<number>`count(distinct ${readingRecords.localDate})`.mapWith(Number),
        })
        .from(readingRecords)
        .where(and(eq(readingRecords.childId, ctx.childId), gte(readingRecords.localDate, ctx.weekStart)));

      const [child] = await ctx.db
        .select({ readingPoints: childProfiles.readingPoints })
        .from(childProfiles)
        .where(eq(childProfiles.id, ctx.childId))
        .limit(1);

      return {
        tool: 'kid_reading',
        ok: true,
        data: {
          todayMinutes: today?.minutes ?? 0,
          weekMinutes: week?.minutes ?? 0,
          weekDays: week?.days ?? 0,
          readingPoints: child?.readingPoints ?? 0,
        },
        summary: `今天读了 ${today?.minutes ?? 0} 分钟，这周 ${week?.minutes ?? 0} 分钟`,
      };
    },
  },
  {
    name: 'kid_exercise',
    side: 'kid',
    description: '今天与这周的运动情况',
    async run(ctx) {
      const [today] = await ctx.db
        .select({
          minutes: sql<number>`coalesce(sum(${exerciseRecords.minutes}), 0)`.mapWith(Number),
          times: sql<number>`count(*)`.mapWith(Number),
        })
        .from(exerciseRecords)
        .where(and(eq(exerciseRecords.childId, ctx.childId), eq(exerciseRecords.localDate, ctx.today)));

      const [week] = await ctx.db
        .select({ days: sql<number>`count(distinct ${exerciseRecords.localDate})`.mapWith(Number) })
        .from(exerciseRecords)
        .where(and(eq(exerciseRecords.childId, ctx.childId), gte(exerciseRecords.localDate, ctx.weekStart)));

      return {
        tool: 'kid_exercise',
        ok: true,
        data: { todayMinutes: today?.minutes ?? 0, todayTimes: today?.times ?? 0, weekDays: week?.days ?? 0 },
        summary: `今天动了 ${today?.times ?? 0} 次，共 ${today?.minutes ?? 0} 分钟`,
      };
    },
  },
  {
    name: 'kid_mood_recent',
    side: 'kid',
    description: '最近几天的心情记录',
    async run(ctx) {
      const rows = await ctx.db
        .select({
          emotionKey: moodRecords.emotionKey,
          content: moodRecords.content,
          localDate: moodRecords.localDate,
        })
        .from(moodRecords)
        .where(eq(moodRecords.childId, ctx.childId))
        .orderBy(desc(moodRecords.createdAt))
        .limit(5);
      return {
        tool: 'kid_mood_recent',
        ok: true,
        data: rows,
        summary: rows.length ? `最近记了 ${rows.length} 次心情` : '还没有记过心情',
      };
    },
  },
  {
    name: 'kid_wishes',
    side: 'kid',
    description: '自己写下的心愿与状态',
    async run(ctx) {
      const rows = await ctx.db
        .select({
          title: wishItems.title,
          starCost: wishItems.starCost,
          status: wishItems.status,
        })
        .from(wishItems)
        .where(and(eq(wishItems.childId, ctx.childId), eq(wishItems.isSurprise, false)))
        .orderBy(desc(wishItems.createdAt))
        .limit(10);
      return {
        tool: 'kid_wishes',
        ok: true,
        data: rows,
        summary: rows.length ? `写了 ${rows.length} 个心愿` : '还没有心愿',
      };
    },
  },
];

export const ALL_TOOLS: ToolDef[] = [...kidTools];

export function toolsFor(side: ToolSide): ToolDef[] {
  return ALL_TOOLS.filter((t) => t.side === side);
}



export async function runTool(
  name: string,
  ctx: ToolContext,
  side: ToolSide,
): Promise<ToolResult> {
  const tool = ALL_TOOLS.find((t) => t.name === name);
  if (!tool || tool.side !== side) {
    return { tool: name, ok: false, data: null, summary: '这个我暂时看不到' };
  }
  try {
    return await tool.run(ctx);
  } catch {
    return { tool: name, ok: false, data: null, summary: '还没有记录' };
  }
}

export function makeContext(ctx: Omit<ToolContext, 'today' | 'weekStart'>): ToolContext {
  return { ...ctx, today: localDateString(), weekStart: weekStartString() };
}
