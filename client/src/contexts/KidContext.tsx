import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getFamilyBootstrap } from '../api';
import type { FamilyBootstrap, FamilyChildSummary } from '@shared/api.interface';

interface KidContextValue {
  childId: string | null;
  children: FamilyChildSummary[];
  loading: boolean;
  error: string | null;
  /** 引导进度（服务端落库）：consent → … → done */
  setupStep: string;
  /** 引导是否走完；没走完就应该被 SetupGate 顶到 /setup */
  setupDone: boolean;
  familyAccountId: string | null;
  parentDisplayName: string;
  reload: () => Promise<FamilyBootstrap | null>;
  selectChild: (id: string) => void;
}

const CHILD_KEY = 'bbu.childId';
const KidContext = createContext<KidContextValue | null>(null);

/**
 * 当前孩子上下文：一次 bootstrap 取到家庭、引导进度与孩子列表，其他页只管用 childId。
 * 面板上的 SetupGate 用 setupDone 决定是否把用户顶到引导页。
 */
export const KidProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [childId, setChildId] = useState<string | null>(null);
  const [list, setList] = useState<FamilyChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<string>('consent');
  const [familyAccountId, setFamilyAccountId] = useState<string | null>(null);
  const [parentDisplayName, setParentDisplayName] = useState<string>('');

  const load = useCallback(async (): Promise<FamilyBootstrap | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFamilyBootstrap();
      setList(data.children);
      setSetupStep(data.setupStep || 'consent');
      setFamilyAccountId(data.familyAccountId);
      setParentDisplayName(data.parentDisplayName);

      const stored = window.localStorage.getItem(CHILD_KEY);
      const valid = stored && data.children.some((c) => c.id === stored) ? stored : data.children[0]?.id ?? null;
      if (!valid) {
        // 引导没走完时没有孩子是正常的（引导页会建），不算错误
        if (data.setupStep === 'done') {
          setError('还没有孩子档案，去家长端添加一个吧');
        }
        setChildId(null);
      } else {
        window.localStorage.setItem(CHILD_KEY, valid);
        setChildId(valid);
      }
      return data;
    } catch (e) {
      logger.error('读取家庭信息失败', e);
      setError('没能读到家庭信息，稍后再试');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectChild = useCallback((id: string) => {
    window.localStorage.setItem(CHILD_KEY, id);
    setChildId(id);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<KidContextValue>(
    () => ({
      childId,
      children: list,
      loading,
      error,
      setupStep,
      setupDone: setupStep === 'done',
      familyAccountId,
      parentDisplayName,
      reload: load,
      selectChild,
    }),
    [childId, list, loading, error, setupStep, familyAccountId, parentDisplayName, load, selectChild],
  );

  return <KidContext.Provider value={value}>{children}</KidContext.Provider>;
};

export function useKidChild(): KidContextValue {
  const ctx = useContext(KidContext);
  if (!ctx) throw new Error('useKidChild 必须在 KidProvider 内使用');
  return ctx;
}
