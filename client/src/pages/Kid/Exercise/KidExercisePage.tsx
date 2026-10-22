import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Activity, Sparkles } from 'lucide-react';
import type { ExerciseSummary } from '../../../api/kid';
import { addExercise, getExercise } from '../../../api/kid';
import '../Records/records.css';

const TYPES = ['跳绳', '跑步', '骑车', '球类', '其他'];
const MINUTES = [10, 15, 20, 30];

export const KidExercisePage: React.FC<{ childId: string }> = ({ childId }) => {
  const [summary, setSummary] = useState<ExerciseSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState(TYPES[0]);
  const [minutes, setMinutes] = useState(15);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSummary(await getExercise(childId));
    } catch (e) {
      logger.error('读取运动数据失败', e);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await addExercise(childId, type, minutes);
      setSummary(res.summary);
      setFlash(`记下了：${type} ${minutes} 分钟`);
      window.setTimeout(() => setFlash(null), 2200);
    } catch (e) {
      logger.error('记录运动失败', e);
      setFlash('这次没记上，再试一次');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="rc-head">
        <div className="rc-head__ico" aria-hidden>
          <Activity size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="rc-head__title">动起来</h1>
          <p className="rc-head__sub">
            {summary ? `今天 ${summary.todayMinutes} 分钟 · 这周 ${summary.weekMinutes} 分钟` : '正在取数据'}
          </p>
        </div>
      </header>

      <div className="rc-cards">
        <div className="rc-card">
          <span className="rc-card__k">今天动了</span>
          <strong className="rc-card__v">{summary?.todayTimes ?? 0} 次</strong>
        </div>
        <div className="rc-card">
          <span className="rc-card__k">这周动过</span>
          <strong className="rc-card__v">{summary?.weekDays ?? 0} 天</strong>
        </div>
      </div>

      <section className="rc-panel">
        <h2 className="rc-panel__title">记一次运动</h2>
        <div className="rc-quick">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`rc-quick__item${type === t ? ' is-on' : ''}`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="rc-quick">
          {MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              className={`rc-quick__item${minutes === m ? ' is-on' : ''}`}
              onClick={() => setMinutes(m)}
            >
              {m} 分钟
            </button>
          ))}
        </div>
        <button type="button" className="rc-submit" disabled={busy} onClick={() => void submit()}>
          {busy ? '正在记…' : `记下 ${type} ${minutes} 分钟`}
        </button>
        {flash ? <p className="rc-flash">{flash}</p> : null}
      </section>

      <section className="rc-section">
        <h2 className="rc-section__title">最近动的</h2>
        <div className="rc-list">
          {summary?.recent.length ? (
            summary.recent.map((r) => (
              <div key={r.id} className="rc-row">
                <span className="rc-row__name">{r.exerciseType}</span>
                <span className="rc-row__meta">
                  {r.minutes} 分钟 · {r.localDate.slice(5)}
                </span>
              </div>
            ))
          ) : (
            <p className="rc-empty">
              <Sparkles size={14} strokeWidth={2.2} aria-hidden /> 还没有记录，动一动就来记一笔
            </p>
          )}
        </div>
      </section>
    </>
  );
};

export default KidExercisePage;
