import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, MoonStar, Timer } from 'lucide-react';
import type { AiQuota } from '../../../api/kid';
import '../Records/records.css';
import './degraded.css';

const COPY: Record<NonNullable<AiQuota['reason']>, { title: string; body: string; icon: React.ReactNode }> = {
  AI_UNAVAILABLE: {
    title: '这里还不能和布布说话',
    body: '在豆包里打开「布布的学习小天地」，就能和布布聊天啦。现在也可以去看看任务和星星。',
    icon: <MessageCircle size={22} strokeWidth={2.2} />,
  },
  DAILY_LIMIT: {
    title: '今天聊得够多啦',
    body: '布布也要休息。明天再来，今天先把想做的事做起来吧。',
    icon: <MoonStar size={22} strokeWidth={2.2} />,
  },
  RATE_LIMITED: {
    title: '慢一点，布布在听',
    body: '连着说太快了，等一小会儿再问。',
    icon: <Timer size={22} strokeWidth={2.2} />,
  },
};

/**
 * AI 降级页（W6）
 *
 * 三种情况都用同一套「不吓人」的话术：
 * 不在豆包里 / 今天额度用完 / 说得太快。
 * 每一种都给一个能继续走下去的出口，不留死路。
 */
export const KidChatDegraded: React.FC<{ quota: AiQuota }> = ({ quota }) => {
  const reason = quota.reason ?? 'AI_UNAVAILABLE';
  const copy = COPY[reason];

  return (
    <div className="dg-wrap">
      <div className="dg-card">
        <div className="dg-ico" aria-hidden>
          {copy.icon}
        </div>
        <h1 className="dg-title">{copy.title}</h1>
        <p className="dg-body">{copy.body}</p>

        {reason === 'DAILY_LIMIT' ? (
          <p className="dg-meta">
            今天已用 {quota.used}/{quota.limit} 轮
          </p>
        ) : null}

        <div className="dg-actions">
          <Link className="dg-btn" to="/kid">
            回首页看看任务
          </Link>
          <Link className="dg-btn dg-btn--ghost" to="/kid/stars">
            去星星商店
          </Link>
        </div>
      </div>
    </div>
  );
};

export default KidChatDegraded;
