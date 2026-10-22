import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { KidShell, ParentShell } from './shells/Shells';
import { ForgotPage, LoginPage, RegisterPage } from './pages/Auth/AuthPages';
import { GatePage } from './pages/Gate/GatePage';
import { KidPlaceholder, ParentPlaceholder } from './pages/Placeholder/Placeholder';
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
 * - 豆包内由平台 SSO 自动登录；豆包外走 /auth/login
 * - 孩子端 /kid/* · 家长端 /parent/* · 家长密码门 /gate
 * - 业务页按批次替换占位页：W2 孩子端首页/内容墙 · W3 孩子端二级 · W4 家长端主 · W5 家长端编辑
 */
const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/kid" replace />} />

    {/* 认证（豆包外） */}
    <Route path="auth/login" element={<LoginPage />} />
    <Route path="auth/register" element={<RegisterPage />} />
    <Route path="auth/forgot" element={<ForgotPage />} />

    {/* 引导 */}
    <Route path="setup" element={<SetupPage />} />

    {/* 家长密码门 */}
    <Route path="gate" element={<GatePage />} />

    {/* 孩子端 */}
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

    {/* 家长端 */}
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

    <Route path="*" element={<Navigate to="/kid" replace />} />
  </Routes>
);

export default App;
