import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  Home,
  BookOpen,
  PersonStanding,
  MessageCircle,
  FileText,
  Gift,
  UserRound,
} from 'lucide-react';
import { AppProvider } from '../contexts/AppContext';

interface NavItemProps {
  to: string;
  end?: boolean;
  icon: React.ReactNode;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, end, icon, label }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
        isActive ? 'text-pink-500' : 'text-text-secondary'
      }`
    }
  >
    <div className="mb-0.5">{icon}</div>
    <span className="text-[10px] leading-none">{label}</span>
  </NavLink>
);

const BottomNav: React.FC = () => (
  <div className="h-[70px] bg-white border-t border-border-pink flex items-center px-2 pb-2 pt-1">
    <NavItem to="/" end icon={<Home size={20} />} label="本周" />
    <NavItem to="/reading" icon={<BookOpen size={20} />} label="阅读" />
    <NavItem to="/exercise" icon={<PersonStanding size={20} />} label="动起来" />
    <NavItem to="/chat" icon={<MessageCircle size={20} />} label="说说话" />
    <NavItem to="/wrong-questions" icon={<FileText size={20} />} label="错题本" />
    <NavItem to="/stars" icon={<Gift size={20} />} label="星星" />
    <NavItem to="/parent" icon={<UserRound size={20} />} label="家长" />
  </div>
);

const Layout: React.FC = () => {
  return (
    <div className="h-screen w-full flex justify-center bg-gray-100">
      <div
        className="w-full max-w-[430px] h-full flex flex-col relative overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, #FFF0F5 0%, #F3E8FF 100%)',
        }}
      >
        <AppProvider>
          <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
            <Outlet />
          </main>
          <BottomNav />
        </AppProvider>
      </div>
    </div>
  );
};

export default Layout;
