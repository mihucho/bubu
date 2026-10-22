import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, eq, isNull } from 'drizzle-orm';
import * as crypto from 'node:crypto';
import { childProfiles, familyAccounts, familyMembers } from '@server/database/appSchema';

export interface FamilyChildSummary {
  id: string;
  nickname: string;
  avatarKey: string;
  colorKey: string;
  title: string;
  availableStars: number;
  firstRunDone: boolean;
}

export interface FamilyBootstrap {
  familyAccountId: string;
  parentDisplayName: string;
  setupStep: string;
  children: FamilyChildSummary[];
}

/**
 * 家庭与孩子的引导（v2）
 *
 * 平台注入的 `doubao_user_id` 是唯一身份来源；第一次进来时补一条家庭 + 一条孩子，
 * 让「登录后能看到东西」不依赖引导流程是否已做完。
 */
@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private static randomCode(len: number): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i += 1) out += alphabet[bytes[i] % alphabet.length];
    return out;
  }

  async bootstrap(platformUserId: string): Promise<FamilyBootstrap> {
    const family = await this.ensureFamily(platformUserId);
    let children = await this.listChildren(family.id);
    // 只有引导走完（setupStep=done）才补占位孩子：「首屏不空」。
    // 引导没走完时留空，前端 SetupGate 会把人顶到 /setup 去建真实的孩子，
    // 否则「小月亮」会和家长刚建的孩子并存。
    if (children.length === 0 && family.setupStep === 'done') {
      await this.createChild(family.id, { nickname: '小月亮', sortOrder: 0 });
      children = await this.listChildren(family.id);
    }
    return {
      familyAccountId: family.id,
      parentDisplayName: family.parentDisplayName,
      setupStep: family.setupStep,
      children,
    };
  }

  async ensureFamily(platformUserId: string) {
    const [existing] = await this.db
      .select()
      .from(familyAccounts)
      .where(eq(familyAccounts.doubaoUserId, platformUserId))
      .limit(1);
    if (existing) return existing;

    // 平台用户首次进入：建家庭（无手机号，用合成账号占位，后续可在设置里补手机号）
    // 并发首登会撞 doubao_user_id 唯一索引 —— 撞了就回读，不返回 500
    try {
      return await this.insertFamily(platformUserId);
    } catch (err) {
      if ((err as { code?: string })?.code === '23505') {
        const [raced] = await this.db
          .select()
          .from(familyAccounts)
          .where(eq(familyAccounts.doubaoUserId, platformUserId))
          .limit(1);
        if (raced) return raced;
      }
      throw err;
    }
  }

  private async insertFamily(platformUserId: string) {
    const [created] = await this.db
      .insert(familyAccounts)
      .values({
        account: `doubao:${platformUserId}`,
        doubaoUserId: platformUserId,
        doubaoBoundAt: new Date(),
        loginProvider: 'doubao',
        // 平台用户走 SSO，不需要密码；占位哈希避免 NOT NULL 违约
        passwordHash: `sso:${crypto.randomBytes(16).toString('hex')}`,
        setupStep: 'consent',
      })
      .returning();

    await this.db.insert(familyMembers).values({
      familyAccountId: created.id,
      phone: `doubao:${platformUserId}`,
      passwordHash: created.passwordHash,
      doubaoUserId: platformUserId,
      displayName: created.parentDisplayName,
      role: 'owner',
    });

    this.logger.log(`family created for platform user ${platformUserId}`);
    return created;
  }

  /** 引导断点：每步落库，中途退出可续 */
  async setSetupStep(familyAccountId: string, step: string) {
    const allowed = ['consent', 'family', 'children', 'tasks', 'rewards', 'boundary', 'done'];
    if (!allowed.includes(step)) throw new BadRequestException('STEP_INVALID');
    await this.db
      .update(familyAccounts)
      .set({
        setupStep: step,
        setupCompletedAt: step === 'done' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(familyAccounts.id, familyAccountId));
    return { ok: true, step };
  }

  async listChildren(familyAccountId: string): Promise<FamilyChildSummary[]> {
    const rows = await this.db
      .select({
        id: childProfiles.id,
        nickname: childProfiles.nickname,
        avatarKey: childProfiles.avatarKey,
        colorKey: childProfiles.colorKey,
        title: childProfiles.title,
        availableStars: childProfiles.availableStars,
        firstRunDone: childProfiles.firstRunDone,
      })
      .from(childProfiles)
      .where(and(eq(childProfiles.familyAccountId, familyAccountId), isNull(childProfiles.archivedAt)))
      .orderBy(asc(childProfiles.sortOrder), asc(childProfiles.createdAt));

    return rows;
  }

  async createChild(
    familyAccountId: string,
    input: { nickname: string; avatarKey?: string; colorKey?: string; sortOrder?: number },
  ): Promise<FamilyChildSummary> {
    const loginId = `BUBU${FamilyService.randomCode(6)}`;
    const [row] = await this.db
      .insert(childProfiles)
      .values({
        familyAccountId,
        loginId,
        // 初始密码：家长首次交接时重设；此处随机，避免空密码
        passwordHash: `init:${crypto.randomBytes(16).toString('hex')}`,
        mustChangePassword: true,
        nickname: input.nickname,
        avatarKey: input.avatarKey ?? 'rabbit',
        colorKey: input.colorKey ?? 'a',
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();

    return {
      id: row.id,
      nickname: row.nickname,
      avatarKey: row.avatarKey,
      colorKey: row.colorKey,
      title: row.title,
      availableStars: row.availableStars,
      firstRunDone: row.firstRunDone,
    };
  }
}
