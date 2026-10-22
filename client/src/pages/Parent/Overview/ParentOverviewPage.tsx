import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { Link } from 'react-router-dom';
import { Bell, CalendarDays, ChevronRight, FileText, MessageCircle, Star } from 'lucide-react';
import './parent.css';

interface ParentChildCard {
  id: string;
  nickname: string;
  avatarKey: string;
  colorKey: string;
  availableStars: number;
  todayDone: number;
  todayTotal: number;
  pendingConfirm: number;
  weekMinutes: number;
}

interface Overview {
  greeting: string;
  children: ParentChildCard[];
  pending: { checkinId: string; childId: string; childName: string; taskName: string; localDate: string; hasPhoto: boolean }[];
  wishesToPrice: { id: string; childId: string; childName: string; title: string }[];
  localDate: string;
}

/**
 * 家长端概览
 * 零比较铁律：孩子卡片永远并列等宽，不排序、不带箭头涨跌、不出现"更/比较"字样。
 */
export const ParentOverviewPage: React.FC = () => {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosForBackend({ url: '/api/v2/parent/overview', method: 'GET' });
      setData(res.data as Overview);
    } catch (e) {
      logger.error('读取家长端概览失败', e);
      setError('没能取到数据，稍后再试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <div className="pt-skel" aria-busy="true" />;
  if (error || !data) {
    return (
      <div className="pt-error" role="alert">
        <p>{error ?? '没有数据'}</p>
        <button type="button" onClick={() => void load()}>
          再试一次
        </button>
      </div>
    );
  }

  const pendingCount = data.pending.length + data.wishesToPrice.length;

  return (
    <>
      <header className="pt-head">
        <h1 className="pt-head__title">{data.greeting}，{data.children.length} 个孩子都在</h1>
        <p className="pt-head__sub">{data.localDate}</p>
      </header>

      {pendingCount > 0 ? (
        <section className="pt-block">
          <h2 className="pt-block__title">等你处理 · {pendingCount}</h2>
          <div className="pt-list">
            {data.pending.map((p) => (
              <div key={p.checkinId} className="pt-row">
                <div className="pt-row__main">
                  <span className="pt-row__name">{p.childName} 交了「{p.taskName}」</span>
                  <span className="pt-row__meta">
                    {p.hasPhoto ? '带照片 · ' : ''}
                    {p.localDate.slice(5)} · 等你确认
                  </span>
                </div>
                <span className="pt-row__go">
                  去确认 <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
                </span>
              </div>
            ))}
            {data.wishesToPrice.map((w) => (
              <div key={w.id} className="pt-row">
                <div className="pt-row__main">
                  <span className="pt-row__name">{w.childName} 想「{w.title}」</span>
                  <span className="pt-row__meta">还没定价</span>
                </div>
                <span className="pt-row__go">
                  去定价 <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="pt-block">
          <div className="pt-empty">今天没有等你处理的事</div>
        </section>
      )}

      <section className="pt-block">
        <h2 className="pt-block__title">去看</h2>
        <div className="pt-list">
          <Link className="pt-row pt-row--link" to="/parent/chat">
            <span className="pt-row__name">
              <MessageCircle size={14} strokeWidth={2.2} aria-hidden /> 问布布
            </span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </Link>
          <Link className="pt-row pt-row--link" to="/parent/notifications">
            <span className="pt-row__name">
              <Bell size={14} strokeWidth={2.2} aria-hidden /> 通知与待确认
            </span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </Link>
          <Link className="pt-row pt-row--link" to="/parent/reports">
            <span className="pt-row__name">
              <FileText size={14} strokeWidth={2.2} aria-hidden /> 周期报告
            </span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </Link>
          <Link className="pt-row pt-row--link" to="/parent/records">
            <span className="pt-row__name">
              <CalendarDays size={14} strokeWidth={2.2} aria-hidden /> 记录月历
            </span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </Link>
        </div>
      </section>

      <section className="pt-block">
        <h2 className="pt-block__title">孩子们</h2>
        <div className="pt-kids">
          {data.children.map((c) => (
            <article key={c.id} className="pt-kid">
              <div className="pt-kid__top">
                <span className="pt-kid__name">{c.nickname}</span>
                <span className="pt-kid__stars">
                  <Star size={13} strokeWidth={2.4} aria-hidden /> {c.availableStars}
                </span>
              </div>
              <div className="pt-kid__rows">
                <div className="pt-kid__row">
                  <span>本周任务</span>
                  <b>
                    {c.todayDone}/{c.todayTotal}
                  </b>
                </div>
                <div className="pt-kid__row">
                  <span>待确认</span>
                  <b>{c.pendingConfirm}</b>
                </div>
                <div className="pt-kid__row">
                  <span>本周得星</span>
                  <b>{c.weekMinutes}</b>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
};

export default ParentOverviewPage;
