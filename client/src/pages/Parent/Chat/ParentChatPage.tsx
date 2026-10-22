import React, { useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Check, MessageCircle, Send, X } from 'lucide-react';
import type { Proposal } from '../../../api/parent';
import { applyProposal, parentChat } from '../../../api/parent';
import {
  getParentAiQuota,
  getParentChildren,
  type ParentAiQuota,
  type ParentChild,
} from '../../../api/parent';
import { useEffect } from 'react';
import '../Tasks/parent-pages.css';
import './parent-chat.css';

interface Turn {
  role: 'me' | 'bubu';
  text: string;
  proposal?: Proposal;
}

/**
 * 家长端「问布布」：P 类只读工具 + D 类提议确认卡。
 * 提议只出卡，家长点「确认」才调 proposal/apply 落库——模型永远不写库。
 */
export const ParentChatPage: React.FC = () => {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childId, setChildId] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [quota, setQuota] = useState<ParentAiQuota | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setQuota(await getParentAiQuota());
      } catch (e) {
        logger.error('读取 AI 额度失败', e);
      }
    })();
  }, []);

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

  const send = async (content: string) => {
    const clean = content.trim();
    if (!clean || busy || !childId) return;
    setBusy(true);
    setText('');
    setTurns((prev) => [...prev, { role: 'me', text: clean }]);
    try {
      const res = await parentChat(childId, clean);
      setTurns((prev) => [...prev, { role: 'bubu', text: res.reply, proposal: res.proposal }]);
    } catch (e) {
      logger.error('问布布失败', e);
      setTurns((prev) => [...prev, { role: 'bubu', text: '这个我暂时看不到，你再说一次' }]);
    } finally {
      setBusy(false);
    }
  };

  const approve = async (p: Proposal) => {
    try {
      await applyProposal(p.kind, p.payload);
      setFlash('已按你的确认办好了');
      setTurns((prev) => prev.map((t) => (t.proposal === p ? { ...t, proposal: undefined } : t)));
      window.setTimeout(() => setFlash(null), 2200);
    } catch (e) {
      logger.error('确认失败', e);
      setFlash('没办成，稍后再试');
    }
  };

  const dismiss = (p: Proposal) => {
    setTurns((prev) => prev.map((t) => (t.proposal === p ? { ...t, proposal: undefined } : t)));
  };

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">问布布</h1>
        <p className="pp-head__sub">
          <MessageCircle size={13} strokeWidth={2.2} aria-hidden /> 只读数据 + 出草稿，改东西要你点确认
        </p>
        {quota ? (
          <p className="pp-head__sub">
            今天还能问 {quota.remaining}/{quota.limit} 次
          </p>
        ) : null}
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

      {flash ? <p className="pc-flash">{flash}</p> : null}

      <div className="pc-thread">
        {turns.map((t, i) => (
          <div key={i} className={`pc-bubble pc-bubble--${t.role}`}>
            <span>{t.text}</span>
            {t.proposal ? (
              <div className="pc-proposal">
                <span className="pc-proposal__title">{t.proposal.title}</span>
                <span className="pc-proposal__meta">
                  {String((t.proposal.payload as { name?: string }).name ?? '')}
                </span>
                <div className="pc-proposal__btns">
                  <button type="button" className="pc-btn pc-btn--ok" onClick={() => void approve(t.proposal as Proposal)}>
                    <Check size={14} strokeWidth={2.6} aria-hidden /> 确认
                  </button>
                  <button type="button" className="pc-btn" onClick={() => dismiss(t.proposal as Proposal)}>
                    <X size={14} strokeWidth={2.6} aria-hidden /> 不要
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {!turns.length ? <p className="pp-empty">问问看：这周两个孩子都做了什么？</p> : null}
      </div>

      <div className="pc-compose">
        <input
          className="pc-input"
          value={text}
          placeholder="比如：这周谁读得多一点"
          maxLength={100}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send(text);
          }}
        />
        <button type="button" className="pc-send" disabled={busy || !text.trim()} onClick={() => void send(text)}>
          <Send size={16} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
    </>
  );
};

export default ParentChatPage;
