import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, gte, lt, asc } from 'drizzle-orm';
import { tasks, kidProfile } from '@server/database/schema';
import type { Task, KidProfile } from '@shared/api.interface';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

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

  private toTask(row: typeof tasks.$inferSelect): Task {
    return {
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

  async getWeekTasks(platformUserId: string): Promise<Task[]> {
    const profileId = await this.resolveProfileId(platformUserId);
    const weekStart = this.getWeekStart();
    const nextWeekStart = this.getNextWeekStart();
    const rows = await this.db
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
    return rows.map((row: typeof tasks.$inferSelect) => this.toTask(row));
  }

  async checkIn(platformUserId: string, taskId: string): Promise<{ task: Task; profile: KidProfile }> {
    const profileId = await this.resolveProfileId(platformUserId);
    const taskRows = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.familyAccountId, profileId)))
      .limit(1);
    if (taskRows.length === 0) {
      throw new NotFoundException('任务不存在');
    }
    const task = taskRows[0];
    const newCount = task.currentCount + 1;
    const wasAchieved = task.isAchieved;
    const isNowAchieved = newCount >= task.targetCount;

    const updatedRows = await this.db
      .update(tasks)
      .set({
        currentCount: newCount,
        isAchieved: isNowAchieved,
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.familyAccountId, profileId)))
      .returning();
    const updatedTask = this.toTask(updatedRows[0]);

    // Add stars for each check-in, update week_achieved on first achievement
    const kidRows = await this.db
      .select()
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    if (kidRows.length === 0) {
      throw new NotFoundException('孩子档案不存在');
    }
    const kid = kidRows[0];
    const patch: Partial<typeof kidProfile.$inferInsert> = {
      availableStars: kid.availableStars + task.starReward,
      totalStars: kid.totalStars + task.starReward,
      weekStars: kid.weekStars + task.starReward,
    };
    if (isNowAchieved && !wasAchieved) {
      patch.weekAchieved = kid.weekAchieved + 1;
    }
    const newProfileRows = await this.db
      .update(kidProfile)
      .set(patch)
      .where(eq(kidProfile.id, kid.id))
      .returning();
    const profile = this.toKidProfile(newProfileRows[0]);

    return { task: updatedTask, profile };
  }

  async reorder(platformUserId: string, ids: string[]): Promise<Task[]> {
    const profileId = await this.resolveProfileId(platformUserId);
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i += 1) {
        await tx
          .update(tasks)
          .set({ sortOrder: i })
          .where(and(
            eq(tasks.id, ids[i]),
            eq(tasks.familyAccountId, profileId),
          ));
      }
    });
    return this.getWeekTasks(platformUserId);
  }
}
