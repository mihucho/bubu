import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, sql } from 'drizzle-orm';
import { moodRecords, kidProfile } from '@server/database/schema';
import type { MoodRecord, KidProfile } from '@shared/api.interface';

const STAR_REWARD = 2;

@Injectable()
export class MoodService {
  private readonly logger = new Logger(MoodService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private async resolveProfileId(platformUserId: string): Promise<string> {
    const rows = await this.db
      .select({ id: kidProfile.id })
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('孩子档案不存在');
    }
    return rows[0].id;
  }

  private toMoodRecord(row: typeof moodRecords.$inferSelect): MoodRecord {
    return {
      id: row.id,
      emotion: row.emotion,
      content: row.content,
      starReward: row.starReward,
      recordDate: row.recordDate,
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

  async getRecords(platformUserId: string): Promise<MoodRecord[]> {
    const profileId = await this.resolveProfileId(platformUserId);
    const rows = await this.db
      .select()
      .from(moodRecords)
      .where(eq(moodRecords.familyAccountId, profileId))
      .orderBy(desc(moodRecords.recordDate), desc(moodRecords.createdAt));
    return rows.map((row: typeof moodRecords.$inferSelect) => this.toMoodRecord(row));
  }

  async create(platformUserId: string, emotion: string, content: string): Promise<{ record: MoodRecord; profile: KidProfile }> {
    const profileId = await this.resolveProfileId(platformUserId);
    const today = new Date().toISOString().slice(0, 10);

    const inserted = await this.db
      .insert(moodRecords)
      .values({
        familyAccountId: profileId,
        emotion,
        content,
        starReward: STAR_REWARD,
      })
      .returning();
    const record = this.toMoodRecord(inserted[0]);

    // Check if there's already a mood record for today
    const todayRecords = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(moodRecords)
      .where(and(
        eq(moodRecords.recordDate, today),
        eq(moodRecords.familyAccountId, profileId),
      ));
    const todayCount = Number(todayRecords[0]?.count ?? 0);
    const isFirstToday = todayCount <= 1; // just inserted this one

    // Add stars only for first mood record of the day
    const kidRows = await this.db
      .select()
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    let profile: KidProfile = {} as KidProfile;
    if (kidRows.length > 0) {
      const kid = kidRows[0];
      if (isFirstToday) {
        const newKidRows = await this.db
          .update(kidProfile)
          .set({
            availableStars: kid.availableStars + STAR_REWARD,
            totalStars: kid.totalStars + STAR_REWARD,
            weekStars: kid.weekStars + STAR_REWARD,
          })
          .where(eq(kidProfile.id, kid.id))
          .returning();
        profile = this.toKidProfile(newKidRows[0]);
      } else {
        profile = this.toKidProfile(kid);
      }
    }

    return { record, profile };
  }

  async exportDiary(platformUserId: string): Promise<string> {
    const profileId = await this.resolveProfileId(platformUserId);
    const rows = await this.db
      .select()
      .from(moodRecords)
      .where(eq(moodRecords.familyAccountId, profileId))
      .orderBy(moodRecords.recordDate);
    const lines: string[] = ['布布的心情日记', '==================', ''];
    for (const row of rows) {
      lines.push(`【${row.recordDate}】 ${row.emotion}`);
      lines.push(row.content);
      lines.push('');
    }
    return lines.join('\n');
  }
}
