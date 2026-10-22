import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Gift, Star } from 'lucide-react';
import type { ShopItem } from '../../../api/kid';
import { exchangeItem, getShop } from '../../../api/kid';
import '../Records/records.css';
import './shop.css';

export const KidStarsPage: React.FC<{ childId: string }> = ({ childId }) => {
  const [balance, setBalance] = useState(0);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getShop(childId);
      setBalance(res.balance);
      setItems(res.items);
    } catch (e) {
      logger.error('读取商店失败', e);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const buy = async (item: ShopItem) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      const res = await exchangeItem(childId, item.id);
      setBalance(res.balance);
      setFlash(`换好了：${res.itemName}`);
      window.setTimeout(() => setFlash(null), 2200);
      await load();
    } catch (e) {
      logger.error('兑换失败', e);
      setFlash('星星还不够，再攒一点');
      window.setTimeout(() => setFlash(null), 2200);
    } finally {
      setBusyId(null);
    }
  };

  const affordable = items.filter((i) => i.affordable);
  const later = items.filter((i) => !i.affordable);

  return (
    <>
      <header className="rc-head">
        <div className="rc-head__ico" aria-hidden>
          <Gift size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="rc-head__title">星星商店</h1>
          <p className="rc-head__sub">现在有 {balance} 颗星</p>
        </div>
      </header>

      {flash ? <p className="rc-flash sh-flash">{flash}</p> : null}

      <section className="rc-section">
        <h2 className="rc-section__title">买得起的</h2>
        <div className="rc-list">
          {affordable.length ? (
            affordable.map((i) => (
              <div key={i.id} className="rc-row">
                <span className="rc-row__name">{i.name}</span>
                <span className="sh-cost">
                  <Star size={13} strokeWidth={2.4} aria-hidden /> {i.starCost}
                </span>
                <button
                  type="button"
                  className="sh-buy"
                  disabled={busyId === i.id}
                  onClick={() => void buy(i)}
                >
                  换
                </button>
              </div>
            ))
          ) : (
            <p className="rc-empty">还没有买得起的，继续攒星星</p>
          )}
        </div>
      </section>

      <section className="rc-section">
        <h2 className="rc-section__title">还要再攒攒</h2>
        <div className="rc-list">
          {later.length ? (
            later.map((i) => (
              <div key={i.id} className="rc-row rc-row--muted">
                <span className="rc-row__name">{i.name}</span>
                <span className="rc-row__meta">
                  还差 {i.starCost - balance} · 共 {i.starCost} 颗
                </span>
              </div>
            ))
          ) : (
            <p className="rc-empty">全部都能换啦</p>
          )}
        </div>
      </section>
    </>
  );
};

export default KidStarsPage;
