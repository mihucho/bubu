import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { KidHomeDto } from '@shared/api.interface';

/**
 * 孩子端 v2 接口
 * - 全部读接口一次取完首页数据，避免多请求造成的数字跳动
 * - 写接口（打卡、星星）都由后端保证幂等，前端只需带 idempotencyKey
 */
export async function getKidHome(childId: string): Promise<KidHomeDto> {
  try {
    const res = await axiosForBackend({
      url: '/api/v2/kid/home',
      method: 'GET',
      params: { childId },
    });
    return res.data as KidHomeDto;
  } catch (error) {
    logger.error('获取孩子端首页失败', error);
    throw error;
  }
}

export async function getStarsBalance(childId: string): Promise<number> {
  try {
    const res = await axiosForBackend({
      url: `/api/v2/kid/${childId}/stars`,
      method: 'GET',
    });
    return (res.data as { balance: number }).balance;
  } catch (error) {
    logger.error('获取星星余额失败', error);
    throw error;
  }
}

export interface CheckinResult {
  checkinId: string;
  status: 'done' | 'pending_confirm';
  currentCount: number;
  isAchieved: boolean;
  balance: number;
  starsGranted: number;
}

/** 打卡：后端幂等，重复点不会重复加星 */
export async function checkinTask(
  taskId: string,
  body: { childId: string; note?: string; media?: unknown[]; idempotencyKey?: string },
): Promise<CheckinResult> {
  try {
    const res = await axiosForBackend({ url: `/api/v2/tasks/${taskId}/checkin`, method: 'POST', data: body });
    return res.data as CheckinResult;
  } catch (error) {
    logger.error('打卡失败', error);
    throw error;
  }
}

export interface ReadingSummary {
  todayMinutes: number;
  weekMinutes: number;
  weekDays: number;
  readingPoints: number;
  readingStreak: number;
  recent: { id: string; minutes: number; bookTitle: string | null; localDate: string }[];
}

export async function getReading(childId: string): Promise<ReadingSummary> {
  const res = await axiosForBackend({ url: '/api/v2/records/reading', method: 'GET', params: { childId } });
  return res.data as ReadingSummary;
}

export async function addReading(childId: string, minutes: number, bookTitle?: string) {
  const res = await axiosForBackend({
    url: '/api/v2/records/reading',
    method: 'POST',
    data: { childId, minutes, bookTitle },
  });
  return res.data as { summary: ReadingSummary };
}

export interface ExerciseSummary {
  todayMinutes: number;
  todayTimes: number;
  weekMinutes: number;
  weekDays: number;
  recent: { id: string; exerciseType: string; minutes: number; localDate: string }[];
}

export async function getExercise(childId: string): Promise<ExerciseSummary> {
  const res = await axiosForBackend({ url: '/api/v2/records/exercise', method: 'GET', params: { childId } });
  return res.data as ExerciseSummary;
}

export async function addExercise(childId: string, exerciseType: string, minutes: number, photo?: unknown) {
  const res = await axiosForBackend({
    url: '/api/v2/records/exercise',
    method: 'POST',
    data: { childId, exerciseType, minutes, photo },
  });
  return res.data as { summary: ExerciseSummary };
}

export interface KidProfileSummary {
  id: string;
  nickname: string;
  title: string;
  avatarKey: string;
  colorKey: string;
  loginId: string;
  mustChangePassword: boolean;
  availableStars: number;
  totalStars: number;
  ledgerSum: number;
  readingPoints: number;
  readingStreak: number;
  exerciseStreak: number;
  petName: string;
}

export async function getKidProfile(childId: string): Promise<KidProfileSummary> {
  const res = await axiosForBackend({ url: `/api/v2/records/profile/${childId}`, method: 'GET' });
  return res.data as KidProfileSummary;
}

export async function addMood(childId: string, emotionKey: string, content?: string) {
  const res = await axiosForBackend({
    url: '/api/v2/records/mood',
    method: 'POST',
    data: { childId, emotionKey, content },
  });
  return res.data as { balance: number; starsGranted: number };
}

/* ---------------- 商店 / 心愿 / 彩蛋 ---------------- */

export interface ShopItem {
  id: string;
  name: string;
  iconKey: string;
  starCost: number;
  description: string | null;
  affordable: boolean;
}

export async function getShop(childId: string): Promise<{ balance: number; items: ShopItem[] }> {
  const res = await axiosForBackend({ url: '/api/v2/shop', method: 'GET', params: { childId } });
  return res.data as { balance: number; items: ShopItem[] };
}

export async function exchangeItem(childId: string, itemId: string) {
  const res = await axiosForBackend({
    url: `/api/v2/shop/${itemId}/exchange`,
    method: 'POST',
    data: { childId, idempotencyKey: `ui:${childId}:${itemId}:${Date.now()}` },
  });
  return res.data as { itemName: string; starCost: number; balance: number };
}

export interface Wish {
  id: string;
  title: string;
  iconKey: string;
  starCost: number | null;
  status: string;
  note: string | null;
  expiresAt: string | null;
  affordable: boolean;
}

export async function getWishes(childId: string): Promise<{ balance: number; wishes: Wish[] }> {
  const res = await axiosForBackend({ url: '/api/v2/wishes', method: 'GET', params: { childId } });
  return res.data as { balance: number; wishes: Wish[] };
}

export async function createWish(childId: string, title: string) {
  const res = await axiosForBackend({ url: '/api/v2/wishes', method: 'POST', data: { childId, title } });
  return res.data as { id: string; title: string; status: string };
}

export interface Egg {
  id: string;
  name: string;
  iconKey: string;
  starReward: number;
  openedToday: boolean;
}

export async function getEggs(childId: string): Promise<Egg[]> {
  const res = await axiosForBackend({ url: '/api/v2/eggs', method: 'GET', params: { childId } });
  return res.data as Egg[];
}

export async function openEgg(childId: string, eggId: string) {
  const res = await axiosForBackend({ url: `/api/v2/eggs/${eggId}/open`, method: 'POST', data: { childId } });
  return res.data as { opened: boolean; stars: number; balance: number; message: string };
}

export interface LedgerRow {
  id: string;
  amount: number;
  reason: string;
  title: string | null;
  balanceAfter: number;
  localDate: string;
}

export async function getLedger(childId: string): Promise<LedgerRow[]> {
  const res = await axiosForBackend({ url: '/api/v2/ledger', method: 'GET', params: { childId } });
  return res.data as LedgerRow[];
}

/* ---------------- 说说话 ---------------- */

export interface ChatTurn {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export async function getChatHistory(childId: string): Promise<ChatTurn[]> {
  const res = await axiosForBackend({ url: '/api/v2/ai/history', method: 'GET', params: { childId } });
  return res.data as ChatTurn[];
}

export interface ChatReply {
  reply: string;
  /** 被额度闸拦下时返回原因，此时 reply 为空 */
  blocked?: 'AI_UNAVAILABLE' | 'DAILY_LIMIT' | 'RATE_LIMITED';
  facts?: { tool: string; ok: boolean; summary: string }[];
}

export async function sendChat(childId: string, message: string): Promise<ChatReply> {
  const res = await axiosForBackend({
    url: '/api/v2/ai/chat',
    method: 'POST',
    data: { childId, message, side: 'kid', inDoubao: detectInDoubao() },
  });
  return res.data as ChatReply;
}

/* ---------------- 闯关 / 徽章 / 小信箱 ---------------- */

export interface Quest {
  id: string;
  subject: string;
  title: string;
  errorReason: string | null;
  status: string;
  attemptCount: number;
  localDate: string;
}

export async function getQuests(childId: string): Promise<Quest[]> {
  const res = await axiosForBackend({ url: '/api/v2/quests', method: 'GET', params: { childId } });
  return res.data as Quest[];
}

export async function attemptQuest(childId: string, questId: string, result: 'pass' | 'fail') {
  const res = await axiosForBackend({
    url: `/api/v2/quests/${questId}/attempt`,
    method: 'POST',
    data: { childId, result },
  });
  return res.data as { mastered: boolean; starsGranted: number; balance: number; message: string };
}

export interface Badge {
  id: string;
  name: string;
  iconKey: string;
  praiseText: string | null;
  starReward: number;
  earnedAt: string | null;
  ruleType: string;
}

export async function getBadges(childId: string): Promise<Badge[]> {
  const res = await axiosForBackend({ url: '/api/v2/badges', method: 'GET', params: { childId } });
  return res.data as Badge[];
}

export interface InboxMessage {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function getInbox(childId: string): Promise<InboxMessage[]> {
  const res = await axiosForBackend({ url: '/api/v2/inbox', method: 'GET', params: { childId } });
  return res.data as InboxMessage[];
}

export async function readMessage(messageId: string) {
  await axiosForBackend({ url: `/api/v2/inbox/${messageId}/read`, method: 'POST' });
}
/* ---------------- 布布记住的（记忆 L3） ---------------- */

export interface MemoryFact {
  id: string;
  key: string;
  value: string;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
}

export async function getMemoryFacts(childId: string): Promise<MemoryFact[]> {
  const res = await axiosForBackend({ url: '/api/v2/ai/memory', method: 'GET', params: { childId } });
  return res.data as MemoryFact[];
}

export async function forgetMemory(childId: string, factId: string) {
  const res = await axiosForBackend({
    url: `/api/v2/ai/memory/${factId}/forget`,
    method: 'POST',
    params: { childId },
  });
  return res.data as { ok: true };
}

/* ---------------- AI 额度 ---------------- */

export interface AiQuota {
  allowed: boolean;
  reason?: 'AI_UNAVAILABLE' | 'DAILY_LIMIT' | 'RATE_LIMITED';
  used: number;
  limit: number;
  remaining: number;
  inDoubao: boolean;
}

/**
 * 是否在豆包环境。
 *
 * 以「平台有没有把身份注入到页面」为准：`window.__platform__` 是服务端
 * ViewContextMiddleware → ViewController → index.html 渲染下来的，
 * 里面有 userId / appId 就说明是平台在跑（豆包内 H5、妙搭预览都算）。
 *
 * 以前只嗅 UA 里的 doubao/bytedance —— 桌面浏览器、部分容器 UA 不带这两个词，
 * 会被误判成「豆包外」，导致孩子端「说说话」整页降级，误伤太大。
 * UA 现在只作最后兜底（本地 vite 直连时 __platform__ 通常为空）。
 */
export function detectInDoubao(): boolean {
  if (typeof window !== 'undefined') {
    const platform = window.__platform__;
    if (platform && (platform.userId || platform.appId)) return true;
  }
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('doubao') || ua.includes('bytedance');
}

export async function getAiQuota(side: 'kid' | 'parent'): Promise<AiQuota> {
  const res = await axiosForBackend({
    url: '/api/v2/ai/quota',
    method: 'GET',
    params: { side, inDoubao: detectInDoubao() },
  });
  return res.data as AiQuota;
}
