import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Swords } from 'lucide-react';
import type { Quest } from '../../../api/kid';
import { attemptQuest, getQuests } from '../../../api/kid';
import '../Records/records.css';
import './quests.css';

export const KidQuestsPage: React.FC<{ childId: string }> = ({ childId }) => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setQuests(await getQuests(childId));
    } catch (e) {
      logger.error('读取关卡失败', e);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const play = async (q: Quest, result: 'pass' | 'fail') => {
    if (busy) return;
    setBusy(q.id);
    try {
      const res = await attemptQuest(childId, q.id, result);
      setFlash(res.message);
      window.setTimeout(() => setFlash(null), 2400);
      await load();
    } catch (e) {
      logger.error('闯关失败', e);
    } finally {
      setBusy(null);
    }
  };

  const pending = quests.filter((q) => q.status !== 'mastered');
  const done = quests.filter((q) => q.status === 'mastered');

  return (
    <>
      <header className="rc-head">
        <div className="rc-head__ico" aria-hidden>
          <Swords size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="rc-head__title">我的关卡</h1>
          <p className="rc-head__sub">做错的题，再来一次就能通关</p>
        </div>
      </header>

      {flash ? <p className="rc-flash qs-flash">{flash}</p> : null}

      <section className="rc-section">
        <h2 className="rc-section__title">还没通关 · {pending.length}</h2>
        <div className="rc-list">
          {pending.map((q) => (
            <div key={q.id} className="qs-card">
              <div className="qs-card__main">
                <span className="rc-row__name">{q.title}</span>
                <span className="rc-row__meta">
                  {q.subject} · 试过 {q.attemptCount} 次
                </span>
                {q.errorReason ? <span className="qs-card__note">{q.errorReason}</span> : null}
              </div>
              <div className="qs-card__btns">
                <button type="button" className="qs-btn" disabled={busy === q.id} onClick={() => void play(q, 'pass')}>
                  做对了
                </button>
                <button
                  type="button"
                  className="qs-btn qs-btn--ghost"
                  disabled={busy === q.id}
                  onClick={() => void play(q, 'fail')}
                >
                  还不会
                </button>
              </div>
            </div>
          ))}
          {!pending.length ? <p className="rc-empty">没有待通关的关卡，真棒</p> : null}
        </div>
      </section>

      <section className="rc-section">
        <h2 className="rc-section__title">已通关 · {done.length}</h2>
        <div className="rc-list">
          {done.map((q) => (
            <div key={q.id} className="rc-row rc-row--muted">
              <span className="rc-row__name">{q.title}</span>
              <span className="rc-row__meta">通关</span>
            </div>
          ))}
          {!done.length ? <p className="rc-empty">还没有通关记录</p> : null}
        </div>
      </section>
    </>
  );
};

export default KidQuestsPage;
