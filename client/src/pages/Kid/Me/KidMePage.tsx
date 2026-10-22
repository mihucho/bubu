import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, Medal, Settings, ShieldCheck, Star, Swords, Trophy } from 'lucide-react';
import type { KidProfileSummary, MemoryFact } from '../../../api/kid';
import { forgetMemory, getKidProfile, getMemoryFacts } from '../../../api/kid';
import '../Records/records.css';

export const KidMePage: React.FC<{ childId: string }> = ({ childId }) => {
  const [me, setMe] = useState<KidProfileSummary | null>(null);
  const [facts, setFacts] = useState<MemoryFact[]>([]);

  const load = useCallback(async () => {
    try {
      const [profile, memory] = await Promise.all([getKidProfile(childId), getMemoryFacts(childId)]);
      setMe(profile);
      setFacts(memory);
    } catch (e) {
      logger.error('读取我的资料失败', e);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const ledgerOk = me ? me.availableStars === me.ledgerSum : null;

  return (
    <>
      <header className="rc-head">
        <div className="rc-head__ico" aria-hidden>
          <Trophy size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="rc-head__title">{me?.nickname ?? '我的'}</h1>
          <p className="rc-head__sub">{me ? `${me.title} · 账号 ${me.loginId}` : '正在取数据'}</p>
        </div>
      </header>

      <div className="rc-cards">
        <div className="rc-card">
          <span className="rc-card__k">可用星星</span>
          <strong className="rc-card__v">
            <Star size={14} strokeWidth={2.4} aria-hidden /> {me?.availableStars ?? 0}
          </strong>
        </div>
        <div className="rc-card">
          <span className="rc-card__k">阅读积分</span>
          <strong className="rc-card__v">{me?.readingPoints ?? 0}</strong>
        </div>
      </div>

      <section className="rc-section">
        <h2 className="rc-section__title">去看看</h2>
        <div className="rc-list">
          <Link className="rc-row rc-row--link" to="/kid/quests">
            <span className="rc-row__name"><Swords size={16} strokeWidth={2.2} aria-hidden /> 我的关卡</span>
            <span className="rc-row__meta">去看</span>
          </Link>
          <Link className="rc-row rc-row--link" to="/kid/badges">
            <span className="rc-row__name"><Medal size={16} strokeWidth={2.2} aria-hidden /> 我的徽章</span>
            <span className="rc-row__meta">去看</span>
          </Link>
          <Link className="rc-row rc-row--link" to="/kid/inbox">
            <span className="rc-row__name"><Mail size={16} strokeWidth={2.2} aria-hidden /> 小信箱</span>
            <span className="rc-row__meta">去看</span>
          </Link>
          <Link className="rc-row rc-row--link" to="/kid/stars">
            <span className="rc-row__name"><Star size={16} strokeWidth={2.2} aria-hidden /> 星星商店</span>
            <span className="rc-row__meta">去看</span>
          </Link>
        </div>
      </section>

      <section className="rc-section">
        <div className="rc-list">
          <Link className="rc-row rc-row--link" to="/gate">
            <span className="rc-row__name"><Settings size={16} strokeWidth={2.2} aria-hidden /> 家长入口</span>
            <span className="rc-row__meta">要密码</span>
          </Link>
        </div>
      </section>

      <section className="rc-section">
        <h2 className="rc-section__title">布布记住的</h2>
        <div className="rc-list">
          {facts.length ? (
            facts.map((f) => (
              <div key={f.id} className="rc-row">
                <span className="rc-row__name">{f.key}：{f.value}</span>
                <button
                  type="button"
                  className="rc-row__meta me-forget"
                  onClick={() => void forgetMemory(childId, f.id).then(load)}
                >
                  忘掉
                </button>
              </div>
            ))
          ) : (
            <p className="rc-empty">布布还没记住什么，多聊聊</p>
          )}
        </div>
      </section>

      <section className="rc-panel">
        <h2 className="rc-panel__title">我的小信息</h2>
        <div className="rc-row rc-row--plain">
          <span className="rc-row__name">
            <KeyRound size={16} strokeWidth={2.2} aria-hidden /> 密码
          </span>
          <span className="rc-row__meta">{me?.mustChangePassword ? '还没改过' : '已改过'}</span>
        </div>
        <div className="rc-row rc-row--plain">
          <span className="rc-row__name">
            <ShieldCheck size={16} strokeWidth={2.2} aria-hidden /> 星星记录
          </span>
          <span className="rc-row__meta">{ledgerOk === null ? '…' : ledgerOk ? '对得上' : '正在核对'}</span>
        </div>
      </section>
    </>
  );
};

export default KidMePage;
