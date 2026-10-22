import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { FileText, Star } from 'lucide-react';
import type { ParentChild, ParentReport } from '../../../api/parent';
import { ensureReport, getParentChildren, getReports } from '../../../api/parent';
import '../Tasks/parent-pages.css';

export const ParentReportsPage: React.FC = () => {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childId, setChildId] = useState('');
  const [reports, setReports] = useState<ParentReport[]>([]);
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

  const load = useCallback(async () => {
    try {
      setReports(await getReports());
    } catch (e) {
      logger.error('读取报告失败', e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (rangeType: '7d' | '30d') => {
    if (!childId || busy) return;
    setBusy(true);
    try {
      await ensureReport(childId, rangeType);
      await load();
    } catch (e) {
      logger.error('生成报告失败', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">周期报告</h1>
        <p className="pp-head__sub">报告是当时那一版的快照，不会事后改数</p>
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

      <div className="pp-seg">
        <button type="button" className="pp-seg__item" disabled={busy} onClick={() => void create('7d')}>
          生成近 7 天
        </button>
        <button type="button" className="pp-seg__item" disabled={busy} onClick={() => void create('30d')}>
          生成近 30 天
        </button>
      </div>

      <section className="pp-block">
        <div className="pp-list">
          {reports.map((r) => (
            <article key={r.id} className="pp-task" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="pp-task__main">
                <span className="pp-task__name">
                  <FileText size={14} strokeWidth={2.2} aria-hidden /> {r.rangeStart} ~ {r.rangeEnd}（{r.rangeType}）
                </span>
                <span className="pp-task__meta">
                  阅读 {r.payload.range?.readingMinutes ?? 0} 分钟 · 运动 {r.payload.range?.exerciseCount ?? 0} 次 · 心情 {r.payload.range?.moodDays ?? 0} 天
                </span>
                <span className="pp-task__meta">
                  <Star size={12} strokeWidth={2.4} aria-hidden /> 得 {r.payload.range?.starsIn ?? 0} · 用 {r.payload.range?.starsOut ?? 0}
                </span>
                {(r.payload.observation ?? []).map((o) => (
                  <span key={o} className="pp-task__meta">
                    · {o}
                  </span>
                ))}
                {r.payload.suggestion ? <span className="pp-task__meta">{r.payload.suggestion}</span> : null}
              </div>
            </article>
          ))}
          {!reports.length ? <p className="pp-empty">还没有报告，点上面生成一份</p> : null}
        </div>
      </section>
    </>
  );
};

export default ParentReportsPage;
