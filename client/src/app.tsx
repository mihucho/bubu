import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { KidProvider } from './contexts/KidContext';
import { SetupGate } from './components/SetupGate';
import { KidShell, ParentShell } from './shells/Shells';
import { ForgotPage, LoginPage, RegisterPage } from './pages/Auth/AuthPages';
import { GatePage } from './pages/Gate/GatePage';
import { KidHomeContainer } from './pages/Kid/Home/KidHomeContainer';
import { KidPageShell } from './pages/Kid/KidPageShell';
import { KidReadingPage } from './pages/Kid/Reading/KidReadingPage';
import { KidExercisePage } from './pages/Kid/Exercise/KidExercisePage';
import { KidMePage } from './pages/Kid/Me/KidMePage';
import { ParentOverviewPage } from './pages/Parent/Overview/ParentOverviewPage';
import { KidStarsPage } from './pages/Kid/Stars/KidStarsPage';
import { KidWishesPage } from './pages/Kid/Wishes/KidWishesPage';
import { KidCheckinPage } from './pages/Kid/Checkin/KidCheckinPage';
import { ParentTasksPage } from './pages/Parent/Tasks/ParentTasksPage';
import { ParentWishesPage } from './pages/Parent/Wishes/ParentWishesPage';
import { ParentChildrenPage } from './pages/Parent/Children/ParentChildrenPage';
import { KidChatPage } from './pages/Kid/Chat/KidChatPage';
import { SetupPage } from './pages/Setup/SetupPage';
import { KidQuestsPage } from './pages/Kid/Quests/KidQuestsPage';
import { KidBadgesPage } from './pages/Kid/Badges/KidBadgesPage';
import { KidInboxPage } from './pages/Kid/Inbox/KidInboxPage';
import { ParentReportsPage } from './pages/Parent/Reports/ParentReportsPage';
import { ParentRecordsPage } from './pages/Parent/Records/ParentRecordsPage';
import { ParentNotificationsPage } from './pages/Parent/Notifications/ParentNotificationsPage';
import { ParentSettingsPage } from './pages/Parent/Settings/ParentSettingsPage';
import { ParentShopPage } from './pages/Parent/Shop/ParentShopPage';
import { ParentFamilyPage } from './pages/Parent/Family/ParentFamilyPage';
import { ParentAuditPage } from './pages/Parent/Audit/ParentAuditPage';
import { ParentChatPage } from './pages/Parent/Chat/ParentChatPage';
import { ParentBadgesPage } from './pages/Parent/Badges/ParentBadgesPage';
import { ParentSearchPage } from './pages/Parent/Search/ParentSearchPage';
import { ParentExportPage } from './pages/Parent/Export/ParentExportPage';
import { ParentPrivacyPage } from './pages/Parent/Privacy/ParentPrivacyPage';

/**
 * 路由表（W1）
 * - 豆包内由平台 SSO 自动登录，进来只有两种状态：引导没走完 / 走完了
 * - 没走完 → SetupGate 顶到 /setup；走完了 → 孩子端 /kid/* · 家长端 /parent/*
 * - 家长密码门 /gate
 */
const App: React.FC = () => (
  <KidProvider>
    <Routes>
      <Route path="/" element={<Navigate to="/kid" replace />} />

      {/* 认证（豆包外兜底页） */}
      <Route path="auth/login" element={<LoginPage />} />
      <Route path="auth/register" element={<RegisterPage />} />
      <Route path="auth/forgot" element={<ForgotPage />} />

      {/* 引导 */}
      <Route path="setup" element={<SetupPage />} />

      {/* 家长密码门 */}
      <Route path="gate" element={<GatePage />} />

      {/* 孩子端 / 家长端：引导没走完会被 SetupGate 顶到 /setup */}
      <Route element={<SetupGate />}>
        <Route path="kid" element={<KidShell />}>
          <Route index element={<KidHomeContainer />} />
          <Route path="reading" element={<KidPageShell>{(id) => <KidReadingPage childId={id} />}</KidPageShell>} />
          <Route path="exercise" element={<KidPageShell>{(id) => <KidExercisePage childId={id} />}</KidPageShell>} />
          <Route path="chat" element={<KidPageShell>{(id) => <KidChatPage childId={id} />}</KidPageShell>} />
          <Route path="me" element={<KidPageShell>{(id) => <KidMePage childId={id} />}</KidPageShell>} />
          <Route path="stars" element={<KidPageShell>{(id) => <KidStarsPage childId={id} />}</KidPageShell>} />
          <Route path="wishes" element={<KidPageShell>{(id) => <KidWishesPage childId={id} />}</KidPageShell>} />
          <Route path="checkin" element={<KidPageShell>{(id) => <KidCheckinPage childId={id} />}</KidPageShell>} />
          <Route path="quests" element={<KidPageShell>{(id) => <KidQuestsPage childId={id} />}</KidPageShell>} />
          <Route path="badges" element={<KidPageShell>{(id) => <KidBadgesPage childId={id} />}</KidPageShell>} />
          <Route path="inbox" element={<KidPageShell>{(id) => <KidInboxPage childId={id} />}</KidPageShell>} />
        </Route>

        <Route path="parent" element={<ParentShell />}>
          <Route index element={<ParentOverviewPage />} />
          <Route path="tasks" element={<ParentTasksPage />} />
          <Route path="wishes" element={<ParentWishesPage />} />
          <Route path="children" element={<ParentChildrenPage />} />
          <Route path="reports" element={<ParentReportsPage />} />
          <Route path="records" element={<ParentRecordsPage />} />
          <Route path="notifications" element={<ParentNotificationsPage />} />
          <Route path="settings" element={<ParentSettingsPage />} />
          <Route path="shop" element={<ParentShopPage />} />
          <Route path="family" element={<ParentFamilyPage />} />
          <Route path="audit" element={<ParentAuditPage />} />
          <Route path="chat" element={<ParentChatPage />} />
          <Route path="badges" element={<ParentBadgesPage />} />
          <Route path="search" element={<ParentSearchPage />} />
          <Route path="export" element={<ParentExportPage />} />
          <Route path="privacy" element={<ParentPrivacyPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/kid" replace />} />
    </Routes>
  </KidProvider>
);

export default App;
