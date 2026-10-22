import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Egg, Star } from 'lucide-react';
import type { Egg as EggDto } from '../../../api/kid';
import { addMood, getEggs, openEgg } from '../../../api/kid';
import '../Records/records.css';
import './checkin.css';

const MOODS: { key: string; label: string }[] = [
  { key: 'happy', label: '开心' },
  { key: 'calm', label: '平静' },
  { key: 'tired', label: '有点累' },
  { key: 'sad', label: '难过' },
  { key: 'angry', label: '生气' },
];

export const KidCheckinPage: React.FC<{ childId: string }> = ({ childId }) => {
  const [eggs, setEggs] = useState<EggDto[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setEggs(await getEggs(childId));
    } catch (e) {
      logger.error('读取彩蛋失败', e);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (egg: EggDto) => {
    if (busy || egg.openedToday) return;
    setBusy(true);
    try {
      const res = await openEgg(childId, egg.id);
      setFlash(res.message);
      await load();
      window.setTimeout(() => setFlash(null), 2400);
    } catch (e) {
      logger.error('开彩蛋失败', e);
    } finally {
      setBusy(false);
    }
  };

  const recordMood = async (key: string) => {
    if (mood) return;
    setMood(key);
    try {
      const res = await addMood(childId, key);
      setFlash(res.starsGranted > 0 ? `记下了，星星 +${res.starsGranted}` : '今天的心情已经记过啦');
      window.setTimeout(() => setFlash(null), 2400);
    } catch (e) {
      logger.error('记录心情失败', e);
      setMood(null);
    }
  };

  return (
    <>
      <header className="rc-head">
        <div className="rc-head__ico" aria-hidden>
          <Egg size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="rc-head__title">签到与心情</h1>
          <p className="rc-head__sub">每天来一下，彩蛋会冒出来</p>
        </div>
      </header>

      {flash ? <p className="rc-flash ck-flash">{flash}</p> : null}

      <section className="rc-section">
        <h2 className="rc-section__title">今天的彩蛋</h2>
        <div className="rc-list">
          {eggs.length ? (
            eggs.map((e) => (
              <div key={e.id} className="rc-row">
                <span className="rc-row__name">{e.name}</span>
                <span className="ck-reward">
                  <Star size={13} strokeWidth={2.4} aria-hidden /> {e.starReward}
                </span>
                <button
                  type="button"
                  className={`sh-buy${e.openedToday ? ' is-done' : ''}`}
                  disabled={busy || e.openedToday}
                  onClick={() => void open(e)}
                >
                  {e.openedToday ? '已开' : '打开'}
                </button>
              </div>
            ))
          ) : (
            <p className="rc-empty">还没有彩蛋，让爸爸妈妈去加一个</p>
          )}
        </div>
      </section>

      <section className="rc-section">
        <h2 className="rc-section__title">今天心情怎么样</h2>
        <div className="ck-moods">
          {MOODS.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`ck-mood${mood === m.key ? ' is-on' : ''}`}
              onClick={() => void recordMood(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>
    </>
  );
};

export default KidCheckinPage;
