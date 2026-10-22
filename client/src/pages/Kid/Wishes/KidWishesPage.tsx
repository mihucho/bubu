import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Heart, Star } from 'lucide-react';
import type { Wish } from '../../../api/kid';
import { createWish, getWishes } from '../../../api/kid';
import '../Records/records.css';
import './wishes.css';

const STATUS_TEXT: Record<string, string> = {
  pending: '等爸爸妈妈定价',
  priced: '已定价，攒够就能换',
  claimable: '可以换啦',
  claimed: '已经拿到',
  deferred: '再等等',
  expired: '过期了',
};

export const KidWishesPage: React.FC<{ childId: string }> = ({ childId }) => {
  const [balance, setBalance] = useState(0);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getWishes(childId);
      setBalance(res.balance);
      setWishes(res.wishes);
    } catch (e) {
      logger.error('读取心愿失败', e);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    const clean = title.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      await createWish(childId, clean);
      setTitle('');
      await load();
    } catch (e) {
      logger.error('写下心愿失败', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="rc-head">
        <div className="rc-head__ico" aria-hidden>
          <Heart size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="rc-head__title">我的心愿</h1>
          <p className="rc-head__sub">现在有 {balance} 颗星</p>
        </div>
      </header>

      <section className="rc-panel">
        <h2 className="rc-panel__title">写一个心愿</h2>
        <label className="rc-field">
          <span className="rc-field__k">想要</span>
          <input
            className="rc-field__in"
            value={title}
            placeholder="比如：一套恐龙拼图"
            maxLength={40}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <button type="button" className="rc-submit" disabled={busy || !title.trim()} onClick={() => void add()}>
          {busy ? '正在交…' : '交给爸爸妈妈'}
        </button>
      </section>

      <section className="rc-section">
        <h2 className="rc-section__title">我写下的</h2>
        <div className="rc-list">
          {wishes.length ? (
            wishes.map((w) => (
              <div key={w.id} className="rc-row">
                <div className="ws-main">
                  <span className="rc-row__name">{w.title}</span>
                  <span className="rc-row__meta">{STATUS_TEXT[w.status] ?? w.status}</span>
                </div>
                {w.starCost !== null ? (
                  <span className="ws-cost">
                    <Star size={13} strokeWidth={2.4} aria-hidden /> {w.starCost}
                  </span>
                ) : (
                  <span className="rc-row__meta">未定价</span>
                )}
              </div>
            ))
          ) : (
            <p className="rc-empty">还没有心愿，写一个试试</p>
          )}
        </div>
      </section>
    </>
  );
};

export default KidWishesPage;
