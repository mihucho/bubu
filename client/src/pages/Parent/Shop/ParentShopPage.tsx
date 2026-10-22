import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Star } from 'lucide-react';
import type { ParentChild, ParentShopItem } from '../../../api/parent';
import { createShopItem, getParentChildren, getParentShop, updateShopItem } from '../../../api/parent';
import '../Tasks/parent-pages.css';

export const ParentShopPage: React.FC = () => {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childId, setChildId] = useState('');
  const [items, setItems] = useState<ParentShopItem[]>([]);
  const [name, setName] = useState('');
  const [cost, setCost] = useState(10);
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
      setItems(await getParentShop());
    } catch (e) {
      logger.error('读取商店失败', e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!name.trim() || !childId || busy) return;
    setBusy(true);
    try {
      await createShopItem({ childId, name: name.trim(), starCost: cost });
      setName('');
      await load();
    } catch (e) {
      logger.error('新建商品失败', e);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: ParentShopItem) => {
    await updateShopItem(item.id, { childId: item.childId, isActive: !item.isActive });
    await load();
  };

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">星星商店</h1>
        <p className="pp-head__sub">孩子攒星来换的东西</p>
      </header>

      {children.length > 1 ? (
        <div className="pp-seg">
          {children.map((c) => (
            <button key={c.id} type="button" className={`pp-seg__item${childId === c.id ? ' is-on' : ''}`} onClick={() => setChildId(c.id)}>
              {c.nickname}
            </button>
          ))}
        </div>
      ) : null}

      <section className="pp-card">
        <h2 className="pp-card__title">加一个</h2>
        <label className="pp-row">
          <span className="pp-row__k">名称</span>
          <input className="pp-row__in" value={name} maxLength={20} placeholder="比如：周末多玩 1 小时" onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="pp-row">
          <span className="pp-row__k">价格</span>
          <div className="pp-chips">
            {[5, 10, 20, 30, 50].map((n) => (
              <button key={n} type="button" className={`pp-chip${cost === n ? ' is-on' : ''}`} onClick={() => setCost(n)}>
                {n} 颗
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="pp-submit" disabled={busy || !name.trim()} onClick={() => void add()}>
          加上
        </button>
      </section>

      <section className="pp-block">
        <h2 className="pp-block__title">现有的 · {items.length}</h2>
        <div className="pp-list">
          {items.map((i) => (
            <div key={i.id} className={`pp-task${i.isActive ? '' : ' is-off'}`}>
              <div className="pp-task__main">
                <span className="pp-task__name">{i.name}</span>
                <span className="pp-task__meta">{i.childName}</span>
              </div>
              <span className="pp-task__reward">
                <Star size={13} strokeWidth={2.4} aria-hidden /> {i.starCost}
              </span>
              <button type="button" className="pp-task__btn" onClick={() => void toggle(i)}>
                {i.isActive ? '下架' : '上架'}
              </button>
            </div>
          ))}
          {!items.length ? <p className="pp-empty">还没有商品</p> : null}
        </div>
      </section>
    </>
  );
};

export default ParentShopPage;
