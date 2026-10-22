import React, { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Copy, UserPlus } from 'lucide-react';
import { createInvite, getFamilyMembers } from '../../../api/parent';
import '../Tasks/parent-pages.css';
import '../Settings/settings.css';

export const ParentFamilyPage: React.FC = () => {
  const [members, setMembers] = useState<{ id: string; displayName: string; role: string; phone: string }[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setMembers(await getFamilyMembers());
      } catch (e) {
        logger.error('读取成员失败', e);
      }
    })();
  }, []);

  const invite = async () => {
    try {
      const res = await createInvite();
      setCode(res.code);
      setFlash('24 小时内有效，只能用一次');
    } catch (e) {
      logger.error('生成邀请码失败', e);
      setFlash('没生成成功');
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setFlash('已复制');
    } catch {
      setFlash('长按上面的码复制');
    }
  };

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">一起管的人</h1>
        <p className="pp-head__sub">最多 4 位家长，各有各的账号</p>
      </header>

      {flash ? <p className="st-flash">{flash}</p> : null}

      <section className="pp-block">
        <div className="pp-list">
          {members.map((m) => (
            <div key={m.id} className="pp-task">
              <div className="pp-task__main">
                <span className="pp-task__name">{m.displayName}</span>
                <span className="pp-task__meta">{m.role === 'owner' ? '创建人' : '成员'} · {m.phone}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pp-card" style={{ marginTop: 12 }}>
        <h2 className="pp-card__title">
          <UserPlus size={14} strokeWidth={2.2} aria-hidden /> 邀请家长
        </h2>
        {code ? (
          <>
            <p className="inv-code">{code}</p>
            <button type="button" className="pp-submit" onClick={() => void copy()}>
              <Copy size={14} strokeWidth={2.2} aria-hidden /> 复制邀请码
            </button>
          </>
        ) : (
          <button type="button" className="pp-submit" onClick={() => void invite()}>
            生成 6 位邀请码
          </button>
        )}
        <p className="st-hint" style={{ marginTop: 8 }}>
          把码给另一位家长，24 小时内有效、只能用一次。
        </p>
      </section>
    </>
  );
};

export default ParentFamilyPage;
