import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getProfileStatus, initProfile as initProfileApi } from '../api';
import type { KidProfile } from '@shared/api.interface';

interface ProfileContextValue {
  loading: boolean;
  profile: KidProfile | null;
  hasProfile: boolean;
  initProfile: (nickname: string, parentRole: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileLocal: (patch: Partial<KidProfile>) => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<KidProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const result = await getProfileStatus();
      if (result.exists && result.profile) {
        setProfile(result.profile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      logger.error('获取档案状态失败', error);
      setProfile(null);
    }
  }, []);

  const initProfile = useCallback(async (nickname: string, parentRole: string) => {
    const result = await initProfileApi(nickname, parentRole);
    setProfile(result);
  }, []);

  const updateProfileLocal = useCallback((patch: Partial<KidProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  useEffect(() => {
    void refreshProfile().finally(() => setLoading(false));
  }, [refreshProfile]);

  const value: ProfileContextValue = {
    loading,
    profile,
    hasProfile: !!profile,
    initProfile,
    refreshProfile,
    updateProfileLocal,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

const useProfile = (): ProfileContextValue => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export { ProfileProvider, useProfile };
