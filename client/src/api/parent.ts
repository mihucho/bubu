import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';

export interface ParentTask {
  id: string;
  name: string;
  iconKey: string;
  color: string;
  cycleType: string;
  cycleTarget: number;
  starReward: number;
  photoRequired: boolean;
  needConfirm: boolean;
  isActive: boolean;
  currentCount: number;
}

export interface ParentWish {
  id: string;
  childId: string;
  childName: string;
  title: string;
  starCost: number | null;
  status: string;
  note: string | null;
}

export interface ParentChild {
  id: string;
  nickname: string;
  avatarKey: string;
  colorKey: string;
  title: string;
  availableStars: number;
  firstRunDone: boolean;
}

export async function getParentTasks(childId: string): Promise<ParentTask[]> {
  const res = await axiosForBackend({ url: '/api/v2/parent/tasks', method: 'GET', params: { childId } });
  return res.data as ParentTask[];
}

export async function createTask(input: {
  childId: string;
  name: string;
  cycleType: string;
  cycleTarget: number;
  starReward: number;
  photoRequired: boolean;
  needConfirm: boolean;
}) {
  const res = await axiosForBackend({ url: '/api/v2/parent/tasks', method: 'POST', data: input });
  return res.data as { id: string; name: string };
}

export async function toggleTask(childId: string, taskId: string, isActive: boolean) {
  const res = await axiosForBackend({
    url: `/api/v2/parent/tasks/${taskId}/active`,
    method: 'POST',
    data: { childId, isActive },
  });
  return res.data as { ok: true };
}

export async function getParentWishes(): Promise<ParentWish[]> {
  const res = await axiosForBackend({ url: '/api/v2/parent/wishes', method: 'GET' });
  return res.data as ParentWish[];
}

export async function priceWish(childId: string, wishId: string, starCost: number) {
  try {
    const res = await axiosForBackend({
      url: `/api/v2/parent/wishes/${wishId}/price`,
      method: 'POST',
      data: { childId, starCost },
    });
    return res.data as { ok: true };
  } catch (e) {
    logger.error('定价失败', e);
    throw e;
  }
}

export async function getParentChildren(): Promise<ParentChild[]> {
  const res = await axiosForBackend({ url: '/api/v2/parent/children', method: 'GET' });
  return res.data as ParentChild[];
}

export interface ParentReport {
  id: string;
  childId: string;
  rangeType: string;
  rangeStart: string;
  rangeEnd: string;
  payload: {
    byCycle?: { daily?: { taskCount: number; doneRate: number; done: number } };
    range?: {
      readingMinutes: number;
      readingDays: number;
      exerciseCount: number;
      exerciseMinutes: number;
      moodDays: number;
      starsIn: number;
      starsOut: number;
    };
    observation?: string[];
    suggestion?: string;
  };
  generatedAt: string;
}

export async function getReports(): Promise<ParentReport[]> {
  const res = await axiosForBackend({ url: '/api/v2/parent/reports', method: 'GET' });
  return res.data as ParentReport[];
}

export async function ensureReport(childId: string, rangeType: '7d' | '30d' = '7d'): Promise<ParentReport> {
  const res = await axiosForBackend({
    url: '/api/v2/parent/reports',
    method: 'POST',
    data: { childId, rangeType },
  });
  return res.data as ParentReport;
}

export async function getMonth(childId: string, month: string) {
  const res = await axiosForBackend({
    url: '/api/v2/parent/records/month',
    method: 'GET',
    params: { childId, month },
  });
  return res.data as { month: string; days: { date: string; tasks: number; reading: number }[] };
}

export async function getDay(childId: string, date: string) {
  const res = await axiosForBackend({
    url: '/api/v2/parent/records/day',
    method: 'GET',
    params: { childId, date },
  });
  return res.data as {
    date: string;
    checkins: { id: string; taskName: string; status: string; delta: number; note: string | null }[];
    readings: { minutes: number; bookTitle: string | null }[];
    exercises: { exerciseType: string; minutes: number }[];
    moods: { emotionKey: string; content: string | null }[];
  };
}

export interface ParentInbox {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function getParentInbox(): Promise<ParentInbox[]> {
  const res = await axiosForBackend({ url: '/api/v2/parent/inbox', method: 'GET' });
  return res.data as ParentInbox[];
}

export async function confirmCheckin(checkinId: string, childId: string) {
  const res = await axiosForBackend({
    url: `/api/v2/checkins/${checkinId}/confirm`,
    method: 'POST',
    data: { childId },
  });
  return res.data as { status: string; starsGranted: number; balance: number };
}

export async function rejectCheckin(checkinId: string, childId: string) {
  const res = await axiosForBackend({
    url: `/api/v2/checkins/${checkinId}/reject`,
    method: 'POST',
    data: { childId },
  });
  return res.data as { ok: true };
}

export async function sendNote(childId: string, body: string) {
  const res = await axiosForBackend({ url: '/api/v2/parent/notes', method: 'POST', data: { childId, body } });
  return res.data as { id: string };
}

/* ---------------- 设置类（W5） ---------------- */

export interface ParentShopItem {
  id: string;
  childId: string;
  childName: string;
  name: string;
  starCost: number;
  iconKey: string;
  isActive: boolean;
}

export async function getParentShop(): Promise<ParentShopItem[]> {
  const res = await axiosForBackend({ url: '/api/v2/parent/shop', method: 'GET' });
  return res.data as ParentShopItem[];
}

export async function createShopItem(input: { childId: string; name: string; starCost: number }) {
  const res = await axiosForBackend({ url: '/api/v2/parent/shop', method: 'POST', data: input });
  return res.data as { id: string };
}

export async function updateShopItem(itemId: string, input: { childId: string; isActive?: boolean; starCost?: number; name?: string }) {
  const res = await axiosForBackend({ url: `/api/v2/parent/shop/${itemId}`, method: 'PUT', data: input });
  return res.data as { ok: true };
}

export interface FamilySettings {
  parentDisplayName: string;
  dailyLimitMinutes: number;
  restIntervalMinutes: number;
  restDurationMinutes: number;
  sleepStart: string;
  sleepEnd: string;
  dailyDigestTime: string;
  quietStart: string;
  quietEnd: string;
  remindConfirm: boolean;
  remindWish: boolean;
  remindSafety: boolean;
  remindReport: boolean;
  diaryParentVisible: boolean;
  aiFulltextVisible: boolean;
  exportEnabled: boolean;
  pinSet: boolean;
}

export async function getFamilySettings(): Promise<FamilySettings> {
  const res = await axiosForBackend({ url: '/api/v2/parent/family', method: 'GET' });
  return res.data as FamilySettings;
}

export async function updateFamilySettings(patch: Partial<FamilySettings>) {
  const res = await axiosForBackend({ url: '/api/v2/parent/family', method: 'PUT', data: patch });
  return res.data as { ok: true };
}

export async function setParentPin(pin: string) {
  const res = await axiosForBackend({ url: '/api/v2/parent/family/pin', method: 'POST', data: { pin } });
  return res.data as { ok: true };
}

export async function verifyParentPin(pin: string) {
  const res = await axiosForBackend({ url: '/api/v2/parent/family/pin/verify', method: 'POST', data: { pin } });
  return res.data as { ok: boolean; reason?: string };
}

export async function getFamilyMembers() {
  const res = await axiosForBackend({ url: '/api/v2/parent/family/members', method: 'GET' });
  return res.data as { id: string; displayName: string; role: string; phone: string; joinedAt: string }[];
}

export async function createInvite() {
  const res = await axiosForBackend({ url: '/api/v2/parent/family/invites', method: 'POST' });
  return res.data as { code: string; expiresAt: string };
}

export async function getAudit() {
  const res = await axiosForBackend({ url: '/api/v2/parent/audit', method: 'GET' });
  return res.data as { id: string; action: string; targetTable: string | null; localDate: string; createdAt: string }[];
}

export interface ChildProfileRow {
  id: string;
  nickname: string;
  loginId: string;
  title: string;
  avatarKey: string;
  colorKey: string;
  mustChangePassword: boolean;
}

export async function getChildProfiles(): Promise<ChildProfileRow[]> {
  const res = await axiosForBackend({ url: '/api/v2/parent/child-profiles', method: 'GET' });
  return res.data as ChildProfileRow[];
}

export async function updateChildProfile(childId: string, patch: { nickname?: string; title?: string; colorKey?: string }) {
  const res = await axiosForBackend({ url: `/api/v2/parent/child-profiles/${childId}`, method: 'PUT', data: patch });
  return res.data as { ok: true };
}

/* ---------------- 家长端跟布布说话（P/D 类工具） ---------------- */

export interface Proposal {
  kind: string;
  title: string;
  payload: Record<string, unknown>;
}

export interface ParentChatResult {
  reply: string;
  degraded: boolean;
  path?: string;
  proposal?: Proposal;
  trace: { step: number; kind: string; tool?: string; summary?: string }[];
}

export async function parentChat(childId: string, message: string): Promise<ParentChatResult> {
  const res = await axiosForBackend({
    url: '/api/v2/ai/chat',
    method: 'POST',
    data: { childId, message, side: 'parent' },
  });
  return res.data as ParentChatResult;
}

export async function applyProposal(kind: string, payload: Record<string, unknown>) {
  const res = await axiosForBackend({
    url: '/api/v2/ai/proposal/apply',
    method: 'POST',
    data: { kind, payload },
  });
  return res.data as { ok: true; created?: { id: string; name: string } };
}

/* ---------------- 搜索 / 导出 / 隐私 / 账号 ---------------- */

export interface SearchResult {
  keyword: string;
  tasks: { id: string; name: string; childId: string; childName: string }[];
  wishes: { id: string; title: string; status: string; childId: string; childName: string }[];
  total: number;
}

export async function searchAll(q: string): Promise<SearchResult> {
  const res = await axiosForBackend({ url: '/api/v2/parent/search', method: 'GET', params: { q } });
  return res.data as SearchResult;
}

export interface ExportPreview {
  allowed: boolean;
  childName: string;
  range: { start: string; end: string };
  checkins: { taskName: string; localDate: string; status: string }[];
  readingMinutes: number;
  exerciseTimes: number;
  moods: { localDate: string; emotionKey: string }[];
  exchanges: { itemName: string; starCost: number }[];
}

export async function getExportPreview(childId: string, days = 7): Promise<ExportPreview> {
  const res = await axiosForBackend({
    url: '/api/v2/parent/export/preview',
    method: 'GET',
    params: { childId, days },
  });
  return res.data as ExportPreview;
}

export interface PrivacyDoc {
  version: string;
  updatedAt: string;
  sections: { title: string; body: string }[];
}

export async function getPrivacyDoc(): Promise<PrivacyDoc> {
  const res = await axiosForBackend({ url: '/api/v2/parent/privacy', method: 'GET' });
  return res.data as PrivacyDoc;
}

export async function grantConsent(version: string) {
  const res = await axiosForBackend({
    url: '/api/v2/parent/privacy/consent',
    method: 'POST',
    data: { version },
  });
  return res.data as { id: string };
}

export async function getConsents() {
  const res = await axiosForBackend({ url: '/api/v2/parent/privacy/consents', method: 'GET' });
  return res.data as { kind: string; version: string; grantedAt: string; revokedAt: string | null }[];
}

export async function requestAccountDeletion() {
  const res = await axiosForBackend({
    url: '/api/v2/parent/account/delete',
    method: 'POST',
    data: { confirm: 'DELETE' },
  });
  return res.data as { ok: true; readonlyUntilDays: number };
}

export interface ParentBadge {
  id: string;
  name: string;
  iconKey: string;
  ruleType: string;
  starReward: number;
  praiseText: string | null;
  awarded: boolean;
}

export async function getParentBadges(childId: string): Promise<ParentBadge[]> {
  const res = await axiosForBackend({ url: '/api/v2/parent/badges', method: 'GET', params: { childId } });
  return res.data as ParentBadge[];
}

export async function createParentBadge(input: {
  childId: string;
  name: string;
  iconKey: string;
  ruleType: string;
  ruleConfig?: Record<string, unknown>;
  starReward?: number;
  praiseText?: string;
}) {
  const res = await axiosForBackend({ url: '/api/v2/parent/badges', method: 'POST', data: input });
  return res.data as { id: string };
}

export async function awardBadge(badgeId: string, childId: string) {
  const res = await axiosForBackend({
    url: `/api/v2/parent/badges/${badgeId}/award`,
    method: 'POST',
    data: { childId },
  });
  return res.data as { ok: true };
}

/* ---------------- 家长端 AI 额度 ---------------- */

export interface ParentAiQuota {
  allowed: boolean;
  reason?: 'AI_UNAVAILABLE' | 'DAILY_LIMIT' | 'RATE_LIMITED';
  used: number;
  limit: number;
  remaining: number;
}

export async function getParentAiQuota(): Promise<ParentAiQuota> {
  const res = await axiosForBackend({
    url: '/api/v2/ai/quota',
    method: 'GET',
    params: { side: 'parent', inDoubao: true },
  });
  return res.data as ParentAiQuota;
}
