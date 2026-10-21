import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';

interface ProfileGateProps {
  children: React.ReactNode;
}

const ProfileGate: React.FC<ProfileGateProps> = ({ children }) => {
  const { hasProfile, loading } = useProfile();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #FF85C1 0%, #A855F7 100%)' }}
      >
        <div className="text-white text-sm">加载中...</div>
      </div>
    );
  }

  if (!hasProfile) {
    return <Navigate to="/setup" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default ProfileGate;
