import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { ShieldCheck } from 'lucide-react';
import './setup.css';

type Step = 'consent' | 'child' | 'task' | 'reward' | 'done';

/**
 * 引导（W8 的最小闭环）：同意 → 建孩子 → 完成。
 * 每一步都落 `setup_step`，中途退出再进来能续上（后续批次再把任务/奖励/边界补进来）。
 */
export const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('consent');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newChildId, setNewChildId] = useState('');
  const [taskName, setTaskName] = useState('叫叫阅读');
  const [rewardName, setRewardName] = useState('周末多玩 1 小时');

  const createTask = async () => {
    if (!newChildId) return;
    setBusy(true);
    try {
      await post('/api/v2/parent/tasks', {
        childId: newChildId,
        name: taskName.trim(),
        cycleType: 'daily',
        cycleTarget: 1,
        starReward: 1,
      });
      await post('/api/v2/family/setup-step', { step: 'tasks' });
      setStep('reward');
    } catch (e) {
      logger.error('创建任务失败', e);
      setError('任务没加上，稍后再试');
    } finally {
      setBusy(false);
    }
  };

  const createReward = async () => {
    if (!newChildId) return;
    setBusy(true);
    try {
      await post('/api/v2/parent/shop', { childId: newChildId, name: rewardName.trim(), starCost: 20 });
      await post('/api/v2/family/setup-step', { step: 'done' });
      setStep('done');
    } catch (e) {
      logger.error('创建商店物品失败', e);
      setError('没放进商店，稍后再试');
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
      await post('/api/v2/family/setup-step', { step: 'consent' });
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
      await post('/api/v2/family/setup-step', { step: 'children' });
      setStep('task');
    } catch (e) {
      logger.error('创建孩子失败', e);
      setError('没能创建，稍后再试');
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

        {step === 'done' ? (
          <>
            <h1 className="setup__title">好了，可以开始啦</h1>
            <p className="setup__body">任务和奖励都备好了。</p>
            <button type="button" className="setup__btn" onClick={() => navigate('/kid', { replace: true })}>
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
