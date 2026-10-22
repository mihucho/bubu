import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import * as crypto from 'node:crypto';
import {
  auditLogs,
  badges,
  childBadges,
  childProfiles,
  familyAccounts,
  familyMembers,
  parentInvites,
  shopItems,
} from '@server/database/appSchema';
import { localDateString } from '../kid-home/kid-home.service';

/** 商店物品的增删改（家长端 W5） */
@Injectable()
export class ParentShopService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(familyAccountId: string) {
    const rows = await this.db
      .select({
        id: shopItems.id,
        childId: shopItems.childId,
        childName: childProfiles.nickname,
        name: shopItems.name,
        starCost: shopItems.starCost,
        iconKey: shopItems.iconKey,
        isActive: shopItems.isActive,
      })
      .from(shopItems)
      .innerJoin(childProfiles, eq(childProfiles.id, shopItems.childId))
      .where(eq(shopItems.familyAccountId, familyAccountId))
      .orderBy(asc(shopItems.sortOrder), desc(shopItems.createdAt));
    return rows;
  }

  async create(
    familyAccountId: string,
    input: { childId: string; name: string; starCost: number; iconKey?: string; description?: string },
  ) {
    const name = (input.name ?? '').trim();
    if (!name) throw new BadRequestException('NAME_REQUIRED');
    if (!Number.isFinite(input.starCost) || input.starCost < 0 || input.starCost > 999) {
      throw new BadRequestException('COST_INVALID');
    }
    const [row] = await this.db
      .insert(shopItems)
      .values({
        childId: input.childId,
        familyAccountId,
        name: name.slice(0, 20),
        starCost: input.starCost,
        iconKey: input.iconKey ?? 'gift',
        description: input.description?.slice(0, 60),
      })
      .returning();
    return { id: row.id };
  }

  async update(childId: string, itemId: string, patch: { name?: string; starCost?: number; isActive?: boolean }) {
    await this.db
      .update(shopItems)
      .set({
        ...(patch.name ? { name: patch.name.slice(0, 20) } : {}),
        ...(typeof patch.starCost === 'number' ? { starCost: patch.starCost } : {}),
        ...(typeof patch.isActive === 'boolean' ? { isActive: patch.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(shopItems.id, itemId), eq(shopItems.childId, childId)));
    return { ok: true };
  }
}

/** 徽章定义（家长自定义，每孩 ≤6） */
@Injectable()
export class ParentBadgeService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(familyAccountId: string, childId: string) {
    const custom = await this.db
      .select()
      .from(badges)
      .where(and(eq(badges.familyAccountId, familyAccountId), eq(badges.childId, childId)))
      .orderBy(desc(badges.id));

    const earned = await this.db
      .select({ badgeId: childBadges.badgeId })
      .from(childBadges)
      .where(eq(childBadges.childId, childId));
    const earnedSet = new Set(earned.map((e) => e.badgeId));

    return custom.map((b) => ({
      id: b.id,
      name: b.name,
      iconKey: b.iconKey,
      ruleType: b.ruleType,
      starReward: b.starReward,
      praiseText: b.praiseText,
      awarded: earnedSet.has(b.id),
    }));
  }

  async create(
    familyAccountId: string,
    childId: string,
    input: { name: string; iconKey: string; ruleType: string; ruleConfig?: Record<string, unknown>; starReward?: number; praiseText?: string },
  ) {
    const name = (input.name ?? '').trim();
    if (!name) throw new BadRequestException('NAME_REQUIRED');

    const existing = await this.db
      .select({ n: badges.id })
      .from(badges)
      .where(and(eq(badges.familyAccountId, familyAccountId), eq(badges.childId, childId)));
    if (existing.length >= 6) throw new BadRequestException('BADGE_LIMIT_6');

    const [row] = await this.db
      .insert(badges)
      .values({
        familyAccountId,
        childId,
        name: name.slice(0, 8),
        iconKey: input.iconKey ?? 'star',
        ruleType: input.ruleType ?? 'manual',
        ruleConfig: input.ruleConfig ?? {},
        starReward: Math.min(3, Math.max(0, input.starReward ?? 0)),
        praiseText: input.praiseText?.slice(0, 60),
      })
      .returning();
    return { id: row.id };
  }

  /** 手动颁发（家长点了就发，已颁发不可删，只能隐藏） */
  async award(familyAccountId: string, childId: string, badgeId: string, operator?: string) {
    const [badge] = await this.db
      .select()
      .from(badges)
      .where(and(eq(badges.id, badgeId), eq(badges.childId, childId)))
      .limit(1);
    if (!badge) throw new NotFoundException('BADGE_NOT_FOUND');

    await this.db
      .insert(childBadges)
      .values({ childId, badgeId, awardedBy: operator ?? null, progressSnapshot: { manual: true } })
      .onConflictDoNothing();
    return { ok: true };
  }
}

/** 家庭：成员 / 邀请码 / 边界设置 */
@Injectable()
export class ParentFamilyService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async members(familyAccountId: string) {
    const rows = await this.db
      .select({
        id: familyMembers.id,
        displayName: familyMembers.displayName,
        role: familyMembers.role,
        phone: familyMembers.phone,
        joinedAt: familyMembers.joinedAt,
      })
      .from(familyMembers)
      .where(eq(familyMembers.familyAccountId, familyAccountId))
      .orderBy(asc(familyMembers.joinedAt));
    return rows.map((r) => ({ ...r, phone: maskPhone(r.phone) }));
  }

  /** 生成 6 位邀请码（24 小时、一次性） */
  async invite(familyAccountId: string, operator: string) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i += 1) code += alphabet[bytes[i] % alphabet.length];

    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await this.db.insert(parentInvites).values({
      familyAccountId,
      code,
      createdBy: operator,
      expiresAt: expires,
    });
    return { code, expiresAt: expires.toISOString() };
  }

  async listInvites(familyAccountId: string) {
    const rows = await this.db
      .select({
        code: parentInvites.code,
        expiresAt: parentInvites.expiresAt,
        usedAt: parentInvites.usedAt,
      })
      .from(parentInvites)
      .where(eq(parentInvites.familyAccountId, familyAccountId))
      .orderBy(desc(parentInvites.createdAt))
      .limit(10);
    return rows;
  }

  async settings(familyAccountId: string) {
    const [row] = await this.db
      .select()
      .from(familyAccounts)
      .where(eq(familyAccounts.id, familyAccountId))
      .limit(1);
    if (!row) throw new NotFoundException('FAMILY_NOT_FOUND');
    return {
      parentDisplayName: row.parentDisplayName,
      dailyLimitMinutes: row.dailyLimitMinutes,
      restIntervalMinutes: row.restIntervalMinutes,
      restDurationMinutes: row.restDurationMinutes,
      sleepStart: row.sleepStart,
      sleepEnd: row.sleepEnd,
      dailyDigestTime: row.dailyDigestTime,
      quietStart: row.quietStart,
      quietEnd: row.quietEnd,
      remindConfirm: row.remindConfirm,
      remindWish: row.remindWish,
      remindSafety: row.remindSafety,
      remindReport: row.remindReport,
      diaryParentVisible: row.diaryParentVisible,
      aiFulltextVisible: row.aiFulltextVisible,
      exportEnabled: row.exportEnabled,
      pinSet: Boolean(row.parentPinHash),
    };
  }

  /** 更新边界/提醒（只更新传进来的字段） */
  async updateSettings(
    familyAccountId: string,
    patch: Record<string, unknown>,
  ) {
    const allowed = [
      'parentDisplayName',
      'dailyLimitMinutes',
      'restIntervalMinutes',
      'restDurationMinutes',
      'sleepStart',
      'sleepEnd',
      'dailyDigestTime',
      'quietStart',
      'quietEnd',
      'remindConfirm',
      'remindWish',
      'remindSafety',
      'remindReport',
      'diaryParentVisible',
      'aiFulltextVisible',
      'exportEnabled',
    ];
    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in patch && patch[key] !== undefined) set[key] = patch[key];
    }
    if (Object.keys(set).length === 1) throw new BadRequestException('NOTHING_TO_UPDATE');

    await this.db.update(familyAccounts).set(set).where(eq(familyAccounts.id, familyAccountId));
    return { ok: true };
  }

  /** 6 位家长密码：设置 / 校验 */
  async setPin(familyAccountId: string, pin: string) {
    if (!/^\d{6}$/.test(pin)) throw new BadRequestException('PIN_MUST_BE_6_DIGITS');
    await this.db
      .update(familyAccounts)
      .set({ parentPinHash: hashPin(pin), parentPinSetAt: new Date(), updatedAt: new Date() })
      .where(eq(familyAccounts.id, familyAccountId));
    return { ok: true };
  }

  async verifyPin(familyAccountId: string, pin: string) {
    const [row] = await this.db
      .select({ parentPinHash: familyAccounts.parentPinHash })
      .from(familyAccounts)
      .where(eq(familyAccounts.id, familyAccountId))
      .limit(1);
    if (!row) throw new NotFoundException('FAMILY_NOT_FOUND');
    if (!row.parentPinHash) return { ok: false, reason: 'PIN_NOT_SET' };
    const ok = row.parentPinHash === hashPin(pin);
    return { ok, reason: ok ? undefined : 'PIN_WRONG' };
  }

  /** 审计：谁改了什么（家长端不可删，只在列表里看） */
  async audit(familyAccountId: string) {
    const rows = await this.db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetTable: auditLogs.targetTable,
        localDate: auditLogs.localDate,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.familyAccountId, familyAccountId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);
    return rows;
  }

  async log(input: {
    familyAccountId: string;
    actor?: string;
    childId?: string;
    action: string;
    targetTable?: string;
    targetId?: string;
    diff?: Record<string, unknown>;
  }) {
    await this.db.insert(auditLogs).values({
      familyAccountId: input.familyAccountId,
      actor: input.actor ?? null,
      childId: input.childId ?? null,
      action: input.action,
      targetTable: input.targetTable,
      targetId: input.targetId,
      diff: input.diff,
      localDate: localDateString(),
    });
  }

  /** 孩子档案列表（编辑用） */
  async children(familyAccountId: string) {
    return this.db
      .select({
        id: childProfiles.id,
        nickname: childProfiles.nickname,
        loginId: childProfiles.loginId,
        title: childProfiles.title,
        avatarKey: childProfiles.avatarKey,
        colorKey: childProfiles.colorKey,
        mustChangePassword: childProfiles.mustChangePassword,
      })
      .from(childProfiles)
      .where(and(eq(childProfiles.familyAccountId, familyAccountId), isNull(childProfiles.archivedAt)))
      .orderBy(asc(childProfiles.sortOrder));
  }

  async updateChild(
    childId: string,
    patch: { nickname?: string; title?: string; avatarKey?: string; colorKey?: string },
  ) {
    await this.db
      .update(childProfiles)
      .set({
        ...(patch.nickname ? { nickname: patch.nickname.slice(0, 12) } : {}),
        ...(patch.title ? { title: patch.title.slice(0, 20) } : {}),
        ...(patch.avatarKey ? { avatarKey: patch.avatarKey } : {}),
        ...(patch.colorKey ? { colorKey: patch.colorKey } : {}),
        updatedAt: new Date(),
      })
      .where(eq(childProfiles.id, childId));
    return { ok: true };
  }

  /** 归档孩子（软删，30 天内可恢复） */
  async archiveChild(childId: string) {
    await this.db
      .update(childProfiles)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(childProfiles.id, childId));
    return { ok: true };
  }
}

function maskPhone(phone: string): string {
  if (/^\d{11}$/.test(phone)) return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  if (phone.startsWith('doubao:')) return '豆包账号';
  return phone.length > 8 ? `${phone.slice(0, 4)}****` : phone;
}

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(`bubu-pin:${pin}`).digest('hex');
}
