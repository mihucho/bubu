import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { KidProfile } from '@shared/api.interface';
import { getProfile, addStarsApi, spendStarsApi } from '../api';

interface AppContextValue {
  profile: KidProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  addStars: (amount: number) => Promise<void>;
  spendStars: (amount: number) => Promise<boolean>;
  setProfile: (p: KidProfile) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data as KidProfile);
    } catch (error) {
      logger.error('刷新档案失败', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const addStars = useCallback(
    async (amount: number) => {
      if (!profile) return;
      const optimistic: KidProfile = {
        ...profile,
        availableStars: profile.availableStars + amount,
        totalStars: profile.totalStars + amount,
        weekStars: profile.weekStars + amount,
      };
      setProfile(optimistic);
      try {
        const data = await addStarsApi(amount);
        setProfile(data as KidProfile);
      } catch (error) {
        setProfile(profile);
        logger.error('增加星星失败', error);
        throw error;
      }
    },
    [profile],
  );

  const spendStars = useCallback(
    async (amount: number): Promise<boolean> => {
      if (!profile) return false;
      if (profile.availableStars < amount) return false;
      const optimistic: KidProfile = {
        ...profile,
        availableStars: profile.availableStars - amount,
      };
      setProfile(optimistic);
      try {
        const data = await spendStarsApi(amount);
        setProfile(data as KidProfile);
        return true;
      } catch (error) {
        setProfile(profile);
        logger.error('消耗星星失败', error);
        return false;
      }
    },
    [profile],
  );

  const value: AppContextValue = {
    profile,
    loading,
    refreshProfile,
    addStars,
    spendStars,
    setProfile: (p: KidProfile) => setProfile(p),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export { AppProvider, useAppContext };
