import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, sql } from 'drizzle-orm';
import { readingRecords, kidProfile } from '@server/database/schema';
import type { ReadingRecord, KidProfile } from '@shared/api.interface';

const TODAY_TARGET = 20;

interface ReadingStats {
  profile: KidProfile;
  todayMinutes: number;
  todayTarget: number;
  streak: number;
  records: ReadingRecord[];
}

@Injectable()
export class ReadingService {
  private readonly logger = new Logger(ReadingService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private async resolveProfileId(platformUserId: string): Promise<string> {
    const rows = await this.db.select({ id: kidProfile.id })
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('孩子档案不存在');
    return rows[0].id;
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toReadingRecord(row: typeof readingRecords.$inferSelect): ReadingRecord {
    return {
      id: row.id,
      durationMinutes: row.durationMinutes,
      recordDate: row.recordDate,
      bookTitle: row.bookTitle ?? undefined,
      pointsEarned: row.pointsEarned,
    };
  }

  private toKidProfile(row: typeof kidProfile.$inferSelect): KidProfile {
    return {
      id: row.id,
      nickname: row.nickname,
      title: row.title,
      avatarUrl: row.avatarUrl ?? undefined,
      availableStars: row.availableStars,
      totalStars: row.totalStars,
      weekStars: row.weekStars,
      weekTarget: row.weekTarget,
      weekAchieved: row.weekAchieved,
      readingPoints: row.readingPoints,
      petName: row.petName,
      petType: row.petType,
      petStatus: row.petStatus,
      petHunger: row.petHunger,
      petClean: row.petClean,
      petMood: row.petMood,
      petPointsSent: row.petPointsSent,
      readingStreak: row.readingStreak,
      exerciseStreak: row.exerciseStreak,
      showReadingTracker: row.showReadingTracker,
      parentRole: row.parentRole,
    };
  }

  async getStats(platformUserId: string): Promise<ReadingStats> {
    const today = this.getToday();
    const profileId = await this.resolveProfileId(platformUserId);
    const kidRows = await this.db
      .select()
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    const profile = kidRows.length > 0 ? this.toKidProfile(kidRows[0]) : ({} as KidProfile);

    const todayRecords = await this.db
      .select()
      .from(readingRecords)
      .where(and(
        eq(readingRecords.recordDate, today),
        eq(readingRecords.familyAccountId, profileId),
      ));
    const todayMinutes = todayRecords.reduce(
      (sum: number, r: typeof readingRecords.$inferSelect) => sum + r.durationMinutes,
      0,
    );

    const recordsRows = await this.db
      .select()
      .from(readingRecords)
      .where(eq(readingRecords.familyAccountId, profileId))
      .orderBy(desc(readingRecords.recordDate), desc(readingRecords.createdAt))
      .limit(30);
    const records = recordsRows.map((r: typeof readingRecords.$inferSelect) =>
      this.toReadingRecord(r),
    );

    return {
      profile,
      todayMinutes,
      todayTarget: TODAY_TARGET,
      streak: profile.readingStreak ?? 0,
      records,
    };
  }

  private async computeStreak(platformUserId: string): Promise<number> {
    const today = new Date();
    const profileId = await this.resolveProfileId(platformUserId);
    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(readingRecords)
        .where(and(
          eq(readingRecords.recordDate, dateStr),
          eq(readingRecords.familyAccountId, profileId),
        ));
      const count = Number(result[0]?.count ?? 0);
      if (count > 0) {
        streak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (streak === 0 && dateStr === today.toISOString().slice(0, 10)) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  }

  async addRecord(
    platformUserId: string,
    durationMinutes: number,
    bookTitle?: string,
  ): Promise<{ record: ReadingRecord; profile: KidProfile }> {
    const today = this.getToday();
    const profileId = await this.resolveProfileId(platformUserId);
    const points = durationMinutes;

    const inserted = await this.db
      .insert(readingRecords)
      .values({
        familyAccountId: profileId,
        durationMinutes,
        recordDate: today,
        bookTitle: bookTitle ?? null,
        pointsEarned: points,
      })
      .returning();
    const record = this.toReadingRecord(inserted[0]);

    const kidRows = await this.db
      .select()
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    let profile: KidProfile = {} as KidProfile;
    if (kidRows.length > 0) {
      const kid = kidRows[0];
      const streak = await this.computeStreak(platformUserId);
      const petHunger = Math.min(100, kid.petHunger + Math.floor(durationMinutes * 0.5));
      const petMood = Math.min(100, kid.petMood + Math.floor(durationMinutes * 0.3));
      const starsEarned = Math.floor(durationMinutes / 10);

      const newKidRows = await this.db
        .update(kidProfile)
        .set({
          readingPoints: kid.readingPoints + points,
          readingStreak: streak,
          petHunger,
          petMood,
          availableStars: kid.availableStars + starsEarned,
          totalStars: kid.totalStars + starsEarned,
          weekStars: kid.weekStars + starsEarned,
        })
        .where(eq(kidProfile.id, kid.id))
        .returning();
      profile = this.toKidProfile(newKidRows[0]);
    }

    return { record, profile };
  }
}
