import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Plus, Star } from 'lucide-react';
import type { ParentChild, ParentTask } from '../../../api/parent';
import { createTask, getParentChildren, getParentTasks, toggleTask } from '../../../api/parent';
import './parent-pages.css';

const CYCLES = [
  { key: 'daily', label: '每天' },
  { key: 'weekly', label: '每周' },
];

/**
 * 家长端 · 任务
 * 左标签 / 右值、保存即生效；停用不删除（历史打卡仍要能算）。
 */
export const ParentTasksPage: React.FC = () => {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childId, setChildId] = useState<string>('');
  const [tasks, setTasks] = useState<ParentTask[]>([]);
  const [name, setName] = useState('');
  const [cycleType, setCycleType] = useState('daily');
  const [target, setTarget] = useState(1);
  const [reward, setReward] = useState(1);
  const [needConfirm, setNeedConfirm] = useState(false);
  const [photoRequired, setPhotoRequired] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const list = await getParentChildren();
        setChildren(list);
        if (list[0]) setChildId(list[0].id);
      } catch (e) {
        logger.error('读取孩子失败', e);
      }
    })();
  }, []);

  const load = useCallback(async (id: string) => {
    try {
      setTasks(await getParentTasks(id));
    } catch (e) {
      logger.error('读取任务失败', e);
    }
  }, []);

  useEffect(() => {
    if (childId) void load(childId);
  }, [childId, load]);

  const add = async () => {
    const clean = name.trim();
    if (!clean || !childId || busy) return;
    setBusy(true);
    try {
      await createTask({
        childId,
        name: clean,
        cycleType,
        cycleTarget: target,
        starReward: reward,
        photoRequired,
        needConfirm,
      });
      setName('');
      await load(childId);
    } catch (e) {
      logger.error('新建任务失败', e);
    } finally {
      setBusy(false);
    }
  };

  const flip = async (task: ParentTask) => {
    await toggleTask(childId, task.id, !task.isActive);
    await load(childId);
  };

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">任务</h1>
        <p className="pp-head__sub">给孩子安排要做的事</p>
      </header>

      {children.length > 1 ? (
        <div className="pp-seg">
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`pp-seg__item${childId === c.id ? ' is-on' : ''}`}
              onClick={() => setChildId(c.id)}
            >
              {c.nickname}
            </button>
          ))}
        </div>
      ) : null}

      <section className="pp-card">
        <h2 className="pp-card__title">新建任务</h2>
        <label className="pp-row">
          <span className="pp-row__k">任务名</span>
          <input
            className="pp-row__in"
            value={name}
            maxLength={30}
            placeholder="比如：叫叫阅读"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="pp-row">
          <span className="pp-row__k">周期</span>
          <div className="pp-chips">
            {CYCLES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`pp-chip${cycleType === c.key ? ' is-on' : ''}`}
                onClick={() => setCycleType(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pp-row">
          <span className="pp-row__k">每周期次数</span>
          <div className="pp-chips">
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`pp-chip${target === n ? ' is-on' : ''}`}
                onClick={() => setTarget(n)}
              >
                {n} 次
              </button>
            ))}
          </div>
        </div>
        <div className="pp-row">
          <span className="pp-row__k">奖励星星</span>
          <div className="pp-chips">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={`pp-chip${reward === n ? ' is-on' : ''}`}
                onClick={() => setReward(n)}
              >
                {n} 颗
              </button>
            ))}
          </div>
        </div>
        <label className="pp-row pp-row--switch">
          <span className="pp-row__k">要拍照</span>
          <input type="checkbox" checked={photoRequired} onChange={(e) => setPhotoRequired(e.target.checked)} />
        </label>
        <label className="pp-row pp-row--switch">
          <span className="pp-row__k">要我确认</span>
          <input type="checkbox" checked={needConfirm} onChange={(e) => setNeedConfirm(e.target.checked)} />
        </label>
        <button type="button" className="pp-submit" disabled={busy || !name.trim()} onClick={() => void add()}>
          <Plus size={16} strokeWidth={2.4} aria-hidden /> {busy ? '保存中…' : '加上这个任务'}
        </button>
      </section>

      <section className="pp-block">
        <h2 className="pp-block__title">现有任务 · {tasks.length}</h2>
        <div className="pp-list">
          {tasks.map((t) => (
            <div key={t.id} className={`pp-task${t.isActive ? '' : ' is-off'}`}>
              <div className="pp-task__main">
                <span className="pp-task__name">{t.name}</span>
                <span className="pp-task__meta">
                  {t.cycleType === 'daily' ? '每天' : '每周'} {t.cycleTarget} 次 · 本期 {t.currentCount}
                  {t.needConfirm ? ' · 要确认' : ''}
                  {t.photoRequired ? ' · 要拍照' : ''}
                </span>
              </div>
              <span className="pp-task__reward">
                <Star size={13} strokeWidth={2.4} aria-hidden /> {t.starReward}
              </span>
              <button type="button" className="pp-task__btn" onClick={() => void flip(t)}>
                {t.isActive ? '停用' : '启用'}
              </button>
            </div>
          ))}
          {!tasks.length ? <p className="pp-empty">还没有任务，上面加一个</p> : null}
        </div>
      </section>
    </>
  );
};

export default ParentTasksPage;
