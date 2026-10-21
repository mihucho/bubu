import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, asc } from 'drizzle-orm';
import { shopItems, exchangeRecords, kidProfile } from '@server/database/schema';
import type { ShopItem, KidProfile } from '@shared/api.interface';

interface ExchangeResult {
  success: boolean;
  item?: ShopItem;
  profile?: KidProfile;
  message?: string;
}

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private async resolveProfileId(platformUserId: string): Promise<string> {
    const rows = await this.db.select({ id: kidProfile.id })
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('孩子档案不存在');
    return rows[0].id;
  }

  private toShopItem(row: typeof shopItems.$inferSelect): ShopItem {
    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      starCost: row.starCost,
      description: row.description ?? undefined,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
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

  async getItems(platformUserId: string): Promise<ShopItem[]> {
    const profileId = await this.resolveProfileId(platformUserId);
    let rows = await this.db
      .select()
      .from(shopItems)
      .where(and(
        eq(shopItems.isActive, true),
        eq(shopItems.familyAccountId, profileId),
      ))
      .orderBy(asc(shopItems.sortOrder));

    if (rows.length === 0) {
      await this.db.insert(shopItems).values([
        { name: '选一本新绘本', icon: '📚', starCost: 5, sortOrder: 1, isActive: true, familyAccountId: profileId },
        { name: '一次户外撒欢（公园/骑车）', icon: '🚲', starCost: 10, sortOrder: 2, isActive: true, familyAccountId: profileId },
        { name: '和爸爸妈妈做一次小小美食', icon: '🧁', starCost: 20, sortOrder: 3, isActive: true, familyAccountId: profileId },
        { name: '去一次游乐场', icon: '🎡', starCost: 100, sortOrder: 4, isActive: true, familyAccountId: profileId },
        { name: '看动画片时间（1☆=1分钟）', icon: '📺', starCost: 1, sortOrder: 5, isActive: true, familyAccountId: profileId },
        { name: '零花钱买玩具（1☆=1元）', icon: '💰', starCost: 1, sortOrder: 6, isActive: true, familyAccountId: profileId },
      ]);
      rows = await this.db
        .select()
        .from(shopItems)
        .where(and(
          eq(shopItems.isActive, true),
          eq(shopItems.familyAccountId, profileId),
        ))
        .orderBy(asc(shopItems.sortOrder));
    }

    return rows.map((row: typeof shopItems.$inferSelect) => this.toShopItem(row));
  }

  async exchangeItem(platformUserId: string, itemId: string): Promise<ExchangeResult> {
    const profileId = await this.resolveProfileId(platformUserId);
    const itemRows = await this.db
      .select()
      .from(shopItems)
      .where(and(
        eq(shopItems.id, itemId),
        eq(shopItems.familyAccountId, profileId),
      ))
      .limit(1);
    if (itemRows.length === 0) {
      throw new NotFoundException('商品不存在');
    }
    const item = itemRows[0];

    const kidRows = await this.db
      .select()
      .from(kidProfile)
      .where(eq(kidProfile.platformUserId, platformUserId))
      .limit(1);
    if (kidRows.length === 0) {
      throw new NotFoundException('孩子档案不存在');
    }
    const kid = kidRows[0];

    if (kid.availableStars < item.starCost) {
      throw new ConflictException('星星不足，无法兑换');
    }

    // Deduct stars and create exchange record in transaction
    let profile: KidProfile = {} as KidProfile;
    await this.db.transaction(async (tx) => {
      const newKidRows = await tx
        .update(kidProfile)
        .set({ availableStars: kid.availableStars - item.starCost })
        .where(and(
          eq(kidProfile.id, kid.id),
          eq(kidProfile.platformUserId, platformUserId),
        ))
        .returning();
      profile = this.toKidProfile(newKidRows[0]);

      await tx.insert(exchangeRecords).values({
        familyAccountId: profileId,
        itemName: item.name,
        starCost: item.starCost,
      });
    });

    return {
      success: true,
      item: this.toShopItem(item),
      profile,
      message: '兑换成功！',
    };
  }
}
