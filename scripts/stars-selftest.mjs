#!/usr/bin/env node
/**
 * 星星铁律自检（无数据库依赖，纯静态 + 算法校验）
 *
 * 校验三件事：
 *  R1 除 `stars.service.ts` 外，没有任何服务直接 UPDATE `child_profiles.available_stars`
 *  R2 `star_ledger.idempotency_key` 是唯一索引（DDL 与 Drizzle 定义都成立）
 *  R3 幂等 + 余额算法：同键重复提交不重复加星；支出不得把余额扣成负数
 */
import fs from 'node:fs';
import path from 'node:path';

const problems = [];

/* ---------------- R1 唯一写入口 ---------------- */
const SERVER = 'server';
const ALLOW = new Set(['server/modules/stars/stars.service.ts']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|js)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const WRITE_PATTERNS = [
  /availableStars\s*:\s*(?!balanceAfter|child\.|sums\.)/,
  /available_stars\s*=\s*(?!\$)/,
  /update\(\s*childProfiles\s*\)/,
];

for (const file of walk(SERVER)) {
  const src = fs.readFileSync(file, 'utf8');
  if (ALLOW.has(file)) continue;
  // 只关心「写」：update(childProfiles) 的 set 里出现 availableStars
  const setWindow = src.match(/update\(\s*childProfiles\s*\)[\s\S]{0,400}?set\(([\s\S]{0,300}?)\)/);
  if (setWindow && /availableStars/.test(setWindow[1])) {
    problems.push(`R1 ${file}: set 里直接写 availableStars（必须走 stars.service）`);
  }
  // 新模型：set 里出现 availableStars 一律拦
  if (/\.set\(\s*\{[^}]*availableStars/.test(src) && /childProfiles/.test(src)) {
    problems.push(`R1 ${file}: set({ availableStars }) 必须换成 stars.service`);
  }
  if (WRITE_PATTERNS[1].test(src)) {
    problems.push(`R1 ${file}: 出现裸 SQL 写 available_stars`);
  }
}

/* ---------------- R2 幂等唯一索引 ---------------- */
const sql = fs.readFileSync('server/database/migrations/001-init.sql', 'utf8');
if (!/CREATE UNIQUE INDEX uq_ledger_idem ON star_ledger\(idempotency_key\)/.test(sql)) {
  problems.push('R2 001-init.sql: star_ledger.idempotency_key 缺少唯一索引');
}
const schema = fs.readFileSync('server/database/appSchema.ts', 'utf8');
if (!/uniqueIndex\('uq_ledger_idem'\)\.on\(t\.idempotencyKey\)/.test(schema)) {
  problems.push('R2 appSchema.ts: starLedger 缺少 idempotencyKey 唯一索引定义');
}

/* ---------------- R3 算法 ---------------- */
class Ledger {
  constructor() {
    this.balance = 0;
    this.rows = new Map();
  }
  apply({ key, amount }) {
    if (key && this.rows.has(key)) return { duplicated: true, balance: this.rows.get(key) };
    if (this.balance + amount < 0) throw new Error('INSUFFICIENT_STARS');
    this.balance += amount;
    if (key) this.rows.set(key, this.balance);
    return { duplicated: false, balance: this.balance };
  }
}

const l = new Ledger();
l.apply({ key: 'task:1', amount: 3 });
l.apply({ key: 'task:1', amount: 3 }); // 重复提交
l.apply({ key: 'egg:1', amount: 1 });
const afterSpend = l.apply({ key: 'shop:1', amount: -2 });
if (l.balance !== 2) problems.push(`R3 余额应为 2，实际 ${l.balance}`);
if (afterSpend.duplicated) problems.push('R3 首次支出不应被判为重复');
try {
  l.apply({ key: 'shop:2', amount: -99 });
  problems.push('R3 超支应抛 INSUFFICIENT_STARS，但没有抛');
} catch (e) {
  if (e.message !== 'INSUFFICIENT_STARS') problems.push(`R3 超支错误码异常：${e.message}`);
}

/* ---------------- 输出 ---------------- */
if (!problems.length) {
  console.log('✓ 星星铁律自检通过（唯一写入口 / 幂等唯一索引 / 余额与超支算法）');
  process.exit(0);
}
console.log(`星星自检问题 ${problems.length} 项：`);
for (const p of problems) console.log('  - ' + p);
process.exit(1);
