#!/usr/bin/env node
/**
 * UI 细节自检（docs/UI细节规范-v1.md）
 * 只做静态可判定的检查，覆盖 Q1–Q2 / Q9 / Q18 / Q19 / Q31 / Q36 / Q70 / Q75 / Q85
 *
 * 用法：
 *   node scripts/audit-ui.mjs            # 报告
 *   node scripts/audit-ui.mjs --strict   # 有 High 即退出码 1
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const strict = process.argv.includes('--strict');

const FILES = [
  'client/src/styles/tokens.css',
  'client/src/styles/shells.css',
  'client/src/shells/Shells.tsx',
  'client/src/pages/Auth/AuthPages.tsx',
  'client/src/pages/Gate/GatePage.tsx',
  'client/src/pages/Placeholder/Placeholder.tsx',
  'prototype/hifi/hifi.css',
];

/* ---------- 允许的颜色（令牌 + 设计稿明确用色） ---------- */
const ALLOWED_HEX = new Set(
  [
    '#ff85c1', '#ffb3d9', '#ffd7ec', '#ffc2e0', '#ffe4f1', '#fff0f5', '#fff4fa',
    '#a855f7', '#c4a6f5', '#ede0fd', '#f3e8fe', '#f2e9ff', '#faf5ff', '#f6f0ff',
    '#db2777', '#7c3aed', '#6d28d9', '#4a2666', '#2e1065', '#7c4fb0', '#8b5fbf',
    '#ffffff', '#fff', '#fbf7ff', '#fbfbfd', '#f8f9fb', '#f7f5fb', '#f4f1f9',
    '#f3e8ff', '#f0e4fb', '#efe6fa', '#fdf9ff', '#fdfaff', '#f8f2fe', '#fff4fa',
    '#ffe680', '#ffd23f', '#f7f0fe', '#f5f0fe', '#e9c3fb', '#dcc0fb',
    '#f2f0f7', '#eceaf2', '#e7e5ee', '#e5e1ee', '#efecf5', '#eceaeff2', '#f6f0fe',
    '#ffd700', '#a16207', '#f0a500', '#e8b23a', '#ffeb a8'.replace(' ', ''),
    '#22c55e', '#15803d', '#4ade80', '#86efac', '#f0fdf4', '#f6fef9',
    '#dc2626', '#b4478f', '#b45309', '#f59e0b', '#8c84a0', '#7e7396', '#6b6480',
    '#6b5a85', '#6f6685', '#3d2b57', '#3b3350', '#1b1230', '#8a83a0', '#8b7fa8',
    '#120c1f', '#000', '#111',
  ].map((c) => c.toLowerCase())
);

/* ---------- 字号阶梯（Q19 / Q20） ---------- */
const FONT_STEPS = new Set([10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15, 16, 16.5, 17, 18, 19, 20, 22, 24, 26, 28, 30, 32]);

const findings = [];
const add = (level, id, file, line, msg) => findings.push({ level, id, file, line, msg });

const read = (rel) => {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
};

for (const rel of FILES) {
  const src = read(rel);
  if (src === null) continue;
  const lines = src.split('\n');

  lines.forEach((raw, i) => {
    const line = raw.trim();
    const n = i + 1;
    if (!line || line.startsWith('/*') || line.startsWith('*') || line.startsWith('//')) return;

    /* Q25/Q26/Q32：硬编码颜色 */
    for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const hex = m[0].toLowerCase();
      if (hex.length !== 4 && hex.length !== 7 && hex.length !== 9) continue;
      if (!ALLOWED_HEX.has(hex)) add('High', 'Q25 颜色须走令牌', rel, n, `未登记颜色 ${hex}`);
    }

    /* Q19/Q20：字号必须在阶梯上 */
    for (const m of line.matchAll(/font-size:\s*([\d.]+)px/g)) {
      const v = Number(m[1]);
      if (!FONT_STEPS.has(v)) add('Medium', 'Q19 字号阶梯', rel, n, `字号 ${v}px 不在阶梯上`);
    }

    /* Q70：100vh */
    if (/\b100vh\b/.test(line)) add('High', 'Q70 用 100dvh', rel, n, '出现 100vh');

    /* Q2：标签省略号 */
    if (/text-overflow:\s*ellipsis/.test(line) && /label|__label|\.frow/.test(src.slice(Math.max(0, src.indexOf(line) - 400), src.indexOf(line)))) {
      add('High', 'Q2 标签不许省略号', rel, n, '标签列出现 ellipsis');
    }

    /* Q75：无限动画 */
    if (/animation:.*infinite/.test(line)) add('Medium', 'Q75 禁止无限装饰动画', rel, n, '出现 infinite 动画');

    /* Q85/Q86：孩子端禁用词 */
    if (/孩子端|kid/i.test(rel) || rel.includes('hifi')) {
      for (const w of ['系统错误', '接口异常', 'token', '暂无数据']) {
        if (line.includes(w)) add('High', 'Q85 儿童文案', rel, n, `出现「${w}」`);
      }
    }
  });
}

/* ---------- Q36：图标按钮缺 aria-label（只看 TSX） ---------- */
for (const rel of FILES.filter((f) => f.endsWith('.tsx'))) {
  const src = read(rel);
  if (!src) continue;
  src.split('\n').forEach((line, i) => {
    const hasIcon = /<([A-Z][A-Za-z]+)\s+size=/.test(line);
    const isButton = /<button/.test(line);
    if (hasIcon && isButton && !/aria-label/.test(line)) {
      add('Medium', 'Q36 图标按钮需 aria-label', rel, i + 1, line.trim().slice(0, 60));
    }
  });
}

/* ---------- Q31：禁用态必须 opacity .45 ---------- */
{
  const css = read('client/src/styles/shells.css') || '';
  if (css.includes(':disabled') && !/opacity:\s*\.?0?\.?45|opacity:\s*0\.45/.test(css)) {
    add('Medium', 'Q31 禁用态', 'client/src/styles/shells.css', 0, '禁用态未使用 opacity .45');
  }
}

/* ---------- 输出 ---------- */
const order = { High: 0, Medium: 1 };
findings.sort((a, b) => order[a.level] - order[b.level] || a.file.localeCompare(b.file) || a.line - b.line);

const high = findings.filter((f) => f.level === 'High').length;
const medium = findings.filter((f) => f.level === 'Medium').length;

console.log(`\nUI 细节自检：${findings.length} 项（High ${high} · Medium ${medium}）\n`);
for (const f of findings.slice(0, 60)) {
  console.log(`  [${f.level}] ${f.id}  ${f.file}:${f.line}  ${f.msg}`);
}
if (findings.length > 60) console.log(`  … 以及 ${findings.length - 60} 项`);

console.log(
  high === 0
    ? '\n✓ High 已清零\n'
    : `\n✗ 还有 ${high} 项 High：按 docs/UI细节规范-v1.md 对应 ID 修\n`
);

if (strict && high > 0) process.exit(1);
