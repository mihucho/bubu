import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Activity, BookOpen, Heart, Home, MessageCircle, ReceiptText, Settings, UserRound, Users } from 'lucide-react';

import '../styles/tokens.css';
import '../styles/shells.css';

/* ============================================================
   四个壳：Gate / Setup / Kid / Parent
   约定：
   - 壳只负责外层结构与导航，不承载业务
   - 视觉值全部来自 tokens.css；家长端靠 data-surface="parent" 换密度
   ============================================================ */

type NavItem = { to: string; label: string; icon: React.ReactNode; end?: boolean };

const NavBar: React.FC<{ items: NavItem[] }> = ({ items }) => (
  <nav className="bbu-nav">
    {items.map((item) => (
      <NavLink key={item.to} to={item.to} end={item.end} className="bbu-nav__item">
        {item.icon}
        <span>{item.label}</span>
      </NavLink>
    ))}
  </nav>
);

const KID_NAV: NavItem[] = [
  { to: '/kid', label: '首页', icon: <Home size={22} strokeWidth={2.2} />, end: true },
  { to: '/kid/reading', label: '阅读', icon: <BookOpen size={22} strokeWidth={2.2} /> },
  { to: '/kid/exercise', label: '动起来', icon: <Activity size={22} strokeWidth={2.2} /> },
  { to: '/kid/chat', label: '说说话', icon: <MessageCircle size={22} strokeWidth={2.2} /> },
  { to: '/kid/me', label: '我的', icon: <UserRound size={22} strokeWidth={2.2} /> },
];

const PARENT_NAV: NavItem[] = [
  { to: '/parent', label: '概览', icon: <Home size={20} strokeWidth={2} />, end: true },
  { to: '/parent/tasks', label: '任务', icon: <ReceiptText size={20} strokeWidth={2} /> },
  { to: '/parent/wishes', label: '心愿', icon: <Heart size={20} strokeWidth={2} /> },
  { to: '/parent/children', label: '孩子', icon: <Users size={20} strokeWidth={2} /> },
  { to: '/parent/settings', label: '我的', icon: <Settings size={20} strokeWidth={2} /> },
];

/** 孩子端壳：粉紫渐变 + 5 tab 底部导航 */
export const KidShell: React.FC = () => (
  <div className="bbu-root bbu-canvas" data-surface="kid">
    <div className="bbu-shell">
      <main className="bbu-shell__main bbu-shell__main--flush">
        <Outlet />
      </main>
      <NavBar items={KID_NAV} />
    </div>
  </div>
);

/** 家长端壳：白灰底 + 更高密度 + 5 tab */
export const ParentShell: React.FC = () => (
  <div className="bbu-root bbu-canvas" data-surface="parent">
    <div className="bbu-shell">
      <main className="bbu-shell__main bbu-shell__main--flush">
        <Outlet />
      </main>
      <NavBar items={PARENT_NAV} />
    </div>
  </div>
);

/** 家长密码门：没有导航，只有一个居中卡片 */
export const GateShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bbu-root bbu-canvas" data-surface="parent">
    <div className="bbu-center">
      <div className="bbu-center__body">{children}</div>
    </div>
  </div>
);

/** 引导壳：顶部进度 + 单列内容 + 底部双按钮 */
export const SetupShell: React.FC<{
  step: number;
  total?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ step, total = 8, children, footer }) => (
  <div className="bbu-root bbu-canvas" data-surface="parent">
    <div className="bbu-shell">
      <div className="bbu-progress" aria-label={`第 ${step} 步，共 ${total} 步`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`bbu-progress__dot${i < step ? ' bbu-progress__dot--done' : ''}`} />
        ))}
      </div>
      <main className="bbu-shell__main">{children}</main>
      {footer ? <div className="bbu-setup__foot">{footer}</div> : null}
    </div>
  </div>
);

/** 孩子端页头 */
export const KidHeader: React.FC<{ title: string; sub?: string; right?: React.ReactNode }> = ({
  title,
  sub,
  right,
}) => (
  <header className="bbu-kidhead">
    <div className="bbu-kidhead__row">
      <div style={{ flex: 1 }}>
        <h1 className="bbu-kidhead__title">{title}</h1>
        {sub ? <p className="bbu-kidhead__sub">{sub}</p> : null}
      </div>
      {right}
    </div>
  </header>
);

/** 家长端页头 */
export const ParentHeader: React.FC<{ title: string; sub?: string; right?: React.ReactNode }> = ({
  title,
  sub,
  right,
}) => (
  <header className="bbu-phead">
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1 }}>
        <h1 className="bbu-phead__title">{title}</h1>
        {sub ? <p className="bbu-phead__sub">{sub}</p> : null}
      </div>
      {right}
    </div>
  </header>
);
