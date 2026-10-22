import React, { useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Search } from 'lucide-react';
import type { SearchResult } from '../../../api/parent';
import { searchAll } from '../../../api/parent';
import '../Tasks/parent-pages.css';

export const ParentSearchPage: React.FC = () => {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!q.trim() || busy) return;
    setBusy(true);
    try {
      setResult(await searchAll(q.trim()));
    } catch (e) {
      logger.error('搜索失败', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">搜索</h1>
        <p className="pp-head__sub">找任务、找心愿</p>
      </header>

      <div className="pp-block">
        <label className="pp-row" style={{ gridTemplateColumns: '1fr auto' }}>
          <input
            className="pp-row__in"
            value={q}
            placeholder="输入关键词"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void run();
            }}
          />
          <button type="button" className="pp-task__btn" disabled={busy} onClick={() => void run()}>
            <Search size={14} strokeWidth={2.2} aria-hidden /> 搜索
          </button>
        </label>
      </div>

      {result ? (
        <>
          <section className="pp-block">
            <h2 className="pp-block__title">任务 · {result.tasks.length}</h2>
            <div className="pp-list">
              {result.tasks.map((t) => (
                <div key={t.id} className="pp-task">
                  <div className="pp-task__main">
                    <span className="pp-task__name">{t.name}</span>
                    <span className="pp-task__meta">{t.childName}</span>
                  </div>
                </div>
              ))}
              {!result.tasks.length ? <p className="pp-empty">没有匹配的任务</p> : null}
            </div>
          </section>
          <section className="pp-block">
            <h2 className="pp-block__title">心愿 · {result.wishes.length}</h2>
            <div className="pp-list">
              {result.wishes.map((w) => (
                <div key={w.id} className="pp-task">
                  <div className="pp-task__main">
                    <span className="pp-task__name">{w.title}</span>
                    <span className="pp-task__meta">{w.childName} · {w.status}</span>
                  </div>
                </div>
              ))}
              {!result.wishes.length ? <p className="pp-empty">没有匹配的心愿</p> : null}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
};

export default ParentSearchPage;
