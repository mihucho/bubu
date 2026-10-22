import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Link } from 'react-router-dom';
import { ChevronRight, Shield } from 'lucide-react';
import type { FamilySettings } from '../../../api/parent';
import { getFamilySettings, getFamilyMembers, setParentPin, updateFamilySettings } from '../../../api/parent';
import '../Tasks/parent-pages.css';
import './settings.css';

export const ParentSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<FamilySettings | null>(null);
  const [members, setMembers] = useState<{ id: string; displayName: string; role: string; phone: string }[]>([]);
  const [pin, setPin] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([getFamilySettings(), getFamilyMembers()]);
      setSettings(s);
      setMembers(m);
    } catch (e) {
      logger.error('读取家庭设置失败', e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Partial<FamilySettings>) => {
    try {
      await updateFamilySettings(patch);
      await load();
      setFlash('已保存');
      window.setTimeout(() => setFlash(null), 1600);
    } catch (e) {
      logger.error('保存失败', e);
      setFlash('没保存成功');
    }
  };

  const savePin = async () => {
    if (!/^\d{6}$/.test(pin)) {
      setFlash('要 6 位数字');
      return;
    }
    await setParentPin(pin);
    setPin('');
    await load();
    setFlash('家长密码已设置');
  };

  if (!settings) return <div className="pp-empty" style={{ margin: 16 }}>正在读取…</div>;

  return (
    <>
      <header className="pp-head">
        <h1 className="pp-head__title">我的</h1>
        <p className="pp-head__sub">家庭、边界与提醒</p>
      </header>

      {flash ? <p className="st-flash">{flash}</p> : null}

      <section className="pp-card">
        <h2 className="pp-card__title">边界</h2>
        {[
          ['diaryParentVisible', '孩子的日记我能看'],
          ['aiFulltextVisible', '孩子和布布的对话我能看全文'],
          ['exportEnabled', '允许导出孩子的记录'],
        ].map(([key, label]) => (
          <label key={key} className="pp-row pp-row--switch">
            <span className="pp-row__k">{label}</span>
            <input
              type="checkbox"
              checked={Boolean(settings[key as keyof FamilySettings])}
              onChange={(e) => void save({ [key]: e.target.checked } as Partial<FamilySettings>)}
            />
          </label>
        ))}
      </section>

      <section className="pp-card" style={{ marginTop: 12 }}>
        <h2 className="pp-card__title">提醒</h2>
        {[
          ['remindConfirm', '有打卡等我确认'],
          ['remindWish', '孩子写了新心愿'],
          ['remindSafety', '安全相关提醒'],
          ['remindReport', '周期报告生成'],
        ].map(([key, label]) => (
          <label key={key} className="pp-row pp-row--switch">
            <span className="pp-row__k">{label}</span>
            <input
              type="checkbox"
              checked={Boolean(settings[key as keyof FamilySettings])}
              onChange={(e) => void save({ [key]: e.target.checked } as Partial<FamilySettings>)}
            />
          </label>
        ))}
      </section>

      <section className="pp-card" style={{ marginTop: 12 }}>
        <h2 className="pp-card__title">使用管理</h2>
        <div className="pp-row">
          <span className="pp-row__k">每天可用</span>
          <div className="pp-chips">
            {[20, 30, 40, 60].map((n) => (
              <button
                key={n}
                type="button"
                className={`pp-chip${settings.dailyLimitMinutes === n ? ' is-on' : ''}`}
                onClick={() => void save({ dailyLimitMinutes: n })}
              >
                {n} 分钟
              </button>
            ))}
          </div>
        </div>
        <div className="pp-row">
          <span className="pp-row__k">休息间隔</span>
          <div className="pp-chips">
            {[15, 20, 25].map((n) => (
              <button
                key={n}
                type="button"
                className={`pp-chip${settings.restIntervalMinutes === n ? ' is-on' : ''}`}
                onClick={() => void save({ restIntervalMinutes: n })}
              >
                {n} 分钟
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="pp-card" style={{ marginTop: 12 }}>
        <h2 className="pp-card__title">
          <Shield size={14} strokeWidth={2.2} aria-hidden /> 家长密码
        </h2>
        <p className="st-hint">{settings.pinSet ? '已设置（6 位）' : '还没设置，孩子点齿轮也进不来'}</p>
        <label className="pp-row">
          <span className="pp-row__k">6 位数字</span>
          <input
            className="pp-row__in"
            value={pin}
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <button type="button" className="pp-submit" onClick={() => void savePin()}>
          保存密码
        </button>
      </section>

      <section className="pp-block">
        <h2 className="pp-block__title">一起管的人 · {members.length}</h2>
        <div className="pp-list">
          {members.map((m) => (
            <div key={m.id} className="pp-task">
              <div className="pp-task__main">
                <span className="pp-task__name">{m.displayName}</span>
                <span className="pp-task__meta">{m.role === 'owner' ? '创建人' : '成员'} · {m.phone}</span>
              </div>
            </div>
          ))}
        </div>
        <Link className="st-link" to="/parent/family">
          邀请另一个家长 <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
        </Link>
      </section>

      <section className="pp-block">
        <h2 className="pp-block__title">还有这些</h2>
        <div className="pp-list">
          <Link className="pp-task st-linkrow" to="/parent/shop">
            <span className="pp-task__name">星星商店</span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </Link>
          <Link className="pp-task st-linkrow" to="/parent/children">
            <span className="pp-task__name">孩子档案</span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </Link>
          <Link className="pp-task st-linkrow" to="/parent/badges">
            <span className="pp-task__name">徽章</span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </Link>
          <Link className="pp-task st-linkrow" to="/parent/search">
            <span className="pp-task__name">搜索</span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </Link>
          <Link className="pp-task st-linkrow" to="/parent/export">
            <span className="pp-task__name">导出</span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </Link>
          <Link className="pp-task st-linkrow" to="/parent/privacy">
            <span className="pp-task__name">隐私与账号</span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </Link>
          <Link className="pp-task st-linkrow" to="/parent/audit">
            <span className="pp-task__name">操作记录</span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
};

export default ParentSettingsPage;
