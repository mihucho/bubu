import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  badges,
  childBadges,
  childProfiles,
  messages,
  questAttempts,
  starLedger,
  wrongQuestions,
} from '@server/database/appSchema';
import { StarsService } from '../stars/stars.service';
import { localDateString } from '../kid-home/kid-home.service';

export interface QuestDto {
  id: string;
  subject: string;
  title: string;
  photos: unknown[];
  errorReason: string | null;
  status: string;
  attemptCount: number;
  localDate: string;
}

export interface BadgeDto {
  id: string;
  name: string;
  iconKey: string;
  praiseText: string | null;
  starReward: number;
  earnedAt: string | null;
  ruleType: string;
}

@Injectable()
export class KidQuestService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly stars: StarsService,
  ) {}

  /** 闯关列表：孩子在「我的关卡」里看到自己的错题 */
  async listQuests(childId: string): Promise<QuestDto[]> {
    const rows = await this.db
      .select()
      .from(wrongQuestions)
      .where(eq(wrongQuestions.childId, childId))
      .orderBy(asc(wrongQuestions.status), desc(wrongQuestions.createdAt));

    return rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      title: r.title,
      photos: Array.isArray(r.photos) ? r.photos : [],
      errorReason: r.errorReason,
      status: r.status,
      attemptCount: r.attemptCount,
      localDate: r.localDate,
    }));
  }

  /** 重做一次：pass 则通关（mastered），首次通关发星 */
  async attempt(childId: string, questId: string, result: 'pass' | 'fail') {
    const [quest] = await this.db
      .select()
      .from(wrongQuestions)
      .where(and(eq(wrongQuestions.id, questId), eq(wrongQuestions.childId, childId)))
      .limit(1);
    if (!quest) throw new NotFoundException('QUEST_NOT_FOUND');
    if (result !== 'pass' && result !== 'fail') throw new BadRequestException('RESULT_INVALID');

    const localDate = localDateString();
    const [child] = await this.db
      .select({ familyAccountId: childProfiles.familyAccountId })
      .from(childProfiles)
      .where(eq(childProfiles.id, childId))
      .limit(1);
    if (!child) throw new NotFoundException('CHILD_NOT_FOUND');

    const firstMaster = result === 'pass' && quest.status !== 'mastered';

    await this.db.insert(questAttempts).values({
      childId,
      questId,
      result,
      localDate,
      starred: firstMaster,
      idempotencyKey: `quest:${childId}:${questId}:${localDate}:${Date.now()}`,
    });

    await this.db
      .update(wrongQuestions)
      .set({
        attemptCount: quest.attemptCount + 1,
        status: result === 'pass' ? 'mastered' : quest.status,
        masteredAt: result === 'pass' ? new Date() : quest.masteredAt,
        updatedAt: new Date(),
      })
      .where(eq(wrongQuestions.id, questId));

    let starsGranted = 0;
    let balance = await this.stars.balance(childId);
    if (firstMaster) {
      const res = await this.stars.grant({
        childId,
        familyAccountId: child.familyAccountId,
        amount: 2,
        reason: 'quest',
        title: `通关：${quest.title}`,
        refTable: 'wrong_questions',
        refId: questId,
        idempotencyKey: `quest-master:${questId}`,
        localDate,
      });
      starsGranted = res.duplicated ? 0 : res.amount;
      balance = res.balance;
    }

    return {
      result,
      mastered: result === 'pass',
      starsGranted,
      balance,
      message: result === 'pass' ? (firstMaster ? '通关啦，星星 +2' : '又通关一次') : '没关系，再来一次就好',
    };
  }

  /** 新增关卡（家长在编辑页也能用，孩子端允许拍照建关） */
  async createQuest(
    childId: string,
    input: { subject: string; title: string; photos?: unknown[]; errorReason?: string },
  ) {
    const title = (input.title ?? '').trim();
    if (!title) throw new BadRequestException('TITLE_REQUIRED');
    const [child] = await this.db
      .select({ familyAccountId: childProfiles.familyAccountId })
      .from(childProfiles)
      .where(eq(childProfiles.id, childId))
      .limit(1);
    if (!child) throw new NotFoundException('CHILD_NOT_FOUND');

    const [row] = await this.db
      .insert(wrongQuestions)
      .values({
        childId,
        familyAccountId: child.familyAccountId,
        subject: input.subject || '数学',
        title: title.slice(0, 60),
        photos: input.photos ?? [],
        errorReason: input.errorReason,
        localDate: localDateString(),
        createdBy: 'kid',
      })
      .returning();
    return { id: row.id, title: row.title };
  }
}

@Injectable()
export class KidBadgeService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly stars: StarsService,
  ) {}

  /** 孩子端徽章墙：系统徽章 + 自己拿到的（隐藏的不给看） */
  async wall(childId: string): Promise<BadgeDto[]> {
    const all = await this.db
      .select()
      .from(badges)
      .where(isNull(badges.familyAccountId));

    const custom = await this.db
      .select()
      .from(badges)
      .where(eq(badges.childId, childId));

    const earned = await this.db
      .select()
      .from(childBadges)
      .where(and(eq(childBadges.childId, childId), eq(childBadges.isHidden, false)));

    const earnedMap = new Map(earned.map((e) => [e.badgeId, e.awardedAt]));

    return [...all, ...custom]
      .filter((b) => !b.isHidden)
      .map((b) => ({
        id: b.id,
        name: b.name,
        iconKey: b.iconKey,
        praiseText: b.praiseText,
        starReward: b.starReward,
        ruleType: b.ruleType,
        earnedAt: earnedMap.get(b.id)?.toISOString() ?? null,
      }));
  }

  /**
   * 检查并颁发「自动规则」徽章。
   * 目前覆盖 stars（累计星星）/ streak（连续天数）/ task_count（任务累计），manual 不参与。
   */
  async evaluate(childId: string) {
    const [child] = await this.db.select().from(childProfiles).where(eq(childProfiles.id, childId)).limit(1);
    if (!child) throw new NotFoundException('CHILD_NOT_FOUND');

    const rules = await this.db
      .select()
      .from(badges)
      .where(eq(badges.childId, childId));

    const earned = await this.db
      .select({ badgeId: childBadges.badgeId })
      .from(childBadges)
      .where(eq(childBadges.childId, childId));
    const earnedSet = new Set(earned.map((e) => e.badgeId));

    const [ledger] = await this.db
      .select({ total: sql<number>`coalesce(sum(case when ${starLedger.amount} > 0 then ${starLedger.amount} else 0 end), 0)`.mapWith(Number) })
      .from(starLedger)
      .where(eq(starLedger.childId, childId));

    const granted: string[] = [];
    for (const rule of rules) {
      if (earnedSet.has(rule.id) || rule.ruleType === 'manual') continue;
      const cfg = (rule.ruleConfig ?? {}) as Record<string, unknown>;
      const n = Number(cfg.n ?? 0);
      let hit = false;

      if (rule.ruleType === 'stars') hit = (ledger?.total ?? 0) >= n;
      else if (rule.ruleType === 'streak') hit = Math.max(child.readingStreak, child.exerciseStreak) >= n;
      else if (rule.ruleType === 'task_count') hit = child.totalStars >= n; // 近似：累计星数代任务量

      if (!hit) continue;

      await this.db.insert(childBadges).values({
        childId,
        badgeId: rule.id,
        progressSnapshot: { total: ledger?.total ?? 0, streak: Math.max(child.readingStreak, child.exerciseStreak) },
      });
      if (rule.starReward > 0) {
        await this.stars.grant({
          childId,
          familyAccountId: child.familyAccountId,
          amount: rule.starReward,
          reason: 'quest',
          title: `徽章：${rule.name}`,
          refTable: 'badges',
          refId: rule.id,
          idempotencyKey: `badge:${childId}:${rule.id}`,
          localDate: localDateString(),
        });
      }
      granted.push(rule.name);
    }

    return { granted };
  }
}

@Injectable()
export class MessageService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /** 孩子端小信箱：只有发给自己的 */
  async kidInbox(childId: string) {
    const rows = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.childId, childId), eq(messages.toRole, 'kid')))
      .orderBy(desc(messages.createdAt))
      .limit(50);
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** 家长端通知中心 */
  async parentInbox(familyAccountId: string) {
    const rows = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.familyAccountId, familyAccountId), eq(messages.toRole, 'parent')))
      .orderBy(desc(messages.createdAt))
      .limit(50);
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async markRead(id: string) {
    await this.db.update(messages).set({ readAt: new Date() }).where(eq(messages.id, id));
    return { ok: true };
  }

  /** 家长给孩子留一句话（鼓励，≤40 字） */
  async sendNote(input: {
    familyAccountId: string;
    childId: string;
    fromUser?: string;
    body: string;
  }) {
    const body = (input.body ?? '').trim();
    if (!body) throw new BadRequestException('BODY_REQUIRED');
    if (body.length > 40) throw new BadRequestException('BODY_TOO_LONG');

    const [row] = await this.db
      .insert(messages)
      .values({
        familyAccountId: input.familyAccountId,
        childId: input.childId,
        toRole: 'kid',
        kind: 'parent_note',
        title: '妈妈给你留了一句话',
        body,
        fromUser: input.fromUser ?? null,
      })
      .returning();
    return { id: row.id };
  }

  /** 系统消息（打卡待确认、报告生成等） */
  async system(input: {
    familyAccountId: string;
    childId?: string;
    toRole: 'kid' | 'parent';
    kind: string;
    title: string;
    body?: string;
    refTable?: string;
    refId?: string;
  }) {
    await this.db.insert(messages).values({
      familyAccountId: input.familyAccountId,
      childId: input.childId,
      toRole: input.toRole,
      kind: input.kind,
      title: input.title,
      body: input.body,
      refTable: input.refTable,
      refId: input.refId,
    });
  }
}
