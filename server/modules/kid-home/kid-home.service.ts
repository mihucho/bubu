import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import {
  childProfiles,
  exerciseRecords,
  readingRecords,
  starLedger,
  taskCheckins,
  tasks,
} from '@server/database/appSchema';
import type { KidHomeDataCard, KidHomeDto, KidHomeTask } from '@shared/api.interface';

const CHEST_SIZE = 10;

/** 本地业务日（YYYY-MM-DD）。平台容器默认 UTC，这里显式按偏移换算 */
export function localDateString(d = new Date()): string {
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

export function weekStartString(d = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  const day = local.getUTCDay(); // 0=周日
  const diff = day === 0 ? 6 : day - 1; // 周一为一周开始
  local.setUTCDate(local.getUTCDate() - diff);
  return local.toISOString().slice(0, 10);
}

@Injectable()
export class KidHomeService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getHome(childId: string): Promise<KidHomeDto> {
    const today = localDateString();
    const weekStart = weekStartString();

    const [child] = await this.db
      .select({
        id: childProfiles.id,
        nickname: childProfiles.nickname,
        title: childProfiles.title,
        avatarKey: childProfiles.avatarKey,
        colorKey: childProfiles.colorKey,
        petName: childProfiles.petName,
        mustChangePassword: childProfiles.mustChangePassword,
        availableStars: childProfiles.availableStars,
        readingStreak: childProfiles.readingStreak,
        exerciseStreak: childProfiles.exerciseStreak,
      })
      .from(childProfiles)
      .where(and(eq(childProfiles.id, childId), isNull(childProfiles.archivedAt)))
      .limit(1);

    if (!child) throw new NotFoundException('CHILD_NOT_FOUND');

    const taskRows = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.childId, childId), eq(tasks.isActive, true)))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

    // 本周内的打卡（含今天），按任务聚合；不依赖 tasks.current_count 缓存列
    const checkinRows = await this.db
      .select({
        taskId: taskCheckins.taskId,
        localDate: taskCheckins.localDate,
        status: taskCheckins.status,
        delta: taskCheckins.delta,
      })
      .from(taskCheckins)
      .where(
        and(
          eq(taskCheckins.childId, childId),
          gte(taskCheckins.localDate, weekStart),
          lte(taskCheckins.localDate, today),
        ),
      );

    const perTask = new Map<string, { todayCount: number; periodCount: number; pending: boolean }>();
    for (const row of checkinRows) {
      const agg = perTask.get(row.taskId) ?? { todayCount: 0, periodCount: 0, pending: false };
      const delta = row.status === 'rejected' ? 0 : row.delta;
      if (row.localDate === today) agg.todayCount += delta;
      agg.periodCount += delta;
      if (row.status === 'pending_confirm') agg.pending = true;
      perTask.set(row.taskId, agg);
    }

    const toTask = (row: typeof tasks.$inferSelect): KidHomeTask => {
      const agg = perTask.get(row.id);
      const isDaily = row.cycleType === 'daily' || row.cycleType === 'once';
      const currentCount = isDaily ? (agg?.todayCount ?? 0) : (agg?.periodCount ?? 0);
      return {
        id: row.id,
        name: row.name,
        iconKey: row.iconKey,
        color: row.color,
        cycleType: row.cycleType as KidHomeTask['cycleType'],
        cycleTarget: row.cycleTarget,
        currentCount,
        starReward: row.starReward,
        photoVisible: row.photoVisible,
        photoRequired: row.photoRequired,
        needConfirm: row.needConfirm,
        isAchieved: currentCount >= row.cycleTarget,
        hasPendingConfirm: agg?.pending ?? false,
      };
    };

    const mapped = taskRows.map(toTask);
    const daily = mapped.filter((t) => t.cycleType === 'daily' || t.cycleType === 'once');
    const weekly = mapped.filter((t) => t.cycleType !== 'daily' && t.cycleType !== 'once');

    const [starsTodayRow] = await this.db
      .select({ delta: sql<number>`coalesce(sum(${starLedger.amount}), 0)`.mapWith(Number) })
      .from(starLedger)
      .where(
        and(
          eq(starLedger.childId, childId),
          eq(starLedger.localDate, today),
          sql`${starLedger.amount} > 0`,
        ),
      );

    const [readingRow] = await this.db
      .select({ minutes: sql<number>`coalesce(sum(${readingRecords.minutes}), 0)`.mapWith(Number) })
      .from(readingRecords)
      .where(and(eq(readingRecords.childId, childId), eq(readingRecords.localDate, today)));

    const [exerciseRow] = await this.db
      .select({ minutes: sql<number>`coalesce(sum(${exerciseRecords.minutes}), 0)`.mapWith(Number) })
      .from(exerciseRecords)
      .where(and(eq(exerciseRecords.childId, childId), eq(exerciseRecords.localDate, today)));

    const starsToday = starsTodayRow?.delta ?? 0;
    const chestFilled = Math.min(CHEST_SIZE, starsToday);
    const taskDone = daily.filter((t) => t.isAchieved).length;
    const pendingConfirm = daily.filter((t) => t.hasPendingConfirm).length;

    const cards: KidHomeDataCard = {
      taskDone,
      taskTotal: daily.length,
      stars: child.availableStars,
      starsToday,
      chestFilled,
      chestSize: CHEST_SIZE,
      chestReady: chestFilled >= CHEST_SIZE,
      streak: Math.max(child.readingStreak, child.exerciseStreak),
      readingMinutesToday: readingRow?.minutes ?? 0,
      exerciseMinutesToday: exerciseRow?.minutes ?? 0,
      pendingConfirm,
    };

    return {
      child: {
        id: child.id,
        nickname: child.nickname,
        title: child.title,
        avatarKey: child.avatarKey,
        colorKey: child.colorKey,
        petName: child.petName,
        mustChangePassword: child.mustChangePassword,
      },
      greeting: greetingFor(child.nickname),
      cards,
      daily,
      weekly,
      localDate: today,
    };
  }
}

function greetingFor(nickname: string): string {
  const hour = new Date().getHours();
  if (hour < 11) return `早上好，${nickname}`;
  if (hour < 14) return `中午好，${nickname}`;
  if (hour < 18) return `下午好，${nickname}`;
  return `晚上好，${nickname}`;
}
