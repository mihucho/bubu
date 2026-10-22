/**
 * 布布 · 应用数据模型（32 表）
 *
 * 唯一依据：`docs/数据模型设计-v2.md`。本文件是**手写**的应用模型，
 * 与平台生成物 `server/database/schema.ts` 分开存放：
 *   - `schema.ts`  — 平台 `gen:db-schema` 生成，旧 12 表，不手改
 *   - `appSchema.ts` — 新模型（本文件），服务层一律从这里 import
 *
 * 铁律（`docs/数据模型设计-v2.md §1`）：
 *   1. 星星只能经 `stars.service.ts` 写 `star_ledger`，`child_profiles.available_stars` 只是缓存
 *   2. 派生数据不存字段（达成率、连续天数以外的统计一律现算）
 *   3. 孩子端零比较：本模型的查询不得出现跨孩子排序
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

const id = () => uuid('id').primaryKey().defaultRandom();
const now = () => timestamptz('created_at').defaultNow().notNull();
const updated = () => timestamptz('updated_at').defaultNow().notNull();

/* ============================================================
   1. 家庭与家长
   ============================================================ */

export const familyAccounts = pgTable('family_accounts', {
  id: id(),
  account: varchar('account', { length: 50 }).notNull().unique(),
  doubaoUserId: varchar('doubao_user_id', { length: 64 }).unique(),
  doubaoBoundAt: timestamptz('doubao_bound_at'),
  loginProvider: varchar('login_provider', { length: 12 }).default('phone').notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  parentDisplayName: varchar('parent_display_name', { length: 20 }).default('妈妈').notNull(),
  parentPinHash: varchar('parent_pin_hash', { length: 255 }),
  parentPinSetAt: timestamptz('parent_pin_set_at'),
  weekStartDay: smallint('week_start_day').default(1).notNull(),
  timezone: varchar('timezone', { length: 40 }).default('Asia/Shanghai').notNull(),
  dailyLimitMinutes: smallint('daily_limit_minutes').default(40).notNull(),
  restIntervalMinutes: smallint('rest_interval_minutes').default(20).notNull(),
  restDurationMinutes: smallint('rest_duration_minutes').default(5).notNull(),
  sleepStart: time('sleep_start').default('21:00').notNull(),
  sleepEnd: time('sleep_end').default('07:00').notNull(),
  dailyDigestTime: time('daily_digest_time').default('20:00').notNull(),
  quietStart: time('quiet_start').default('22:00').notNull(),
  quietEnd: time('quiet_end').default('07:00').notNull(),
  remindConfirm: boolean('remind_confirm').default(true).notNull(),
  remindWish: boolean('remind_wish').default(true).notNull(),
  remindSafety: boolean('remind_safety').default(true).notNull(),
  remindReport: boolean('remind_report').default(false).notNull(),
  diaryParentVisible: boolean('diary_parent_visible').default(true).notNull(),
  aiFulltextVisible: boolean('ai_fulltext_visible').default(true).notNull(),
  exportEnabled: boolean('export_enabled').default(true).notNull(),
  mergedIntoId: uuid('merged_into_id'),
  mergedAt: timestamptz('merged_at'),
  setupStep: varchar('setup_step', { length: 20 }).default('consent').notNull(),
  setupCompletedAt: timestamptz('setup_completed_at'),
  lastLoginAt: timestamptz('last_login_at'),
  createdAt: now(),
  updatedAt: updated(),
});

export const familyMembers = pgTable(
  'family_members',
  {
    id: id(),
    familyAccountId: uuid('family_account_id').notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    doubaoUserId: varchar('doubao_user_id', { length: 64 }),
    displayName: varchar('display_name', { length: 20 }).default('妈妈').notNull(),
    role: varchar('role', { length: 12 }).default('member').notNull(),
    joinedAt: timestamptz('joined_at').defaultNow().notNull(),
    lastLoginAt: timestamptz('last_login_at'),
  },
  (t) => [
    uniqueIndex('uq_family_members_phone').on(t.phone),
    uniqueIndex('uq_family_members_doubao').on(t.doubaoUserId),
    index('idx_family_members_family').on(t.familyAccountId),
  ],
);

export const parentInvites = pgTable(
  'parent_invites',
  {
    id: id(),
    familyAccountId: uuid('family_account_id').notNull(),
    code: varchar('code', { length: 8 }).notNull(),
    createdBy: uuid('created_by').notNull(),
    expiresAt: timestamptz('expires_at').notNull(),
    usedBy: uuid('used_by'),
    usedAt: timestamptz('used_at'),
    createdAt: now(),
  },
  (t) => [uniqueIndex('uq_parent_invites_code').on(t.code)],
);

export const consents = pgTable('consents', {
  id: id(),
  familyAccountId: uuid('family_account_id').notNull(),
  consentVersion: varchar('consent_version', { length: 20 }).notNull(),
  kind: varchar('kind', { length: 20 }).notNull(),
  grantedAt: timestamptz('granted_at').defaultNow().notNull(),
  revokedAt: timestamptz('revoked_at'),
  ip: varchar('ip', { length: 64 }),
  userAgent: text('user_agent'),
});

/* ============================================================
   2. 孩子
   ============================================================ */

export const childProfiles = pgTable(
  'child_profiles',
  {
    id: id(),
    familyAccountId: uuid('family_account_id').notNull(),
    loginId: varchar('login_id', { length: 16 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    mustChangePassword: boolean('must_change_password').default(true).notNull(),
    passwordChangedAt: timestamptz('password_changed_at'),
    nickname: varchar('nickname', { length: 20 }).notNull(),
    avatarKey: varchar('avatar_key', { length: 40 }).default('rabbit').notNull(),
    avatarFile: text('avatar_file'),
    birthYear: smallint('birth_year'),
    ageBand: varchar('age_band', { length: 10 }).default('mid').notNull(),
    colorKey: varchar('color_key', { length: 10 }).default('a').notNull(),
    title: varchar('title', { length: 20 }).default('小花朵').notNull(),
    aiPersonaName: varchar('ai_persona_name', { length: 20 }),
    aiPersonaAvatarKey: varchar('ai_persona_avatar_key', { length: 40 }),
    /** 缓存：唯一真相是 star_ledger */
    availableStars: integer('available_stars').default(0).notNull(),
    totalStars: integer('total_stars').default(0).notNull(),
    readingPoints: integer('reading_points').default(0).notNull(),
    readingStreak: integer('reading_streak').default(0).notNull(),
    exerciseStreak: integer('exercise_streak').default(0).notNull(),
    taskViewMode: varchar('task_view_mode', { length: 10 }).default('list').notNull(),
    petName: varchar('pet_name', { length: 20 }).default('小黄油').notNull(),
    petType: varchar('pet_type', { length: 20 }).default('dog').notNull(),
    petHunger: integer('pet_hunger').default(80).notNull(),
    petClean: integer('pet_clean').default(80).notNull(),
    petMood: integer('pet_mood').default(80).notNull(),
    firstRunDone: boolean('first_run_done').default(false).notNull(),
    sortOrder: smallint('sort_order').default(0).notNull(),
    archivedAt: timestamptz('archived_at'),
    createdAt: now(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex('uq_child_login_id').on(t.loginId),
    index('idx_child_family').on(t.familyAccountId, t.sortOrder),
  ],
);

/* ============================================================
   3. 任务与打卡
   ============================================================ */

export const tasks = pgTable(
  'tasks',
  {
    id: id(),
    childId: uuid('child_id').notNull(),
    familyAccountId: uuid('family_account_id').notNull(),
    name: varchar('name', { length: 60 }).notNull(),
    iconKey: varchar('icon_key', { length: 40 }).default('book').notNull(),
    iconFile: text('icon_file'),
    color: varchar('color', { length: 10 }).default('pink').notNull(),
    cycleType: varchar('cycle_type', { length: 12 }).default('daily').notNull(),
    cycleTarget: integer('cycle_target').default(1).notNull(),
    cycleWeekdays: smallint('cycle_weekdays').array(),
    startDate: date('start_date'),
    endDate: date('end_date'),
    pausedUntil: date('paused_until'),
    currentCount: integer('current_count').default(0).notNull(),
    starReward: integer('star_reward').default(1).notNull(),
    photoVisible: boolean('photo_visible').default(true).notNull(),
    photoRequired: boolean('photo_required').default(false).notNull(),
    needConfirm: boolean('need_confirm').default(false).notNull(),
    sortOrder: smallint('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    periodKey: varchar('period_key', { length: 12 }).notNull(),
    isAchieved: boolean('is_achieved').default(false).notNull(),
    achievedAt: timestamptz('achieved_at'),
    createdAt: now(),
    updatedAt: updated(),
  },
  (t) => [index('idx_tasks_child_active').on(t.childId, t.isActive, t.sortOrder)],
);

export const taskCheckins = pgTable(
  'task_checkins',
  {
    id: id(),
    childId: uuid('child_id').notNull(),
    taskId: uuid('task_id').notNull(),
    delta: integer('delta').default(1).notNull(),
    localDate: date('local_date').notNull(),
    periodKey: varchar('period_key', { length: 12 }).notNull(),
    media: jsonb('media').$type<unknown[]>().default([]).notNull(),
    mediaPending: boolean('media_pending').default(false).notNull(),
    mediaSource: varchar('media_source', { length: 10 }),
    status: varchar('status', { length: 12 }).default('done').notNull(),
    confirmedBy: uuid('confirmed_by'),
    confirmedAt: timestamptz('confirmed_at'),
    note: varchar('note', { length: 200 }),
    source: varchar('source', { length: 12 }).default('kid').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 64 }),
    createdAt: now(),
  },
  (t) => [
    index('idx_checkins_child_date').on(t.childId, t.localDate),
    uniqueIndex('uq_checkins_idem').on(t.idempotencyKey),
  ],
);

export const eggTasks = pgTable('egg_tasks', {
  id: id(),
  childId: uuid('child_id').notNull(),
  familyAccountId: uuid('family_account_id').notNull(),
  name: varchar('name', { length: 40 }).notNull(),
  iconKey: varchar('icon_key', { length: 40 }).default('egg').notNull(),
  starReward: integer('star_reward').default(1).notNull(),
  sortOrder: smallint('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const eggOpens = pgTable(
  'egg_opens',
  {
    id: id(),
    childId: uuid('child_id').notNull(),
    eggTaskId: uuid('egg_task_id').notNull(),
    localDate: date('local_date').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 64 }),
    createdAt: now(),
  },
  (t) => [uniqueIndex('uq_egg_open_day').on(t.childId, t.eggTaskId, t.localDate)],
);

/* ============================================================
   4. 记录类
   ============================================================ */

export const moodRecords = pgTable('mood_records', {
  id: id(),
  childId: uuid('child_id').notNull(),
  emotionKey: varchar('emotion_key', { length: 12 }).notNull(),
  content: text('content'),
  starReward: integer('star_reward').default(2).notNull(),
  localDate: date('local_date').notNull(),
  starsGranted: boolean('stars_granted').default(false).notNull(),
  media: jsonb('media').$type<unknown[]>().default([]).notNull(),
  createdAt: now(),
});

export const readingRecords = pgTable('reading_records', {
  id: id(),
  childId: uuid('child_id').notNull(),
  minutes: integer('minutes').notNull(),
  pointsEarned: integer('points_earned').notNull(),
  bookTitle: varchar('book_title', { length: 80 }),
  localDate: date('local_date').notNull(),
  createdAt: now(),
});

export const exerciseRecords = pgTable('exercise_records', {
  id: id(),
  childId: uuid('child_id').notNull(),
  exerciseType: varchar('exercise_type', { length: 30 }).notNull(),
  minutes: integer('minutes').notNull(),
  photo: jsonb('photo').$type<unknown>(),
  localDate: date('local_date').notNull(),
  createdAt: now(),
});

export const readingTracker = pgTable('reading_tracker', {
  id: id(),
  childId: uuid('child_id').notNull(),
  bookTitle: varchar('book_title', { length: 80 }).notNull(),
  note: text('note'),
  isSeen: boolean('is_seen').default(false).notNull(),
  createdAt: now(),
});

/* ============================================================
   5. 闯关（错题）
   ============================================================ */

export const wrongQuestions = pgTable('wrong_questions', {
  id: id(),
  childId: uuid('child_id').notNull(),
  familyAccountId: uuid('family_account_id').notNull(),
  subject: varchar('subject', { length: 20 }).notNull(),
  title: varchar('title', { length: 120 }).notNull(),
  photos: jsonb('photos').$type<unknown[]>().default([]).notNull(),
  errorReason: text('error_reason'),
  status: varchar('status', { length: 10 }).default('pending').notNull(),
  masteredAt: timestamptz('mastered_at'),
  attemptCount: integer('attempt_count').default(0).notNull(),
  localDate: date('local_date').notNull(),
  createdBy: varchar('created_by', { length: 10 }).default('parent').notNull(),
  createdAt: now(),
  updatedAt: updated(),
});

export const questAttempts = pgTable(
  'quest_attempts',
  {
    id: id(),
    childId: uuid('child_id').notNull(),
    questId: uuid('quest_id').notNull(),
    result: varchar('result', { length: 10 }).notNull(),
    localDate: date('local_date').notNull(),
    starred: boolean('starred').default(false).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 64 }),
    createdAt: now(),
  },
  (t) => [uniqueIndex('uq_quest_idem').on(t.idempotencyKey)],
);

/* ============================================================
   6. 商店 / 心愿 / 星星
   ============================================================ */

export const shopItems = pgTable('shop_items', {
  id: id(),
  childId: uuid('child_id').notNull(),
  familyAccountId: uuid('family_account_id').notNull(),
  name: varchar('name', { length: 40 }).notNull(),
  iconKey: varchar('icon_key', { length: 40 }).default('gift').notNull(),
  iconFile: text('icon_file'),
  starCost: integer('star_cost').notNull(),
  description: varchar('description', { length: 120 }),
  sortOrder: smallint('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: now(),
  updatedAt: updated(),
});

export const exchangeRecords = pgTable(
  'exchange_records',
  {
    id: id(),
    childId: uuid('child_id').notNull(),
    itemId: uuid('item_id'),
    itemName: varchar('item_name', { length: 40 }).notNull(),
    starCost: integer('star_cost').notNull(),
    wishId: uuid('wish_id'),
    status: varchar('status', { length: 10 }).default('done').notNull(),
    refundedAt: timestamptz('refunded_at'),
    idempotencyKey: varchar('idempotency_key', { length: 64 }),
    createdAt: now(),
  },
  (t) => [uniqueIndex('uq_exchange_idem').on(t.idempotencyKey)],
);

export const wishItems = pgTable('wish_items', {
  id: id(),
  childId: uuid('child_id').notNull(),
  familyAccountId: uuid('family_account_id').notNull(),
  title: varchar('title', { length: 60 }).notNull(),
  iconKey: varchar('icon_key', { length: 40 }).default('star').notNull(),
  starCost: integer('star_cost'),
  status: varchar('status', { length: 14 }).default('pending').notNull(),
  isSurprise: boolean('is_surprise').default(false).notNull(),
  expiresAt: date('expires_at'),
  fulfillType: varchar('fulfill_type', { length: 12 }).default('gift').notNull(),
  note: varchar('note', { length: 200 }),
  deferReason: varchar('defer_reason', { length: 200 }),
  createdBy: varchar('created_by', { length: 10 }).default('kid').notNull(),
  pricedAt: timestamptz('priced_at'),
  claimedAt: timestamptz('claimed_at'),
  kidConfirmedAt: timestamptz('kid_confirmed_at'),
  sortOrder: smallint('sort_order').default(0).notNull(),
  createdAt: now(),
  updatedAt: updated(),
});

export const starLedger = pgTable(
  'star_ledger',
  {
    id: id(),
    childId: uuid('child_id').notNull(),
    familyAccountId: uuid('family_account_id').notNull(),
    amount: integer('amount').notNull(),
    reason: varchar('reason', { length: 20 }).notNull(),
    refTable: varchar('ref_table', { length: 30 }),
    refId: uuid('ref_id'),
    title: varchar('title', { length: 60 }),
    balanceAfter: integer('balance_after').notNull(),
    localDate: date('local_date').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 64 }),
    createdAt: now(),
  },
  (t) => [
    uniqueIndex('uq_ledger_idem').on(t.idempotencyKey),
    index('idx_ledger_child_date').on(t.childId, t.localDate),
  ],
);

/* ============================================================
   7. 徽章
   ============================================================ */

export const badges = pgTable('badges', {
  id: id(),
  familyAccountId: uuid('family_account_id'),
  childId: uuid('child_id'),
  name: varchar('name', { length: 16 }).notNull(),
  iconKey: varchar('icon_key', { length: 24 }).notNull(),
  ruleType: varchar('rule_type', { length: 12 }).notNull(),
  ruleConfig: jsonb('rule_config').$type<Record<string, unknown>>().default({}).notNull(),
  starReward: smallint('star_reward').default(0).notNull(),
  praiseText: varchar('praise_text', { length: 60 }),
  createdBy: uuid('created_by'),
  isHidden: boolean('is_hidden').default(false).notNull(),
});

export const childBadges = pgTable(
  'child_badges',
  {
    id: id(),
    childId: uuid('child_id').notNull(),
    badgeId: uuid('badge_id').notNull(),
    awardedAt: timestamptz('awarded_at').defaultNow().notNull(),
    awardedBy: uuid('awarded_by'),
    progressSnapshot: jsonb('progress_snapshot').$type<Record<string, unknown>>().default({}).notNull(),
    isHidden: boolean('is_hidden').default(false).notNull(),
  },
  (t) => [uniqueIndex('uq_child_badge').on(t.childId, t.badgeId)],
);

/* ============================================================
   8. 消息 / 设备 / 使用时长
   ============================================================ */

export const messages = pgTable(
  'messages',
  {
    id: id(),
    childId: uuid('child_id'),
    familyAccountId: uuid('family_account_id').notNull(),
    toRole: varchar('to_role', { length: 10 }).notNull(),
    kind: varchar('kind', { length: 20 }).notNull(),
    title: varchar('title', { length: 60 }).notNull(),
    body: varchar('body', { length: 300 }),
    refTable: varchar('ref_table', { length: 30 }),
    refId: uuid('ref_id'),
    fromUser: uuid('from_user'),
    readAt: timestamptz('read_at'),
    createdAt: now(),
  },
  (t) => [index('idx_messages_inbox').on(t.toRole, t.familyAccountId, t.createdAt)],
);

export const kidDevices = pgTable('kid_devices', {
  id: id(),
  familyAccountId: uuid('family_account_id').notNull(),
  childId: uuid('child_id').notNull(),
  deviceName: varchar('device_name', { length: 40 }).notNull(),
  tokenHash: varchar('token_hash', { length: 128 }).notNull(),
  userAgent: text('user_agent'),
  lastSeenAt: timestamptz('last_seen_at'),
  createdAt: now(),
  revokedAt: timestamptz('revoked_at'),
});

export const pairCodes = pgTable(
  'pair_codes',
  {
    id: id(),
    familyAccountId: uuid('family_account_id').notNull(),
    childId: uuid('child_id').notNull(),
    code: varchar('code', { length: 6 }).notNull(),
    expiresAt: timestamptz('expires_at').notNull(),
    usedAt: timestamptz('used_at'),
    createdBy: uuid('created_by').notNull(),
    createdAt: now(),
  },
  (t) => [index('idx_pair_codes_code').on(t.code)],
);

export const usageSessions = pgTable('usage_sessions', {
  id: id(),
  childId: uuid('child_id').notNull(),
  startedAt: timestamptz('started_at').notNull(),
  endedAt: timestamptz('ended_at'),
  minutes: integer('minutes').default(0).notNull(),
  deviceId: uuid('device_id'),
  createdAt: now(),
});

/* ============================================================
   9. 报告
   ============================================================ */

export const periodReports = pgTable('period_reports', {
  id: id(),
  childId: uuid('child_id').notNull(),
  familyAccountId: uuid('family_account_id').notNull(),
  rangeType: varchar('range_type', { length: 10 }).notNull(),
  rangeStart: date('range_start').notNull(),
  rangeEnd: date('range_end').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
  generatedAt: timestamptz('generated_at').defaultNow().notNull(),
  viewedAt: timestamptz('viewed_at'),
});

export const aiDailyReports = pgTable(
  'ai_daily_reports',
  {
    id: id(),
    childId: uuid('child_id').notNull(),
    reportDate: date('report_date').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
    generatedAt: timestamptz('generated_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('uq_ai_daily').on(t.childId, t.reportDate)],
);

/* ============================================================
   10. 对话与记忆
   ============================================================ */

export const chatSessions = pgTable('chat_sessions', {
  id: id(),
  childId: uuid('child_id').notNull(),
  channel: varchar('channel', { length: 10 }).notNull(),
  summaryCursorMessageId: uuid('summary_cursor_message_id'),
  messageCount: integer('message_count').default(0).notNull(),
  startedAt: timestamptz('started_at').defaultNow().notNull(),
  lastActiveAt: timestamptz('last_active_at').defaultNow().notNull(),
  closedAt: timestamptz('closed_at'),
});

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: id(),
    sessionId: uuid('session_id').notNull(),
    childId: uuid('child_id').notNull(),
    role: varchar('role', { length: 10 }).notNull(),
    sender: varchar('sender', { length: 10 }),
    content: text('content').notNull(),
    toolName: varchar('tool_name', { length: 40 }),
    toolPayload: jsonb('tool_payload').$type<Record<string, unknown>>(),
    tokens: integer('tokens'),
    localDate: date('local_date').notNull(),
    safetyFlag: varchar('safety_flag', { length: 20 }),
    createdAt: now(),
  },
  (t) => [index('idx_chat_messages_session').on(t.sessionId, t.createdAt)],
);

export const chatSummaries = pgTable('chat_summaries', {
  id: id(),
  childId: uuid('child_id').notNull(),
  sessionId: uuid('session_id'),
  level: varchar('level', { length: 12 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
  cursorMessageId: uuid('cursor_message_id'),
  version: integer('version').default(1).notNull(),
  tokensIn: integer('tokens_in'),
  tokensOut: integer('tokens_out'),
  compactFailedAt: timestamptz('compact_failed_at'),
  createdAt: now(),
});

export const chatMemoryFacts = pgTable(
  'chat_memory_facts',
  {
    id: id(),
    childId: uuid('child_id').notNull(),
    key: varchar('key', { length: 40 }).notNull(),
    value: varchar('value', { length: 200 }).notNull(),
    confidence: integer('confidence').default(50).notNull(),
    firstSeen: timestamptz('first_seen').defaultNow().notNull(),
    lastSeen: timestamptz('last_seen').defaultNow().notNull(),
    sourceMessageId: uuid('source_message_id'),
    deletedAt: timestamptz('deleted_at'),
  },
  (t) => [index('idx_facts_child').on(t.childId, t.key)],
);

/* ============================================================
   11. 审计
   ============================================================ */

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    familyAccountId: uuid('family_account_id').notNull(),
    actor: uuid('actor'),
    childId: uuid('child_id'),
    action: varchar('action', { length: 40 }).notNull(),
    targetTable: varchar('target_table', { length: 30 }),
    targetId: uuid('target_id'),
    diff: jsonb('diff').$type<Record<string, unknown>>(),
    localDate: date('local_date').notNull(),
    createdAt: now(),
  },
  (t) => [index('idx_audit_family').on(t.familyAccountId, t.createdAt)],
);
