import React, { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { ShieldCheck } from 'lucide-react';
import type { PrivacyDoc } from '../../../api/parent';
import { getConsents, getPrivacyDoc, requestAccountDeletion } from '../../../api/parent';
import '../Tasks/parent-pages.css';
import '../Settings/settings.css';

export const ParentPrivacyPage: React.FC = () => {
  const [doc, setDoc] = useState<PrivacyDoc | null>(null);
  const [consents, setConsents] = useState<{ kind: string; version: string; grantedAt: string }[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [d, c] = await Promise.all([getPrivacyDoc(), getConsents()]);
        setDoc(d);
        setConsents(c);
      } catch (e) {
        logger.error('读取隐私文档失败', e);
      }
    })();
  }, []);

  const remove = async () => {
    if (confirmText !== '删除') {
      setFlash('要输入「删除」两个字才能继续');
      return;
    }
    try {
      const res = await requestAccountDeletion();
      setFlash(`已提交，${res.readonlyUntilDays} 天内只读，之后清除`);
    } catch (e) {
      logger.error('注销失败', e);
      setFlash('没能提交，可能不是创建人账号');
    }
  };

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">隐私与账号</h1>
        <p className="pp-head__sub">
          <ShieldCheck size={13} strokeWidth={2.2} aria-hidden /> 版本 {doc?.version ?? '—'}
        </p>
      </header>

      {flash ? <p className="st-flash">{flash}</p> : null}

      {(doc?.sections ?? []).map((s) => (
        <section key={s.title} className="pp-card" style={{ marginBottom: 10 }}>
          <h2 className="pp-card__title">{s.title}</h2>
          <p className="pv-body">{s.body}</p>
        </section>
      ))}

      <section className="pp-block">
        <h2 className="pp-block__title">同意记录</h2>
        <div className="pp-list">
          {consents.map((c, i) => (
            <div key={`${c.kind}${i}`} className="pp-task">
              <div className="pp-task__main">
                <span className="pp-task__name">{c.kind === 'guardian' ? '监护人同意' : '建档同意'}</span>
                <span className="pp-task__meta">版本 {c.version} · {c.grantedAt.slice(0, 10)}</span>
              </div>
            </div>
          ))}
          {!consents.length ? <p className="pp-empty">还没有同意记录</p> : null}
        </div>
      </section>

      <section className="pp-card" style={{ marginTop: 12 }}>
        <h2 className="pp-card__title">注销账号</h2>
        <p className="pv-body">
          只有创建人（owner）能注销。注销后立即停用，7 天内只读，之后清除孩子档案与记录。这个操作不可撤销。
        </p>
        <label className="pp-row">
          <span className="pp-row__k">输入「删除」</span>
          <input className="pp-row__in" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </label>
        <button type="button" className="pp-submit" style={{ background: 'var(--k-danger)' }} onClick={() => void remove()}>
          提交注销
        </button>
      </section>
    </>
  );
};

export default ParentPrivacyPage;
