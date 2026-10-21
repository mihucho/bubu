/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, index, integer, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const familyAccounts = pgTable("family_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  account: varchar("account", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  childNickname: varchar("child_nickname", { length: 50 }).notNull().default('布布'),
  parentRole: varchar("parent_role", { length: 20 }).notNull().default('妈妈'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("family_accounts_account_key").on(table.account),
]);

export const readingTracker = pgTable("reading_tracker", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookTitle: varchar("book_title", { length: 200 }).notNull(),
  note: text("note"),
  isSeen: boolean("is_seen").notNull().default(false),
  familyAccountId: uuid("family_account_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const wrongQuestions = pgTable("wrong_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  subject: varchar("subject", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  errorReason: text("error_reason"),
  isMastered: boolean("is_mastered").notNull().default(false),
  recordDate: date("record_date").notNull().default('CURRENT_DATE'),
  familyAccountId: uuid("family_account_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const exchangeRecords = pgTable("exchange_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  starCost: integer("star_cost").notNull(),
  exchangeDate: customTimestamptz("exchange_date", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  familyAccountId: uuid("family_account_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const shopItems = pgTable("shop_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull().default('🎁'),
  starCost: integer("star_cost").notNull().default(5),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  familyAccountId: uuid("family_account_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sender: varchar("sender", { length: 20 }).notNull().default('kid'),
  content: text("content").notNull(),
  channel: varchar("channel", { length: 20 }).notNull().default('family'),
  familyAccountId: uuid("family_account_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const exerciseRecords = pgTable("exercise_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseType: varchar("exercise_type", { length: 50 }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  recordDate: date("record_date").notNull().default('CURRENT_DATE'),
  familyAccountId: uuid("family_account_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const readingRecords = pgTable("reading_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  recordDate: date("record_date").notNull().default('CURRENT_DATE'),
  bookTitle: varchar("book_title", { length: 200 }),
  pointsEarned: integer("points_earned").notNull().default(0),
  familyAccountId: uuid("family_account_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const moodRecords = pgTable("mood_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  emotion: varchar("emotion", { length: 20 }).notNull().default('😊'),
  content: text("content").notNull(),
  starReward: integer("star_reward").notNull().default(2),
  recordDate: date("record_date").notNull().default('CURRENT_DATE'),
  familyAccountId: uuid("family_account_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const eggTasks = pgTable("egg_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 20 }).notNull().default('🥚'),
  starReward: integer("star_reward").notNull().default(1),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedDate: date("completed_date"),
  familyAccountId: uuid("family_account_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull().default('📚'),
  color: varchar("color", { length: 20 }).notNull().default('pink'),
  targetCount: integer("target_count").notNull().default(1),
  currentCount: integer("current_count").notNull().default(0),
  starReward: integer("star_reward").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  isRecommended: boolean("is_recommended").notNull().default(true),
  isAchieved: boolean("is_achieved").notNull().default(false),
  weekStart: date("week_start").notNull(),
  familyAccountId: uuid("family_account_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const kidProfile = pgTable("kid_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  nickname: varchar("nickname", { length: 50 }).notNull().default('布布'),
  title: varchar("title", { length: 50 }).notNull().default('小花朵'),
  avatarUrl: text("avatar_url"),
  availableStars: integer("available_stars").notNull().default(0),
  totalStars: integer("total_stars").notNull().default(0),
  weekStars: integer("week_stars").notNull().default(0),
  weekTarget: integer("week_target").notNull().default(8),
  weekAchieved: integer("week_achieved").notNull().default(0),
  readingPoints: integer("reading_points").notNull().default(0),
  petName: varchar("pet_name", { length: 50 }).notNull().default('小黄油'),
  petType: varchar("pet_type", { length: 20 }).notNull().default('小狗'),
  petStatus: varchar("pet_status", { length: 20 }).notNull().default('睁开眼啦'),
  petHunger: integer("pet_hunger").notNull().default(88),
  petClean: integer("pet_clean").notNull().default(96),
  petMood: integer("pet_mood").notNull().default(95),
  petPointsSent: integer("pet_points_sent").notNull().default(0),
  readingStreak: integer("reading_streak").notNull().default(0),
  exerciseStreak: integer("exercise_streak").notNull().default(0),
  showReadingTracker: boolean("show_reading_tracker").notNull().default(true),
  parentRole: varchar("parent_role", { length: 20 }).notNull().default('妈妈'),
  familyAccountId: uuid("family_account_id"),
  platformUserId: varchar("platform_user_id", { length: 64 }).unique(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("idx_kid_profile_platform_user_id").on(table.platformUserId),
]);

// table aliases
export const chatMessagesTable = chatMessages;
export const eggTasksTable = eggTasks;
export const exchangeRecordsTable = exchangeRecords;
export const exerciseRecordsTable = exerciseRecords;
export const familyAccountsTable = familyAccounts;
export const kidProfileTable = kidProfile;
export const moodRecordsTable = moodRecords;
export const readingRecordsTable = readingRecords;
export const readingTrackerTable = readingTracker;
export const shopItemsTable = shopItems;
export const tasksTable = tasks;
export const wrongQuestionsTable = wrongQuestions;
