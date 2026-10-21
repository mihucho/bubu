import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  PersonStanding,
  Dumbbell,
  TreePine,
  Sparkles,
  CheckCircle,
  Flame,
  Trophy,
  Calendar,
} from 'lucide-react';
import StatsHeader from '@client/src/components/StatsHeader';
import { useAppContext } from '@client/src/contexts/AppContext';
import {
  getExerciseStats,
  addExerciseRecord,
  deleteExerciseRecord,
} from '@client/src/api';
import type { ExerciseStats, ExerciseRecord } from '@shared/api.interface';

const EXERCISE_TYPES: { key: string; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'running', label: '跑步', icon: <PersonStanding size={24} />, color: '#FF85C1' },
  { key: 'fitness', label: '体能课', icon: <Dumbbell size={24} />, color: '#A855F7' },
  { key: 'outdoor', label: '户外玩', icon: <TreePine size={24} />, color: '#22C55E' },
  { key: 'other', label: '其他', icon: <Sparkles size={24} />, color: '#F59E0B' },
];

const EXERCISE_LABEL: Record<string, string> = {
  running: '跑步',
  fitness: '体能课',
  outdoor: '户外玩',
  other: '其他',
};

const EXERCISE_ICON: Record<string, React.ReactNode> = {
  running: <PersonStanding size={20} className="text-[#FF85C1]" />,
  fitness: <Dumbbell size={20} className="text-[#A855F7]" />,
  outdoor: <TreePine size={20} className="text-[#22C55E]" />,
  other: <Sparkles size={20} className="text-[#F59E0B]" />,
};

const ExercisePage: React.FC = () => {
  const { profile, refreshProfile, setProfile } = useAppContext();
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<string>('running');
  const [minutes, setMinutes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const loadStats = useCallback(async () => {
    try {
      const data = (await getExerciseStats()) as ExerciseStats;
      setStats(data);
    } catch (error) {
      logger.error('加载运动统计失败', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const todayMoved =
    stats?.records.some((r) => {
      const today = new Date().toISOString().slice(0, 10);
      return r.recordDate.slice(0, 10) === today;
    }) ?? false;

  const streak = profile?.exerciseStreak ?? 0;
  const nextFlame = Math.max(0, 3 - streak);

  const handleOpenModal = () => {
    setSelectedType('running');
    setMinutes('');
    setShowModal(true);
  };

  const handleSave = async () => {
    const mins = Number(minutes);
    if (!mins || mins <= 0) return;
    setSaving(true);
    try {
      const result = await addExerciseRecord({
        exerciseType: selectedType,
        durationMinutes: mins,
      });
      if (result.profile) {
        setProfile(result.profile);
      }
      await loadStats();
      setShowModal(false);
    } catch (error) {
      logger.error('保存运动记录失败', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExerciseRecord(id);
      await refreshProfile();
      await loadStats();
    } catch (error) {
      logger.error('删除运动记录失败', error);
    }
  };

  const bestRecords = stats?.bestRecords ?? [];
  const records = stats?.records ?? [];

  const selectedTypeObj = EXERCISE_TYPES.find((t) => t.key === selectedType);
  const selectedIcon = selectedTypeObj?.icon ?? <Sparkles size={24} />;

  return (
    <div className="min-h-full bg-gradient-to-b from-pink-50 to-purple-50 pb-20">
      {profile && <StatsHeader profile={profile} />}

      <div className="px-4 -mt-4 space-y-3">
        {/* 顶部标题 */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-[#4A2666]">动起来</h1>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              todayMoved
                ? 'bg-green-100 text-[#22C55E]'
                : 'bg-orange-100 text-orange-500'
            }`}
          >
            {todayMoved ? (
              <span className="flex items-center gap-1">
                <CheckCircle size={12} /> 今天已运动
              </span>
            ) : (
              '今天还没动'
            )}
          </span>
        </div>

        {/* 连续天数卡片 */}
        <div
          className="rounded-[20px] p-4 shadow-sm flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #FFD1A4 0%, #FFA45B 100%)',
          }}
        >
          <div>
            <div className="text-lg font-bold text-white mb-1">
              连续 {streak} 天动起来
            </div>
            <div className="text-xs text-white/90">
              再坚持{nextFlame}天就有火苗啦
            </div>
          </div>
          <Flame size={48} className="text-white" />
        </div>

        {/* 数据统计 3 卡片 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-[20px] p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-[#A855F7]">
              {stats?.weekCount ?? 0}
            </div>
            <div className="text-xs text-[#8B5FBF] mt-1">本周次数</div>
          </div>
          <div className="bg-white rounded-[20px] p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-[#FF85C1]">
              {stats?.weekMinutes ?? 0}
            </div>
            <div className="text-xs text-[#8B5FBF] mt-1">本周分钟</div>
          </div>
          <div className="bg-white rounded-[20px] p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-[#4A2666]">
              {stats?.totalCount ?? 0}
            </div>
            <div className="text-xs text-[#8B5FBF] mt-1">累计次数</div>
          </div>
        </div>

        {/* 记一次运动按钮 */}
        <button
          type="button"
          onClick={handleOpenModal}
          className="w-full py-4 rounded-full text-white text-base font-bold shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(90deg, #FF85C1, #A855F7)',
          }}
        >
          <PersonStanding size={20} />
          记一次运动
        </button>

        {/* 我的最好成绩 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm">
          <h3 className="text-base font-bold text-[#4A2666] mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-[#FFD700]" />
            我的最好成绩
          </h3>
          <div className="space-y-2">
            {EXERCISE_TYPES.map((t) => {
              const best = bestRecords.find(
                (b) => b.type === t.key,
              )?.minutes ?? 0;
              return (
                <div
                  key={t.key}
                  className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#A855F7]">{t.icon}</span>
                    <span className="text-sm text-[#4A2666]">{t.label}</span>
                  </div>
                  <span className="text-sm font-bold text-[#A855F7]">
                    {best} 分钟
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 最近的记录 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm">
          <h3 className="text-base font-bold text-[#4A2666] mb-3 flex items-center gap-2">
            <Calendar size={18} className="text-[#FF85C1]" />
            最近的记录
          </h3>
          {loading ? (
            <p className="text-sm text-[#8B5FBF] text-center py-4">加载中...</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-[#8B5FBF] text-center py-4">
              还没有运动记录哦～
            </p>
          ) : (
            <div className="space-y-2">
              {records.map((r: ExerciseRecord) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-pink-50 flex items-center justify-center">
                      {EXERCISE_ICON[r.exerciseType] ?? <Sparkles size={20} className="text-[#F59E0B]" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#4A2666]">
                        {EXERCISE_LABEL[r.exerciseType] ?? r.exerciseType}
                        <span className="text-[#A855F7] font-bold ml-2">
                          {r.durationMinutes} 分钟
                        </span>
                      </div>
                      <div className="text-xs text-[#8B5FBF]">
                        {r.recordDate.slice(0, 10)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDelete(r.id);
                    }}
                    className="text-xs text-red-500 px-2 py-1 active:opacity-60"
                  >
                    删掉
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 记录弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] p-5 w-full max-w-sm">
            <h3 className="text-lg font-bold text-[#4A2666] text-center mb-4 flex items-center justify-center gap-2">
              {selectedIcon}
              记一次运动
            </h3>

            <div className="mb-4">
              <label className="text-xs text-[#8B5FBF] block mb-2">
                运动类型
              </label>
              <div className="grid grid-cols-4 gap-2">
                {EXERCISE_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedType(t.key)}
                    className={`py-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      selectedType === t.key
                        ? 'bg-purple-100 text-[#A855F7] border-2 border-[#A855F7]'
                        : 'bg-gray-50 text-[#8B5FBF] border-2 border-transparent'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs text-[#8B5FBF] block mb-2">
                分钟数
              </label>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="例如：30"
                min="1"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-base text-[#4A2666] focus:outline-none focus:border-[#A855F7] text-center font-bold"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-full bg-gray-100 text-[#8B5FBF] text-sm font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSave();
                }}
                disabled={saving || !minutes || Number(minutes) <= 0}
                className="flex-1 py-3 rounded-full text-white text-sm font-bold shadow-md disabled:opacity-60"
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

export default ExercisePage;
