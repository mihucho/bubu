import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and } from 'drizzle-orm';
import { eggTasks, kidProfile } from '@server/database/schema';
import type { EggTask, KidProfile } from '@shared/api.interface';

@Injectable()
export class EggService {
  private readonly logger = new Logger(EggService.name);

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

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toEggTask(row: typeof eggTasks.$inferSelect): EggTask {
    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      starReward: row.starReward,
      isCompleted: row.isCompleted,
      completedDate: row.completedDate ?? undefined,
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

  async getTodayTasks(platformUserId: string): Promise<EggTask[]> {
    const profileId = await this.resolveProfileId(platformUserId);
    const today = this.getToday();
    let rows = await this.db
      .select()
      .from(eggTasks)
      .where(eq(eggTasks.familyAccountId, profileId))
      .orderBy(eggTasks.createdAt)
      .limit(4);

    if (rows.length === 0) {
      await this.db.insert(eggTasks).values([
        { name: '小口算', icon: '🔢', starReward: 1, isCompleted: false, familyAccountId: profileId },
        { name: '小单词', icon: '🔤', starReward: 1, isCompleted: false, familyAccountId: profileId },
        { name: '小科学', icon: '🔬', starReward: 1, isCompleted: false, familyAccountId: profileId },
        { name: '小古文', icon: '📜', starReward: 1, isCompleted: false, familyAccountId: profileId },
      ]);
      rows = await this.db
        .select()
        .from(eggTasks)
        .where(eq(eggTasks.familyAccountId, profileId))
        .orderBy(eggTasks.createdAt)
        .limit(4);
    }

    const allFromToday = rows.every(
      (r: typeof eggTasks.$inferSelect) =>
        !r.isCompleted || r.completedDate === today,
    );

    if (!allFromToday) {
      await this.db
        .update(eggTasks)
        .set({ isCompleted: false, completedDate: null })
        .where(and(
          eq(eggTasks.isCompleted, true),
          eq(eggTasks.familyAccountId, profileId),
        ));
      const refreshed = await this.db
        .select()
        .from(eggTasks)
        .where(eq(eggTasks.familyAccountId, profileId))
        .orderBy(eggTasks.createdAt)
        .limit(4);
      return refreshed.map((r: typeof eggTasks.$inferSelect) => this.toEggTask(r));
    }

    return rows.map((r: typeof eggTasks.$inferSelect) => this.toEggTask(r));
  }

  async completeTask(platformUserId: string, taskId: string): Promise<{ task: EggTask; profile: KidProfile }> {
    const profileId = await this.resolveProfileId(platformUserId);
    const taskRows = await this.db
      .select()
      .from(eggTasks)
      .where(and(
        eq(eggTasks.id, taskId),
        eq(eggTasks.familyAccountId, profileId),
      ))
      .limit(1);
    if (taskRows.length === 0) {
      throw new NotFoundException('彩蛋任务不存在');
    }
    const task = taskRows[0];
    if (task.isCompleted) {
      // Already completed, just return current state
      const kidRows = await this.db
        .select()
        .from(kidProfile)
        .where(eq(kidProfile.platformUserId, platformUserId))
        .limit(1);
      const profile = kidRows.length > 0 ? this.toKidProfile(kidRows[0]) : ({} as KidProfile);
      return { task: this.toEggTask(task), profile };
    }

    const today = this.getToday();
    const updated = await this.db
      .update(eggTasks)
      .set({ isCompleted: true, completedDate: today })
      .where(and(
        eq(eggTasks.id, taskId),
        eq(eggTasks.familyAccountId, profileId),
      ))
      .returning();

    // Add stars
    const kidRows = await this.db
      .select()
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    let profile: KidProfile = {} as KidProfile;
    if (kidRows.length > 0) {
      const kid = kidRows[0];
      const newKidRows = await this.db
        .update(kidProfile)
        .set({
          availableStars: kid.availableStars + task.starReward,
          totalStars: kid.totalStars + task.starReward,
          weekStars: kid.weekStars + task.starReward,
        })
        .where(eq(kidProfile.id, kid.id))
        .returning();
      profile = this.toKidProfile(newKidRows[0]);
    }

    return { task: this.toEggTask(updated[0]), profile };
  }
}
