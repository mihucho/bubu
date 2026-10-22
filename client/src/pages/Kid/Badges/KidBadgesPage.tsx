import React, { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Medal, Star } from 'lucide-react';
import type { Badge } from '../../../api/kid';
import { getBadges } from '../../../api/kid';
import '../Records/records.css';
import './badges.css';

export const KidBadgesPage: React.FC<{ childId: string }> = ({ childId }) => {
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        setBadges(await getBadges(childId));
      } catch (e) {
        logger.error('读取徽章失败', e);
      }
    })();
  }, [childId]);

  const earned = badges.filter((b) => b.earnedAt);
  const locked = badges.filter((b) => !b.earnedAt);

  return (
    <>
      <header className="rc-head">
        <div className="rc-head__ico" aria-hidden>
          <Medal size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="rc-head__title">我的徽章</h1>
          <p className="rc-head__sub">已经拿到 {earned.length} 个</p>
        </div>
      </header>

      <section className="rc-section">
        <h2 className="rc-section__title">拿到的</h2>
        <div className="bd-grid">
          {earned.map((b) => (
            <div key={b.id} className="bd-item is-on">
              <Medal size={20} strokeWidth={2.2} aria-hidden />
              <span className="bd-item__name">{b.name}</span>
              {b.praiseText ? <span className="bd-item__note">{b.praiseText}</span> : null}
            </div>
          ))}
          {!earned.length ? <p className="rc-empty">还没有徽章，继续做任务就有</p> : null}
        </div>
      </section>

      <section className="rc-section">
        <h2 className="rc-section__title">还没拿到的</h2>
        <div className="bd-grid">
          {locked.map((b) => (
            <div key={b.id} className="bd-item">
              <Medal size={20} strokeWidth={2.2} aria-hidden />
              <span className="bd-item__name">{b.name}</span>
              {b.starReward > 0 ? (
                <span className="bd-item__note">
                  <Star size={12} strokeWidth={2.4} aria-hidden /> {b.starReward}
                </span>
              ) : null}
            </div>
          ))}
          {!locked.length ? <p className="rc-empty">全部拿到啦</p> : null}
        </div>
      </section>
    </>
  );
};

export default KidBadgesPage;
