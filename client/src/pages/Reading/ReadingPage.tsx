import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Footprints,
  Crown,
  PawPrint,
  Gift,
  Target,
  PartyPopper,
  Rainbow,
  BookOpen,
  Map,
  Drumstick,
  Bath,
  Heart,
  Timer,
  Star,
} from 'lucide-react';
import StatsHeader from '@client/src/components/StatsHeader';
import { useAppContext } from '@client/src/contexts/AppContext';
import { getReadingStats, addReadingRecord } from '@client/src/api';
import type { KidProfile } from '@shared/api.interface';

interface ReadingStatsData {
  profile: KidProfile;
  todayMinutes: number;
  todayTarget: number;
  streak: number;
}

const LEVEL_THRESHOLDS: { name: string; min: number; icon: React.ReactNode; count: number }[] = [
  { name: '阅读起步', min: 0, icon: <Footprints size={20} />, count: 1 },
  { name: '阅读小达人', min: 200, icon: <Footprints size={20} />, count: 2 },
  { name: '阅读小学者', min: 500, icon: <Footprints size={20} />, count: 3 },
  { name: '阅读大师', min: 1000, icon: <Crown size={20} />, count: 1 },
];

function getLevel(points: number): {
  name: string;
  icon: React.ReactNode;
  nextMin: number;
  prevMin: number;
  progress: number;
} {
  let idx = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (points >= LEVEL_THRESHOLDS[i].min) idx = i;
  }
  const current = LEVEL_THRESHOLDS[idx];
  const next = LEVEL_THRESHOLDS[idx + 1];
  const prevMin = current.min;
  const nextMin = next ? next.min : prevMin + 500;
  const diff = nextMin - prevMin;
  const progress = Math.min(100, Math.max(0, ((points - prevMin) / diff) * 100));
  return {
    name: current.name,
    icon: (
      <div className="flex items-center gap-0.5 text-[#FF85C1]">
        {Array.from({ length: current.count }).map((_, i) => (
          <span key={i}>{current.icon}</span>
        ))}
      </div>
    ),
    nextMin,
    prevMin,
    progress,
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const ReadingPage: React.FC = () => {
  const { profile, refreshProfile, setProfile } = useAppContext();
  const [stats, setStats] = useState<ReadingStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isTiming, setIsTiming] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [bookTitle, setBookTitle] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const loadStats = useCallback(async () => {
    try {
      const data = (await getReadingStats()) as ReadingStatsData;
      setStats(data);
    } catch (error) {
      logger.error('加载阅读统计失败', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    let timer: number | undefined;
    if (isTiming) {
      timer = window.setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [isTiming]);

  const handleToggleTimer = () => {
    if (isTiming) {
      setIsTiming(false);
      if (elapsed >= 60) {
        setShowConfirm(true);
      } else {
        setElapsed(0);
      }
    } else {
      setElapsed(0);
      setIsTiming(true);
    }
  };

  const handleCancelTimer = () => {
    setShowConfirm(false);
    setElapsed(0);
  };

  const handleSaveRecord = async () => {
    const minutes = Math.floor(elapsed / 60);
    if (minutes <= 0) {
      setShowConfirm(false);
      setElapsed(0);
      return;
    }
    setSaving(true);
    try {
      const result = await addReadingRecord({
        durationMinutes: minutes,
        bookTitle: bookTitle || undefined,
      });
      if (result.profile) {
        setProfile(result.profile);
      }
      await loadStats();
      setShowConfirm(false);
      setElapsed(0);
      setBookTitle('');
    } catch (error) {
      logger.error('保存阅读记录失败', error);
    } finally {
      setSaving(false);
    }
  };

  const displayProfile = stats?.profile ?? profile;
  const readingPoints = stats?.profile.readingPoints ?? profile?.readingPoints ?? 0;
  const todayMinutes = stats?.todayMinutes ?? 0;
  const todayTarget = stats?.todayTarget ?? 20;
  const streak = stats?.streak ?? profile?.readingStreak ?? 0;

  const level = getLevel(readingPoints);
  const pointsToNext = Math.max(0, level.nextMin - readingPoints);
  const todayProgress = Math.min(100, (todayMinutes / todayTarget) * 100);
  const goalAchieved = todayMinutes >= todayTarget;

  if (loading && !displayProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 p-4">
        <p className="text-text-secondary text-center">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-pink-50 to-purple-50 pb-20">
      {displayProfile && <StatsHeader profile={displayProfile} />}

      <div className="px-4 -mt-4 space-y-3">
        {/* 阅读成长卡片 */}
        <div
          className="rounded-[20px] p-4 shadow-sm"
          style={{
            background:
              'linear-gradient(135deg, #FFE4E1 0%, #FFDAB9 50%, #FFE4B5 100%)',
          }}
        >
          {/* 标题行 */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-[#4A2666]">阅读成长</h2>
            <span className="text-xs text-[#8B5FBF] bg-white/60 px-2 py-1 rounded-full">
              读1分钟=1积分
            </span>
          </div>

          {/* 等级 + 积分 */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                {level.icon}
                <span className="text-sm font-bold text-[#4A2666]">
                  {level.name}
                </span>
              </div>
              <div className="text-xs text-[#8B5FBF]">
                坚持阅读，脚印会越来越多哦～
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#4A2666] leading-none">
                {readingPoints}
              </div>
              <div className="text-xs text-[#8B5FBF] mt-1">
                累计积分 · 只涨不跌
              </div>
            </div>
          </div>

          {/* 已送小黄油 + 可用积分 */}
          <div className="flex items-center justify-between text-xs text-[#8B5FBF] mb-2">
            <span className="flex items-center gap-1">
              <Gift size={14} className="text-[#FF85C1]" />
              已送小黄油 {displayProfile?.petPointsSent ?? 0} 分
            </span>
            <span>可用积分 {Math.max(0, readingPoints - (displayProfile?.petPointsSent ?? 0))} 分</span>
          </div>

          {/* 等级进度条 */}
          <div className="mb-1">
            <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${level.progress}%`,
                  background: 'linear-gradient(90deg, #FF85C1, #A855F7)',
                }}
              />
            </div>
          </div>
          <div className="text-xs text-[#8B5FBF] mb-3 text-right">
            距离下一级还差 {pointsToNext} 分
          </div>

          {/* 今日目标 */}
          <div className="bg-white/70 rounded-2xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-[#4A2666] flex items-center gap-1">
                <Target size={16} className="text-[#FF85C1]" />
                今日目标
              </span>
              <span className="text-xs text-[#4A2666]">
                {todayMinutes}/{todayTarget}分钟 ·{' '}
                {Math.round(todayProgress)}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${todayProgress}%`,
                  backgroundColor: '#4ADE80',
                }}
              />
            </div>
            {goalAchieved && (
              <div className="text-xs font-medium text-[#22C55E] flex items-center gap-1">
                <PartyPopper size={12} />
                今日目标已达成！多读的都算加分～
              </div>
            )}
          </div>

          {/* 连续天数 */}
          <div className="bg-gray-100/80 rounded-full px-3 py-2 text-xs text-[#4A2666] text-center mb-4 flex items-center justify-center gap-1">
            连续 {streak} 天啦！今天也满载而归，真了不起
            <Rainbow size={14} className="text-[#A855F7]" />
          </div>

          {/* 三个按钮 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleToggleTimer}
              className="flex-1 py-2.5 px-3 rounded-full text-white text-sm font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1"
              style={{
                background: isTiming
                  ? 'linear-gradient(90deg, #EF4444, #F97316)'
                  : 'linear-gradient(90deg, #FF85C1, #A855F7)',
              }}
            >
              <Timer size={16} />
              {isTiming
                ? `结束计时 ${formatTime(elapsed)}`
                : '开始计时'}
            </button>
            <button
              type="button"
              className="py-2.5 px-3 rounded-full text-white text-sm font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1"
              style={{
                background: 'linear-gradient(90deg, #FF85C1, #A855F7)',
              }}
            >
              <BookOpen size={16} />
              去打卡
            </button>
            <button
              type="button"
              className="py-2.5 px-3 rounded-full text-sm font-bold border-2 border-[#A855F7] text-[#A855F7] bg-white active:scale-95 transition-transform flex items-center justify-center gap-1"
            >
              <Map size={16} />
              地图 7/11
            </button>
          </div>
        </div>

        {/* 我的小宠物 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#4A2666] flex items-center gap-1">
              <PawPrint size={18} className="text-[#FF85C1]" />
              我的小宠物
            </h3>
            <div className="text-xs text-[#8B5FBF]">
              {displayProfile?.petStatus ?? ''} · 可用积分{' '}
              {Math.max(
                0,
                readingPoints - (displayProfile?.petPointsSent ?? 0),
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 mb-3">
            <div className="w-16 h-16 rounded-full bg-yellow-300 flex items-center justify-center flex-shrink-0 border-2 border-yellow-200">
              <PawPrint size={32} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-[#4A2666] text-sm">
                {displayProfile?.petName ?? '小黄油'}
              </div>
              <div className="text-xs text-[#8B5FBF] mb-2">
                小宠物 · {displayProfile?.petStatus ?? '睁开眼啦'}
              </div>
              <div className="bg-[#FFF0F5] rounded-2xl rounded-tl-none p-2.5 text-xs text-[#4A2666] relative flex items-start gap-1.5">
                <PartyPopper size={14} className="text-[#FF85C1] shrink-0 mt-0.5" />
                你今天把《大中华寻宝记 广东寻宝记》读完啦！我都看见了，了不起～
              </div>
            </div>
          </div>

          {/* 属性条 */}
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs text-[#4A2666] mb-1">
                <span className="flex items-center gap-1">
                  <Drumstick size={14} className="text-[#F59E0B]" />
                  饱食度
                </span>
                <span className="font-bold">
                  {displayProfile?.petHunger ?? 88}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#4ADE80] transition-all"
                  style={{
                    width: `${displayProfile?.petHunger ?? 88}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-[#4A2666] mb-1">
                <span className="flex items-center gap-1">
                  <Bath size={14} className="text-[#60A5FA]" />
                  清洁度
                </span>
                <span className="font-bold">
                  {displayProfile?.petClean ?? 96}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#4ADE80] transition-all"
                  style={{
                    width: `${displayProfile?.petClean ?? 96}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-[#4A2666] mb-1">
                <span className="flex items-center gap-1">
                  <Heart size={14} className="text-[#FF85C1]" />
                  心情
                </span>
                <span className="font-bold">
                  {displayProfile?.petMood ?? 95}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#4ADE80] transition-all"
                  style={{
                    width: `${displayProfile?.petMood ?? 95}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 确认记录弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] p-5 w-full max-w-sm">
            <h3 className="text-lg font-bold text-[#4A2666] text-center mb-4 flex items-center justify-center gap-2">
              <PartyPopper size={20} className="text-[#FFD700]" />
              阅读完成！
            </h3>
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-[#A855F7] mb-1">
                {Math.floor(elapsed / 60)} 分钟
              </div>
              <div className="text-xs text-[#8B5FBF]">
                获得 {Math.floor(elapsed / 60)} 阅读积分
                {Math.floor(elapsed / 600) > 0 && (
                  <> · 奖励 {Math.floor(elapsed / 600)} <Star size={12} className="inline text-[#FFD700]" /></>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-[#8B5FBF] block mb-1">
                读的什么书（选填）
              </label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="书名..."
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-[#4A2666] focus:outline-none focus:border-[#A855F7]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelTimer}
                className="flex-1 py-2.5 rounded-full bg-gray-100 text-[#8B5FBF] text-sm font-bold"
              >
                放弃
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSaveRecord();
                }}
                disabled={saving}
                className="flex-1 py-2.5 rounded-full text-white text-sm font-bold shadow-md disabled:opacity-60"
                style={{
                  background: 'linear-gradient(90deg, #FF85C1, #A855F7)',
                }}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingPage;
