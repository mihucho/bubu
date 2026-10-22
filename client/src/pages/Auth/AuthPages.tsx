import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';

import '../../styles/tokens.css';
import '../../styles/shells.css';

/* ============================================================
   认证三页：登录 / 注册 / 忘记密码
   口径（docs/最终方案-v2.0.md D22）：
   - 豆包内由平台 SSO 自动登录，这一页不出现
   - 豆包外（微信扫码 / 浏览器）走手机号 + 密码
   - 不做微信授权登录
   本期只做表单与校验；提交到 console + 提示，接口下批接。
   ============================================================ */

type Mode = 'login' | 'register' | 'forgot';

const PHONE_RE = /^1[3-9]\d{9}$/;
const PWD_MIN = 8;

const AuthLayout: React.FC<{ title: string; sub: string; children: React.ReactNode; footer?: React.ReactNode }> = ({
  title,
  sub,
  children,
  footer,
}) => (
  <div className="bbu-root bbu-canvas" data-surface="parent">
    <div className="bbu-center">
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: '#fff',
            boxShadow: 'var(--clay-card)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            fontWeight: 800,
            color: '#A855F7',
          }}
          aria-hidden
        >
          布
        </div>
        <h1 style={{ margin: '12px 0 4px', fontSize: 22, fontWeight: 800, color: 'var(--k-text)' }}>{title}</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--k-text-sub)' }}>{sub}</p>
      </div>
      <div className="bbu-center__body">{children}</div>
      {footer}
    </div>
  </div>
);

/** 登录：手机号 + 密码 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pwd, setPwd] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pErr = PHONE_RE.test(phone) ? '' : '请输入 11 位手机号';
    const wErr = pwd.length >= PWD_MIN ? '' : `密码至少 ${PWD_MIN} 位`;
    setPhoneErr(pErr);
    setPwdErr(wErr);
    if (pErr || wErr) return;

    // TODO(W1+): 接 POST /auth/login；当前仅打通路由
    logger.info('[auth] login', { phone });
    navigate('/parent');
  };

  return (
    <AuthLayout
      title="布布的学习小天地"
      sub="家长的账号 · 每天一点点，成长看得见"
      footer={
        <p className="bbu-hint" style={{ marginTop: 12 }}>
          {isInDoubao()
            ? '在豆包里打开会自动登录，这一页不会出现'
            : '你正在微信或浏览器里打开，用手机号登录即可'}
        </p>
      }
    >
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} noValidate>
        <div className="bbu-field">
          <label className="bbu-field__label" htmlFor="login-phone">
            手机号
          </label>
          <input
            id="login-phone"
            className="bbu-input"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={11}
            placeholder="138 0000 0000"
            value={phone}
            aria-invalid={!!phoneErr}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          />
          {phoneErr ? <p className="bbu-error">{phoneErr}</p> : null}
        </div>

        <div className="bbu-field">
          <label className="bbu-field__label" htmlFor="login-pwd">
            密码
          </label>
          <input
            id="login-pwd"
            className="bbu-input"
            type="password"
            autoComplete="current-password"
            placeholder={`至少 ${PWD_MIN} 位`}
            value={pwd}
            aria-invalid={!!pwdErr}
            onChange={(e) => setPwd(e.target.value)}
          />
          {pwdErr ? <p className="bbu-error">{pwdErr}</p> : null}
        </div>

        <button className="bbu-btn" type="submit" style={{ marginTop: 4 }}>
          登录
        </button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <Link to="/auth/register" style={{ color: 'var(--k-text-sub)' }}>
          没有账号？注册
        </Link>
        <Link to="/auth/forgot" style={{ color: 'var(--k-text-sub)' }}>
          忘记密码
        </Link>
      </div>
    </AuthLayout>
  );
};

/** 注册：手机号 + 密码 + 密码确认 */
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState<{ phone?: string; pwd?: string; pwd2?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof err = {};
    if (!PHONE_RE.test(phone)) next.phone = '请输入 11 位手机号';
    if (pwd.length < PWD_MIN) next.pwd = `密码至少 ${PWD_MIN} 位`;
    if (pwd2 !== pwd) next.pwd2 = '两次输入的密码不一致';
    setErr(next);
    if (Object.keys(next).length) return;

    // TODO(W1+): 接 POST /auth/register，成功后进入引导第 1 步（监护人同意）
    logger.info('[auth] register', { phone });
    navigate('/parent');
  };

  return (
    <AuthLayout title="注册家长账号" sub="一个账号可以管好所有孩子">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} noValidate>
        <div className="bbu-field">
          <label className="bbu-field__label" htmlFor="reg-phone">
            手机号
          </label>
          <input
            id="reg-phone"
            className="bbu-input"
            inputMode="numeric"
            maxLength={11}
            placeholder="138 0000 0000"
            value={phone}
            aria-invalid={!!err.phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          />
          {err.phone ? <p className="bbu-error">{err.phone}</p> : null}
        </div>

        <div className="bbu-field">
          <label className="bbu-field__label" htmlFor="reg-pwd">
            密码
          </label>
          <input
            id="reg-pwd"
            className="bbu-input"
            type="password"
            autoComplete="new-password"
            placeholder={`至少 ${PWD_MIN} 位`}
            value={pwd}
            aria-invalid={!!err.pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          {err.pwd ? <p className="bbu-error">{err.pwd}</p> : null}
        </div>

        <div className="bbu-field">
          <label className="bbu-field__label" htmlFor="reg-pwd2">
            再输一次
          </label>
          <input
            id="reg-pwd2"
            className="bbu-input"
            type="password"
            autoComplete="new-password"
            value={pwd2}
            aria-invalid={!!err.pwd2}
            onChange={(e) => setPwd2(e.target.value)}
          />
          {err.pwd2 ? <p className="bbu-error">{err.pwd2}</p> : null}
        </div>

        <button className="bbu-btn" type="submit" style={{ marginTop: 4 }}>
          注册
        </button>
      </form>

      <p className="bbu-hint">
        注册后先要有一位家长同意孩子的使用，
        <br />
        再添加第一个孩子。
      </p>
      <Link to="/auth/login" style={{ textAlign: 'center', fontSize: 13, color: 'var(--k-text-sub)' }}>
        已经有账号，去登录
      </Link>
    </AuthLayout>
  );
};

/** 忘记密码：手机号 + 验证码（本期只到"已发送"状态） */
export const ForgotPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  const send = () => {
    if (!PHONE_RE.test(phone)) {
      setErr('请输入 11 位手机号');
      return;
    }
    setErr('');
    setSent(true);
    // TODO(W1+): 接 POST /auth/sms-code
    logger.info('[auth] send code', { phone });
  };

  return (
    <AuthLayout title="找回密码" sub="用注册时的手机号收一条验证码">
      <div className="bbu-field">
        <label className="bbu-field__label" htmlFor="forgot-phone">
          手机号
        </label>
        <input
          id="forgot-phone"
          className="bbu-input"
          inputMode="numeric"
          maxLength={11}
          placeholder="138 0000 0000"
          value={phone}
          aria-invalid={!!err}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
        />
        {err ? <p className="bbu-error">{err}</p> : null}
      </div>

      {sent ? (
        <div className="bbu-field">
          <label className="bbu-field__label" htmlFor="forgot-code">
            验证码
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="forgot-code"
              className="bbu-input"
              inputMode="numeric"
              maxLength={6}
              placeholder="6 位数字"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <button type="button" className="bbu-btn bbu-btn--ghost" style={{ width: 108 }} onClick={send}>
              重发
            </button>
          </div>
          <p className="bbu-hint" style={{ textAlign: 'left' }}>
            没收到？60 秒后可以重发。
          </p>
        </div>
      ) : null}

      <button className="bbu-btn" type="button" disabled={sent && code.length !== 6} onClick={send}>
        {sent ? '下一步' : '发送验证码'}
      </button>

      <Link to="/auth/login" style={{ textAlign: 'center', fontSize: 13, color: 'var(--k-text-sub)' }}>
        想起来了，去登录
      </Link>
    </AuthLayout>
  );
};

/** 环境判定：本次只判断"在不在豆包内"（D22） */
export function isInDoubao(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Doubao|aweme.*doubao/i.test(navigator.userAgent);
}

export type { Mode };
