import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  childProfiles,
  eggOpens,
  eggTasks,
  exchangeRecords,
  shopItems,
  starLedger,
  wishItems,
} from '@server/database/appSchema';
import { StarsService } from '../stars/stars.service';
import { localDateString } from '../kid-home/kid-home.service';

export interface ShopItemDto {
  id: string;
  name: string;
  iconKey: string;
  starCost: number;
  description: string | null;
  affordable: boolean;
}

export interface WishDto {
  id: string;
  title: string;
  iconKey: string;
  starCost: number | null;
  status: string;
  note: string | null;
  expiresAt: string | null;
  affordable: boolean;
}

export interface EggDto {
  id: string;
  name: string;
  iconKey: string;
  starReward: number;
  openedToday: boolean;
}

/**
 * 孩子端的「想要」与「彩蛋」：商店兑换、心愿、签到彩蛋。
 * 所有扣星/发星都经 `stars.service`（含幂等），业务表只存快照。
 */
@Injectable()
export class KidShopService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly stars: StarsService,
  ) {}

  private async childOf(childId: string) {
    const [child] = await this.db
      .select({
        id: childProfiles.id,
        familyAccountId: childProfiles.familyAccountId,
        availableStars: childProfiles.availableStars,
      })
      .from(childProfiles)
      .where(and(eq(childProfiles.id, childId), isNull(childProfiles.archivedAt)))
      .limit(1);
    if (!child) throw new NotFoundException('CHILD_NOT_FOUND');
    return child;
  }

  /* -------------------- 星星商店 -------------------- */

  async listShop(childId: string): Promise<{ balance: number; items: ShopItemDto[] }> {
    const child = await this.childOf(childId);
    const rows = await this.db
      .select()
      .from(shopItems)
      .where(and(eq(shopItems.childId, childId), eq(shopItems.isActive, true)))
      .orderBy(asc(shopItems.sortOrder), asc(shopItems.createdAt));

    return {
      balance: child.availableStars,
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        iconKey: r.iconKey,
        starCost: r.starCost,
        description: r.description,
        affordable: r.starCost <= child.availableStars,
      })),
    };
  }

  async exchange(childId: string, itemId: string, idempotencyKey?: string) {
    const child = await this.childOf(childId);
    const [item] = await this.db
      .select()
      .from(shopItems)
      .where(and(eq(shopItems.id, itemId), eq(shopItems.childId, childId)))
      .limit(1);
    if (!item) throw new NotFoundException('ITEM_NOT_FOUND');
    if (!item.isActive) throw new BadRequestException('ITEM_INACTIVE');

    const localDate = localDateString();
    const idem = idempotencyKey ?? `exchange:${childId}:${itemId}:${Date.now()}`;

    // 先扣星（幂等），再落兑换快照；扣星失败会抛 INSUFFICIENT_STARS
    const spend = await this.stars.spend({
      childId,
      familyAccountId: child.familyAccountId,
      amount: item.starCost,
      reason: 'shop',
      title: item.name,
      refTable: 'shop_items',
      refId: item.id,
      idempotencyKey: `${idem}:spend`,
      localDate,
    });

    const [record] = await this.db
      .insert(exchangeRecords)
      .values({
        childId,
        itemId: item.id,
        itemName: item.name,
        starCost: item.starCost,
        status: 'done',
        idempotencyKey: idem,
      })
      .returning();

    return {
      exchangeId: record.id,
      itemName: item.name,
      starCost: item.starCost,
      balance: spend.balance,
      duplicated: spend.duplicated,
    };
  }

  async listExchanges(childId: string) {
    const rows = await this.db
      .select({
        id: exchangeRecords.id,
        itemName: exchangeRecords.itemName,
        starCost: exchangeRecords.starCost,
        status: exchangeRecords.status,
        createdAt: exchangeRecords.createdAt,
      })
      .from(exchangeRecords)
      .where(eq(exchangeRecords.childId, childId))
      .orderBy(desc(exchangeRecords.createdAt))
      .limit(20);
    return rows;
  }

  /* -------------------- 心愿 -------------------- */

  async listWishes(childId: string): Promise<{ balance: number; wishes: WishDto[] }> {
    const child = await this.childOf(childId);
    const rows = await this.db
      .select()
      .from(wishItems)
      .where(and(eq(wishItems.childId, childId), eq(wishItems.isSurprise, false)))
      .orderBy(desc(wishItems.createdAt));

    return {
      balance: child.availableStars,
      wishes: rows.map((r) => ({
        id: r.id,
        title: r.title,
        iconKey: r.iconKey,
        starCost: r.starCost,
        status: r.status,
        note: r.note,
        expiresAt: r.expiresAt,
        affordable: r.starCost !== null && r.starCost <= child.availableStars,
      })),
    };
  }

  async createWish(childId: string, title: string, fulfillType = 'gift') {
    const clean = (title ?? '').trim();
    if (!clean) throw new BadRequestException('TITLE_REQUIRED');
    if (clean.length > 40) throw new BadRequestException('TITLE_TOO_LONG');
    const child = await this.childOf(childId);

    const expires = new Date();
    expires.setUTCDate(expires.getUTCDate() + 90);

    const [row] = await this.db
      .insert(wishItems)
      .values({
        childId,
        familyAccountId: child.familyAccountId,
        title: clean,
        fulfillType,
        status: 'pending',
        createdBy: 'kid',
        expiresAt: expires.toISOString().slice(0, 10),
      })
      .returning();

    return { id: row.id, title: row.title, status: row.status };
  }

  /** 孩子点「我拿到啦」 */
  async confirmWish(childId: string, wishId: string) {
    const [wish] = await this.db
      .select()
      .from(wishItems)
      .where(and(eq(wishItems.id, wishId), eq(wishItems.childId, childId)))
      .limit(1);
    if (!wish) throw new NotFoundException('WISH_NOT_FOUND');
    if (wish.status !== 'claimable' && wish.status !== 'claimed') {
      throw new BadRequestException('WISH_NOT_CLAIMABLE');
    }
    await this.db
      .update(wishItems)
      .set({ status: 'claimed', kidConfirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(wishItems.id, wishId));
    return { ok: true };
  }

  /* -------------------- 签到彩蛋 -------------------- */

  async listEggs(childId: string): Promise<EggDto[]> {
    const today = localDateString();
    const rows = await this.db
      .select()
      .from(eggTasks)
      .where(and(eq(eggTasks.childId, childId), eq(eggTasks.isActive, true)))
      .orderBy(asc(eggTasks.sortOrder));

    const opened = await this.db
      .select({ eggTaskId: eggOpens.eggTaskId })
      .from(eggOpens)
      .where(and(eq(eggOpens.childId, childId), eq(eggOpens.localDate, today)));
    const openedSet = new Set(opened.map((o) => o.eggTaskId));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      iconKey: r.iconKey,
      starReward: r.starReward,
      openedToday: openedSet.has(r.id),
    }));
  }

  async openEgg(childId: string, eggTaskId: string) {
    const child = await this.childOf(childId);
    const [egg] = await this.db
      .select()
      .from(eggTasks)
      .where(and(eq(eggTasks.id, eggTaskId), eq(eggTasks.childId, childId)))
      .limit(1);
    if (!egg) throw new NotFoundException('EGG_NOT_FOUND');

    const today = localDateString();
    const [already] = await this.db
      .select({ id: eggOpens.id })
      .from(eggOpens)
      .where(
        and(
          eq(eggOpens.childId, childId),
          eq(eggOpens.eggTaskId, eggTaskId),
          eq(eggOpens.localDate, today),
        ),
      )
      .limit(1);
    if (already) {
      const balance = await this.stars.balance(childId);
      return { opened: false, stars: 0, balance, message: '今天已经开过啦' };
    }

    const [openRow] = await this.db
      .insert(eggOpens)
      .values({
        childId,
        eggTaskId,
        localDate: today,
        idempotencyKey: `egg:${childId}:${eggTaskId}:${today}`,
      })
      .returning();

    const grant = await this.stars.grant({
      childId,
      familyAccountId: child.familyAccountId,
      amount: egg.starReward,
      reason: 'egg',
      title: egg.name,
      refTable: 'egg_tasks',
      refId: egg.id,
      idempotencyKey: `egg-grant:${childId}:${eggTaskId}:${today}`,
      localDate: today,
    });

    return {
      opened: true,
      eggOpenId: openRow.id,
      stars: grant.duplicated ? 0 : grant.amount,
      balance: grant.balance,
      message: grant.duplicated ? '今天已经开过啦' : `彩蛋里是 ${egg.starReward} 颗星`,
    };
  }

  /** 家长端：给孩子发一句话（站内消息） */
  async listLedger(childId: string) {
    const rows = await this.db
      .select({
        id: starLedger.id,
        amount: starLedger.amount,
        reason: starLedger.reason,
        title: starLedger.title,
        balanceAfter: starLedger.balanceAfter,
        localDate: starLedger.localDate,
      })
      .from(starLedger)
      .where(eq(starLedger.childId, childId))
      .orderBy(desc(starLedger.createdAt))
      .limit(30);
    return rows;
  }

  async ledgerTotal(childId: string) {
    const [row] = await this.db
      .select({ total: sql<number>`coalesce(sum(${starLedger.amount}), 0)`.mapWith(Number) })
      .from(starLedger)
      .where(eq(starLedger.childId, childId));
    return row?.total ?? 0;
  }
}
