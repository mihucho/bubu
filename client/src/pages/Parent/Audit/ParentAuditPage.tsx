import React, { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getAudit } from '../../../api/parent';
import '../Tasks/parent-pages.css';

const ACTION_TEXT: Record<string, string> = {
  'child.archive': '归档了孩子档案',
  'checkin.confirm': '确认了打卡',
  'checkin.backfill': '补记了打卡',
  'task.update': '改了任务',
  'task.delete': '删了任务',
  'exchange.refund': '退了兑换',
  'photo.allow': '调整了照片权限',
  'device.revoke': '移除了设备',
  'password.reset': '重置了密码',
};

export const ParentAuditPage: React.FC = () => {
  const [rows, setRows] = useState<{ id: string; action: string; targetTable: string | null; localDate: string }[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        setRows(await getAudit());
      } catch (e) {
        logger.error('读取操作记录失败', e);
      }
    })();
  }, []);

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">操作记录</h1>
        <p className="pp-head__sub">谁改了什么，都会留在这里（不可删）</p>
      </header>

      <section className="pp-block">
        <div className="pp-list">
          {rows.map((r) => (
            <div key={r.id} className="pp-task">
              <div className="pp-task__main">
                <span className="pp-task__name">{ACTION_TEXT[r.action] ?? r.action}</span>
                <span className="pp-task__meta">{r.targetTable ?? '—'}</span>
              </div>
              <span className="pp-task__meta">{r.localDate.slice(5)}</span>
            </div>
          ))}
          {!rows.length ? <p className="pp-empty">还没有操作记录</p> : null}
        </div>
      </section>
    </>
  );
};

export default ParentAuditPage;
