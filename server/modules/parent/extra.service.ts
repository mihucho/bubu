import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from 'drizzle-orm';
import {
  auditLogs,
  childProfiles,
  consents,
  exchangeRecords,
  exerciseRecords,
  familyAccounts,
  familyMembers,
  moodRecords,
  readingRecords,
  taskCheckins,
  tasks,
  wishItems,
} from '@server/database/appSchema';
import { localDateString } from '../kid-home/kid-home.service';

/** 搜索：家长端跨孩子找任务 / 心愿 / 商品（只读） */
@Injectable()
export class ParentSearchService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async search(familyAccountId: string, keyword: string) {
    const q = (keyword ?? '').trim();
    if (!q) throw new BadRequestException('KEYWORD_REQUIRED');
    const like = `%${q}%`;

    const taskRows = await this.db
      .select({
        id: tasks.id,
        name: tasks.name,
        childId: tasks.childId,
        childName: childProfiles.nickname,
      })
      .from(tasks)
      .innerJoin(childProfiles, eq(childProfiles.id, tasks.childId))
      .where(and(eq(tasks.familyAccountId, familyAccountId), ilike(tasks.name, like)))
      .limit(20);

    const wishRows = await this.db
      .select({
        id: wishItems.id,
        title: wishItems.title,
        status: wishItems.status,
        childId: wishItems.childId,
        childName: childProfiles.nickname,
      })
      .from(wishItems)
      .innerJoin(childProfiles, eq(childProfiles.id, wishItems.childId))
      .where(and(eq(wishItems.familyAccountId, familyAccountId), ilike(wishItems.title, like)))
      .limit(20);

    return {
      keyword: q,
      tasks: taskRows,
      wishes: wishRows,
      total: taskRows.length + wishRows.length,
    };
  }
}

/** 导出预览：只给「会导出什么」，不直接下发文件（图片导出在客户端画） */
@Injectable()
export class ParentExportService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async preview(childId: string, days = 7) {
    const end = localDateString();
    const startDate = new Date(`${end}T00:00:00Z`);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    const start = startDate.toISOString().slice(0, 10);

    const [child] = await this.db
      .select({ nickname: childProfiles.nickname, familyAccountId: childProfiles.familyAccountId })
      .from(childProfiles)
      .where(eq(childProfiles.id, childId))
      .limit(1);
    if (!child) throw new NotFoundException('CHILD_NOT_FOUND');

    const [family] = await this.db
      .select({ exportEnabled: familyAccounts.exportEnabled })
      .from(familyAccounts)
      .where(eq(familyAccounts.id, child.familyAccountId))
      .limit(1);

    const checkins = await this.db
      .select({ taskName: tasks.name, localDate: taskCheckins.localDate, status: taskCheckins.status })
      .from(taskCheckins)
      .innerJoin(tasks, eq(tasks.id, taskCheckins.taskId))
      .where(
        and(
          eq(taskCheckins.childId, childId),
          gte(taskCheckins.localDate, start),
          lte(taskCheckins.localDate, end),
          sql`${taskCheckins.status} <> 'rejected'`,
        ),
      )
      .orderBy(desc(taskCheckins.localDate))
      .limit(50);

    const [reading] = await this.db
      .select({ minutes: sql<number>`coalesce(sum(${readingRecords.minutes}), 0)`.mapWith(Number) })
      .from(readingRecords)
      .where(and(eq(readingRecords.childId, childId), gte(readingRecords.localDate, start)));

    const [exercise] = await this.db
      .select({ times: sql<number>`count(*)`.mapWith(Number) })
      .from(exerciseRecords)
      .where(and(eq(exerciseRecords.childId, childId), gte(exerciseRecords.localDate, start)));

    const moods = await this.db
      .select({ localDate: moodRecords.localDate, emotionKey: moodRecords.emotionKey })
      .from(moodRecords)
      .where(and(eq(moodRecords.childId, childId), gte(moodRecords.localDate, start)))
      .limit(20);

    const exchanges = await this.db
      .select({ itemName: exchangeRecords.itemName, starCost: exchangeRecords.starCost, createdAt: exchangeRecords.createdAt })
      .from(exchangeRecords)
      .where(eq(exchangeRecords.childId, childId))
      .orderBy(desc(exchangeRecords.createdAt))
      .limit(10);

    return {
      allowed: family?.exportEnabled ?? false,
      childName: child.nickname,
      range: { start, end },
      checkins,
      readingMinutes: reading?.minutes ?? 0,
      exerciseTimes: exercise?.times ?? 0,
      moods,
      exchanges,
    };
  }
}

/** 隐私与账号：文档版本、同意记录、注销（软删 + 7 天只读） */
@Injectable()
export class ParentAccountService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  privacyDoc() {
    return {
      version: '1.2',
      updatedAt: '2026-10-01',
      sections: [
        {
          title: '我们收集什么',
          body: '孩子的昵称、头像、任务与打卡记录、阅读与运动时长、心情记录、与布布的对话。不收集定位、通讯录、相册以外的任何信息。',
        },
        {
          title: '怎么用',
          body: '只用于给孩子展示进度、给家长做周期报告。不做排名，不投向任何第三方广告。',
        },
        {
          title: '谁能看到',
          body: '本家庭的家长成员。日记与对话全文是否可见，由「我的 → 边界」里的开关决定；关掉后家长只能看到统计，看不到内容。',
        },
        {
          title: '保存多久',
          body: '账号存续期间保存。注销后立即停用，7 天内只读，之后清除孩子档案与记录。',
        },
        {
          title: '孩子的权利',
          body: '孩子可以随时删除自己的心愿、改动密码；家长可以导出全部记录。',
        },
      ],
    };
  }

  async consentTrail(familyAccountId: string) {
    const rows = await this.db
      .select({
        kind: consents.kind,
        version: consents.consentVersion,
        grantedAt: consents.grantedAt,
        revokedAt: consents.revokedAt,
      })
      .from(consents)
      .where(eq(consents.familyAccountId, familyAccountId))
      .orderBy(desc(consents.grantedAt));
    return rows;
  }

  /** 记录一次同意（引导第 1 步会调用） */
  async grantConsent(familyAccountId: string, version: string, kind = 'guardian') {
    const [row] = await this.db
      .insert(consents)
      .values({ familyAccountId, consentVersion: version, kind })
      .returning();
    return { id: row.id };
  }

  /** 注销：只允许 owner，且必须显式传 confirm */
  async requestDeletion(familyAccountId: string, operatorId: string, confirm: string) {
    if (confirm !== 'DELETE') throw new BadRequestException('CONFIRM_REQUIRED');

    const [owner] = await this.db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(and(eq(familyMembers.familyAccountId, familyAccountId), eq(familyMembers.role, 'owner')))
      .limit(1);
    if (!owner) throw new NotFoundException('OWNER_NOT_FOUND');
    if (owner.id !== operatorId) throw new BadRequestException('ONLY_OWNER_CAN_DELETE');

    // 关闭该家庭下所有孩子档案（软删；7 天后由运维任务物理清理）
    await this.db
      .update(childProfiles)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(childProfiles.familyAccountId, familyAccountId), isNull(childProfiles.archivedAt)));

    await this.db.insert(auditLogs).values({
      familyAccountId,
      actor: operatorId,
      action: 'child.archive',
      targetTable: 'family_accounts',
      targetId: familyAccountId,
      diff: { reason: 'account_deletion_requested' },
      localDate: localDateString(),
    });

    return { ok: true, readonlyUntilDays: 7 };
  }
}
