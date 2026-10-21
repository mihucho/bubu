import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  BookOpen,
  Moon,
  CheckCircle,
  Target,
  Egg,
  PartyPopper,
  Star,
  Sparkles,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import StatsHeader from '../../components/StatsHeader';
import { useAppContext } from '../../contexts/AppContext';
import { logger } from '@lark-apaas/client-toolkit/logger';
import IconRenderer from '@client/src/utils/icon-mapper';
import {
  getTasks,
  checkInTask,
  getReadingTracker,
  reorderTasks,
} from '../../api';
import type { Task, ReadingTracker } from '@shared/api.interface';

const HomePage: React.FC = () => {
  const { profile, addStars, refreshProfile, loading: profileLoading, setProfile } =
    useAppContext();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [readingTracker, setReadingTracker] = useState<ReadingTracker[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);
  const [trackerLoading, setTrackerLoading] = useState<boolean>(true);
  const [sortMode, setSortMode] = useState<boolean>(false);
  const [localTaskOrder, setLocalTaskOrder] = useState<Task[]>([]);

  // 打卡弹窗
  const [checkinTask, setCheckinTask] = useState<Task | null>(null);
  const [checkinLoading, setCheckinLoading] = useState<boolean>(false);
  const [checkinSuccess, setCheckinSuccess] = useState<boolean>(false);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const data = (await getTasks()) as Task[];
      const sorted = [...data].sort(
        (a: Task, b: Task) => a.sortOrder - b.sortOrder,
      );
      setTasks(sorted);
      setLocalTaskOrder(sorted);
    } catch (error) {
      logger.error('加载任务失败', error);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const fetchReadingTracker = useCallback(async () => {
    setTrackerLoading(true);
    try {
      const data = (await getReadingTracker()) as ReadingTracker[];
      setReadingTracker(data);
    } catch (error) {
      logger.error('加载阅读追踪失败', error);
    } finally {
      setTrackerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      void fetchTasks();
      if (profile.showReadingTracker) {
        void fetchReadingTracker();
      }
    }
  }, [profile, fetchTasks, fetchReadingTracker]);

  // 本周日期范围
  const getWeekRange = (): string => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const formatDate = (d: Date): string =>
      `${d.getMonth() + 1}月${d.getDate()}日`;
    return `${formatDate(monday)} - ${formatDate(sunday)}`;
  };

  // 本周达标进度
  const achievedCount = tasks.filter((t: Task) => t.isAchieved).length;
  const totalTasks = tasks.length;
  const progressPercent =
    totalTasks > 0 ? Math.round((achievedCount / totalTasks) * 100) : 0;

  // 今日推荐任务
  const recommendedTasks = localTaskOrder.filter((t: Task) => t.isRecommended);

  const handleTaskClick = (task: Task): void => {
    if (sortMode) return;
    setCheckinTask(task);
    setCheckinSuccess(false);
  };

  const handleConfirmCheckin = async (): Promise<void> => {
    if (!checkinTask || checkinLoading) return;
    setCheckinLoading(true);
    try {
      const result = await checkInTask(checkinTask.id);
      if (result.profile) {
        setProfile(result.profile);
      }
      setCheckinSuccess(true);
      // 刷新任务列表
      await fetchTasks();
      setTimeout(() => {
        setCheckinTask(null);
        setCheckinSuccess(false);
      }, 1500);
    } catch (error) {
      logger.error('打卡失败', error);
    } finally {
      setCheckinLoading(false);
    }
  };

  const moveTask = (recIndex: number, direction: 'up' | 'down'): void => {
    const targetRecIndex = direction === 'up' ? recIndex - 1 : recIndex + 1;
    if (targetRecIndex < 0 || targetRecIndex >= recommendedTasks.length)
      return;
    // 在 localTaskOrder 中找到这两个推荐任务的位置并交换
    const idA = recommendedTasks[recIndex].id;
    const idB = recommendedTasks[targetRecIndex].id;
    const newOrder = [...localTaskOrder];
    const idxA = newOrder.findIndex((t: Task) => t.id === idA);
    const idxB = newOrder.findIndex((t: Task) => t.id === idB);
    if (idxA === -1 || idxB === -1) return;
    [newOrder[idxA], newOrder[idxB]] = [newOrder[idxB], newOrder[idxA]];
    setLocalTaskOrder(newOrder);
  };

  const handleToggleSortMode = async (): Promise<void> => {
    if (sortMode) {
      // 保存排序
      try {
        const ids = localTaskOrder.map((t: Task) => t.id);
        await reorderTasks(ids);
        setTasks(localTaskOrder);
      } catch (error) {
        logger.error('保存排序失败', error);
      }
    }
    setSortMode(!sortMode);
  };

  const seenCount = readingTracker.filter((r: ReadingTracker) => r.isSeen)
    .length;
  const totalTracker = readingTracker.length;

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
        {/* 她看了没 板块 */}
        {profile.showReadingTracker && (
          <div className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye size={20} className="text-[#FF85C1]" />
                <span className="text-[17px] font-bold text-text-primary">
                  她看了没
                </span>
              </div>
              <span className="text-sm text-text-secondary">
                已看到 {seenCount}/{totalTracker}
              </span>
            </div>
            {trackerLoading ? (
              <div className="text-center text-text-secondary text-sm py-4">
                加载中...
              </div>
            ) : readingTracker.length === 0 ? (
              <div className="text-center text-text-secondary text-sm py-4">
                暂无待查看内容
              </div>
            ) : (
              <div className="space-y-2">
                {readingTracker.map((item: ReadingTracker) => (
                  <div
                    key={item.id}
                    className="bg-pink-light/50 rounded-xl p-3 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate flex items-center gap-1.5">
                        <BookOpen size={14} className="text-[#A855F7] shrink-0" />
                        {item.bookTitle}
                      </div>
                      {item.note && (
                        <div className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {item.note}
                        </div>
                      )}
                    </div>
                    {!item.isSeen && (
                      <div className="flex flex-col items-center text-xs text-text-secondary shrink-0">
                        <Moon size={20} className="text-text-secondary" />
                        <span className="mt-0.5">{profile?.nickname || '布布'}还没看到</span>
                      </div>
                    )}
                    {item.isSeen && (
                      <div className="flex flex-col items-center text-xs text-green-complete shrink-0">
                        <CheckCircle size={20} className="text-green-complete" />
                        <span className="mt-0.5">已查看</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-text-secondary/70 mt-3 leading-relaxed">
              只读，方便判断该提醒她去看、还是催一下就行。可在设置里关掉。
            </p>
          </div>
        )}

        {/* 本周任务板块 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={20} className="text-[#FF85C1]" />
              <span className="text-[17px] font-bold text-text-primary">
                本周任务
              </span>
            </div>
            <span className="text-sm text-text-secondary">{getWeekRange()}</span>
          </div>

          {/* 进度条 */}
          <div className="mb-2">
            <div className="h-3 bg-pink-light rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background:
                    'linear-gradient(90deg, #FF85C1 0%, #A855F7 100%)',
                }}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-text-primary">
                本周达标 {achievedCount} / {totalTasks} 项，整体进度{' '}
                {progressPercent}%
              </span>
              <button
                type="button"
                onClick={() => {
                  void handleToggleSortMode();
                }}
                className="text-sm font-medium text-text-secondary bg-white border border-border-pink px-3 py-1 rounded-full"
              >
                {sortMode ? '完成排序' : '我自己排顺序'}
              </button>
            </div>
          </div>

          {/* 今日推荐任务网格 */}
          {tasksLoading ? (
            <div className="text-center text-text-secondary text-sm py-8">
              加载中...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {recommendedTasks.map((task: Task, index: number) => (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className={`relative border-2 border-border-pink rounded-[20px] p-3 bg-pink-light/30 flex flex-col gap-2 ${sortMode ? '' : 'active:scale-95 transition-transform cursor-pointer'}`}
                >
                  {/* 排序模式的上下箭头 */}
                  {sortMode && (
                    <div className="absolute right-2 top-2 flex flex-col gap-0.5 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveTask(index, 'up');
                        }}
                        className="w-6 h-6 bg-white border border-border-pink rounded-full text-xs text-text-secondary flex items-center justify-center"
                        disabled={index === 0}
                        aria-label="上移"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveTask(index, 'down');
                        }}
                        className="w-6 h-6 bg-white border border-border-pink rounded-full text-xs text-text-secondary flex items-center justify-center"
                        disabled={index === recommendedTasks.length - 1}
                        aria-label="下移"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  )}

                  {/* 今天推荐标签 */}
                  <div className="self-start">
                    <span className="inline-block bg-[#FF85C1] text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                      今天推荐
                    </span>
                  </div>

                  {/* 任务图标 */}
                  <div className="text-center my-1 flex justify-center">
                    <IconRenderer emoji={task.icon} size={32} className="text-[#A855F7]" />
                  </div>

                  {/* 任务名称 */}
                  <div className="text-sm font-medium text-text-primary text-center truncate">
                    {task.name}
                  </div>

                  {/* 进度 */}
                  <div className="text-sm font-semibold text-[#FF85C1] text-center">
                    {task.currentCount}/{task.targetCount}
                  </div>

                  {/* 底部圆点进度 */}
                  <div className="flex justify-center gap-1 mt-1">
                    {Array.from({ length: task.targetCount }).map(
                      (_: unknown, i: number) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < task.currentCount
                              ? 'bg-[#FF85C1]'
                              : 'border border-border-pink bg-white'
                          }`}
                        />
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 彩蛋入口 */}
        <div
          onClick={() => navigate('/checkin')}
          className="bg-white rounded-[20px] p-4 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <Egg size={24} className="text-[#FFD700]" />
            <span className="text-[15px] font-medium text-text-primary">
              今日签到彩蛋
            </span>
          </div>
          <span className="text-text-secondary text-sm">去看看 →</span>
        </div>
      </div>

      {/* 打卡确认弹窗 */}
      {checkinTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-[300px] text-center">
            {checkinSuccess ? (
              <>
                <div className="mb-3 flex justify-center">
                  <PartyPopper size={48} className="text-[#FFD700]" />
                </div>
                <div className="text-lg font-bold text-text-primary mb-2">
                  打卡成功！
                </div>
                <div className="text-sm text-text-secondary flex items-center justify-center gap-1">
                  获得 {checkinTask.starReward} 颗星星
                  <Star size={14} className="text-[#FFD700]" />
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex justify-center">
                  <IconRenderer emoji={checkinTask.icon} size={40} className="text-[#A855F7]" />
                </div>
                <div className="text-lg font-bold text-text-primary mb-1">
                  {checkinTask.name}
                </div>
                <div className="text-sm text-text-secondary mb-2 flex items-center justify-center gap-1">
                  完成可获得 {checkinTask.starReward} 颗星星
                  <Star size={14} className="text-[#FFD700]" />
                </div>
                <div className="text-sm text-text-secondary mb-5">
                  当前进度：{checkinTask.currentCount}/{checkinTask.targetCount}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckinTask(null)}
                    className="flex-1 py-2.5 rounded-full border border-border-pink text-text-secondary text-sm font-medium"
                    disabled={checkinLoading}
                  >
                    再想想
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleConfirmCheckin();
                    }}
                    className="flex-1 py-2.5 rounded-full text-white text-sm font-medium"
                    style={{
                      background:
                        'linear-gradient(90deg, #FF85C1 0%, #A855F7 100%)',
                    }}
                    disabled={checkinLoading}
                  >
                    {checkinLoading ? '打卡中...' : '确认打卡'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
