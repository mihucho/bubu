import React, { useState, useEffect, useCallback } from 'react';
import {
  Egg,
  Smile,
  Frown,
  Angry,
  HelpCircle,
  PartyPopper,
  Check,
  BookOpen,
  Star,
} from 'lucide-react';
import StatsHeader from '../../components/StatsHeader';
import { useAppContext } from '../../contexts/AppContext';
import { logger } from '@lark-apaas/client-toolkit/logger';
import IconRenderer from '@client/src/utils/icon-mapper';
import {
  getEggTasks,
  completeEggTask,
  getMoodRecords,
  createMoodRecord,
  exportMoodDiary,
} from '../../api';
import type { EggTask, MoodRecord, KidProfile } from '@shared/api.interface';

interface EmotionOption {
  key: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}

const EMOTIONS: EmotionOption[] = [
  { key: '😊', icon: <Smile size={22} />, label: '开心', color: '#FFD700' },
  { key: '😄', icon: <Smile size={22} />, label: '大笑', color: '#FF85C1' },
  { key: '😔', icon: <Frown size={22} />, label: '难过', color: '#60A5FA' },
  { key: '😠', icon: <Angry size={22} />, label: '生气', color: '#EF4444' },
  { key: '🤔', icon: <HelpCircle size={22} />, label: '思考', color: '#A855F7' },
  { key: '🥳', icon: <PartyPopper size={22} />, label: '庆祝', color: '#22C55E' },
];

const CheckinPage: React.FC = () => {
  const { profile, addStars, loading: profileLoading, setProfile } = useAppContext();

  const [eggTasks, setEggTasks] = useState<EggTask[]>([]);
  const [eggLoading, setEggLoading] = useState<boolean>(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [eggSuccess, setEggSuccess] = useState<string | null>(null);

  const [todayMood, setTodayMood] = useState<MoodRecord | null>(null);
  const [moodLoading, setMoodLoading] = useState<boolean>(true);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [moodContent, setMoodContent] = useState<string>('');
  const [savingMood, setSavingMood] = useState<boolean>(false);
  const [moodSaved, setMoodSaved] = useState<boolean>(false);

  const fetchEggTasks = useCallback(async () => {
    setEggLoading(true);
    try {
      const data = (await getEggTasks()) as EggTask[];
      setEggTasks(data);
    } catch (error) {
      logger.error('加载彩蛋任务失败', error);
    } finally {
      setEggLoading(false);
    }
  }, []);

  const fetchMoodRecords = useCallback(async () => {
    setMoodLoading(true);
    try {
      const data = (await getMoodRecords()) as MoodRecord[];
      // 找今天的记录
      const today = new Date().toISOString().slice(0, 10);
      const todayRecord =
        data.find(
          (r: MoodRecord) => r.recordDate?.slice(0, 10) === today,
        ) ?? null;
      setTodayMood(todayRecord);
      if (todayRecord) {
        setSelectedEmotion(todayRecord.emotion);
        setMoodContent(todayRecord.content);
      }
    } catch (error) {
      logger.error('加载心情记录失败', error);
    } finally {
      setMoodLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      void fetchEggTasks();
      void fetchMoodRecords();
    }
  }, [profile, fetchEggTasks, fetchMoodRecords]);

  const handleCompleteEgg = async (task: EggTask): Promise<void> => {
    if (task.isCompleted || completingId) return;
    setCompletingId(task.id);
    try {
      const result = await completeEggTask(task.id);
      if (result.profile) {
        setProfile(result.profile);
      }
      setEggSuccess(task.id);
      // 更新本地状态
      setEggTasks((prev: EggTask[]) =>
        prev.map((t: EggTask) =>
          t.id === task.id ? { ...t, isCompleted: true } : t,
        ),
      );
      setTimeout(() => setEggSuccess(null), 1500);
    } catch (error) {
      logger.error('完成彩蛋失败', error);
    } finally {
      setCompletingId(null);
    }
  };

  const completedEggCount = eggTasks.filter((t: EggTask) => t.isCompleted)
    .length;

  const handleSaveMood = async (): Promise<void> => {
    if (!selectedEmotion || moodContent.trim() === '' || savingMood) return;
    setSavingMood(true);
    try {
      const result = (await createMoodRecord({
        emotion: selectedEmotion,
        content: moodContent.trim(),
      })) as { record: MoodRecord; profile: KidProfile };
      setTodayMood(result.record);
      if (result.profile) {
        setProfile(result.profile);
      }
      setMoodSaved(true);
    } catch (error) {
      logger.error('保存心情失败', error);
    } finally {
      setSavingMood(false);
    }
  };

  const handleExportDiary = (): void => {
    // 触发导出下载
    logger.info('导出小日记');
    // 创建一个隐藏的 a 标签下载 blob
    const doExport = async (): Promise<void> => {
      try {
        const blob = (await exportMoodDiary()) as Blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '小日记.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        logger.error('导出失败', error);
      }
    };
    void doExport();
  };

  const getSelectedEmotionOption = (): EmotionOption | undefined => {
    return EMOTIONS.find((e) => e.key === selectedEmotion);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        加载中...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        暂无数据
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <StatsHeader profile={profile} />
      <div className="flex-1 px-4 pb-20 space-y-4">
        {/* 今日签到彩蛋 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Egg size={20} className="text-[#FFD700]" />
              <span className="text-[17px] font-bold text-text-primary">
                今日签到彩蛋
              </span>
            </div>
            <span className="text-sm text-text-secondary">
              完成了 {completedEggCount}/{eggTasks.length}
            </span>
          </div>

          {eggLoading ? (
            <div className="text-center text-text-secondary text-sm py-4">
              加载中...
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {eggTasks.map((task: EggTask) => (
                <div
                  key={task.id}
                  onClick={() => {
                    void handleCompleteEgg(task);
                  }}
                  className={`shrink-0 w-[100px] rounded-[20px] p-3 flex flex-col items-center gap-2 transition-all ${task.isCompleted ? 'bg-green-complete text-white' : 'bg-gradient-to-b from-pink-light to-purple-light cursor-pointer active:scale-95'} ${completingId === task.id ? 'opacity-60' : ''}`}
                >
                  <div className="text-white">
                    <IconRenderer emoji={task.icon} size={28} />
                  </div>
                  <div
                    className={`text-sm font-medium text-center ${task.isCompleted ? 'text-white' : 'text-text-primary'}`}
                  >
                    {task.name}
                  </div>
                  {task.isCompleted ? (
                    <div className="text-xs font-medium text-white flex items-center gap-1">
                      完成 <Check size={12} />
                    </div>
                  ) : (
                    <div className="text-[11px] text-text-secondary">
                      点我答题
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 今日小心情 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Smile size={20} className="text-[#FFD700]" />
              <span className="text-[17px] font-bold text-text-primary">
                今日小心情
              </span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${moodSaved ? 'bg-green-progress/20 text-green-complete' : 'bg-pink-light text-[#FF85C1]'}`}
            >
              {moodSaved ? '已记' : '还没记'}
            </span>
          </div>

          <p className="text-sm text-text-primary mb-1">
            今天有什么好玩的、有趣的、或者想记下来的事？写下来，奖励2～
          </p>
          <p className="text-xs text-text-secondary mb-4">
            以后可以导出成一本「小日记」，写作文就有素材啦
          </p>

          {/* 表情选择 */}
          <div className="text-xs text-text-secondary mb-2">选一个表情：</div>
          <div className="flex gap-2 mb-4">
            {EMOTIONS.map((emotion: EmotionOption) => (
              <button
                key={emotion.key}
                type="button"
                onClick={() => setSelectedEmotion(emotion.key)}
                disabled={moodSaved}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${selectedEmotion === emotion.key ? 'bg-[#FF85C1]/20 border-2 border-[#FF85C1] scale-110' : 'bg-pink-light/50 border border-transparent'} ${moodSaved ? 'cursor-default' : 'cursor-pointer active:scale-90'}`}
                style={{ color: emotion.color }}
                aria-label={emotion.label}
              >
                {emotion.icon}
              </button>
            ))}
          </div>

          {/* 输入框 */}
          <div className="mb-4">
            <textarea
              value={moodContent}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setMoodContent(e.target.value)
              }
              disabled={moodSaved}
              placeholder="小小的一件好事也可以写下来～"
              rows={4}
              className="w-full p-3 rounded-xl border border-border-pink bg-pink-light/20 text-sm text-text-primary placeholder:text-text-secondary/50 resize-none focus:outline-none focus:border-[#FF85C1] disabled:bg-gray-50"
            />
          </div>

          {/* 保存按钮 */}
          <button
            type="button"
            onClick={() => {
              void handleSaveMood();
            }}
            disabled={!selectedEmotion || moodContent.trim() === '' || savingMood}
            className="w-full py-3 rounded-full text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            style={{
              background:
                'linear-gradient(90deg, #FF85C1 0%, #A855F7 100%)',
            }}
          >
            {savingMood ? '保存中...' : (todayMood ? '再记一条' : (
              <>
                保存并领2颗星 <Star size={14} className="text-[#FFD700]" />
              </>
            ))}
          </button>
          {moodSaved && (
            <div className="text-center text-green-complete text-sm font-medium mt-2 flex items-center justify-center gap-1">
              <PartyPopper size={16} /> 记录成功！{todayMood ? '' : '获得 2 颗星星～'}
            </div>
          )}
          {todayMood && !moodSaved && (
            <div className="text-center text-text-secondary text-xs mt-2">
              今天已经领过奖励啦，再记一条也很棒～
            </div>
          )}

          {/* 导出按钮 */}
          <button
            type="button"
            onClick={handleExportDiary}
            className="w-full mt-3 py-3 rounded-full border-2 border-border-pink text-text-secondary font-medium text-sm bg-white flex items-center justify-center gap-2"
          >
            <BookOpen size={16} className="text-[#A855F7]" />
            导出小日记
          </button>
        </div>
      </div>

      {/* 彩蛋完成成功提示 */}
      {eggSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="bg-white rounded-[24px] p-6 text-center animate-bounce">
            <Star size={40} className="mx-auto mb-2 text-[#FFD700]" />
            <div className="text-lg font-bold text-text-primary">
              答对啦！+1 颗星
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckinPage;
