import React from 'react';
import { useKidChild } from '../../contexts/KidContext';
import '../Kid/Home/home.css';

/**
 * 二级页统一的三态外壳：先解决「孩子是谁」，再渲染具体页面。
 * 页面本身只管自己的数据，不重复处理 bootstrap。
 */
export const KidPageShell: React.FC<{ children: (childId: string) => React.ReactNode }> = ({ children }) => {
  const { childId, loading, error, reload } = useKidChild();

  if (loading) {
    return (
      <div className="kh-loading" aria-busy="true">
        <div className="kh-skel kh-skel--head" />
        <div className="kh-skel kh-skel--cards" />
        <div className="kh-skel kh-skel--row" />
      </div>
    );
  }

  if (error || !childId) {
    return (
      <div className="kh-error" role="alert">
        <p className="kh-error__text">{error ?? '没有找到孩子档案'}</p>
        <button type="button" className="kh-error__btn" onClick={reload}>
          再试一次
        </button>
      </div>
    );
  }

  return <>{children(childId)}</>;
};

export default KidPageShell;
