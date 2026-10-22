import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKidChild } from '../../contexts/KidContext';
import { setSetupStep } from '../../api';
import { setParentPin } from '../../api/parent';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { ShieldCheck } from 'lucide-react';
import './setup.css';

type Step = 'consent' | 'child' | 'task' | 'reward' | 'pin' | 'done';

/**
 * 引导（W8 的最小闭环）：同意 → 建孩子 → 完成。
 * 每一步都落 `setup_step`，中途退出再进来能续上（后续批次再把任务/奖励/边界补进来）。
 */
export const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { setupStep, children: familyChildren, reload } = useKidChild();
  const [step, setStep] = useState<Step>(() => uiStepOf(setupStep));
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newChildId, setNewChildId] = useState('');
  const [taskName, setTaskName] = useState('叫叫阅读');
  const [rewardName, setRewardName] = useState('周末多玩 1 小时');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');

  const childId = newChildId || familyChildren[0]?.id || '';

  const createTask = async () => {
    if (!childId) return;
    setBusy(true);
    try {
      await post('/api/v2/parent/tasks', {
        childId,
        name: taskName.trim(),
        cycleType: 'daily',
        cycleTarget: 1,
        starReward: 1,
      });
      await setSetupStep('tasks');
      setStep('reward');
    } catch (e) {
      logger.error('创建任务失败', e);
      setError('任务没加上，稍后再试');
    } finally {
      setBusy(false);
    }
  };

  const createReward = async () => {
    if (!childId) return;
    setBusy(true);
    try {
      await post('/api/v2/parent/shop', { childId, name: rewardName.trim(), starCost: 20 });
      await setSetupStep('rewards');
      setStep('pin');
    } catch (e) {
      logger.error('创建商店物品失败', e);
      setError('没放进商店，稍后再试');
    } finally {
      setBusy(false);
    }
  };

  const setupPin = async () => {
    if (!/^\d{6}$/.test(pin) || pin !== pin2) return;
    setBusy(true);
    setError(null);
    try {
      await setParentPin(pin);
      await setSetupStep('done');
      setStep('done');
    } catch (e) {
      logger.error('保存家长密码失败', e);
      setError('密码没存上，再试一次');
    } finally {
      setBusy(false);
    }
  };

  const post = async (url: string, data: unknown) => {
    const res = await axiosForBackend({ url, method: 'POST', data });
    return res.data;
  };

  const agree = async () => {
    setBusy(true);
    setError(null);
    try {
      await setSetupStep('consent');
      setStep('child');
    } catch (e) {
      logger.error('保存同意失败', e);
      setError('没能保存，稍后再试');
    } finally {
      setBusy(false);
    }
  };

  const createKid = async () => {
    const clean = nickname.trim();
    if (!clean) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await post('/api/v2/family/children', { nickname: clean })) as { id: string };
      setNewChildId(res.id);
      await setSetupStep('children');
      setStep('task');
    } catch (e) {
      logger.error('创建孩子失败', e);
      setError('没能创建，稍后再试');
    } finally {
      setBusy(false);
    }
  };

  const enterHome = async () => {
    setBusy(true);
    try {
      await reload(); // 让 SetupGate 看到 setupStep=done
      navigate('/kid', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setup">
      <div className="setup__card">
        <div className="setup__badge" aria-hidden>
          <ShieldCheck size={22} strokeWidth={2.2} />
        </div>

        {step === 'consent' ? (
          <>
            <h1 className="setup__title">先说清楚一件事</h1>
            <p className="setup__body">
              我们只收集孩子的学习与心情记录，用来看进步和安排任务。
              不会把孩子的信息给第三方，也不会做成排名。
            </p>
            <button type="button" className="setup__btn" disabled={busy} onClick={() => void agree()}>
              {busy ? '稍等…' : '我知道了，继续'}
            </button>
          </>
        ) : null}

        {step === 'child' ? (
          <>
            <h1 className="setup__title">先加一个孩子</h1>
            <p className="setup__body">可以之后再加第二个、第三个。</p>
            <input
              className="setup__input"
              value={nickname}
              maxLength={12}
              placeholder="孩子的昵称"
              onChange={(e) => setNickname(e.target.value)}
            />
            <button
              type="button"
              className="setup__btn"
              disabled={busy || !nickname.trim()}
              onClick={() => void createKid()}
            >
              {busy ? '正在建…' : '建好，进去看看'}
            </button>
          </>
        ) : null}

        {step === 'task' ? (
          <>
            <h1 className="setup__title">给她安排第一件事</h1>
            <p className="setup__body">比如「叫叫阅读」每天 1 次，做到就有一颗星。</p>
            <input
              className="setup__input"
              value={taskName}
              maxLength={20}
              placeholder="任务名"
              onChange={(e) => setTaskName(e.target.value)}
            />
            <button type="button" className="setup__btn" disabled={busy || !taskName.trim()} onClick={() => void createTask()}>
              {busy ? '正在加…' : '加上这个任务'}
            </button>
          </>
        ) : null}

        {step === 'reward' ? (
          <>
            <h1 className="setup__title">星星能换什么</h1>
            <p className="setup__body">先放一个孩子想要的东西，攒够星就能换。</p>
            <input
              className="setup__input"
              value={rewardName}
              maxLength={20}
              placeholder="比如：周末多玩 1 小时"
              onChange={(e) => setRewardName(e.target.value)}
            />
            <button type="button" className="setup__btn" disabled={busy || !rewardName.trim()} onClick={() => void createReward()}>
              {busy ? '正在加…' : '放进商店'}
            </button>
          </>
        ) : null}

        {step === 'pin' ? (
          <>
            <h1 className="setup__title">设一个家长密码</h1>
            <p className="setup__body">
              6 位数字，只有你知道。之后进家长端（改任务、看报告）都要输它。
            </p>
            <input
              className="setup__input"
              value={pin}
              inputMode="numeric"
              maxLength={6}
              placeholder="6 位数字"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
            <input
              className="setup__input"
              value={pin2}
              inputMode="numeric"
              maxLength={6}
              placeholder="再输一次"
              onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))}
            />
            {pin.length === 6 && pin2.length === 6 && pin !== pin2 ? (
              <p className="setup__error">两次不一样，再对一下</p>
            ) : null}
            <button
              type="button"
              className="setup__btn"
              disabled={busy || pin.length !== 6 || pin !== pin2}
              onClick={() => void setupPin()}
            >
              {busy ? '正在存…' : '设好了，继续'}
            </button>
          </>
        ) : null}

        {step === 'done' ? (
          <>
            <h1 className="setup__title">好了，可以开始啦</h1>
            <p className="setup__body">任务和奖励都备好了。</p>
            <button
              type="button"
              className="setup__btn"
              disabled={busy}
              onClick={() => void enterHome()}
            >
              进首页
            </button>
          </>
        ) : null}

        {error ? <p className="setup__error">{error}</p> : null}
      </div>
    </div>
  );
};

export default SetupPage;

/** 服务端引导进度 → 引导页 UI 步骤（支持中途退出再进来续做） */
function uiStepOf(serverStep: string): Step {
  switch (serverStep) {
    case 'children':
      return 'task';
    case 'tasks':
      return 'reward';
    case 'rewards':
    case 'boundary':
      return 'pin';
    case 'done':
      return 'done';
    default:
      return 'consent';
  }
}
