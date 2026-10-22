import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useKidChild } from '../contexts/KidContext';

/**
 * 引导闸门：数据清空 / 首次进入时，服务端会把家庭建成 setupStep=consent。
 * 只要引导没走到 done，就把人顶到 /setup（并记住本来想去哪）。
 *
 * 这里不判断运行环境——豆包内一律平台 SSO，进来就是「有身份、可能没数据」。
 */
export const SetupGate: React.FC = () => {
  const { setupDone, loading, error } = useKidChild();
  const location = useLocation();

  if (loading) {
    return (
      <div className="bbu-center">
        <div className="bbu-center__body">
          <p className="bbu-center__text">正在准备…</p>
        </div>
      </div>
    );
  }

  // 读不到家庭信息（网络/鉴权）：不要把用户骗进引导页，先给可重试的提示
  if (error && !setupDone) {
    return (
      <div className="bbu-center">
        <div className="bbu-center__body">
          <p className="bbu-center__text">{error}</p>
          <button type="button" className="bbu-center__btn" onClick={() => window.location.reload()}>
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!setupDone) {
    return <Navigate to="/setup" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default SetupGate;
