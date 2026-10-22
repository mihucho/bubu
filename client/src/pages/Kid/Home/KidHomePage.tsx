import React, { useCallback, useRef, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { BookOpen, Camera, Check, Star, Turtle } from 'lucide-react';
import type { KidHomeDto, KidHomeTask } from '@shared/api.interface';
import { checkinTask } from '../../../api/kid';
import PhotoSheet, { type PhotoDraft } from './PhotoSheet';
import './home.css';

/* ============================================================
   孩子端首页
   结构遵守 DESIGN.md §10.5：状态条 / 页头 / 唯一滚动区 / 底部导航（导航在壳里）
   数字一律 Baloo 2 + tabular-nums，中文走系统栈
   ============================================================ */

const Chest: React.FC<{ filled: number; size: number; ready: boolean }> = ({ filled, size, ready }) => (
  <div className={`kh-chest${ready ? ' kh-chest--ready' : ''}`}>
    <div className="kh-chest__head">
      <span className="kh-chest__title">我的宝箱</span>
      <span className="kh-chest__count">
        {filled}/{size}
      </span>
    </div>
    <div className="kh-chest__slots">
      {Array.from({ length: size }).map((_, i) => (
        <span key={i} className={`kh-chest__slot${i < filled ? ' is-on' : ''}`} />
      ))}
    </div>
    <p className="kh-chest__hint">{ready ? '宝箱满了，可以开啦' : '每攒 10 颗星，宝箱进一格'}</p>
  </div>
);

const TaskRow: React.FC<{
  task: KidHomeTask;
  onDone: (task: KidHomeTask, rowEl: HTMLElement | null) => Promise<void>;
  onPhoto: (task: KidHomeTask) => void;
}> = ({ task, onDone, onPhoto }) => {
  const done = task.isAchieved;
  const waiting = !done && task.hasPendingConfirm;
  const [stamping, setStamping] = useState(false);
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (busy) return;
    setBusy(true);
    setStamping(true);
    window.setTimeout(() => setStamping(false), 460);
    try {
      await onDone(task, e.currentTarget.closest('.kh-task') as HTMLElement | null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`kh-task${done ? ' is-done' : ''}${stamping ? ' is-stamping' : ''}`}
      data-task-id={task.id}
    >
      <span className={`kh-task__ico kh-task__ico--${task.color}`} aria-hidden>
        <BookOpen size={18} strokeWidth={2.2} />
      </span>
      <div className="kh-task__main">
        <div className="kh-task__name">{task.name}</div>
        <div className="kh-task__meta">
          {task.cycleTarget > 1 ? `${task.currentCount}/${task.cycleTarget}` : task.cycleType === 'daily' ? '今天' : '本周'}
          {task.photoRequired ? ' · 要拍照' : ''}
          {task.needConfirm ? ' · 等确认' : ''}
        </div>
      </div>
      {done ? (
        <span className="kh-task__done" aria-label="已完成">
          <Check size={20} strokeWidth={2.6} />
        </span>
      ) : waiting ? (
        <span className="kh-task__wait">等妈妈</span>
      ) : (
        <>
          {task.photoVisible ? (
            <button
              type="button"
              className="kh-task__cam"
              aria-label={`给 ${task.name} 拍照`}
              disabled={busy}
              onClick={() => onPhoto(task)}
            >
              <Camera size={18} strokeWidth={2.2} />
            </button>
          ) : null}
          <button
            type="button"
            className="kh-task__plus"
            aria-label={`打卡 ${task.name}`}
            disabled={busy}
            onClick={(e) => void handle(e)}
          >
            +1
          </button>
        </>
      )}
    </div>
  );
};

export const KidHomePage: React.FC<{ data: KidHomeDto; onChanged?: () => void }> = ({ data, onChanged }) => {
  const { child, cards, daily, weekly, greeting } = data;

  const chestRef = useRef<HTMLDivElement | null>(null);
  const [photoTask, setPhotoTask] = useState<KidHomeTask | null>(null);

  /** 星星飞入宝箱：从任务行飞到宝箱，纯视觉，不动布局 */
  const flyStars = useCallback((fromEl: HTMLElement | null, count: number) => {
    const chest = chestRef.current;
    if (!fromEl || !chest || typeof document === 'undefined') return;
    const from = fromEl.getBoundingClientRect();
    const to = chest.getBoundingClientRect();
    const startX = from.left + from.width * 0.72;
    const startY = from.top + from.height / 2;
    const endX = to.left + to.width * 0.5;
    const endY = to.top + 26;
    for (let i = 0; i < Math.min(3, Math.max(1, count)); i += 1) {
      const dot = document.createElement('span');
      dot.className = 'kh-fly';
      dot.textContent = '★';
      dot.style.left = `${startX}px`;
      dot.style.top = `${startY}px`;
      dot.style.animationDelay = `${i * 70}ms`;
      dot.style.setProperty('--dx', `${endX - startX}px`);
      dot.style.setProperty('--dy', `${endY - startY}px`);
      document.body.appendChild(dot);
      window.setTimeout(() => dot.remove(), 900);
    }
  }, []);

  const submitCheckin = useCallback(
    async (task: KidHomeTask, rowEl: HTMLElement | null, photos: PhotoDraft[] = []) => {
      try {
        const res = await checkinTask(task.id, {
          childId: child.id,
          media: photos.map((p) => ({ name: p.name, url: p.dataUrl })),
          idempotencyKey: `ui:${child.id}:${task.id}:${photos.length ? 'p' : 'n'}:${Date.now()}`,
        });
        if (res.starsGranted > 0) flyStars(rowEl, res.starsGranted);
        onChanged?.();
      } catch (e) {
        logger.error('打卡失败', e);
        throw e;
      }
    },
    [child.id, flyStars, onChanged],
  );

  const doCheckin = useCallback(
    async (task: KidHomeTask, rowEl: HTMLElement | null) => {
      // 需要拍照的任务先开弹层；不需要拍照的直接交
      if (task.photoRequired) {
        setPhotoTask(task);
        return;
      }
      try {
        await submitCheckin(task, rowEl);
      } catch {
        /* 已在 submitCheckin 里记日志 */
      }
    },
    [submitCheckin],
  );

  return (
    <>
      <header className="kh-head">
        <div className="kh-head__avatar" data-color={child.colorKey} aria-hidden>
          <Turtle size={24} strokeWidth={2} />
        </div>
        <div className="kh-head__text">
          <h1 className="kh-head__title">{greeting}</h1>
          <p className="kh-head__sub">
            {cards.taskTotal > 0
              ? `今天 ${cards.taskDone}/${cards.taskTotal} 个任务完成`
              : '今天还没有任务'}
          </p>
        </div>
      </header>

      <div className="kh-cards">
        <div className="kh-card">
          <span className="kh-card__k">可用星星</span>
          <strong className="kh-card__v">{cards.stars}</strong>
        </div>
        <div className="kh-card">
          <span className="kh-card__k">今天得到</span>
          <strong className="kh-card__v">
            <Star size={14} strokeWidth={2.4} aria-hidden /> {cards.starsToday}
          </strong>
        </div>
        <div className="kh-card">
          <span className="kh-card__k">连续天数</span>
          <strong className="kh-card__v">{cards.streak}</strong>
        </div>
        <div className="kh-card">
          <span className="kh-card__k">待确认</span>
          <strong className="kh-card__v">{cards.pendingConfirm}</strong>
        </div>
      </div>

      <div ref={chestRef}>
        <Chest filled={cards.chestFilled} size={cards.chestSize} ready={cards.chestReady} />
      </div>

      <section className="kh-section">
        <h2 className="kh-section__title">每天</h2>
        <div className="kh-tasks">
          {daily.length ? (
            daily.map((t) => (
              <TaskRow key={t.id} task={t} onDone={doCheckin} onPhoto={setPhotoTask} />
            ))
          ) : (
            <p className="kh-empty">今天没有每天任务，休息一下也行</p>
          )}
        </div>
      </section>

      <section className="kh-section">
        <h2 className="kh-section__title">本周</h2>
        <div className="kh-tasks">
          {weekly.length ? (
            weekly.map((t) => (
              <TaskRow key={t.id} task={t} onDone={doCheckin} onPhoto={setPhotoTask} />
            ))
          ) : (
            <p className="kh-empty">这周还没有周任务</p>
          )}
        </div>
      </section>

      {photoTask ? (
        <PhotoSheet
          taskName={photoTask.name}
          required={photoTask.photoRequired}
          onCancel={() => setPhotoTask(null)}
          onSubmit={async (photos) => {
            const row = document.querySelector(`[data-task-id="${photoTask.id}"]`) as HTMLElement | null;
            await submitCheckin(photoTask, row, photos);
            setPhotoTask(null);
          }}
        />
      ) : null}
    </>
  );
};

export default KidHomePage;
