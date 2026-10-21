import { Injectable, Inject, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, gte, lt, asc } from 'drizzle-orm';
import { kidProfile, readingTracker, tasks } from '@server/database/schema';
import type { KidProfile, DashboardStats, ReadingTracker } from '@shared/api.interface';

@Injectable()
export class KidService {
  private readonly logger = new Logger(KidService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

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

  private toReadingTracker(row: typeof readingTracker.$inferSelect): ReadingTracker {
    return {
      id: row.id,
      bookTitle: row.bookTitle,
      note: row.note ?? undefined,
      isSeen: row.isSeen,
    };
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

  private getNextWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff + 7);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
  }

  async ensureProfile(platformUserId: string): Promise<{ profile: KidProfile; profileId: string }> {
    const rows = await this.db
      .select()
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    if (rows.length === 0) {
      const inserted = await this.db.insert(kidProfile).values({
        platformUserId,
        nickname: '布布',
        title: '小花朵',
        petName: '小黄油',
        petType: '小狗',
        petStatus: '睁开眼啦',
        petHunger: 88,
        petClean: 96,
        petMood: 95,
      }).returning();
      return { profile: this.toKidProfile(inserted[0]), profileId: inserted[0].id };
    }
    return { profile: this.toKidProfile(rows[0]), profileId: rows[0].id };
  }

  async getProfile(platformUserId: string): Promise<KidProfile> {
    const { profile } = await this.ensureProfile(platformUserId);
    return profile;
  }

  async getDashboard(platformUserId: string): Promise<DashboardStats> {
    const { profile, profileId } = await this.ensureProfile(platformUserId);
    const weekStart = this.getWeekStart();
    const nextWeekStart = this.getNextWeekStart();
    let taskRows = await this.db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.familyAccountId, profileId),
          gte(tasks.weekStart, weekStart),
          lt(tasks.weekStart, nextWeekStart),
        ),
      )
      .orderBy(asc(tasks.sortOrder));

    if (taskRows.length === 0) {
      await this.db.insert(tasks).values([
        { name: '大果外教作业', icon: '🌍', color: 'blue', targetCount: 2, currentCount: 0, starReward: 3, sortOrder: 1, isRecommended: true, weekStart, familyAccountId: profileId },
        { name: '小帮手做家务', icon: '🧹', color: 'yellow', targetCount: 3, currentCount: 0, starReward: 2, sortOrder: 2, isRecommended: true, weekStart, familyAccountId: profileId },
        { name: '叫叫阅读 20\'', icon: '🐣', color: 'orange', targetCount: 5, currentCount: 2, starReward: 1, sortOrder: 3, isRecommended: true, weekStart, familyAccountId: profileId },
        { name: '学校作业', icon: '🎒', color: 'red', targetCount: 7, currentCount: 1, starReward: 2, sortOrder: 4, isRecommended: true, weekStart, familyAccountId: profileId },
      ]);
      taskRows = await this.db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.familyAccountId, profileId),
            gte(tasks.weekStart, weekStart),
            lt(tasks.weekStart, nextWeekStart),
          ),
        )
        .orderBy(asc(tasks.sortOrder));
    }

    const weekTasks = taskRows.map((row: typeof tasks.$inferSelect) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      targetCount: row.targetCount,
      currentCount: row.currentCount,
      starReward: row.starReward,
      sortOrder: row.sortOrder,
      isRecommended: row.isRecommended,
      isAchieved: row.isAchieved,
      weekStart: row.weekStart,
    }));

    const trackerRows = await this.db
      .select()
      .from(readingTracker)
      .where(eq(readingTracker.familyAccountId, profileId))
      .orderBy(readingTracker.createdAt);
    const readingTrackerList: ReadingTracker[] = trackerRows.map(
      (row: typeof readingTracker.$inferSelect) => this.toReadingTracker(row),
    );

    return {
      profile,
      weekTasks,
      readingTracker: readingTrackerList,
    };
  }

  async updateProfile(platformUserId: string, patch: Partial<KidProfile>): Promise<KidProfile> {
    const { profile, profileId } = await this.ensureProfile(platformUserId);
    const updatePatch: Partial<typeof kidProfile.$inferInsert> = {};
    if (patch.nickname !== undefined) updatePatch.nickname = patch.nickname;
    if (patch.title !== undefined) updatePatch.title = patch.title;
    if (patch.avatarUrl !== undefined) updatePatch.avatarUrl = patch.avatarUrl;
    if (patch.weekTarget !== undefined) updatePatch.weekTarget = patch.weekTarget;
    if (patch.petName !== undefined) updatePatch.petName = patch.petName;
    if (patch.petType !== undefined) updatePatch.petType = patch.petType;
    if (patch.showReadingTracker !== undefined) {
      updatePatch.showReadingTracker = patch.showReadingTracker;
    }
    if (patch.parentRole !== undefined) updatePatch.parentRole = patch.parentRole;

    if (Object.keys(updatePatch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const updated = await this.db
      .update(kidProfile)
      .set(updatePatch)
      .where(eq(kidProfile.id, profileId))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('孩子档案不存在');
    }
    return this.toKidProfile(updated[0]);
  }

  async getReadingTracker(platformUserId: string): Promise<ReadingTracker[]> {
    const { profileId } = await this.ensureProfile(platformUserId);
    const rows = await this.db
      .select()
      .from(readingTracker)
      .where(eq(readingTracker.familyAccountId, profileId))
      .orderBy(readingTracker.createdAt);
    return rows.map((row: typeof readingTracker.$inferSelect) => this.toReadingTracker(row));
  }

  async markSeen(platformUserId: string, id: string): Promise<ReadingTracker> {
    const { profileId } = await this.ensureProfile(platformUserId);
    const updated = await this.db
      .update(readingTracker)
      .set({ isSeen: true })
      .where(and(
        eq(readingTracker.id, id),
        eq(readingTracker.familyAccountId, profileId),
      ))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('阅读追踪记录不存在');
    }
    return this.toReadingTracker(updated[0]);
  }

  async addStars(platformUserId: string, amount: number): Promise<KidProfile> {
    const { profile, profileId } = await this.ensureProfile(platformUserId);
    const updated = await this.db
      .update(kidProfile)
      .set({
        availableStars: profile.availableStars + amount,
        totalStars: profile.totalStars + amount,
        weekStars: profile.weekStars + amount,
      })
      .where(eq(kidProfile.id, profileId))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('孩子档案不存在');
    }
    return this.toKidProfile(updated[0]);
  }

  async spendStars(platformUserId: string, amount: number): Promise<KidProfile> {
    const { profile, profileId } = await this.ensureProfile(platformUserId);
    if (profile.availableStars < amount) {
      throw new ConflictException('星星不足，无法兑换');
    }
    const updated = await this.db
      .update(kidProfile)
      .set({ availableStars: profile.availableStars - amount })
      .where(eq(kidProfile.id, profileId))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('孩子档案不存在');
    }
    return this.toKidProfile(updated[0]);
  }
}
