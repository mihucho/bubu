/**
 * 家长端工具（P 类只读 + D 类提议）
 *
 * 铁律：
 *   - P 类可以跨孩子**并列**查询，但**绝不排名**：返回值里没有任何分数排序
 *   - D 类只返回提议结构，模型不写库；家长点确认后由正式 service 落库
 */
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import {
  childProfiles,
  readingRecords,
  starLedger,
  taskCheckins,
  tasks,
} from '@server/database/appSchema';

export interface ParentToolContext {
  db: PostgresJsDatabase;
  familyAccountId: string;
  today: string;
  weekStart: string;
  /** D 类提议只允许作用在一个孩子上 */
  childId?: string;
}

export interface ParentToolResult {
  tool: string;
  ok: boolean;
  data: unknown;
  summary: string;
  /** D 类：需要家长在确认卡上点一下 */
  proposal?: {
    kind: 'create_task' | 'price_wish' | 'send_note';
    title: string;
    payload: Record<string, unknown>;
  };
}

async function familyChildren(ctx: ParentToolContext) {
  return ctx.db
    .select({
      id: childProfiles.id,
      nickname: childProfiles.nickname,
      availableStars: childProfiles.availableStars,
      readingStreak: childProfiles.readingStreak,
      exerciseStreak: childProfiles.exerciseStreak,
    })
    .from(childProfiles)
    .where(and(eq(childProfiles.familyAccountId, ctx.familyAccountId), isNull(childProfiles.archivedAt)));
}

export const parentTools = [
  {
    name: 'parent_children_overview',
    description: '每个孩子本周的任务、阅读、运动、星星（并列，不排名）',
    async run(ctx: ParentToolContext): Promise<ParentToolResult> {
      const kids = await familyChildren(ctx);
      const rows = [];
      for (const kid of kids) {
        const [done] = await ctx.db
          .select({ n: sql<number>`count(*)`.mapWith(Number) })
          .from(taskCheckins)
          .where(
            and(
              eq(taskCheckins.childId, kid.id),
              gte(taskCheckins.localDate, ctx.weekStart),
              sql`${taskCheckins.status} <> 'rejected'`,
            ),
          );
        const [reading] = await ctx.db
          .select({ minutes: sql<number>`coalesce(sum(${readingRecords.minutes}), 0)`.mapWith(Number) })
          .from(readingRecords)
          .where(and(eq(readingRecords.childId, kid.id), gte(readingRecords.localDate, ctx.weekStart)));
        rows.push({
          nickname: kid.nickname,
          checkins: done?.n ?? 0,
          readingMinutes: reading?.minutes ?? 0,
          stars: kid.availableStars,
        });
      }
      return {
        tool: 'parent_children_overview',
        ok: true,
        data: rows,
        summary: rows.map((r) => `${r.nickname}：任务 ${r.checkins} 次、阅读 ${r.readingMinutes} 分钟、${r.stars} 颗星`).join('；') || '还没有孩子',
      };
    },
  },
  {
    name: 'parent_pending_confirm',
    description: '有多少打卡在等我确认',
    async run(ctx: ParentToolContext): Promise<ParentToolResult> {
      const kids = await familyChildren(ctx);
      const rows = [];
      for (const kid of kids) {
        const [n] = await ctx.db
          .select({ n: sql<number>`count(*)`.mapWith(Number) })
          .from(taskCheckins)
          .where(and(eq(taskCheckins.childId, kid.id), eq(taskCheckins.status, 'pending_confirm')));
        if ((n?.n ?? 0) > 0) rows.push(`${kid.nickname} 有 ${n.n} 条`);
      }
      return {
        tool: 'parent_pending_confirm',
        ok: true,
        data: rows,
        summary: rows.length ? `待确认：${rows.join('，')}` : '没有待确认的打卡',
      };
    },
  },
  {
    name: 'parent_stars_recent',
    description: '最近星星流水（并列展示，不排名）',
    async run(ctx: ParentToolContext): Promise<ParentToolResult> {
      const rows = await ctx.db
        .select({
          amount: starLedger.amount,
          reason: starLedger.reason,
          title: starLedger.title,
          localDate: starLedger.localDate,
          childId: starLedger.childId,
        })
        .from(starLedger)
        .where(eq(starLedger.familyAccountId, ctx.familyAccountId))
        .orderBy(desc(starLedger.createdAt))
        .limit(10);
      return {
        tool: 'parent_stars_recent',
        ok: true,
        data: rows,
        summary: rows.length ? `最近 ${rows.length} 笔星星变动` : '还没有星星记录',
      };
    },
  },
  {
    name: 'parent_tasks_list',
    description: '某个孩子的任务清单',
    async run(ctx: ParentToolContext): Promise<ParentToolResult> {
      if (!ctx.childId) {
        return { tool: 'parent_tasks_list', ok: false, data: null, summary: '要问爸爸妈妈才知道' };
      }
      const rows = await ctx.db
        .select({ name: tasks.name, cycleType: tasks.cycleType, target: tasks.cycleTarget, active: tasks.isActive })
        .from(tasks)
        .where(eq(tasks.childId, ctx.childId));
      return {
        tool: 'parent_tasks_list',
        ok: true,
        data: rows,
        summary: rows.length ? `有 ${rows.length} 个任务：${rows.map((r) => r.name).join('、')}` : '还没有任务',
      };
    },
  },
  /* ---------- D 类：只出提议，不写库 ---------- */
  {
    name: 'propose_create_task',
    description: '建议新增一个任务（只出确认卡，家长点确认才落库）',
    async run(ctx: ParentToolContext): Promise<ParentToolResult> {
      const kids = await familyChildren(ctx);
      const target = ctx.childId ?? kids[0]?.id;
      if (!target) {
        return { tool: 'propose_create_task', ok: false, data: null, summary: '还没有孩子' };
      }
      return {
        tool: 'propose_create_task',
        ok: true,
        data: { childId: target },
        summary: '我准备了一条任务草稿，请你确认',
        proposal: {
          kind: 'create_task',
          title: '新建任务草稿',
          payload: {
            childId: target,
            name: '新任务',
            cycleType: 'daily',
            cycleTarget: 1,
            starReward: 1,
            needConfirm: false,
            photoRequired: false,
          },
        },
      };
    },
  },
] as const;

export type ParentToolName = (typeof parentTools)[number]['name'];

export async function runParentTool(
  name: string,
  ctx: ParentToolContext,
): Promise<ParentToolResult> {
  const tool = parentTools.find((t) => t.name === name);
  if (!tool) return { tool: name, ok: false, data: null, summary: '这个我暂时看不到' };
  try {
    return await tool.run(ctx);
  } catch {
    return { tool: name, ok: false, data: null, summary: '还没有记录' };
  }
}

export function parentToolSpecs() {
  return parentTools.map((t) => ({ name: t.name, description: t.description }));
}
