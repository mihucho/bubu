import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Shield } from 'lucide-react';
import { isParentPinSet, setParentPin, verifyParentPin } from '../../api/parent';
import './gate.css';

/**
 * 家长密码门（W8）
 * - 已设置密码：输 6 位进入；连续错 5 次锁 5 分钟
 * - 未设置：引导先设一个，设完直接进
 */
export const GatePage: React.FC = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'verify' | 'setup'>('verify');
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [checking, setChecking] = useState(true);

  // 进来先问一句「设过密码没」：没设过直接进设置态，别让家长先错一次才知道
  useEffect(() => {
    let alive = true;
    void isParentPinSet().then((set) => {
      if (!alive) return;
      setMode(set ? 'verify' : 'setup');
      setChecking(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const locked = lockedUntil > Date.now();

  const submit = async () => {
    if (!/^\d{6}$/.test(pin) || busy || locked) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'setup') {
        await setParentPin(pin);
        navigate('/parent', { replace: true });
        return;
      }
      const res = await verifyParentPin(pin);
      if (res.ok) {
        navigate('/parent', { replace: true });
        return;
      }
      if (res.reason === 'PIN_NOT_SET') {
        setMode('setup');
        setError('还没设置家长密码，先设一个');
        setPin('');
        return;
      }
      const next = failCount + 1;
      setFailCount(next);
      setPin('');
      if (next >= 5) {
        setLockedUntil(Date.now() + 5 * 60 * 1000);
        setError('错太多次了，5 分钟后再试');
      } else {
        setError(`密码不对，还能试 ${5 - next} 次`);
      }
    } catch (e) {
      logger.error('家长门校验失败', e);
      setError('没能校验，稍后再试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <div className="gate__card">
        <div className="gate__badge" aria-hidden>
          <Shield size={22} strokeWidth={2.2} />
        </div>
        <h1 className="gate__title">{mode === 'setup' ? '设一个家长密码' : '家长入口'}</h1>
        <p className="gate__sub">
          {mode === 'setup' ? '6 位数字，只有你知道' : '输入 6 位家长密码'}
        </p>

        {checking ? <p className="gate__sub">检查中…</p> : null}

        <input
          className="gate__input"
          value={pin}
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          autoFocus
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />

        {error ? <p className="gate__error">{error}</p> : null}

        <button
          type="button"
          className="gate__btn"
          disabled={checking || busy || pin.length !== 6 || locked}
          onClick={() => void submit()}
        >
          {busy ? '校验中…' : mode === 'setup' ? '保存并进入' : '进入'}
        </button>

        <button type="button" className="gate__back" onClick={() => navigate('/kid', { replace: true })}>
          回孩子端
        </button>
      </div>
    </div>
  );
};

export default GatePage;
