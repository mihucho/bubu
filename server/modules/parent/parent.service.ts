import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import {
  childProfiles,
  exerciseRecords,
  moodRecords,
  periodReports,
  readingRecords,
  starLedger,
  taskCheckins,
  tasks,
  wishItems,
} from '@server/database/appSchema';
import { localDateString, weekStartString } from '../kid-home/kid-home.service';

export interface ParentChildCard {
  id: string;
  nickname: string;
  avatarKey: string;
  colorKey: string;
  availableStars: number;
  todayDone: number;
  todayTotal: number;
  weekMinutes: number;
  pendingConfirm: number;
}

export interface ParentOverviewDto {
  greeting: string;
  children: ParentChildCard[];
  pending: { checkinId: string; childId: string; childName: string; taskName: string; localDate: string; hasPhoto: boolean }[];
  wishesToPrice: { id: string; childId: string; childName: string; title: string }[];
  localDate: string;
}

/**
 * 家长端概览（v2）
 * 铁律：孩子之间**只并列，不排名**——返回值里不带任何排序用的分数，前端也没有排序入口。
 */
@Injectable()
export class ParentService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async overview(familyAccountId: string): Promise<ParentOverviewDto> {
    const today = localDateString();
    const weekStart = weekStartString();

    const children = await this.db
      .select({
        id: childProfiles.id,
        nickname: childProfiles.nickname,
        avatarKey: childProfiles.avatarKey,
        colorKey: childProfiles.colorKey,
        availableStars: childProfiles.availableStars,
      })
      .from(childProfiles)
      .where(and(eq(childProfiles.familyAccountId, familyAccountId), isNull(childProfiles.archivedAt)))
      .orderBy(asc(childProfiles.sortOrder), asc(childProfiles.createdAt));

    const cards: ParentChildCard[] = [];
    for (const child of children) {
      const [taskStat] = await this.db
        .select({
          total: sql<number>`count(*)`.mapWith(Number),
        })
        .from(tasks)
        .where(and(eq(tasks.childId, child.id), eq(tasks.isActive, true)));

      const [doneStat] = await this.db
        .select({
          done: sql<number>`count(distinct ${taskCheckins.taskId})`.mapWith(Number),
        })
        .from(taskCheckins)
        .where(
          and(
            eq(taskCheckins.childId, child.id),
            gte(taskCheckins.localDate, weekStart),
            lte(taskCheckins.localDate, today),
            sql`${taskCheckins.status} <> 'rejected'`,
          ),
        );

      const [pendingStat] = await this.db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(taskCheckins)
        .where(and(eq(taskCheckins.childId, child.id), eq(taskCheckins.status, 'pending_confirm')));

      const [weekStars] = await this.db
        .select({ n: sql<number>`coalesce(sum(${starLedger.amount}), 0)`.mapWith(Number) })
        .from(starLedger)
        .where(
          and(
            eq(starLedger.childId, child.id),
            gte(starLedger.localDate, weekStart),
            lte(starLedger.localDate, today),
            sql`${starLedger.amount} > 0`,
          ),
        );

      cards.push({
        id: child.id,
        nickname: child.nickname,
        avatarKey: child.avatarKey,
        colorKey: child.colorKey,
        availableStars: child.availableStars,
        todayDone: doneStat?.done ?? 0,
        todayTotal: taskStat?.total ?? 0,
        weekMinutes: weekStars?.n ?? 0,
        pendingConfirm: pendingStat?.n ?? 0,
      });
    }

    const pendingRows = await this.db
      .select({
        checkinId: taskCheckins.id,
        childId: taskCheckins.childId,
        childName: childProfiles.nickname,
        taskName: tasks.name,
        localDate: taskCheckins.localDate,
        media: taskCheckins.media,
      })
      .from(taskCheckins)
      .innerJoin(childProfiles, eq(childProfiles.id, taskCheckins.childId))
      .innerJoin(tasks, eq(tasks.id, taskCheckins.taskId))
      .where(
        and(
          eq(childProfiles.familyAccountId, familyAccountId),
          eq(taskCheckins.status, 'pending_confirm'),
        ),
      )
      .orderBy(desc(taskCheckins.createdAt))
      .limit(20);

    const wishRows = await this.db
      .select({
        id: wishItems.id,
        childId: wishItems.childId,
        childName: childProfiles.nickname,
        title: wishItems.title,
      })
      .from(wishItems)
      .innerJoin(childProfiles, eq(childProfiles.id, wishItems.childId))
      .where(and(eq(wishItems.familyAccountId, familyAccountId), eq(wishItems.status, 'pending')))
      .orderBy(desc(wishItems.createdAt))
      .limit(20);

    return {
      greeting: greeting(),
      children: cards,
      pending: pendingRows.map((r) => ({
        checkinId: r.checkinId,
        childId: r.childId,
        childName: r.childName,
        taskName: r.taskName,
        localDate: r.localDate,
        hasPhoto: Array.isArray(r.media) && r.media.length > 0,
      })),
      wishesToPrice: wishRows,
      localDate: today,
    };
  }
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

/* ============================================================
   家长端：任务与心愿的读写（W4/W5 基础）
   ============================================================ */

@Injectable()
export class ParentTasksService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async listTasks(childId: string) {
    const rows = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.childId, childId))
      .orderBy(asc(tasks.isActive ? tasks.sortOrder : tasks.sortOrder), asc(tasks.createdAt));

    const checkins = await this.db
      .select({
        taskId: taskCheckins.taskId,
        periodKey: taskCheckins.periodKey,
        n: sql<number>`sum(${taskCheckins.delta})`.mapWith(Number),
      })
      .from(taskCheckins)
      .where(and(eq(taskCheckins.childId, childId), sql`${taskCheckins.status} <> 'rejected'`))
      .groupBy(taskCheckins.taskId, taskCheckins.periodKey);

    const byTask = new Map(checkins.map((c) => [`${c.taskId}:${c.periodKey}`, c.n]));

    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      iconKey: t.iconKey,
      color: t.color,
      cycleType: t.cycleType,
      cycleTarget: t.cycleTarget,
      starReward: t.starReward,
      photoVisible: t.photoVisible,
      photoRequired: t.photoRequired,
      needConfirm: t.needConfirm,
      isActive: t.isActive,
      periodKey: t.periodKey,
      currentCount: byTask.get(`${t.id}:${t.periodKey}`) ?? 0,
    }));
  }

  async createTask(
    familyAccountId: string,
    input: {
      childId: string;
      name: string;
      cycleType?: string;
      cycleTarget?: number;
      starReward?: number;
      photoRequired?: boolean;
      needConfirm?: boolean;
      iconKey?: string;
      color?: string;
    },
  ) {
    const name = (input.name ?? '').trim();
    if (!name) throw new BadRequestException('NAME_REQUIRED');
    if (name.length > 30) throw new BadRequestException('NAME_TOO_LONG');

    const cycleType = input.cycleType ?? 'daily';
    const periodKey =
      cycleType === 'monthly'
        ? localDateString().slice(0, 7)
        : cycleType === 'daily' || cycleType === 'once'
          ? localDateString()
          : weekStartString();

    const [row] = await this.db
      .insert(tasks)
      .values({
        childId: input.childId,
        familyAccountId,
        name,
        iconKey: input.iconKey ?? 'book',
        color: input.color ?? 'pink',
        cycleType,
        cycleTarget: input.cycleTarget ?? 1,
        starReward: input.starReward ?? 1,
        photoVisible: true,
        photoRequired: input.photoRequired ?? false,
        needConfirm: input.needConfirm ?? false,
        periodKey,
      })
      .returning();

    return { id: row.id, name: row.name };
  }

  async setActive(childId: string, taskId: string, isActive: boolean) {
    await this.db
      .update(tasks)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.childId, childId)));
    return { ok: true };
  }
}

@Injectable()
export class ParentWishesService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(familyAccountId: string) {
    const rows = await this.db
      .select({
        id: wishItems.id,
        childId: wishItems.childId,
        childName: childProfiles.nickname,
        title: wishItems.title,
        starCost: wishItems.starCost,
        status: wishItems.status,
        note: wishItems.note,
        createdAt: wishItems.createdAt,
      })
      .from(wishItems)
      .innerJoin(childProfiles, eq(childProfiles.id, wishItems.childId))
      .where(eq(wishItems.familyAccountId, familyAccountId))
      .orderBy(desc(wishItems.createdAt));
    return rows;
  }

  /** 定价：pending/deferred → priced，并把价格写给孩子 */
  async price(childId: string, wishId: string, starCost: number, note?: string) {
    if (!Number.isFinite(starCost) || starCost < 0 || starCost > 999) {
      throw new BadRequestException('COST_INVALID');
    }
    const [wish] = await this.db
      .select()
      .from(wishItems)
      .where(and(eq(wishItems.id, wishId), eq(wishItems.childId, childId)))
      .limit(1);
    if (!wish) throw new NotFoundException('WISH_NOT_FOUND');

    await this.db
      .update(wishItems)
      .set({ starCost, status: 'priced', note, pricedAt: new Date(), updatedAt: new Date() })
      .where(eq(wishItems.id, wishId));

    return { ok: true };
  }

  /** 延后：写下温和原因 */
  async defer(childId: string, wishId: string, reason: string) {
    const [wish] = await this.db
      .select()
      .from(wishItems)
      .where(and(eq(wishItems.id, wishId), eq(wishItems.childId, childId)))
      .limit(1);
    if (!wish) throw new NotFoundException('WISH_NOT_FOUND');
    await this.db
      .update(wishItems)
      .set({ status: 'deferred', deferReason: reason?.slice(0, 200), updatedAt: new Date() })
      .where(eq(wishItems.id, wishId));
    return { ok: true };
  }
}

/* ============================================================
   报告 / 记录（W4）
   ============================================================ */

@Injectable()
export class ParentReportService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /**
   * 生成（或复用）一份周期报告快照。
   * 铁律：报告是**快照**，不现算——同一天重复打开不重新生成。
   */
  async ensure(input: { familyAccountId: string; childId: string; rangeType?: '7d' | '30d' }) {
    const rangeType = input.rangeType ?? '7d';
    const days = rangeType === '30d' ? 30 : 7;
    const end = localDateString();
    const startDate = new Date(`${end}T00:00:00Z`);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    const start = startDate.toISOString().slice(0, 10);

    const [existing] = await this.db
      .select()
      .from(periodReports)
      .where(
        and(
          eq(periodReports.childId, input.childId),
          eq(periodReports.rangeType, rangeType),
          eq(periodReports.rangeStart, start),
          eq(periodReports.rangeEnd, end),
        ),
      )
      .limit(1);
    if (existing) return existing;

    const payload = await this.buildPayload(input.childId, start, end);
    const [row] = await this.db
      .insert(periodReports)
      .values({
        childId: input.childId,
        familyAccountId: input.familyAccountId,
        rangeType,
        rangeStart: start,
        rangeEnd: end,
        payload,
      })
      .returning();
    return row;
  }

  private async buildPayload(childId: string, start: string, end: string) {
    const [tasksDone] = await this.db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(taskCheckins)
      .where(
        and(
          eq(taskCheckins.childId, childId),
          gte(taskCheckins.localDate, start),
          lte(taskCheckins.localDate, end),
          sql`${taskCheckins.status} <> 'rejected'`,
        ),
      );

    const [reading] = await this.db
      .select({
        minutes: sql<number>`coalesce(sum(${readingRecords.minutes}), 0)`.mapWith(Number),
        days: sql<number>`count(distinct ${readingRecords.localDate})`.mapWith(Number),
      })
      .from(readingRecords)
      .where(
        and(
          eq(readingRecords.childId, childId),
          gte(readingRecords.localDate, start),
          lte(readingRecords.localDate, end),
        ),
      );

    const [exercise] = await this.db
      .select({
        times: sql<number>`count(*)`.mapWith(Number),
        minutes: sql<number>`coalesce(sum(${exerciseRecords.minutes}), 0)`.mapWith(Number),
      })
      .from(exerciseRecords)
      .where(
        and(
          eq(exerciseRecords.childId, childId),
          gte(exerciseRecords.localDate, start),
          lte(exerciseRecords.localDate, end),
        ),
      );

    const [mood] = await this.db
      .select({ days: sql<number>`count(distinct ${moodRecords.localDate})`.mapWith(Number) })
      .from(moodRecords)
      .where(
        and(
          eq(moodRecords.childId, childId),
          gte(moodRecords.localDate, start),
          lte(moodRecords.localDate, end),
        ),
      );

    const [starsIn] = await this.db
      .select({ n: sql<number>`coalesce(sum(${starLedger.amount}), 0)`.mapWith(Number) })
      .from(starLedger)
      .where(
        and(
          eq(starLedger.childId, childId),
          gte(starLedger.localDate, start),
          lte(starLedger.localDate, end),
          sql`${starLedger.amount} > 0`,
        ),
      );

    const [starsOut] = await this.db
      .select({ n: sql<number>`coalesce(sum(${starLedger.amount}), 0)`.mapWith(Number) })
      .from(starLedger)
      .where(
        and(
          eq(starLedger.childId, childId),
          gte(starLedger.localDate, start),
          lte(starLedger.localDate, end),
          sql`${starLedger.amount} < 0`,
        ),
      );

    const [all] = await this.db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(tasks)
      .where(and(eq(tasks.childId, childId), eq(tasks.isActive, true)));

    const doneCount = tasksDone?.n ?? 0;
    const totalTasks = all?.total ?? 0;
    const rate = totalTasks > 0 ? Math.min(1, doneCount / Math.max(totalTasks * (end === start ? 1 : 7), 1)) : 0;

    const observation: string[] = [];
    if ((reading?.minutes ?? 0) > 0) observation.push(`这${'7'}天读了 ${reading.minutes} 分钟，${reading.days} 天有记录`);
    if ((exercise?.times ?? 0) > 0) observation.push(`运动 ${exercise.times} 次，共 ${exercise.minutes} 分钟`);
    if ((mood?.days ?? 0) > 0) observation.push(`记了 ${mood.days} 天心情`);
    if (!observation.length) observation.push('这段时间记录还不多，慢慢来');

    return {
      byCycle: {
        daily: { taskCount: totalTasks, doneRate: Number(rate.toFixed(2)), done: doneCount },
      },
      range: {
        readingMinutes: reading?.minutes ?? 0,
        readingDays: reading?.days ?? 0,
        exerciseCount: exercise?.times ?? 0,
        exerciseMinutes: exercise?.minutes ?? 0,
        moodDays: mood?.days ?? 0,
        starsIn: starsIn?.n ?? 0,
        starsOut: Math.abs(starsOut?.n ?? 0),
      },
      observation,
      suggestion: '每天记一点点，比一次记很多更容易坚持。',
    };
  }

  async list(familyAccountId: string) {
    const rows = await this.db
      .select({
        id: periodReports.id,
        childId: periodReports.childId,
        rangeType: periodReports.rangeType,
        rangeStart: periodReports.rangeStart,
        rangeEnd: periodReports.rangeEnd,
        payload: periodReports.payload,
        generatedAt: periodReports.generatedAt,
      })
      .from(periodReports)
      .where(eq(periodReports.familyAccountId, familyAccountId))
      .orderBy(desc(periodReports.generatedAt))
      .limit(20);
    return rows;
  }
}

@Injectable()
export class ParentRecordsService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /** 月历：某月每天有没有记录（任务/阅读/运动/心情） */
  async month(childId: string, month: string) {
    const start = `${month}-01`;
    const endDate = new Date(`${start}T00:00:00Z`);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    endDate.setUTCDate(0);
    const end = endDate.toISOString().slice(0, 10);

    const checkins = await this.db
      .select({ localDate: taskCheckins.localDate, n: sql<number>`count(*)`.mapWith(Number) })
      .from(taskCheckins)
      .where(
        and(
          eq(taskCheckins.childId, childId),
          gte(taskCheckins.localDate, start),
          lte(taskCheckins.localDate, end),
          sql`${taskCheckins.status} <> 'rejected'`,
        ),
      )
      .groupBy(taskCheckins.localDate);

    const readings = await this.db
      .select({ localDate: readingRecords.localDate, minutes: sql<number>`sum(${readingRecords.minutes})`.mapWith(Number) })
      .from(readingRecords)
      .where(and(eq(readingRecords.childId, childId), gte(readingRecords.localDate, start), lte(readingRecords.localDate, end)))
      .groupBy(readingRecords.localDate);

    const days = new Map<string, { tasks: number; reading: number }>();
    for (const c of checkins) days.set(c.localDate, { tasks: c.n, reading: 0 });
    for (const r of readings) {
      const cur = days.get(r.localDate) ?? { tasks: 0, reading: 0 };
      days.set(r.localDate, { tasks: cur.tasks, reading: r.minutes });
    }

    return {
      month,
      days: [...days.entries()].map(([date, v]) => ({ date, ...v })),
    };
  }

  /** 某天明细 */
  async day(childId: string, date: string) {
    const checkins = await this.db
      .select({
        id: taskCheckins.id,
        taskName: tasks.name,
        status: taskCheckins.status,
        delta: taskCheckins.delta,
        note: taskCheckins.note,
      })
      .from(taskCheckins)
      .innerJoin(tasks, eq(tasks.id, taskCheckins.taskId))
      .where(and(eq(taskCheckins.childId, childId), eq(taskCheckins.localDate, date)));

    const readings = await this.db
      .select({ minutes: readingRecords.minutes, bookTitle: readingRecords.bookTitle })
      .from(readingRecords)
      .where(and(eq(readingRecords.childId, childId), eq(readingRecords.localDate, date)));

    const exercises = await this.db
      .select({ exerciseType: exerciseRecords.exerciseType, minutes: exerciseRecords.minutes })
      .from(exerciseRecords)
      .where(and(eq(exerciseRecords.childId, childId), eq(exerciseRecords.localDate, date)));

    const moods = await this.db
      .select({ emotionKey: moodRecords.emotionKey, content: moodRecords.content })
      .from(moodRecords)
      .where(and(eq(moodRecords.childId, childId), eq(moodRecords.localDate, date)));

    return { date, checkins, readings, exercises, moods };
  }
}
