import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir')+1] : 'prototype/hifi/v2';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');

let issues = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    const n = i + 1;
    // 1) 内联高度过小的按钮
    if (/<button/.test(line) || /class="[^"]*(btn|chip|opt|mood)[^"]*"/.test(line)) {
      const m = line.match(/height:\s*(\d+)px/);
      if (m && +m[1] < 40) issues.push([f, n, 'Q33 触控尺寸', `height ${m[1]}px`]);
    }
    // 2) 纯图标按钮缺 aria-label
    if (/<button[^>]*>\s*<svg/.test(line) && !/aria-label/.test(line)) {
      const afterSvg = line.split('</svg>').pop() || '';
      const hasText = afterSvg.replace(/<[^>]*>/g, '').trim().length > 0;
      if (!hasText) issues.push([f, n, 'Q36 图标按钮', '缺 aria-label']);
    }
    // 3) 未登记颜色（排除调色板内）
    for (const mm of line.matchAll(/#[0-9a-fA-F]{6}/g)) {
      const hex = mm[0].toLowerCase();
      const PALETTE = new Set(('ff85c1 ffc2e0 ffd7ec fff0f5 fff3fa fff6fb fbf7ff f7f0fe a855f7 d6b8fb f0e4fb ede0fd f3e8fe faf5ff db2777 7c3aed 6d28d9 4a2666 2b1147 3f2159 7c5a9e 7d7395 a08fb8 ffffff fff fbfbfd f8f9fc f7f7fa f2f0f7 eceaf2 e7e5ee efecf5 f1ecf7 f4f2f8 f5f1fa f6e3f1 fdeaf6 c7f0d6 86efac 22c55e 16a34a 15803d 157f43 ecfdf3 f0fdf4 f7fffa ffc93c e0a01a a16207 b45309 fff5e8 ffe0ab fff0d6 ffe680 ffd23f dc2626 b4478f 8b5cf6 c026d3 be185d 2563eb 6366f1 4ade80 55e08f 1fb85f d9b8fb ffe9f5 fbe6ff f0e4ff ffe4f1 f0e2ff f4eefb f3eefb f6f1fd fdf5fb ffc6e2 ffe0ef d3d0fb e6e5ff c4f0d5 ddf7e6 cfe0ff e6f0ff e0d0ff f0e6ff fff2f8 17111f faf9fc efefe6 fa f7f5fb e9d5ff f9f7fd efe6fa 7c4fb0 8b7fa8 fff6dc e8b23a ffe6f4 ffcfe6 f2e2ff e6e6fa ffd1e8 cfe2ff d4f6e4 f5e6ff ffe6f2 e8f7ff 1b1230 faf7ff efe6ff fecaca 3b2b57 fff5f5 f6f1fa f5e9fc b3a8c6 3d2b57 fff8fd b48ad6 8a5a00 fff8ec ffe7c2 6b6480 3b3350 f0e9f8 4b3a63 5b3d78 6f6685 f3e8ff fff0f7 f3e8fe').split(' '));
      const ok = PALETTE.has(hex.slice(1));
      if (!ok) issues.push([f, n, 'Q25 颜色', hex]);
    }
  });
}

const grouped = {};
for (const [f, n, id, msg] of issues) {
  grouped[id] = grouped[id] || [];
  grouped[id].push(`${f}:${n} ${msg}`);
}
console.log(`扫描 ${files.length} 个页面，问题 ${issues.length} 项`);
for (const [id, list] of Object.entries(grouped)) {
  console.log(`\n[${id}] ${list.length} 项`);
  list.slice(0, 6).forEach(x => console.log('  ' + x));
  if (list.length > 6) console.log(`  … 还有 ${list.length - 6} 项`);
}
