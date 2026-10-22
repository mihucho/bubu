#!/usr/bin/env node
/**
 * 壳结构审计（R10）：每个页面的 .screen 必须是固定四行
 *   1. .statusbar
 *   2. 页头（可省略，如首页/列表首屏也可没有）
 *   3. 唯一滚动区 main.scroll / .scroll / .pbody（恰好 1 个）
 *   4. 底部导航 .nav / .pnav2（可省略）
 * 页头不允许出现在滚动区内部；滚动区不允许出现 2 个及以上。
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'prototype/hifi/v2';
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.html') && f !== 'index.html').sort();

// chatwrap 是唯一被允许的复合滚动容器：头部固定 + chatbody 滚动 + 输入条
// screen-sheet-bg：底部弹层舞台（背景层可滚 + 弹层绝对定位在底部），视为第 2–3 行合并形态
const SCROLL = new Set(['scroll', 'pbody', 'authwrap', 'chatwrap', 'screen-sheet-bg']);
const NAV = new Set(['nav', 'pnav2']);

/** 从 `<div class="screen...">` 起做 div 深度扫描，返回顶层子元素的 class 列表 */
function topLevelChildren(src) {
  const start = src.indexOf('<div class="screen');
  if (start < 0) return null;
  const openEnd = src.indexOf('>', start);
  let i = openEnd + 1;
  let depth = 0;
  const out = [];
  const re = /<(\/?)(div|main|nav|header|section)\b([^>]*)>/g;
  re.lastIndex = i;
  let m;
  while ((m = re.exec(src))) {
    const closing = m[1] === '/';
    const attrs = m[3] || '';
    if (!closing) {
      if (depth === 0) {
        const cm = attrs.match(/class="([^"]*)"/);
        out.push((m[2] === 'main' ? 'main ' : '') + (cm ? cm[1] : ''));
      }
      depth++;
    } else {
      depth--;
      if (depth < 0) break; // .screen 自身闭合
    }
  }
  return out;
}

const problems = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const kids = topLevelChildren(src);
  if (kids === null) {
    problems.push([f, '找不到 .screen']);
    continue;
  }
  const cls = kids.map((c) => c.split(/\s+/).filter(Boolean));
  const has = (set) => cls.map((arr) => arr.some((c) => set.has(c)));

  const isStatus = cls.map((arr) => arr.includes('statusbar'));
  const isScroll = has(SCROLL);
  const isNav = has(NAV);

  if (!isStatus[0]) problems.push([f, `第 1 个子元素不是 .statusbar（是 "${kids[0]}"）`]);

  const scrollIdx = isScroll.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  if (scrollIdx.length === 0) problems.push([f, '没有独立滚动区（main.scroll / .scroll / .pbody）']);
  if (scrollIdx.length > 1) problems.push([f, `出现了 ${scrollIdx.length} 个滚动区`]);

  const last = kids.length - 1;
  if (isNav[last]) {
    // 导航必须最后
  } else if (isNav.some(Boolean)) {
    problems.push([f, '导航不在最后一个子元素']);
  }

  // 页头必须在滚动区之前
  if (scrollIdx.length === 1 && !cls[scrollIdx[0]].includes('chatwrap')) {
    const after = kids.slice(scrollIdx[0] + 1).filter((c) => /dbar|phead2|p2head|greet/.test(c));
    if (after.length) problems.push([f, '页头出现在滚动区之后']);
  }
  // 聊天页必须自带 .chatbody 作为内层滚动区
  if (cls.some((a) => a.includes('chatwrap')) && !src.includes('class="chatbody')) {
    problems.push([f, 'chatwrap 内缺少 .chatbody 滚动区']);
  }
}

if (!problems.length) {
  console.log(`✓ 壳结构审计通过（${files.length} 页：状态条 / 页头 / 唯一滚动区 / 导航）`);
  process.exit(0);
}

console.log(`壳结构问题 ${problems.length} 项（共 ${files.length} 页）\n`);
for (const [f, msg] of problems) console.log(`  ${f}: ${msg}`);
process.exit(1);
