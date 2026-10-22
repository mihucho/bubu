declare module '*.css';

// Type declarations for importing static assets
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

declare module '*.ico' {
  const value: string;
  export default value;
}

declare module '*.json' {
  const value: any;
  export default value;
}

declare module '*.md' {
  const value: string;
  export default value;
}

declare module '*.csv' {
  const value: string;
  export default value;
}

declare namespace React {
  export interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}

/**
 * 平台注入到页面里的运行时信息（`client/index.html` 的 `window.__platform__`）。
 * 只有「在豆包/妙搭里打开」时才有值：服务端 ViewContextMiddleware 把
 * req.__platform_data__ 渲染进 HTML，前端用它判断身份、CSRF、以及路由 basename。
 */
interface Window {
  __platform__?: {
    csrfToken?: string;
    userId?: string;
    appId?: string;
    appName?: string;
    appAvatar?: string;
    appDescription?: string;
    loginUrl?: string;
    userType?: string;
    tenantId?: number | string;
    environment?: 'online' | 'staging' | 'gray' | string;
    showBadge?: boolean;
    basename?: string;
    appPublished?: Record<string, unknown> | null;
  };
  MIAODA_APP_ID?: string;
  appId?: string;
  csrfToken?: string;
}
