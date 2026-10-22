import React, { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Star } from 'lucide-react';
import type { ParentChild } from '../../../api/parent';
import { getParentChildren } from '../../../api/parent';
import '../Tasks/parent-pages.css';

export const ParentChildrenPage: React.FC = () => {
  const [children, setChildren] = useState<ParentChild[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        setChildren(await getParentChildren());
      } catch (e) {
        logger.error('读取孩子失败', e);
      }
    })();
  }, []);

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">孩子</h1>
        <p className="pp-head__sub">每人一个账号，各有各的节奏</p>
      </header>

      <section className="pp-block">
        <div className="pp-list">
          {children.map((c) => (
            <div key={c.id} className="pp-task">
              <div className="pp-task__main">
                <span className="pp-task__name">{c.nickname}</span>
                <span className="pp-task__meta">{c.title} · 首次体验{c.firstRunDone ? '已完成' : '还没做'}</span>
              </div>
              <span className="pp-task__reward">
                <Star size={13} strokeWidth={2.4} aria-hidden /> {c.availableStars}
              </span>
            </div>
          ))}
          {!children.length ? <p className="pp-empty">还没有孩子档案</p> : null}
        </div>
      </section>
    </>
  );
};

export default ParentChildrenPage;
