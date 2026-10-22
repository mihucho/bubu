#!/usr/bin/env node
/**
 * 高保真全站结构审计（117 页）
 * 检查项：
 *  R1 每页引入 hf.js
 *  R2 每页有顶部信息（greet/dbar/phead2/p2head/authbrand/gsteps/chathead/meprofile/弹层/阻断态）
 *  R3 顶部条不能嵌在滚动区里（会失去吸顶与留位）
 *  R4 只有一层 .phone（防双重包装）
 *  R5 内联字号必须在允许集合内（孩子端 6 级 / 家长端 6 级）
 *  R6 无 emoji
 *  R7 纯图标按钮必须有 aria-label
 *  R8 内联 height < 40 的可点元素
 *  R9 div 标签配对
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'prototype/hifi/v2';
const KID_SIZES = new Set([11.5, 12, 13, 15, 17, 22]);
const PARENT_SIZES = new Set([11, 12, 13, 15, 19, 26]);
const TOP = ['class="greet"', 'class="dbar"', 'class="phead2"', 'class="p2head"', 'class="authbrand"',
  'class="gsteps"', 'class="chathead"', 'class="meprofile"', 'class="screen-sheet-bg"', 'class="offbar'];

// 设计上允许没有顶部条的页面：选人页（第一屏）、两堵墙（阻断态）、平板两栏（自带左栏标题）
const NO_TOP_OK = new Set(['choose-kid.html', 'kid-restwall.html', 'state-wall.html', 'tablet-two-col.html']);

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html') && f !== 'index.html');
const issues = [];
const add = (rule, file, msg) => issues.push({ rule, file, msg });

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const isKid = /^(kid|state|choose)/.test(f);

  if (!src.includes('hf.js')) add('R1', f, '缺 hf.js');

  if (!TOP.some(t => src.includes(t)) && !NO_TOP_OK.has(f)) add('R2', f, '无顶部信息');

  if (/<div class="(scroll|pbody)"[^>]*>\s*(?:<!--[\s\S]*?-->\s*)*<div class="(dbar|phead2|p2head)"/.test(src))
    add('R3', f, '顶部条嵌在滚动区内');

  const phones = (src.match(/class="phone/g) || []).length;
  if (phones !== 1) add('R4', f, `phone 数量 ${phones}`);

  const sizes = [...src.matchAll(/font-size:\s*([\d.]+)px/g)].map(m => parseFloat(m[1]));
  const allowed = isKid ? KID_SIZES : PARENT_SIZES;
  const bad = [...new Set(sizes.filter(s => !allowed.has(s)))];
  if (bad.length) add('R5', f, `越界字号 ${bad.join('/')}`);

  const emoji = (src.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  if (emoji) add('R6', f, `emoji ${emoji}`);

  src.split('\n').forEach((line, i) => {
    if (/<button[^>]*>\s*<svg/.test(line) && !/aria-label/.test(line)) {
      const after = (line.split('</svg>').pop() || '').replace(/<[^>]*>/g, '').trim();
      if (!after) add('R7', f, `第 ${i + 1} 行纯图标按钮缺 aria-label`);
    }
    const m = line.match(/height:\s*(\d+)px/);
    if (m && /<button|class="[^"]*(btn|chip|opt|mood)[^"]*"/.test(line) && +m[1] < 40)
      add('R8', f, `第 ${i + 1} 行触控 ${m[1]}px`);
  });

  const open = (src.match(/<div\b/g) || []).length;
  const close = (src.match(/<\/div>/g) || []).length;
  if (open !== close) add('R9', f, `div ${open}/${close} 不配对`);
}

const byRule = {};
for (const it of issues) {
  byRule[it.rule] = byRule[it.rule] || [];
  byRule[it.rule].push(`${it.file}: ${it.msg}`);
}

console.log(`\n审计 ${files.length} 页，问题 ${issues.length} 项\n`);
const names = {
  R1: 'hf.js 缺失', R2: '缺顶部信息', R3: '顶部条嵌在滚动区', R4: 'phone 层数',
  R5: '字号越界', R6: 'emoji', R7: '图标按钮 aria', R8: '触控尺寸', R9: 'div 配对',
};
for (const [rule, list] of Object.entries(byRule)) {
  console.log(`[${rule}] ${names[rule]} — ${list.length} 项`);
  list.slice(0, 8).forEach(x => console.log('   ' + x));
  if (list.length > 8) console.log(`   … 还有 ${list.length - 8} 项`);
  console.log('');
}
if (!issues.length) console.log('✓ 全部通过\n');
