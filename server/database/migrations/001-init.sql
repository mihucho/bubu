-- 布布 · 初始化 DDL（开发期可直接 DROP 重建）
-- 依据：docs/数据模型设计-v2.md（32 表）
-- 用法：psql -f server/database/migrations/001-init.sql

BEGIN;

-- ---------- 1. 家庭与家长 ----------
DROP TABLE IF EXISTS audit_logs, chat_memory_facts, chat_summaries, chat_messages, chat_sessions,
  ai_daily_reports, period_reports, usage_sessions, pair_codes, kid_devices, messages,
  child_badges, badges, star_ledger, wish_items, exchange_records, shop_items,
  quest_attempts, wrong_questions, reading_tracker, exercise_records, reading_records,
  mood_records, egg_opens, egg_tasks, task_checkins, tasks, child_profiles,
  consents, parent_invites, family_members, family_accounts CASCADE;

CREATE TABLE family_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account varchar(50) NOT NULL UNIQUE,
  doubao_user_id varchar(64) UNIQUE,
  doubao_bound_at timestamptz,
  login_provider varchar(12) NOT NULL DEFAULT 'phone',
  password_hash varchar(255) NOT NULL,
  parent_display_name varchar(20) NOT NULL DEFAULT '妈妈',
  parent_pin_hash varchar(255),
  parent_pin_set_at timestamptz,
  week_start_day smallint NOT NULL DEFAULT 1,
  timezone varchar(40) NOT NULL DEFAULT 'Asia/Shanghai',
  daily_limit_minutes smallint NOT NULL DEFAULT 40,
  rest_interval_minutes smallint NOT NULL DEFAULT 20,
  rest_duration_minutes smallint NOT NULL DEFAULT 5,
  sleep_start time NOT NULL DEFAULT '21:00',
  sleep_end time NOT NULL DEFAULT '07:00',
  daily_digest_time time NOT NULL DEFAULT '20:00',
  quiet_start time NOT NULL DEFAULT '22:00',
  quiet_end time NOT NULL DEFAULT '07:00',
  remind_confirm boolean NOT NULL DEFAULT true,
  remind_wish boolean NOT NULL DEFAULT true,
  remind_safety boolean NOT NULL DEFAULT true,
  remind_report boolean NOT NULL DEFAULT false,
  diary_parent_visible boolean NOT NULL DEFAULT true,
  ai_fulltext_visible boolean NOT NULL DEFAULT true,
  export_enabled boolean NOT NULL DEFAULT true,
  merged_into_id uuid,
  merged_at timestamptz,
  setup_step varchar(20) NOT NULL DEFAULT 'consent',
  setup_completed_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  phone varchar(50) NOT NULL,
  password_hash varchar(255) NOT NULL,
  doubao_user_id varchar(64),
  display_name varchar(20) NOT NULL DEFAULT '妈妈',
  role varchar(12) NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX uq_family_members_phone ON family_members(phone);
CREATE UNIQUE INDEX uq_family_members_doubao ON family_members(doubao_user_id);
CREATE INDEX idx_family_members_family ON family_members(family_account_id);

CREATE TABLE parent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  code varchar(8) NOT NULL,
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_parent_invites_code ON parent_invites(code);

CREATE TABLE consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  consent_version varchar(20) NOT NULL,
  kind varchar(20) NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip varchar(64),
  user_agent text
);

-- ---------- 2. 孩子 ----------
CREATE TABLE child_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  login_id varchar(16) NOT NULL,
  password_hash varchar(255) NOT NULL,
  must_change_password boolean NOT NULL DEFAULT true,
  password_changed_at timestamptz,
  nickname varchar(20) NOT NULL,
  avatar_key varchar(40) NOT NULL DEFAULT 'rabbit',
  avatar_file text,
  birth_year smallint,
  age_band varchar(10) NOT NULL DEFAULT 'mid',
  color_key varchar(10) NOT NULL DEFAULT 'a',
  title varchar(20) NOT NULL DEFAULT '小花朵',
  ai_persona_name varchar(20),
  ai_persona_avatar_key varchar(40),
  available_stars integer NOT NULL DEFAULT 0,
  total_stars integer NOT NULL DEFAULT 0,
  reading_points integer NOT NULL DEFAULT 0,
  reading_streak integer NOT NULL DEFAULT 0,
  exercise_streak integer NOT NULL DEFAULT 0,
  task_view_mode varchar(10) NOT NULL DEFAULT 'list',
  pet_name varchar(20) NOT NULL DEFAULT '小黄油',
  pet_type varchar(20) NOT NULL DEFAULT 'dog',
  pet_hunger integer NOT NULL DEFAULT 80,
  pet_clean integer NOT NULL DEFAULT 80,
  pet_mood integer NOT NULL DEFAULT 80,
  first_run_done boolean NOT NULL DEFAULT false,
  sort_order smallint NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_child_login_id ON child_profiles(login_id);
CREATE INDEX idx_child_family ON child_profiles(family_account_id, sort_order) WHERE archived_at IS NULL;

-- ---------- 3. 任务与打卡 ----------
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  name varchar(60) NOT NULL,
  icon_key varchar(40) NOT NULL DEFAULT 'book',
  icon_file text,
  color varchar(10) NOT NULL DEFAULT 'pink',
  cycle_type varchar(12) NOT NULL DEFAULT 'daily',
  cycle_target integer NOT NULL DEFAULT 1,
  cycle_weekdays smallint[],
  start_date date,
  end_date date,
  paused_until date,
  current_count integer NOT NULL DEFAULT 0,
  star_reward integer NOT NULL DEFAULT 1,
  photo_visible boolean NOT NULL DEFAULT true,
  photo_required boolean NOT NULL DEFAULT false,
  need_confirm boolean NOT NULL DEFAULT false,
  sort_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  period_key varchar(12) NOT NULL,
  is_achieved boolean NOT NULL DEFAULT false,
  achieved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_child_active ON tasks(child_id, is_active, sort_order);

CREATE TABLE task_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  delta integer NOT NULL DEFAULT 1,
  local_date date NOT NULL,
  period_key varchar(12) NOT NULL,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  media_pending boolean NOT NULL DEFAULT false,
  media_source varchar(10),
  status varchar(12) NOT NULL DEFAULT 'done',
  confirmed_by uuid,
  confirmed_at timestamptz,
  note varchar(200),
  source varchar(12) NOT NULL DEFAULT 'kid',
  idempotency_key varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checkins_child_date ON task_checkins(child_id, local_date);
CREATE UNIQUE INDEX uq_checkins_idem ON task_checkins(idempotency_key);

CREATE TABLE egg_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  name varchar(40) NOT NULL,
  icon_key varchar(40) NOT NULL DEFAULT 'egg',
  star_reward integer NOT NULL DEFAULT 1,
  sort_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE egg_opens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  egg_task_id uuid NOT NULL REFERENCES egg_tasks(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  idempotency_key varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_egg_open_day ON egg_opens(child_id, egg_task_id, local_date);

-- ---------- 4. 记录类 ----------
CREATE TABLE mood_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  emotion_key varchar(12) NOT NULL,
  content text,
  star_reward integer NOT NULL DEFAULT 2,
  local_date date NOT NULL,
  stars_granted boolean NOT NULL DEFAULT false,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reading_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  minutes integer NOT NULL,
  points_earned integer NOT NULL,
  book_title varchar(80),
  local_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exercise_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  exercise_type varchar(30) NOT NULL,
  minutes integer NOT NULL,
  photo jsonb,
  local_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reading_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  book_title varchar(80) NOT NULL,
  note text,
  is_seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- 5. 闯关 ----------
CREATE TABLE wrong_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  subject varchar(20) NOT NULL,
  title varchar(120) NOT NULL,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_reason text,
  status varchar(10) NOT NULL DEFAULT 'pending',
  mastered_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  local_date date NOT NULL,
  created_by varchar(10) NOT NULL DEFAULT 'parent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quest_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES wrong_questions(id) ON DELETE CASCADE,
  result varchar(10) NOT NULL,
  local_date date NOT NULL,
  starred boolean NOT NULL DEFAULT false,
  idempotency_key varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_quest_idem ON quest_attempts(idempotency_key);

-- ---------- 6. 商店 / 心愿 / 星星 ----------
CREATE TABLE shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  name varchar(40) NOT NULL,
  icon_key varchar(40) NOT NULL DEFAULT 'gift',
  icon_file text,
  star_cost integer NOT NULL,
  description varchar(120),
  sort_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exchange_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  item_id uuid,
  item_name varchar(40) NOT NULL,
  star_cost integer NOT NULL,
  wish_id uuid,
  status varchar(10) NOT NULL DEFAULT 'done',
  refunded_at timestamptz,
  idempotency_key varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_exchange_idem ON exchange_records(idempotency_key);

CREATE TABLE wish_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  title varchar(60) NOT NULL,
  icon_key varchar(40) NOT NULL DEFAULT 'star',
  star_cost integer,
  status varchar(14) NOT NULL DEFAULT 'pending',
  is_surprise boolean NOT NULL DEFAULT false,
  expires_at date,
  fulfill_type varchar(12) NOT NULL DEFAULT 'gift',
  note varchar(200),
  defer_reason varchar(200),
  created_by varchar(10) NOT NULL DEFAULT 'kid',
  priced_at timestamptz,
  claimed_at timestamptz,
  kid_confirmed_at timestamptz,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE star_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason varchar(20) NOT NULL,
  ref_table varchar(30),
  ref_id uuid,
  title varchar(60),
  balance_after integer NOT NULL,
  local_date date NOT NULL,
  idempotency_key varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_ledger_idem ON star_ledger(idempotency_key);
CREATE INDEX idx_ledger_child_date ON star_ledger(child_id, local_date);

-- ---------- 7. 徽章 ----------
CREATE TABLE badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id uuid REFERENCES family_accounts(id) ON DELETE CASCADE,
  child_id uuid REFERENCES child_profiles(id) ON DELETE CASCADE,
  name varchar(16) NOT NULL,
  icon_key varchar(24) NOT NULL,
  rule_type varchar(12) NOT NULL,
  rule_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  star_reward smallint NOT NULL DEFAULT 0,
  praise_text varchar(60),
  created_by uuid,
  is_hidden boolean NOT NULL DEFAULT false
);

CREATE TABLE child_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  awarded_by uuid,
  progress_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_hidden boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX uq_child_badge ON child_badges(child_id, badge_id);

-- ---------- 8. 消息 / 设备 / 使用时长 ----------
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES child_profiles(id) ON DELETE CASCADE,
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  to_role varchar(10) NOT NULL,
  kind varchar(20) NOT NULL,
  title varchar(60) NOT NULL,
  body varchar(300),
  ref_table varchar(30),
  ref_id uuid,
  from_user uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_inbox ON messages(to_role, family_account_id, created_at DESC);

CREATE TABLE kid_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  device_name varchar(40) NOT NULL,
  token_hash varchar(128) NOT NULL,
  user_agent text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE pair_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  code varchar(6) NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pair_codes_code ON pair_codes(code);

CREATE TABLE usage_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  minutes integer NOT NULL DEFAULT 0,
  device_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- 9. 报告 ----------
CREATE TABLE period_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  range_type varchar(10) NOT NULL,
  range_start date NOT NULL,
  range_end date NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz
);

CREATE TABLE ai_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_ai_daily ON ai_daily_reports(child_id, report_date);

-- ---------- 10. 对话与记忆 ----------
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  channel varchar(10) NOT NULL,
  summary_cursor_message_id uuid,
  message_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  role varchar(10) NOT NULL,
  sender varchar(10),
  content text NOT NULL,
  tool_name varchar(40),
  tool_payload jsonb,
  tokens integer,
  local_date date NOT NULL,
  safety_flag varchar(20),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);

CREATE TABLE chat_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  session_id uuid,
  level varchar(12) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  cursor_message_id uuid,
  version integer NOT NULL DEFAULT 1,
  tokens_in integer,
  tokens_out integer,
  compact_failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_memory_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  key varchar(40) NOT NULL,
  value varchar(200) NOT NULL,
  confidence integer NOT NULL DEFAULT 50,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  source_message_id uuid,
  deleted_at timestamptz
);
CREATE INDEX idx_facts_child ON chat_memory_facts(child_id, key);

-- ---------- 11. 审计 ----------
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
  actor uuid,
  child_id uuid,
  action varchar(40) NOT NULL,
  target_table varchar(30),
  target_id uuid,
  diff jsonb,
  local_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_family ON audit_logs(family_account_id, created_at DESC);

COMMIT;
