#!/usr/bin/env node
/**
 * ReAct 解析器自测（本地可跑，不依赖数据库 / 平台能力）
 *
 * 后端在本地跑不起来，所以这里把「模型可能输出什么鬼东西」全部枚举一遍，
 * 保证解析器不会因为格式差异把整条对话链打崩。
 *
 * 运行：npm run audit:react
 */
import {
  buildToolManifest,
  buildReActPrompt,
  parseReActStep,
  validateAction,
  sanitizeForKid,
} from '../server/modules/ai/react-prompt.ts';

const problems = [];
let pass = 0;

function expectAction(label, input, tool, args = {}) {
  const step = parseReActStep(input);
  if (step.kind !== 'action') {
    problems.push(`${label}: 期望 action(${tool})，实际 ${step.kind}`);
    return;
  }
  if (step.tool !== tool) {
    problems.push(`${label}: 工具名 ${step.tool} != ${tool}`);
    return;
  }
  const ak = Object.keys(args).sort().join(',');
  const sk = Object.keys(step.args).sort().join(',');
  if (ak !== sk) {
    problems.push(`${label}: 参数键 ${sk} != ${ak}`);
    return;
  }
  pass += 1;
}

function expectFinal(label, input, contains) {
  const step = parseReActStep(input);
  if (step.kind !== 'final') {
    problems.push(`${label}: 期望 final，实际 ${step.kind}`);
    return;
  }
  if (contains && !step.text.includes(contains)) {
    problems.push(`${label}: final 文本里没有「${contains}」→ ${step.text.slice(0, 40)}`);
    return;
  }
  pass += 1;
}

function expectInvalid(label, input) {
  const step = parseReActStep(input);
  if (step.kind !== 'invalid') {
    problems.push(`${label}: 期望 invalid，实际 ${step.kind}`);
    return;
  }
  pass += 1;
}

/* ---------- 正常形态 ---------- */
expectAction('标准 tool_call', '<tool_call>{"name":"kid_reading","arguments":{}}</tool_call>', 'kid_reading');
expectAction('tool 裸名', '<tool>kid_reading</tool>', 'kid_reading');
expectAction('tool + json', '<tool>{"name":"kid_stars"}</tool>', 'kid_stars');
expectAction('tool_use', '<tool_use>{"name":"kid_exercise","args":{}}</tool_use>', 'kid_exercise');
expectAction('function= 方言', '<function=kid_wishes>{}</function>', 'kid_wishes');
expectAction('action name 属性', '<action name="kid_today_tasks">{}</action>', 'kid_today_tasks');
expectAction('裸 JSON', '{"name":"kid_stars","arguments":{}}', 'kid_stars');
expectAction('tool 字段名', '{"tool":"kid_reading","args":{}}', 'kid_reading');
expectAction('parameters 字段', '<tool_call>{"name":"kid_stars","parameters":{"x":1}}</tool_call>', 'kid_stars', { x: 1 });

/* ---------- 脏数据 ---------- */
expectAction('代码围栏', '```json\n{"name":"kid_stars","arguments":{}}\n```', 'kid_stars');
expectAction('尾随逗号', '<tool_call>{"name":"kid_stars","arguments":{},}</tool_call>', 'kid_stars');
expectAction('缺闭合标签', '<tool_call>{"name":"kid_reading","arguments":{}}', 'kid_reading');
expectAction('前后有废话', '我想查一下。<tool_call>{"name":"kid_stars"}</tool_call> 稍等。', 'kid_stars');
expectAction('arguments 是字符串', '<tool_call>{"name":"kid_stars","arguments":"{}"}</tool_call>', 'kid_stars');
expectAction('function 嵌套 name', '<tool_call>{"function":{"name":"kid_stars"}}</tool_call>', 'kid_stars');

/* ---------- 最终答案 ---------- */
expectFinal('final 标签', '<final>你今天完成了 2 个任务。</final>', '2 个任务');
expectFinal('FINAL 前缀', 'FINAL: 你今天读了 20 分钟', '20 分钟');
expectFinal('裸文本当 final', '你今天好棒，已经完成了两个任务', '好棒');
expectFinal('final 缺闭合', '<final>你今天读了 20 分钟', '20 分钟');

/* ---------- 非法输入 ---------- */
expectInvalid('空输出', '   ');
expectInvalid('tool 里是垃圾', '<tool_call>今天天气不错</tool_call>');

/* ---------- 校验器 ---------- */
const tools = [
  { name: 'kid_stars', description: '星星' },
  { name: 'kid_reading', description: '阅读' },
];
const seen = new Set(['kid_stars']);
const unknown = validateAction({ kind: 'action', tool: 'nope', args: {}, raw: '' }, tools, new Set());
if (unknown.ok) problems.push('校验器: 未知工具应判不合法'); else pass += 1;

const dup = validateAction({ kind: 'action', tool: 'kid_stars', args: {}, raw: '' }, tools, seen);
if (dup.ok) problems.push('校验器: 重复工具应判不合法'); else pass += 1;

const okTool = validateAction({ kind: 'action', tool: 'kid_reading', args: {}, raw: '' }, tools, seen);
if (!okTool.ok) problems.push('校验器: 合法工具被误判'); else pass += 1;

const withParams = [{ name: 'x', description: 'x', params: { n: '数量' } }];
const missing = validateAction({ kind: 'action', tool: 'x', args: {}, raw: '' }, withParams, new Set());
if (missing.ok) problems.push('校验器: 缺参数应判不合法'); else pass += 1;

/* ---------- 提示词与护栏 ---------- */
const manifest = buildToolManifest(tools);
if (!manifest.includes('kid_stars') || !manifest.includes('kid_reading')) {
  problems.push('清单: 没有把工具名写进提示词');
} else pass += 1;

const prompt = buildReActPrompt({
  tools,
  question: '我今天读了多久',
  scratchpad: ['- 今天读了 20 分钟'],
  step: 4,
  maxSteps: 4,
});
if (!prompt.includes('最后一次机会')) problems.push('提示词: 最后一步没有强制作答提醒'); else pass += 1;
if (!prompt.includes('今天读了 20 分钟')) problems.push('提示词: 没有把已验证事实喂回去'); else pass += 1;

if (sanitizeForKid('你比姐姐多做了两个任务') === '你比姐姐多做了两个任务') {
  problems.push('护栏: 比较句式没有被拦下');
} else pass += 1;

if (sanitizeForKid('你今天完成了两个任务') !== '你今天完成了两个任务') {
  problems.push('护栏: 正常语句被误拦');
} else pass += 1;

/* ---------- 输出 ---------- */
if (!problems.length) {
  console.log(`✓ ReAct 协议自测通过（${pass} 项：解析 / 校验 / 提示词 / 护栏）`);
  process.exit(0);
}
console.log(`ReAct 自测问题 ${problems.length} 项：`);
for (const p of problems) console.log('  - ' + p);
process.exit(1);
