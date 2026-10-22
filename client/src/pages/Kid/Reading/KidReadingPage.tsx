import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { BookOpen, Sparkles } from 'lucide-react';
import type { ReadingSummary } from '../../../api/kid';
import { addReading, getReading } from '../../../api/kid';
import '../Records/records.css';

const QUICK = [10, 15, 20, 30];

export const KidReadingPage: React.FC<{ childId: string }> = ({ childId }) => {
  const [summary, setSummary] = useState<ReadingSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [minutes, setMinutes] = useState(20);
  const [book, setBook] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSummary(await getReading(childId));
    } catch (e) {
      logger.error('读取阅读数据失败', e);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await addReading(childId, minutes, book.trim() || undefined);
      setSummary(res.summary);
      setBook('');
      setFlash(`记下了 ${minutes} 分钟，阅读积分 +${minutes}`);
      window.setTimeout(() => setFlash(null), 2200);
    } catch (e) {
      logger.error('记录阅读失败', e);
      setFlash('这次没记上，再试一次');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="rc-head">
        <div className="rc-head__ico" aria-hidden>
          <BookOpen size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="rc-head__title">阅读</h1>
          <p className="rc-head__sub">
            {summary ? `今天 ${summary.todayMinutes} 分钟 · 这周 ${summary.weekMinutes} 分钟` : '正在取数据'}
          </p>
        </div>
      </header>

      <div className="rc-cards">
        <div className="rc-card">
          <span className="rc-card__k">阅读积分</span>
          <strong className="rc-card__v">{summary?.readingPoints ?? 0}</strong>
        </div>
        <div className="rc-card">
          <span className="rc-card__k">连续天数</span>
          <strong className="rc-card__v">{summary?.readingStreak ?? 0}</strong>
        </div>
      </div>

      <section className="rc-panel">
        <h2 className="rc-panel__title">记一次阅读</h2>
        <div className="rc-quick">
          {QUICK.map((m) => (
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
        <label className="rc-field">
          <span className="rc-field__k">书名</span>
          <input
            className="rc-field__in"
            value={book}
            placeholder="可不填"
            onChange={(e) => setBook(e.target.value)}
            maxLength={40}
          />
        </label>
        <button type="button" className="rc-submit" disabled={busy} onClick={() => void submit()}>
          {busy ? '正在记…' : `记下 ${minutes} 分钟`}
        </button>
        {flash ? <p className="rc-flash">{flash}</p> : null}
      </section>

      <section className="rc-section">
        <h2 className="rc-section__title">最近读的</h2>
        <div className="rc-list">
          {summary?.recent.length ? (
            summary.recent.map((r) => (
              <div key={r.id} className="rc-row">
                <span className="rc-row__name">{r.bookTitle || '一次阅读'}</span>
                <span className="rc-row__meta">
                  {r.minutes} 分钟 · {r.localDate.slice(5)}
                </span>
              </div>
            ))
          ) : (
            <p className="rc-empty">
              <Sparkles size={14} strokeWidth={2.2} aria-hidden /> 还没有记录，读一会儿就来记一笔
            </p>
          )}
        </div>
      </section>
    </>
  );
};

export default KidReadingPage;
