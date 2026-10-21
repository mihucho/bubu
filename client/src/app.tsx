import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { ProfileProvider } from './contexts/ProfileContext';
import ProfileGate from './components/ProfileGate';
import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import SetupPage from './pages/Setup/SetupPage';
import HomePage from './pages/Home/HomePage';
import ReadingPage from './pages/Reading/ReadingPage';
import ExercisePage from './pages/Exercise/ExercisePage';
import ChatPage from './pages/Chat/ChatPage';
import WrongQuestionsPage from './pages/WrongQuestions/WrongQuestionsPage';
import StarsPage from './pages/Stars/StarsPage';
import ParentPage from './pages/Parent/ParentPage';
import CheckinPage from './pages/Checkin/CheckinPage';

const RoutesComponent = () => {
  return (
      <ProfileProvider>
      <Routes>
        <Route path="setup" element={<SetupPage />} />
        <Route
          element={
            <ProfileGate>
              <Layout />
            </ProfileGate>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="reading" element={<ReadingPage />} />
          <Route path="exercise" element={<ExercisePage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="wrong-questions" element={<WrongQuestionsPage />} />
          <Route path="stars" element={<StarsPage />} />
          <Route path="parent" element={<ParentPage />} />
          <Route path="checkin" element={<CheckinPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ProfileProvider>
  );
};

export default RoutesComponent;
