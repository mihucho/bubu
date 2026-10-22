import React from 'react';
import { KidHeader, ParentHeader } from '../../shells/Shells';

/**
 * 占位页：W1 只验证壳与路由，业务页在 W2–W5 分批替换。
 * 每个占位页都写清「属于哪个批次」，避免上线遗漏。
 */
export const KidPlaceholder: React.FC<{ title: string; batch: string; note?: string }> = ({ title, batch, note }) => (
  <>
    <KidHeader title={title} sub="布布的学习小天地" />
    <div style={{ padding: 16 }}>
      <div className="bbu-card">
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--k-text)' }}>这一页还在做</p>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--k-text-sub)', lineHeight: 1.6 }}>
          {note ?? `${title} 排在 ${batch} 批次；壳与导航已就位。`}
        </p>
      </div>
    </div>
  </>
);

export const ParentPlaceholder: React.FC<{ title: string; batch: string; note?: string }> = ({ title, batch, note }) => (
  <>
    <ParentHeader title={title} sub="家长端" />
    <div style={{ padding: 14 }}>
      <div className="bbu-card">
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--p-text)' }}>这一页还在做</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--p-text-sub)', lineHeight: 1.6 }}>
          {note ?? `${title} 排在 ${batch} 批次；壳与导航已就位。`}
        </p>
      </div>
    </div>
  </>
);
