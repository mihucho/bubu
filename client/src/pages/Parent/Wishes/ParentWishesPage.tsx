import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Star } from 'lucide-react';
import type { ParentWish } from '../../../api/parent';
import { getParentWishes, priceWish } from '../../../api/parent';
import '../Tasks/parent-pages.css';

const STATUS_TEXT: Record<string, string> = {
  pending: '等定价',
  priced: '已定价',
  claimable: '可以换',
  claimed: '已拿到',
  deferred: '已延后',
  expired: '已过期',
};

export const ParentWishesPage: React.FC = () => {
  const [wishes, setWishes] = useState<ParentWish[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [cost, setCost] = useState(20);

  const load = useCallback(async () => {
    try {
      setWishes(await getParentWishes());
    } catch (e) {
      logger.error('读取心愿失败', e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (w: ParentWish) => {
    try {
      await priceWish(w.childId, w.id, cost);
      setEditing(null);
      await load();
    } catch (e) {
      logger.error('定价失败', e);
    }
  };

  const pending = wishes.filter((w) => w.status === 'pending');
  const rest = wishes.filter((w) => w.status !== 'pending');

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">心愿</h1>
        <p className="pp-head__sub">孩子写的愿望，你定价</p>
      </header>

      <section className="pp-block">
        <h2 className="pp-block__title">等定价 · {pending.length}</h2>
        <div className="pp-list">
          {pending.map((w) => (
            <div key={w.id} className="pp-task">
              <div className="pp-task__main">
                <span className="pp-task__name">{w.childName} 想「{w.title}」</span>
                {editing === w.id ? (
                  <div className="pp-chips" style={{ marginTop: 6 }}>
                    {[10, 20, 30, 50].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`pp-chip${cost === n ? ' is-on' : ''}`}
                        onClick={() => setCost(n)}
                      >
                        {n} 颗
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="pp-task__meta">还没定价</span>
                )}
              </div>
              {editing === w.id ? (
                <button type="button" className="pp-task__btn" onClick={() => void save(w)}>
                  保存
                </button>
              ) : (
                <button type="button" className="pp-task__btn" onClick={() => setEditing(w.id)}>
                  定价
                </button>
              )}
            </div>
          ))}
          {!pending.length ? <p className="pp-empty">没有等定价的心愿</p> : null}
        </div>
      </section>

      <section className="pp-block">
        <h2 className="pp-block__title">全部心愿 · {wishes.length}</h2>
        <div className="pp-list">
          {rest.map((w) => (
            <div key={w.id} className="pp-task">
              <div className="pp-task__main">
                <span className="pp-task__name">{w.childName} · {w.title}</span>
                <span className="pp-task__meta">{STATUS_TEXT[w.status] ?? w.status}</span>
              </div>
              {w.starCost !== null ? (
                <span className="pp-task__reward">
                  <Star size={13} strokeWidth={2.4} aria-hidden /> {w.starCost}
                </span>
              ) : null}
            </div>
          ))}
          {!rest.length ? <p className="pp-empty">还没有其他心愿</p> : null}
        </div>
      </section>
    </>
  );
};

export default ParentWishesPage;
