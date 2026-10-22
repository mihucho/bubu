import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

interface FamilyChild {
  id: string;
  nickname: string;
}

interface FamilyBootstrap {
  familyAccountId: string;
  parentDisplayName: string;
  setupStep: string;
  children: FamilyChild[];
}

interface KidContextValue {
  childId: string | null;
  children: FamilyChild[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  selectChild: (id: string) => void;
}

const CHILD_KEY = 'bbu.childId';
const KidContext = createContext<KidContextValue | null>(null);

/**
 * 当前孩子上下文：一次 bootstrap 取到家庭与孩子，其他页只管用 childId。
 * 没有孩子时给出明确提示，不静默渲染空页面。
 */
export const KidProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [childId, setChildId] = useState<string | null>(null);
  const [list, setList] = useState<FamilyChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosForBackend({ url: '/api/v2/family/bootstrap', method: 'GET' });
      const data = res.data as FamilyBootstrap;
      setList(data.children);

      const stored = window.localStorage.getItem(CHILD_KEY);
      const valid = stored && data.children.some((c) => c.id === stored) ? stored : data.children[0]?.id ?? null;
      if (!valid) {
        setError('还没有孩子档案，去家长端添加一个吧');
        setChildId(null);
      } else {
        window.localStorage.setItem(CHILD_KEY, valid);
        setChildId(valid);
      }
    } catch (e) {
      logger.error('读取家庭信息失败', e);
      setError('没能读到家庭信息，稍后再试');
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
    () => ({ childId, children: list, loading, error, reload: () => void load(), selectChild }),
    [childId, list, loading, error, load, selectChild],
  );

  return <KidContext.Provider value={value}>{children}</KidContext.Provider>;
};

export function useKidChild(): KidContextValue {
  const ctx = useContext(KidContext);
  if (!ctx) throw new Error('useKidChild 必须在 KidProvider 内使用');
  return ctx;
}
