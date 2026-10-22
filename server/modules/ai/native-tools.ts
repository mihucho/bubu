import { Logger } from '@nestjs/common';
import type { CapabilityService, PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { sanitizeForKid } from './react-prompt';
import { runTool, toolsFor, type ToolContext, type ToolSide } from './tools';
import { parentToolSpecs, runParentTool } from './parent-tools';

const logger = new Logger('NativeToolCalling');

/** OpenAI 风格的 function 定义 */
export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface NativeResult {
  reply: string;
  trace: { step: number; kind: string; tool?: string; summary?: string }[];
  modelCalls: number;
  degraded: boolean;
  /** 是否真的拿到了结构化 tool_calls（而不是模型自由发挥） */
  nativeToolCalls: number;
}

export function toToolSchema(side: ToolSide): ToolSchema[] {
  if (side === 'parent') {
    return parentToolSpecs().map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: { type: 'object' as const, properties: {} },
      },
    }));
  }
  return toolsFor(side).map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: { type: 'object', properties: {} },
    },
  }));
}

/**
 * 从插件返回里挖出 tool_calls。
 * 插件可能返回：
 *   { tool_calls: [...] }                    理想情况
 *   { content: '{"tool_calls":[...]}' }       被塞进文本
 *   { choices:[{message:{tool_calls:[...]}}] } OpenAI 原始结构
 * 三种都要认，否则会出现「模型明明调了工具，我们却当它没调」。
 */
export function extractToolCalls(payload: unknown): { calls: ToolCall[]; content: string } {
  const empty = { calls: [] as ToolCall[], content: '' };
  if (!payload) return empty;

  const asRecord = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : null;

  const direct = asRecord(payload);
  if (!direct) return empty;

  // choices[0].message
  const choices = direct.choices;
  if (Array.isArray(choices) && choices.length) {
    const msg = asRecord(asRecord(choices[0])?.message);
    if (msg) {
      const calls = msg.tool_calls;
      if (Array.isArray(calls) && calls.length) {
        return { calls: calls as ToolCall[], content: String(msg.content ?? '') };
      }
      if (typeof msg.content === 'string' && msg.content) {
        return { calls: [], content: msg.content };
      }
    }
  }

  const calls = direct.tool_calls;
  if (Array.isArray(calls) && calls.length) {
    return { calls: calls as ToolCall[], content: String(direct.content ?? '') };
  }

  const content = typeof direct.content === 'string' ? direct.content : '';
  if (content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (Array.isArray(parsed.tool_calls) && parsed.tool_calls.length) {
        return { calls: parsed.tool_calls as ToolCall[], content: '' };
      }
      if (typeof parsed.content === 'string') return { calls: [], content: parsed.content };
    } catch {
      /* 不是 JSON，当普通文本 */
    }
  }

  return { calls: [], content };
}

async function callNative(
  capability: CapabilityService,
  capabilityId: string,
  messages: ChatMessage[],
  tools: ToolSchema[],
): Promise<unknown> {
  const executor = capability.load(capabilityId);
  // 优先 unary（结构化返回最完整）；插件不支持时退回流式聚合
  try {
    return await executor.call('textGenerate', {
      messages,
      tools,
      tool_choice: 'auto',
    });
  } catch (e) {
    logger.warn(`unary 调用失败，退回流式：${(e as Error).message}`);
    const stream = executor.callStream('textGenerate', { messages, tools, tool_choice: 'auto' });
    const normalized =
      stream && typeof stream === 'object' && 'output' in stream
        ? (stream as { output: AsyncIterable<{ content?: string }> }).output
        : (stream as AsyncIterable<{ content?: string }>);
    let text = '';
    for await (const chunk of normalized) text += chunk?.content ?? '';
    return { content: text };
  }
}

/**
 * 原生 function calling 路径（`AI_NATIVE_TOOLS=1` 时启用）
 *
 * 与提示词 ReAct 的差别：模型直接返回结构化 `tool_calls`，
 * 不再需要解析文本方言；执行完把 `role:'tool'` 的消息回填，继续下一轮。
 * 这条路径能不能跑，取决于能力插件是否透传 `tools`——所以先做成可开关的探针。
 */
export async function runNativeTools(input: {
  db: PostgresJsDatabase;
  capability: CapabilityService;
  capabilityId?: string;
  childId: string;
  familyAccountId: string;
  question: string;
  side?: ToolSide;
  maxSteps?: number;
}): Promise<NativeResult> {
  const {
    db,
    capability,
    capabilityId = 'bubu_ai_native_tools',
    childId,
    familyAccountId,
    question,
    side = 'kid',
  } = input;

  const maxSteps = input.maxSteps ?? 4;
  const tools = toToolSchema(side);

  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  const today = new Date(now.getTime() - offset).toISOString().slice(0, 10);
  const monday = new Date(`${today}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));

  const ctx: ToolContext = {
    db,
    childId,
    familyAccountId,
    today,
    weekStart: monday.toISOString().slice(0, 10),
  };

  const messages: ChatMessage[] = [{ role: 'user', content: question }];
  const trace: NativeResult['trace'] = [];
  let modelCalls = 0;
  let nativeToolCalls = 0;

  for (let step = 1; step <= maxSteps; step += 1) {
    let payload: unknown;
    try {
      payload = await callNative(capability, capabilityId, messages, tools);
      modelCalls += 1;
    } catch (e) {
      logger.warn(`原生工具调用失败 step=${step}: ${(e as Error).message}`);
      trace.push({ step, kind: 'error', summary: (e as Error).message.slice(0, 80) });
      break;
    }

    const { calls, content } = extractToolCalls(payload);

    if (!calls.length) {
      const reply = side === 'kid' ? sanitizeForKid(content) : content;
      trace.push({ step, kind: 'final', summary: reply.slice(0, 60) });
      return {
        reply: reply || '这个我暂时看不到，等做完一点事再来问我吧',
        trace,
        modelCalls,
        degraded: false,
        nativeToolCalls,
      };
    }

    nativeToolCalls += calls.length;
    messages.push({ role: 'assistant', content: content || null, tool_calls: calls });

    for (const call of calls) {
      const name = call.function?.name ?? '';
      const result =
        side === 'parent'
          ? await runParentTool(name, {
              db,
              familyAccountId,
              today: ctx.today,
              weekStart: ctx.weekStart,
              childId,
            })
          : await runTool(name, ctx, side);
      trace.push({ step, kind: 'action', tool: name, summary: result.summary });
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name,
        content: JSON.stringify({ ok: result.ok, summary: result.summary, data: result.data }),
      });
    }
  }

  const facts = trace.filter((t) => t.kind === 'action' && t.summary).map((t) => t.summary as string);
  const reply = facts.length
    ? side === 'kid'
      ? `${facts.join('；')}。想再聊哪一件？`
      : facts.join('；')
    : '这个我暂时看不到，等做完一点事再来问我吧';
  trace.push({ step: trace.length + 1, kind: 'final', summary: '兜底' });
  return { reply, trace, modelCalls, degraded: true, nativeToolCalls };
}
