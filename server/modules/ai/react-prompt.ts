/**
 * ReAct 协议层（纯函数，无数据库依赖）
 *
 * 用途：平台能力插件只暴露 `chat_role / user_message / data_context`，
 * 没有 tools / function calling / response_format 参数。
 * 所以把「工具清单 + 输出协议」写进 data_context，把模型输出解析回结构化步骤。
 *
 * 解析器必须容忍模型的各种方言，否则整条链路会时不时崩：
 *   <tool_call>{"name":"x","arguments":{}}</tool_call>
 *   <tool>{"name":"x"}</tool>        <tool>x</tool>
 *   <function=x>{...}</function>     <action name="x">{...}</action>
 *   ```json {"name":"x"} ```          裸 JSON 一行
 *   缺闭合标签 / 尾随逗号 / arguments 是字符串
 * 最终答案：
 *   <final>…</final>   FINAL: …   或「没有任何工具标记的普通文本」
 */

export interface ToolSpec {
  name: string;
  description: string;
  /** 目前 K 类工具全部无参数 */
  params?: Record<string, string>;
}

export type ReActStep =
  | { kind: 'action'; tool: string; args: Record<string, unknown>; raw: string }
  | { kind: 'final'; text: string; raw: string }
  | { kind: 'invalid'; reason: string; raw: string };

/* ============================================================
   1. 提示词：工具清单 + 协议
   ============================================================ */

export function buildToolManifest(tools: ToolSpec[]): string {
  const lines = tools.map((t) => {
    const params = t.params && Object.keys(t.params).length
      ? `（参数：${Object.entries(t.params).map(([k, v]) => `${k}=${v}`).join('，')}）`
      : '（无参数）';
    return `- ${t.name} ${params}：${t.description}`;
  });
  return ['【可用工具】', ...lines].join('\n');
}

export function buildReActPrompt(input: {
  tools: ToolSpec[];
  question: string;
  scratchpad: string[];
  step: number;
  maxSteps: number;
  lastInvalid?: string;
}): string {
  const { tools, question, scratchpad, step, maxSteps, lastInvalid } = input;
  const parts: string[] = [
    buildToolManifest(tools),
    '',
    '【怎么用】',
    '一次只做一件事，并且只输出下面两种之一，不要输出别的文字：',
    '1) 需要查数据：',
    '   <tool_call>{"name":"工具名","arguments":{}}</tool_call>',
    '2) 已经能回答：',
    '   <final>你要说的话</final>',
    '规则：一次只能请求一个工具；已经知道答案就立刻给 final；不要重复请求同一个工具。',
    '',
    '【聊天对象】孩子',
    '',
    `【孩子的问题】${question}`,
  ];

  if (scratchpad.length) {
    parts.push('', '【已经查到的事实】', ...scratchpad);
  }

  if (step >= maxSteps) {
    parts.push('', '【提醒】这是最后一次机会，请直接输出 <final> 回答，不要再请求工具。');
  }
  if (lastInvalid) {
    parts.push('', `【上次输出有问题】${lastInvalid}。请严格按上面的格式重发一次。`);
  }

  return parts.join('\n');
}

/* ============================================================
   2. 解析器
   ============================================================ */

const FENCE = /```(?:json|JSON)?\s*([\s\S]*?)```/g;

/** 去掉代码围栏，保留其余文字 */
function stripFences(text: string): string {
  return text.replace(FENCE, (_m, body: string) => body);
}

/** 修复常见的 JSON 损坏：尾随逗号、前后杂物 */
function repairJson(raw: string): string {
  let out = raw.trim();
  const start = out.indexOf('{');
  if (start < 0) return out;
  // 取第一个平衡的花括号块
  let depth = 0;
  let end = -1;
  let inStr = false;
  let esc = false;
  for (let i = start; i < out.length; i += 1) {
    const ch = out[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end > 0) out = out.slice(start, end);
  // 尾随逗号
  out = out.replace(/,\s*([}\]])/g, '$1');
  return out;
}

function safeParseJson(raw: string): Record<string, unknown> | null {
  const candidate = repairJson(raw);
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** 从一组可能的字段名里取工具名与参数 */
function pickCall(obj: Record<string, unknown>): { tool: string; args: Record<string, unknown> } | null {
  const nameLike = obj.name ?? obj.tool ?? obj.function ?? obj.action;
  let tool = '';
  if (typeof nameLike === 'string') tool = nameLike;
  else if (nameLike && typeof nameLike === 'object') {
    const inner = (nameLike as Record<string, unknown>).name;
    if (typeof inner === 'string') tool = inner;
  }
  if (!tool) return null;

  const argsLike = obj.arguments ?? obj.args ?? obj.parameters ?? obj.input;
  let args: Record<string, unknown> = {};
  if (argsLike && typeof argsLike === 'object') args = argsLike as Record<string, unknown>;
  else if (typeof argsLike === 'string') {
    const parsed = safeParseJson(argsLike);
    if (parsed) args = parsed;
  }
  return { tool: tool.trim(), args };
}

/**
 * 从模型输出里解析一步。
 * 顺序：final 标签 → FINAL: 前缀 → tool_call 标签 → tool 标签 → function= → action 标签 → 裸 JSON → 普通文本(当作 final)
 */
export function parseReActStep(rawOutput: string): ReActStep {
  const raw = rawOutput ?? '';
  const text = stripFences(raw).trim();
  if (!text) return { kind: 'invalid', reason: '模型没有输出内容', raw };

  /* ---------- final ---------- */
  const finalTag = text.match(/<final>([\s\S]*?)(?:<\/final>|$)/i);
  if (finalTag) {
    const body = finalTag[1].trim();
    if (body) return { kind: 'final', text: body, raw };
  }

  const finalPrefix = text.match(/^(?:FINAL|Final|答案)\s*[:：]\s*([\s\S]+)$/);
  if (finalPrefix) {
    const body = finalPrefix[1].trim();
    if (body) return { kind: 'final', text: body, raw };
  }

  /* ---------- tool_call / tool / tool_use ---------- */
  const tagMatch = text.match(/<(tool_call|tool_use|tool|action)\b([^>]*)>([\s\S]*?)(?:<\/\1>|$)/i);
  if (tagMatch) {
    const [, tag, attrs, body] = tagMatch;
    const attrName = attrs?.match(/name\s*=\s*["']([^"']+)["']/i)?.[1];

    // <tool>kid_reading</tool> —— 裸工具名
    const bare = body.trim();
    if (bare && !bare.startsWith('{')) {
      if (/^[a-z0-9_]+$/i.test(bare)) {
        return { kind: 'action', tool: bare, args: {}, raw };
      }
    }

    const parsed = safeParseJson(bare);
    if (parsed) {
      const call = pickCall(parsed);
      if (call) return { kind: 'action', tool: call.tool, args: call.args, raw };
    }

    if (attrName) return { kind: 'action', tool: attrName, args: {}, raw };

    return { kind: 'invalid', reason: `<${tag}> 里的内容不是合法的工具调用`, raw };
  }

  /* ---------- <function=name>…</function> ---------- */
  const fnMatch = text.match(/<function\s*=\s*([a-z0-9_]+)\s*>([\s\S]*?)(?:<\/function>|$)/i);
  if (fnMatch) {
    const [, name, body] = fnMatch;
    const parsed = safeParseJson(body);
    const call = parsed ? pickCall(parsed) : null;
    return { kind: 'action', tool: call?.tool ?? name, args: call?.args ?? {}, raw };
  }

  /* ---------- 裸 JSON ---------- */
  if (text.startsWith('{')) {
    const parsed = safeParseJson(text);
    if (parsed) {
      const call = pickCall(parsed);
      if (call) return { kind: 'action', tool: call.tool, args: call.args, raw };
    }
  }

  /* ---------- 没标签：当成最终回答 ---------- */
  return { kind: 'final', text, raw };
}

/* ============================================================
   3. 校验
   ============================================================ */

export interface ValidateResult {
  ok: boolean;
  reason?: string;
}

export function validateAction(
  step: Extract<ReActStep, { kind: 'action' }>,
  tools: ToolSpec[],
  seen: Set<string>,
): ValidateResult {
  const spec = tools.find((t) => t.name === step.tool);
  if (!spec) {
    return { ok: false, reason: `没有叫 ${step.tool} 的工具` };
  }
  const allowed = Object.keys(spec.params ?? {});
  const given = Object.keys(step.args ?? {});
  const extra = given.filter((k) => !allowed.includes(k));
  if (extra.length) {
    return { ok: false, reason: `工具 ${step.tool} 不接受参数：${extra.join('、')}` };
  }
  const missing = allowed.filter((k) => !(k in (step.args ?? {})));
  if (missing.length) {
    return { ok: false, reason: `工具 ${step.tool} 缺少参数：${missing.join('、')}` };
  }
  if (seen.has(step.tool)) {
    return { ok: false, reason: `工具 ${step.tool} 已经查过了，换个方式或直接回答` };
  }
  return { ok: true };
}

/* ============================================================
   4. 孩子端输出护栏
   ============================================================ */

const COMPARISON = /(比.{0,8}(多|少|强|好|快|高))|第一名|排名|最厉害|不如|落后|超过别人/;

export function sanitizeForKid(text: string): string {
  if (!text) return '我记不清了，你再说一次好不好';
  if (COMPARISON.test(text)) return '我只知道你今天的表现，我们一起看看你做的事吧。';
  return text;
}
