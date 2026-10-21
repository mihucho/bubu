import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { exerciseRecords, kidProfile } from '@server/database/schema';
import type { ExerciseStats, ExerciseRecord, KidProfile } from '@shared/api.interface';

@Injectable()
export class ExerciseService {
  private readonly logger = new Logger(ExerciseService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private async resolveProfileId(platformUserId: string): Promise<string> {
    const rows = await this.db.select({ id: kidProfile.id })
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('孩子档案不存在');
    return rows[0].id;
  }

  private getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
  }

  private toExerciseRecord(row: typeof exerciseRecords.$inferSelect): ExerciseRecord {
    return {
      id: row.id,
      exerciseType: row.exerciseType,
      durationMinutes: row.durationMinutes,
      recordDate: row.recordDate,
    };
  }

  async getStats(platformUserId: string): Promise<ExerciseStats> {
    const weekStart = this.getWeekStart();
    const profileId = await this.resolveProfileId(platformUserId);

    const weekRecords = await this.db
      .select()
      .from(exerciseRecords)
      .where(and(
        gte(exerciseRecords.recordDate, weekStart),
        eq(exerciseRecords.familyAccountId, profileId),
      ));

    const weekCount = weekRecords.length;
    const weekMinutes = weekRecords.reduce(
      (sum: number, r: typeof exerciseRecords.$inferSelect) => sum + r.durationMinutes,
      0,
    );

    const totalCountResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(exerciseRecords)
      .where(eq(exerciseRecords.familyAccountId, profileId));
    const totalCount = Number(totalCountResult[0]?.count ?? 0);

    // Best records by type
    const bestResult = await this.db
      .select({
        type: exerciseRecords.exerciseType,
        minutes: sql<number>`max(${exerciseRecords.durationMinutes})`.as('minutes'),
      })
      .from(exerciseRecords)
      .where(eq(exerciseRecords.familyAccountId, profileId))
      .groupBy(exerciseRecords.exerciseType);
    const bestRecords = bestResult.map((r: { type: string; minutes: number }) => ({
      type: r.type,
      minutes: r.minutes,
    }));

    const recordRows = await this.db
      .select()
      .from(exerciseRecords)
      .where(eq(exerciseRecords.familyAccountId, profileId))
      .orderBy(desc(exerciseRecords.recordDate), desc(exerciseRecords.createdAt))
      .limit(50);
    const records = recordRows.map((r: typeof exerciseRecords.$inferSelect) =>
      this.toExerciseRecord(r),
    );

    return {
      weekCount,
      weekMinutes,
      totalCount,
      bestRecords,
      records,
    };
  }

  async addRecord(platformUserId: string, exerciseType: string, durationMinutes: number): Promise<{ record: ExerciseRecord; profile: KidProfile }> {
    const today = new Date().toISOString().slice(0, 10);
    const profileId = await this.resolveProfileId(platformUserId);
    const inserted = await this.db
      .insert(exerciseRecords)
      .values({
        familyAccountId: profileId,
        exerciseType,
        durationMinutes,
        recordDate: today,
      })
      .returning();
    const record = this.toExerciseRecord(inserted[0]);

    const starsEarned = Math.floor(durationMinutes / 20);
    const updated = await this.db
      .update(kidProfile)
      .set({
        availableStars: sql`${kidProfile.availableStars} + ${starsEarned}`,
        totalStars: sql`${kidProfile.totalStars} + ${starsEarned}`,
        weekStars: sql`${kidProfile.weekStars} + ${starsEarned}`,
      })
      .where(eq(kidProfile.id, profileId))
      .returning();

    const profile: KidProfile = {
      id: updated[0].id,
      nickname: updated[0].nickname,
      title: updated[0].title,
      avatarUrl: updated[0].avatarUrl ?? undefined,
      availableStars: updated[0].availableStars,
      totalStars: updated[0].totalStars,
      weekStars: updated[0].weekStars,
      weekTarget: updated[0].weekTarget,
      weekAchieved: updated[0].weekAchieved,
      readingPoints: updated[0].readingPoints,
      petName: updated[0].petName,
      petType: updated[0].petType,
      petStatus: updated[0].petStatus,
      petHunger: updated[0].petHunger,
      petClean: updated[0].petClean,
      petMood: updated[0].petMood,
      petPointsSent: updated[0].petPointsSent,
      readingStreak: updated[0].readingStreak,
      exerciseStreak: updated[0].exerciseStreak,
      showReadingTracker: updated[0].showReadingTracker,
      parentRole: updated[0].parentRole,
    };

    return { record, profile };
  }

  async deleteRecord(platformUserId: string, id: string): Promise<void> {
    const profileId = await this.resolveProfileId(platformUserId);
    const deleted = await this.db
      .delete(exerciseRecords)
      .where(and(
        eq(exerciseRecords.id, id),
        eq(exerciseRecords.familyAccountId, profileId),
      ))
      .returning({ id: exerciseRecords.id });
    if (deleted.length === 0) {
      throw new NotFoundException('运动记录不存在');
    }
  }
}
