import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Bell, Check, X } from 'lucide-react';
import type { ParentInbox } from '../../../api/parent';
import { confirmCheckin, getParentInbox, rejectCheckin } from '../../../api/parent';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import '../Tasks/parent-pages.css';
import './notifications.css';

interface PendingRow {
  checkinId: string;
  childId: string;
  childName: string;
  taskName: string;
  localDate: string;
  hasPhoto: boolean;
}

/** 通知中心 + 待确认打卡闭环（确认后才发星） */
export const ParentNotificationsPage: React.FC = () => {
  const [items, setItems] = useState<ParentInbox[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [inbox, overview] = await Promise.all([
        getParentInbox(),
        axiosForBackend({ url: '/api/v2/parent/overview', method: 'GET' }),
      ]);
      setItems(inbox);
      setPending((overview.data as { pending: PendingRow[] }).pending ?? []);
    } catch (e) {
      logger.error('读取通知失败', e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (row: PendingRow, action: 'confirm' | 'reject') => {
    if (busy) return;
    setBusy(row.checkinId);
    try {
      if (action === 'confirm') {
        const res = await confirmCheckin(row.checkinId, row.childId);
        setFlash(res.starsGranted > 0 ? `已确认，星星 +${res.starsGranted}` : '已确认');
      } else {
        await rejectCheckin(row.checkinId, row.childId);
        setFlash('已退回，孩子可以再做一次');
      }
      window.setTimeout(() => setFlash(null), 2400);
      await load();
    } catch (e) {
      logger.error('处理打卡失败', e);
      setFlash('没处理成功，稍后再试');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">通知</h1>
        <p className="pp-head__sub">等你确认的打卡与站内消息</p>
      </header>

      {flash ? <p className="nt-flash">{flash}</p> : null}

      <section className="pp-block">
        <h2 className="pp-block__title">等确认 · {pending.length}</h2>
        <div className="pp-list">
          {pending.map((p) => (
            <div key={p.checkinId} className="pp-task">
              <div className="pp-task__main">
                <span className="pp-task__name">{p.childName} · {p.taskName}</span>
                <span className="pp-task__meta">
                  {p.localDate.slice(5)} {p.hasPhoto ? '· 有照片' : ''}
                </span>
              </div>
              <button
                type="button"
                className="nt-btn nt-btn--ok"
                disabled={busy === p.checkinId}
                onClick={() => void act(p, 'confirm')}
                aria-label="确认"
              >
                <Check size={16} strokeWidth={2.6} aria-hidden />
              </button>
              <button
                type="button"
                className="nt-btn"
                disabled={busy === p.checkinId}
                onClick={() => void act(p, 'reject')}
                aria-label="退回"
              >
                <X size={16} strokeWidth={2.6} aria-hidden />
              </button>
            </div>
          ))}
          {!pending.length ? <p className="pp-empty">没有待确认的打卡</p> : null}
        </div>
      </section>

      <section className="pp-block">
        <h2 className="pp-block__title">站内消息 · {items.length}</h2>
        <div className="pp-list">
          {items.map((m) => (
            <div key={m.id} className={`pp-task${m.readAt ? '' : ' nt-unread'}`}>
              <div className="pp-task__main">
                <span className="pp-task__name">
                  <Bell size={13} strokeWidth={2.2} aria-hidden /> {m.title}
                </span>
                {m.body ? <span className="pp-task__meta">{m.body}</span> : null}
                <span className="pp-task__meta">{m.createdAt.slice(5, 10)}</span>
              </div>
            </div>
          ))}
          {!items.length ? <p className="pp-empty">还没有消息</p> : null}
        </div>
      </section>
    </>
  );
};

export default ParentNotificationsPage;
