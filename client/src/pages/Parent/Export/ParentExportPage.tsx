import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ExportPreview, ParentChild } from '../../../api/parent';
import { getExportPreview, getParentChildren } from '../../../api/parent';
import '../Tasks/parent-pages.css';

/**
 * 导出预览：只展示「会导出什么」，图片由客户端用 canvas 绘制（这里不做假下载）。
 */
export const ParentExportPage: React.FC = () => {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childId, setChildId] = useState('');
  const [preview, setPreview] = useState<ExportPreview | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const list = await getParentChildren();
        setChildren(list);
        if (list[0]) setChildId(list[0].id);
      } catch (e) {
        logger.error('读取孩子失败', e);
      }
    })();
  }, []);

  const load = useCallback(async (id: string) => {
    try {
      setPreview(await getExportPreview(id, 7));
    } catch (e) {
      logger.error('读取导出预览失败', e);
    }
  }, []);

  useEffect(() => {
    if (childId) void load(childId);
  }, [childId, load]);

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">导出</h1>
        <p className="pp-head__sub">先看看会导出什么</p>
      </header>

      {children.length > 1 ? (
        <div className="pp-seg">
          {children.map((c) => (
            <button key={c.id} type="button" className={`pp-seg__item${childId === c.id ? ' is-on' : ''}`} onClick={() => setChildId(c.id)}>
              {c.nickname}
            </button>
          ))}
        </div>
      ) : null}

      {preview ? (
        preview.allowed ? (
          <>
            <section className="pp-card">
              <h2 className="pp-card__title">{preview.childName} · {preview.range.start} ~ {preview.range.end}</h2>
              <div className="pp-row">
                <span className="pp-row__k">打卡</span>
                <span>{preview.checkins.length} 条</span>
              </div>
              <div className="pp-row">
                <span className="pp-row__k">阅读</span>
                <span>{preview.readingMinutes} 分钟</span>
              </div>
              <div className="pp-row">
                <span className="pp-row__k">运动</span>
                <span>{preview.exerciseTimes} 次</span>
              </div>
              <div className="pp-row">
                <span className="pp-row__k">心情</span>
                <span>{preview.moods.length} 天</span>
              </div>
              <div className="pp-row">
                <span className="pp-row__k">兑换</span>
                <span>{preview.exchanges.length} 次</span>
              </div>
            </section>
            <section className="pp-block">
              <p className="pp-empty">导出图片由客户端绘制，这个环境暂未启用下载。</p>
            </section>
          </>
        ) : (
          <section className="pp-block">
            <p className="pp-empty">家里关掉了导出（我的 → 边界 → 允许导出）</p>
          </section>
        )
      ) : (
        <section className="pp-block">
          <p className="pp-empty">正在读取…</p>
        </section>
      )}
    </>
  );
};

export default ParentExportPage;
