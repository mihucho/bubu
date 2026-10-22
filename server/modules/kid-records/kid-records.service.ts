import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import {
  childProfiles,
  exerciseRecords,
  moodRecords,
  readingRecords,
  starLedger,
} from '@server/database/appSchema';
import { StarsService } from '../stars/stars.service';
import { localDateString } from '../kid-home/kid-home.service';

const MOOD_STAR_REWARD = 2;

@Injectable()
export class KidRecordsService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly stars: StarsService,
  ) {}

  private async familyOf(childId: string): Promise<string> {
    const [child] = await this.db
      .select({ familyAccountId: childProfiles.familyAccountId })
      .from(childProfiles)
      .where(eq(childProfiles.id, childId))
      .limit(1);
    if (!child) throw new NotFoundException('CHILD_NOT_FOUND');
    return child.familyAccountId;
  }

  /* -------------------- 阅读 -------------------- */

  async addReading(childId: string, minutes: number, bookTitle?: string) {
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) {
      throw new BadRequestException('MINUTES_INVALID');
    }
    const localDate = localDateString();
    const points = Math.round(minutes); // 1 分钟 = 1 积分，只涨不跌

    const [record] = await this.db
      .insert(readingRecords)
      .values({ childId, minutes, pointsEarned: points, bookTitle, localDate })
      .returning();

    await this.db
      .update(childProfiles)
      .set({ readingPoints: sql`${childProfiles.readingPoints} + ${points}`, updatedAt: new Date() })
      .where(eq(childProfiles.id, childId));

    const summary = await this.readingSummary(childId);
    return { record, summary };
  }

  async readingSummary(childId: string) {
    const today = localDateString();
    const weekStart = new Date(`${today}T00:00:00Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const from = weekStart.toISOString().slice(0, 10);

    const [todayRow] = await this.db
      .select({ minutes: sql<number>`coalesce(sum(${readingRecords.minutes}), 0)`.mapWith(Number) })
      .from(readingRecords)
      .where(and(eq(readingRecords.childId, childId), eq(readingRecords.localDate, today)));

    const [weekRow] = await this.db
      .select({
        minutes: sql<number>`coalesce(sum(${readingRecords.minutes}), 0)`.mapWith(Number),
        days: sql<number>`count(distinct ${readingRecords.localDate})`.mapWith(Number),
      })
      .from(readingRecords)
      .where(and(eq(readingRecords.childId, childId), gte(readingRecords.localDate, from)));

    const [child] = await this.db
      .select({ readingPoints: childProfiles.readingPoints, readingStreak: childProfiles.readingStreak })
      .from(childProfiles)
      .where(eq(childProfiles.id, childId))
      .limit(1);

    const recent = await this.db
      .select({
        id: readingRecords.id,
        minutes: readingRecords.minutes,
        bookTitle: readingRecords.bookTitle,
        localDate: readingRecords.localDate,
      })
      .from(readingRecords)
      .where(eq(readingRecords.childId, childId))
      .orderBy(desc(readingRecords.createdAt))
      .limit(5);

    return {
      todayMinutes: todayRow?.minutes ?? 0,
      weekMinutes: weekRow?.minutes ?? 0,
      weekDays: weekRow?.days ?? 0,
      readingPoints: child?.readingPoints ?? 0,
      readingStreak: child?.readingStreak ?? 0,
      recent,
    };
  }

  /* -------------------- 运动 -------------------- */

  async addExercise(childId: string, exerciseType: string, minutes: number, photo?: unknown) {
    if (!exerciseType) throw new BadRequestException('TYPE_REQUIRED');
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) {
      throw new BadRequestException('MINUTES_INVALID');
    }
    const localDate = localDateString();
    const [record] = await this.db
      .insert(exerciseRecords)
      .values({ childId, exerciseType, minutes, photo, localDate })
      .returning();
    const summary = await this.exerciseSummary(childId);
    return { record, summary };
  }

  async exerciseSummary(childId: string) {
    const today = localDateString();
    const [todayRow] = await this.db
      .select({
        minutes: sql<number>`coalesce(sum(${exerciseRecords.minutes}), 0)`.mapWith(Number),
        times: sql<number>`count(*)`.mapWith(Number),
      })
      .from(exerciseRecords)
      .where(and(eq(exerciseRecords.childId, childId), eq(exerciseRecords.localDate, today)));

    const weekStart = new Date(`${today}T00:00:00Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const from = weekStart.toISOString().slice(0, 10);
    const [weekRow] = await this.db
      .select({
        minutes: sql<number>`coalesce(sum(${exerciseRecords.minutes}), 0)`.mapWith(Number),
        days: sql<number>`count(distinct ${exerciseRecords.localDate})`.mapWith(Number),
      })
      .from(exerciseRecords)
      .where(and(eq(exerciseRecords.childId, childId), gte(exerciseRecords.localDate, from)));

    const recent = await this.db
      .select({
        id: exerciseRecords.id,
        exerciseType: exerciseRecords.exerciseType,
        minutes: exerciseRecords.minutes,
        localDate: exerciseRecords.localDate,
      })
      .from(exerciseRecords)
      .where(eq(exerciseRecords.childId, childId))
      .orderBy(desc(exerciseRecords.createdAt))
      .limit(5);

    return {
      todayMinutes: todayRow?.minutes ?? 0,
      todayTimes: todayRow?.times ?? 0,
      weekMinutes: weekRow?.minutes ?? 0,
      weekDays: weekRow?.days ?? 0,
      recent,
    };
  }

  /* -------------------- 心情 / 小日记 -------------------- */

  async addMood(childId: string, emotionKey: string, content?: string) {
    const allowed = ['happy', 'calm', 'tired', 'sad', 'angry'];
    if (!allowed.includes(emotionKey)) throw new BadRequestException('EMOTION_INVALID');
    const localDate = localDateString();

    // 一天只发一次心情星星（幂等键按孩子+日期）
    const familyAccountId = await this.familyOf(childId);

    const [record] = await this.db
      .insert(moodRecords)
      .values({ childId, emotionKey, content, localDate, starReward: MOOD_STAR_REWARD, starsGranted: true })
      .returning();

    const grant = await this.stars.grant({
      childId,
      familyAccountId,
      amount: MOOD_STAR_REWARD,
      reason: 'mood',
      title: '今天的心情',
      refTable: 'mood_records',
      refId: record.id,
      idempotencyKey: `mood:${childId}:${localDate}`,
      localDate,
    });

    return { record, balance: grant.balance, starsGranted: grant.duplicated ? 0 : grant.amount };
  }

  async moodTimeline(childId: string, days = 7) {
    const today = localDateString();
    const from = new Date(`${today}T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - (days - 1));
    const rows = await this.db
      .select({
        id: moodRecords.id,
        emotionKey: moodRecords.emotionKey,
        content: moodRecords.content,
        localDate: moodRecords.localDate,
      })
      .from(moodRecords)
      .where(and(eq(moodRecords.childId, childId), gte(moodRecords.localDate, from.toISOString().slice(0, 10))))
      .orderBy(desc(moodRecords.createdAt));
    return rows;
  }

  /* -------------------- 我的 -------------------- */

  async profile(childId: string) {
    const [child] = await this.db.select().from(childProfiles).where(eq(childProfiles.id, childId)).limit(1);
    if (!child) throw new NotFoundException('CHILD_NOT_FOUND');

    const [stars] = await this.db
      .select({ total: sql<number>`coalesce(sum(${starLedger.amount}), 0)`.mapWith(Number) })
      .from(starLedger)
      .where(eq(starLedger.childId, childId));

    return {
      id: child.id,
      nickname: child.nickname,
      title: child.title,
      avatarKey: child.avatarKey,
      colorKey: child.colorKey,
      loginId: child.loginId,
      mustChangePassword: child.mustChangePassword,
      availableStars: child.availableStars,
      totalStars: child.totalStars,
      ledgerSum: stars?.total ?? 0,
      readingPoints: child.readingPoints,
      readingStreak: child.readingStreak,
      exerciseStreak: child.exerciseStreak,
      petName: child.petName,
      firstRunDone: child.firstRunDone,
    };
  }
}
