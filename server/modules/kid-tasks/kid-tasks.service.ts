import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { childProfiles, taskCheckins, tasks } from '@server/database/appSchema';
import { StarsService } from '../stars/stars.service';
import { localDateString, weekStartString } from '../kid-home/kid-home.service';

export interface CheckinInput {
  childId: string;
  taskId: string;
  note?: string;
  media?: unknown[];
  /** 前端生成的幂等键；不传时后端按 child+task+日期 兜底 */
  idempotencyKey?: string;
  source?: 'kid' | 'parent_confirm' | 'parent_backfill';
}

export interface CheckinResult {
  checkinId: string;
  status: 'done' | 'pending_confirm';
  currentCount: number;
  isAchieved: boolean;
  balance: number;
  starsGranted: number;
  duplicated: boolean;
}

/**
 * 打卡写入（v2）
 *
 * 规则（`docs/最终方案-v2.0.md` D6/D16）：
 * - `need_confirm=true` 的打卡先落 `pending_confirm`，不发星；家长确认后再发
 * - 达标（达到 cycle_target）才发 `star_reward` 颗星，一个周期只发一次（幂等键 = task+periodKey）
 * - 需要拍照（photo_required）但没有 media 时拒绝
 */
@Injectable()
export class KidTasksService {
  private readonly logger = new Logger(KidTasksService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly stars: StarsService,
  ) {}

  /** 当前周期标识：daily=YYYY-MM-DD，weekly=YYYY-Www，monthly=YYYY-MM */
  static periodKeyFor(cycleType: string, d = new Date()): string {
    const day = localDateString(d);
    if (cycleType === 'daily' || cycleType === 'once') return day;
    if (cycleType === 'monthly') return day.slice(0, 7);
    // weekly / weekly_days / custom 一律按周
    const start = weekStartString(d);
    const dt = new Date(`${start}T00:00:00Z`);
    const year = dt.getUTCFullYear();
    const jan1 = Date.UTC(year, 0, 1);
    const week = Math.floor((dt.getTime() - jan1) / (7 * 86400000)) + 1;
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  async checkin(input: CheckinInput): Promise<CheckinResult> {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, input.taskId), eq(tasks.childId, input.childId)))
      .limit(1);

    if (!task) throw new NotFoundException('TASK_NOT_FOUND');
    if (!task.isActive) throw new BadRequestException('TASK_INACTIVE');

    const isParentSource = (input.source ?? 'kid') !== 'kid';
    const needsPhoto = task.photoRequired && (input.media?.length ?? 0) === 0;
    if (needsPhoto) throw new BadRequestException('PHOTO_REQUIRED');

    const localDate = localDateString();
    const periodKey = KidTasksService.periodKeyFor(task.cycleType);
    const idem =
      input.idempotencyKey ?? `checkin:${task.id}:${localDate}:${task.currentCount + 1}`;

    // 需要家长确认且不是家长代填 → 挂起
    const pending = task.needConfirm && !isParentSource;
    const status: CheckinResult['status'] = pending ? 'pending_confirm' : 'done';

    const [checkin] = await this.db
      .insert(taskCheckins)
      .values({
        childId: input.childId,
        taskId: task.id,
        delta: 1,
        localDate,
        periodKey,
        media: input.media ?? [],
        mediaPending: false,
        mediaSource: (input.media?.length ?? 0) > 0 ? 'camera' : null,
        status,
        note: input.note,
        source: input.source ?? 'kid',
        idempotencyKey: idem,
      })
      .returning();

    // 现算本周期完成次数（不信任 current_count 缓存）
    const [countRow] = await this.db
      .select({ n: sql<number>`coalesce(sum(${taskCheckins.delta}), 0)`.mapWith(Number) })
      .from(taskCheckins)
      .where(
        and(
          eq(taskCheckins.taskId, task.id),
          eq(taskCheckins.periodKey, periodKey),
          sql`${taskCheckins.status} <> 'rejected'`,
        ),
      );
    const currentCount = countRow?.n ?? 0;
    const isAchieved = currentCount >= task.cycleTarget;

    await this.db
      .update(tasks)
      .set({ currentCount, periodKey, isAchieved, achievedAt: isAchieved ? new Date() : task.achievedAt, updatedAt: new Date() })
      .where(eq(tasks.id, task.id));

    // 发星：达标 + 已确认（非挂起）
    let starsGranted = 0;
    let balance = await this.stars.balance(input.childId);
    if (isAchieved && status === 'done') {
      const [child] = await this.db
        .select({ familyAccountId: childProfiles.familyAccountId })
        .from(childProfiles)
        .where(eq(childProfiles.id, input.childId))
        .limit(1);
      if (!child) throw new NotFoundException('CHILD_NOT_FOUND');

      const res = await this.stars.grant({
        childId: input.childId,
        familyAccountId: child.familyAccountId,
        amount: task.starReward,
        reason: 'task',
        title: task.name,
        refTable: 'tasks',
        refId: task.id,
        idempotencyKey: `task-achieve:${task.id}:${periodKey}`,
        localDate,
      });
      starsGranted = res.duplicated ? 0 : res.amount;
      balance = res.balance;
    }

    return {
      checkinId: checkin.id,
      status,
      currentCount,
      isAchieved,
      balance,
      starsGranted,
      duplicated: false,
    };
  }

  /** 家长确认一条挂起的打卡：状态转 done，若达标则发星 */
  async confirm(childId: string, checkinId: string, operator?: string): Promise<CheckinResult> {
    const [checkin] = await this.db
      .select()
      .from(taskCheckins)
      .where(and(eq(taskCheckins.id, checkinId), eq(taskCheckins.childId, childId)))
      .limit(1);
    if (!checkin) throw new NotFoundException('CHECKIN_NOT_FOUND');
    if (checkin.status !== 'pending_confirm') throw new BadRequestException('CHECKIN_NOT_PENDING');

    await this.db
      .update(taskCheckins)
      .set({ status: 'done', confirmedBy: operator ?? null, confirmedAt: new Date() })
      .where(eq(taskCheckins.id, checkinId));

    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, checkin.taskId)).limit(1);
    if (!task) throw new NotFoundException('TASK_NOT_FOUND');

    const [countRow] = await this.db
      .select({ n: sql<number>`coalesce(sum(${taskCheckins.delta}), 0)`.mapWith(Number) })
      .from(taskCheckins)
      .where(
        and(
          eq(taskCheckins.taskId, task.id),
          eq(taskCheckins.periodKey, checkin.periodKey),
          sql`${taskCheckins.status} <> 'rejected'`,
        ),
      );
    const currentCount = countRow?.n ?? 0;
    const isAchieved = currentCount >= task.cycleTarget;

    let starsGranted = 0;
    let balance = await this.stars.balance(childId);
    if (isAchieved) {
      const [child] = await this.db
        .select({ familyAccountId: childProfiles.familyAccountId })
        .from(childProfiles)
        .where(eq(childProfiles.id, childId))
        .limit(1);
      if (!child) throw new NotFoundException('CHILD_NOT_FOUND');
      const res = await this.stars.grant({
        childId,
        familyAccountId: child.familyAccountId,
        amount: task.starReward,
        reason: 'task',
        title: task.name,
        refTable: 'tasks',
        refId: task.id,
        idempotencyKey: `task-achieve:${task.id}:${checkin.periodKey}`,
        localDate: checkin.localDate,
      });
      starsGranted = res.duplicated ? 0 : res.amount;
      balance = res.balance;
    }

    return {
      checkinId,
      status: 'done',
      currentCount,
      isAchieved,
      balance,
      starsGranted,
      duplicated: false,
    };
  }

  /** 家长驳回：状态转 rejected，计数不计入 */
  async reject(childId: string, checkinId: string): Promise<{ ok: true }> {
    const [checkin] = await this.db
      .select()
      .from(taskCheckins)
      .where(and(eq(taskCheckins.id, checkinId), eq(taskCheckins.childId, childId)))
      .limit(1);
    if (!checkin) throw new NotFoundException('CHECKIN_NOT_FOUND');
    if (checkin.status === 'rejected') return { ok: true };
    if (checkin.status !== 'pending_confirm') throw new ForbiddenException('CHECKIN_NOT_PENDING');
    await this.db.update(taskCheckins).set({ status: 'rejected' }).where(eq(taskCheckins.id, checkinId));
    return { ok: true };
  }

  /** 首页「待确认」列表（家长端用） */
  async listPending(childId: string) {
    const rows = await this.db
      .select({
        id: taskCheckins.id,
        taskId: taskCheckins.taskId,
        localDate: taskCheckins.localDate,
        note: taskCheckins.note,
        media: taskCheckins.media,
        createdAt: taskCheckins.createdAt,
        taskName: tasks.name,
      })
      .from(taskCheckins)
      .innerJoin(tasks, eq(tasks.id, taskCheckins.taskId))
      .where(and(eq(taskCheckins.childId, childId), eq(taskCheckins.status, 'pending_confirm')))
      .orderBy(taskCheckins.createdAt);

    return rows;
  }

  /** 幂等键兜底：同一孩子同一天同一任务的最后一次打卡 */
  async lastCheckin(childId: string, taskId: string) {
    const [row] = await this.db
      .select()
      .from(taskCheckins)
      .where(
        and(
          eq(taskCheckins.childId, childId),
          eq(taskCheckins.taskId, taskId),
          isNull(taskCheckins.confirmedAt),
        ),
      )
      .orderBy(sql`${taskCheckins.createdAt} desc`)
      .limit(1);
    return row ?? null;
  }
}
