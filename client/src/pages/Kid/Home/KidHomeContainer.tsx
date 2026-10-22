import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { KidHomeDto } from '@shared/api.interface';
import { getKidHome } from '../../../api/kid';
import { useKidChild } from '../../../contexts/KidContext';
import KidHomePage from './KidHomePage';
import './home.css';

/** 首页容器：孩子 id 来自 KidProvider，这里只管取数据与三态 */
export const KidHomeContainer: React.FC = () => {
  const { childId, loading: ctxLoading, error: ctxError, reload } = useKidChild();
  const [data, setData] = useState<KidHomeDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getKidHome(childId));
    } catch (e) {
      logger.error('首页加载失败', e);
      setError('没能取到今天的数据，稍后再试');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (ctxLoading || loading) {
    return (
      <div className="kh-loading" aria-busy="true">
        <div className="kh-skel kh-skel--head" />
        <div className="kh-skel kh-skel--cards" />
        <div className="kh-skel kh-skel--chest" />
        <div className="kh-skel kh-skel--row" />
        <div className="kh-skel kh-skel--row" />
      </div>
    );
  }

  if (ctxError || error || !data) {
    return (
      <div className="kh-error" role="alert">
        <p className="kh-error__text">{ctxError ?? error ?? '没有数据'}</p>
        <button
          type="button"
          className="kh-error__btn"
          onClick={() => {
            if (ctxError) reload();
            else void load();
          }}
        >
          再试一次
        </button>
      </div>
    );
  }

  return <KidHomePage data={data} onChanged={() => void load()} />;
};

export default KidHomeContainer;
