import React, { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { MessageCircle, Send } from 'lucide-react';
import type { AiQuota, ChatTurn } from '../../../api/kid';
import { getAiQuota, getChatHistory, sendChat } from '../../../api/kid';
import KidChatDegraded from './KidChatDegraded';
import '../Records/records.css';
import './chat.css';

const QUICK = ['我今天表现怎么样', '我读了几分钟书', '我的星星够换什么', '我今天的心情'];

export const KidChatPage: React.FC<{ childId: string }> = ({ childId }) => {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const load = useCallback(async () => {
    try {
      const [history, q] = await Promise.all([getChatHistory(childId), getAiQuota('kid')]);
      setTurns(history);
      setQuota(q);
    } catch (e) {
      logger.error('读取聊天记录失败', e);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [turns.length]);

  const send = async (content: string) => {
    const clean = content.trim();
    if (!clean || busy) return;
    setBusy(true);
    setText('');
    setTurns((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: 'user', content: clean, createdAt: new Date().toISOString() },
    ]);
    try {
      const res = await sendChat(childId, clean);
      if (res.degraded) {
        // 兜底回答时把服务端轨迹打到控制台：出问题直接看 F12，不用翻服务器日志
        logger.warn('[ai] 降级回答', {
          path: res.path,
          modelCalls: res.modelCalls,
          trace: res.trace,
        });
      }
      if (res.blocked) {
        // 被额度闸拦下：把额度状态刷一遍，页面会切到降级态
        setQuota(await getAiQuota('kid'));
        return;
      }
      setTurns((prev) => [
        ...prev,
        { id: `local-a-${Date.now()}`, role: 'assistant', content: res.reply, createdAt: new Date().toISOString() },
      ]);
    } catch (e) {
      logger.error('布布回复失败', e);
      setTurns((prev) => [
        ...prev,
        {
          id: `local-e-${Date.now()}`,
          role: 'assistant',
          content: '我记不清了，你再说一次好不好',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  // 额度闸没放行：整页切降级态，不给输入框，避免孩子反复被拒
  if (quota && !quota.allowed) {
    return <KidChatDegraded quota={quota} />;
  }

  return (
    <div className="ct-page">
      <header className="rc-head">
        <div className="rc-head__ico" aria-hidden>
          <MessageCircle size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="rc-head__title">说说话</h1>
          <p className="rc-head__sub">布布先开口，你也可以问</p>
        </div>
      </header>

      <div className="ct-thread">
        {turns.length ? (
          turns.map((t) => (
            <div key={t.id} className={`ct-bubble ct-bubble--${t.role === 'user' ? 'me' : 'bubu'}`}>
              {t.content}
            </div>
          ))
        ) : (
          <p className="rc-empty">还没有聊天，点下面一句话开始</p>
        )}
        <div ref={endRef} />
      </div>

      <div className="ct-quick">
        {QUICK.map((q) => (
          <button key={q} type="button" className="ct-chip" disabled={busy} onClick={() => void send(q)}>
            {q}
          </button>
        ))}
      </div>

      <div className="ct-compose">
        <input
          className="ct-input"
          value={text}
          placeholder="想说什么就写在这里…"
          maxLength={100}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send(text);
          }}
        />
        <button type="button" className="ct-send" disabled={busy || !text.trim()} onClick={() => void send(text)}>
          <Send size={18} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
    </div>
  );
};

export default KidChatPage;
