import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { CalendarDays } from 'lucide-react';
import type { ParentChild } from '../../../api/parent';
import { getDay, getMonth, getParentChildren } from '../../../api/parent';
import '../Tasks/parent-pages.css';
import './records.css';

function monthOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const ParentRecordsPage: React.FC = () => {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childId, setChildId] = useState('');
  const [month, setMonth] = useState(monthOf(new Date()));
  const [days, setDays] = useState<{ date: string; tasks: number; reading: number }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getDay>> | null>(null);

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

  const load = useCallback(async () => {
    if (!childId) return;
    try {
      const res = await getMonth(childId, month);
      setDays(res.days);
    } catch (e) {
      logger.error('读取月历失败', e);
    }
  }, [childId, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const pick = async (date: string) => {
    setSelected(date);
    try {
      setDetail(await getDay(childId, date));
    } catch (e) {
      logger.error('读取当天明细失败', e);
    }
  };

  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const grid = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const startPad = (first.getUTCDay() + 6) % 7;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: (string | null)[] = Array.from({ length: startPad }, () => null);
    for (let d = 1; d <= lastDay; d += 1) {
      cells.push(`${month}-${String(d).padStart(2, '0')}`);
    }
    return cells;
  }, [month]);

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">记录</h1>
        <p className="pp-head__sub">点一天看那天做了什么</p>
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

      <div className="pp-block">
        <div className="rc-monthbar">
          <button type="button" className="pp-task__btn" onClick={() => {
            const [y, m] = month.split('-').map(Number);
            const d = new Date(Date.UTC(y, m - 2, 1));
            setMonth(monthOf(new Date(d.getUTCFullYear(), d.getUTCMonth(), 1)));
            setSelected(null);
            setDetail(null);
          }}>
            上个月
          </button>
          <span className="rc-monthbar__label">
            <CalendarDays size={14} strokeWidth={2.2} aria-hidden /> {month}
          </span>
          <button type="button" className="pp-task__btn" onClick={() => {
            const [y, m] = month.split('-').map(Number);
            const d = new Date(Date.UTC(y, m, 1));
            setMonth(monthOf(new Date(d.getUTCFullYear(), d.getUTCMonth(), 1)));
            setSelected(null);
            setDetail(null);
          }}>
            下个月
          </button>
        </div>

        <div className="rc-grid">
          {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
            <span key={w} className="rc-grid__head">{w}</span>
          ))}
          {grid.map((date, i) => {
            if (!date) return <span key={`p${i}`} className="rc-grid__cell rc-grid__cell--pad" />;
            const info = dayMap.get(date);
            const level = info ? (info.tasks > 0 && info.reading > 0 ? 'both' : info.tasks > 0 ? 'task' : 'read') : '';
            return (
              <button
                key={date}
                type="button"
                className={`rc-grid__cell rc-grid__cell--${level || 'none'}${selected === date ? ' is-on' : ''}`}
                onClick={() => void pick(date)}
              >
                {Number(date.slice(8))}
              </button>
            );
          })}
        </div>
      </div>

      <section className="pp-block">
        <h2 className="pp-block__title">{selected ?? '选一天'}</h2>
        {detail ? (
          <div className="pp-list">
            {detail.checkins.map((c) => (
              <div key={c.id} className="pp-task">
                <div className="pp-task__main">
                  <span className="pp-task__name">{c.taskName}</span>
                  <span className="pp-task__meta">{c.status === 'done' ? '已完成' : c.status === 'pending_confirm' ? '等确认' : '被驳回'}</span>
                </div>
              </div>
            ))}
            {detail.readings.map((r, i) => (
              <div key={`r${i}`} className="pp-task">
                <div className="pp-task__main">
                  <span className="pp-task__name">阅读 {r.minutes} 分钟</span>
                  <span className="pp-task__meta">{r.bookTitle ?? '—'}</span>
                </div>
              </div>
            ))}
            {detail.exercises.map((e, i) => (
              <div key={`e${i}`} className="pp-task">
                <div className="pp-task__main">
                  <span className="pp-task__name">{e.exerciseType}</span>
                  <span className="pp-task__meta">{e.minutes} 分钟</span>
                </div>
              </div>
            ))}
            {detail.moods.map((m, i) => (
              <div key={`m${i}`} className="pp-task">
                <div className="pp-task__main">
                  <span className="pp-task__name">心情：{m.emotionKey}</span>
                  {m.content ? <span className="pp-task__meta">{m.content}</span> : null}
                </div>
              </div>
            ))}
            {!detail.checkins.length && !detail.readings.length && !detail.exercises.length && !detail.moods.length ? (
              <p className="pp-empty">这天没有记录</p>
            ) : null}
          </div>
        ) : (
          <p className="pp-empty">点月历里的某一天</p>
        )}
      </section>
    </>
  );
};

export default ParentRecordsPage;
