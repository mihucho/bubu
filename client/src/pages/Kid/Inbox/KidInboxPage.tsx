import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Mail } from 'lucide-react';
import type { InboxMessage } from '../../../api/kid';
import { getInbox, readMessage } from '../../../api/kid';
import '../Records/records.css';
import './inbox.css';

export const KidInboxPage: React.FC<{ childId: string }> = ({ childId }) => {
  const [items, setItems] = useState<InboxMessage[]>([]);

  const load = useCallback(async () => {
    try {
      setItems(await getInbox(childId));
    } catch (e) {
      logger.error('读取小信箱失败', e);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (m: InboxMessage) => {
    if (m.readAt) return;
    await readMessage(m.id);
    await load();
  };

  return (
    <>
      <header className="rc-head">
        <div className="rc-head__ico" aria-hidden>
          <Mail size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="rc-head__title">小信箱</h1>
          <p className="rc-head__sub">{items.length} 封信</p>
        </div>
      </header>

      <section className="rc-section">
        <div className="rc-list">
          {items.map((m) => (
            <button key={m.id} type="button" className={`ib-item${m.readAt ? '' : ' is-new'}`} onClick={() => void open(m)}>
              <span className="ib-item__title">{m.title}</span>
              {m.body ? <span className="ib-item__body">{m.body}</span> : null}
              <span className="ib-item__meta">
                {m.createdAt.slice(5, 10)} · {m.readAt ? '已读' : '新'}
              </span>
            </button>
          ))}
          {!items.length ? <p className="rc-empty">还没有信，妈妈会给你留话的</p> : null}
        </div>
      </section>
    </>
  );
};

export default KidInboxPage;
