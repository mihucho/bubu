import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Medal, Star } from 'lucide-react';
import type { ParentBadge, ParentChild } from '../../../api/parent';
import { awardBadge, createParentBadge, getParentBadges, getParentChildren } from '../../../api/parent';
import '../Tasks/parent-pages.css';

const RULES = [
  { key: 'manual', label: '我手动发' },
  { key: 'stars', label: '攒够星星' },
  { key: 'streak', label: '连续天数' },
];

export const ParentBadgesPage: React.FC = () => {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childId, setChildId] = useState('');
  const [badges, setBadges] = useState<ParentBadge[]>([]);
  const [name, setName] = useState('');
  const [rule, setRule] = useState('manual');
  const [n, setN] = useState(10);
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

  const load = useCallback(async (id: string) => {
    try {
      setBadges(await getParentBadges(id));
    } catch (e) {
      logger.error('读取徽章失败', e);
    }
  }, []);

  useEffect(() => {
    if (childId) void load(childId);
  }, [childId, load]);

  const add = async () => {
    if (!name.trim() || !childId || busy) return;
    setBusy(true);
    try {
      await createParentBadge({
        childId,
        name: name.trim(),
        iconKey: 'medal',
        ruleType: rule,
        ruleConfig: rule === 'manual' ? {} : { n },
        starReward: 1,
      });
      setName('');
      await load(childId);
    } catch (e) {
      logger.error('新建徽章失败', e);
    } finally {
      setBusy(false);
    }
  };

  const award = async (b: ParentBadge) => {
    await awardBadge(b.id, childId);
    await load(childId);
  };

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">徽章</h1>
        <p className="pp-head__sub">每个孩子最多 6 个自定义徽章</p>
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
        <h2 className="pp-card__title">做一个徽章</h2>
        <label className="pp-row">
          <span className="pp-row__k">名字</span>
          <input className="pp-row__in" value={name} maxLength={8} placeholder="最多 8 个字" onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="pp-row">
          <span className="pp-row__k">怎么拿到</span>
          <div className="pp-chips">
            {RULES.map((r) => (
              <button key={r.key} type="button" className={`pp-chip${rule === r.key ? ' is-on' : ''}`} onClick={() => setRule(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {rule !== 'manual' ? (
          <div className="pp-row">
            <span className="pp-row__k">门槛</span>
            <div className="pp-chips">
              {[5, 10, 20, 50].map((v) => (
                <button key={v} type="button" className={`pp-chip${n === v ? ' is-on' : ''}`} onClick={() => setN(v)}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <button type="button" className="pp-submit" disabled={busy || !name.trim()} onClick={() => void add()}>
          加上
        </button>
      </section>

      <section className="pp-block">
        <h2 className="pp-block__title">已有的 · {badges.length}/6</h2>
        <div className="pp-list">
          {badges.map((b) => (
            <div key={b.id} className="pp-task">
              <div className="pp-task__main">
                <span className="pp-task__name">
                  <Medal size={13} strokeWidth={2.2} aria-hidden /> {b.name}
                </span>
                <span className="pp-task__meta">
                  {b.ruleType === 'manual' ? '手动颁发' : b.ruleType === 'stars' ? '按星星' : '按连续天数'}
                  {b.starReward > 0 ? ` · 奖 ${b.starReward} 星` : ''}
                </span>
              </div>
              {b.awarded ? (
                <span className="pp-task__meta">
                  <Star size={12} strokeWidth={2.4} aria-hidden /> 已颁发
                </span>
              ) : (
                <button type="button" className="pp-task__btn" onClick={() => void award(b)}>
                  颁发
                </button>
              )}
            </div>
          ))}
          {!badges.length ? <p className="pp-empty">还没有自定义徽章</p> : null}
        </div>
      </section>
    </>
  );
};

export default ParentBadgesPage;
