import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and } from 'drizzle-orm';
import { kidProfile, tasks, shopItems, eggTasks } from '@server/database/schema';
import type { KidProfile, ProfileStatusResponse } from '@shared/api.interface';

const DEFAULT_WEEK_TASKS = [
  { name: '大果外教作业', icon: '🌍', color: 'blue', targetCount: 2, starReward: 3, sortOrder: 1 },
  { name: '小帮手做家务', icon: '🧹', color: 'yellow', targetCount: 3, starReward: 2, sortOrder: 2 },
  { name: '叫叫阅读 20分', icon: '🐣', color: 'orange', targetCount: 5, starReward: 1, sortOrder: 3 },
  { name: '学校作业', icon: '🎒', color: 'red', targetCount: 7, starReward: 2, sortOrder: 4 },
  { name: '每日口算', icon: '🔢', color: 'pink', targetCount: 1, starReward: 1, sortOrder: 5 },
  { name: '英语单词', icon: '🔤', color: 'purple', targetCount: 1, starReward: 1, sortOrder: 6 },
];

const DEFAULT_SHOP_ITEMS = [
  { name: '选一本新绘本', icon: '📚', starCost: 5, sortOrder: 1 },
  { name: '一次户外撒欢（公园/骑车）', icon: '🚲', starCost: 10, sortOrder: 2 },
  { name: '和爸爸妈妈做一次小小美食', icon: '🧁', starCost: 20, sortOrder: 3 },
  { name: '去一次游乐场', icon: '🎡', starCost: 100, sortOrder: 4 },
  { name: '看动画片时间（1☆=1分钟）', icon: '📺', starCost: 1, sortOrder: 5 },
  { name: '零花钱买玩具（1☆=1元）', icon: '💰', starCost: 1, sortOrder: 6 },
];

const DEFAULT_EGG_TASKS = [
  { name: '小口算', icon: '🔢', starReward: 1 },
  { name: '小单词', icon: '🔤', starReward: 1 },
  { name: '小科学', icon: '🔬', starReward: 1 },
  { name: '小古文', icon: '📜', starReward: 1 },
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
  }

  async checkProfile(platformUserId: string): Promise<ProfileStatusResponse> {
    const rows = await this.db
      .select()
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);

    if (rows.length === 0) {
      return { exists: false };
    }

    const row = rows[0];
    const profile: KidProfile = {
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

    return { exists: true, profile };
  }

  async initProfile(platformUserId: string, nickname: string, parentRole: string): Promise<KidProfile> {
    const trimmedNickname = nickname.trim();
    const trimmedRole = parentRole.trim();
    if (!trimmedNickname) throw new BadRequestException('孩子昵称不能为空');
    if (!trimmedRole) throw new BadRequestException('家长身份不能为空');

    const existing = await this.db
      .select({ id: kidProfile.id })
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    if (existing.length > 0) {
      throw new BadRequestException('档案已存在');
    }

    const weekStart = this.getWeekStart();

    const inserted = await this.db.transaction(async (tx) => {
      const profileRows = await tx.insert(kidProfile).values({
        platformUserId,
        nickname: trimmedNickname,
        parentRole: trimmedRole,
        title: '小花朵',
        petName: '小黄油',
        petType: '小狗',
        petStatus: '睁开眼啦',
        petHunger: 88,
        petClean: 96,
        petMood: 95,
      }).returning();

      const profileId = profileRows[0].id;

      await tx.insert(tasks).values(
        DEFAULT_WEEK_TASKS.map((t) => ({
          ...t,
          familyAccountId: profileId,
          isRecommended: true,
          weekStart,
        })),
      );

      await tx.insert(shopItems).values(
        DEFAULT_SHOP_ITEMS.map((item) => ({
          ...item,
          familyAccountId: profileId,
          isActive: true,
        })),
      );

      await tx.insert(eggTasks).values(
        DEFAULT_EGG_TASKS.map((t) => ({
          ...t,
          familyAccountId: profileId,
          isCompleted: false,
        })),
      );

      return profileRows[0];
    });

    return {
      id: inserted.id,
      nickname: inserted.nickname,
      title: inserted.title,
      avatarUrl: inserted.avatarUrl ?? undefined,
      availableStars: inserted.availableStars,
      totalStars: inserted.totalStars,
      weekStars: inserted.weekStars,
      weekTarget: inserted.weekTarget,
      weekAchieved: inserted.weekAchieved,
      readingPoints: inserted.readingPoints,
      petName: inserted.petName,
      petType: inserted.petType,
      petStatus: inserted.petStatus,
      petHunger: inserted.petHunger,
      petClean: inserted.petClean,
      petMood: inserted.petMood,
      petPointsSent: inserted.petPointsSent,
      readingStreak: inserted.readingStreak,
      exerciseStreak: inserted.exerciseStreak,
      showReadingTracker: inserted.showReadingTracker,
      parentRole: inserted.parentRole,
    };
  }
}
