# AI 原生工具调用接入方案（v1）

> 背景：模型本身支持 function calling，**不支持的是平台能力插件这个接口**——
> `@official-plugins/ai-text-generate` 经我们的 capability JSON 只暴露了
> `chat_role / user_message / data_context` 三个参数，没有 `tools`。

现状与三条路：

| 路径 | 做法 | 依赖 | 状态 |
| --- | --- | --- | --- |
| A · 透传探针 | 自建 capability，把 `messages / tools / tool_choice` 放进 paramsSchema 透传给同一个插件 | 插件是否透传未知 | **已建，待平台验证** |
| B · 自研插件 | 用 `@lark-apaas/action-plugin-core` 写一个 `chatWithTools` 插件，发布后安装，capability 指向它 | 需要插件里能拿到模型凭证 | 待评估 |
| C · 提示词 ReAct | 把工具清单与协议写进 `data_context`，解析 `<tool_call>/<final>` 驱动循环 | 无 | **已实现并自测** |

---

## A. 透传探针（当前默认关闭）

已新增 `server/capabilities/bubu_ai_native_tools.json`：

```json
{
  "id": "bubu_ai_native_tools",
  "pluginKey": "@official-plugins/ai-text-generate",
  "paramsSchema": { "required": ["messages"],
    "properties": { "messages": …, "tools": …, "tool_choice": …, "response_format": … } },
  "formValue": { "messages": "{{input.messages}}", "tools": "{{input.tools}}", … }
}
```

代码侧：`server/modules/ai/native-tools.ts`，环境变量开关：

```bash
AI_NATIVE_TOOLS=1   # 打开原生路径；失败会自动回落到提示词 ReAct
```

### 怎么在平台上验证这一条

1. 部署到豆包（dev 环境才有 debug 接口）
2. 调用探针，看返回结构里有没有结构化 `tool_calls`：

```bash
curl -X POST "$BASE/__innerapi__/capability/debug/bubu_ai_native_tools" \
  -H 'content-type: application/json' \
  -d '{"action":"textGenerate","params":{
        "messages":[{"role":"user","content":"我今天读了多久书"}],
        "tools":[{"type":"function","function":{"name":"kid_reading",
                  "description":"阅读时长","parameters":{"type":"object","properties":{}}}}],
        "tool_choice":"auto"}}'
```

判读：

| 返回 | 说明 | 下一步 |
| --- | --- | --- |
| `data.tool_calls[0].function.name = "kid_reading"` | 插件透传成功，原生可用 | 打开 `AI_NATIVE_TOOLS=1` |
| `debug.resolvedParams.tools` 为空 | 模板没解析（字段名不对） | 对照插件 manifest 改 `formValue` 字段名 |
| 报 `unrecognized key: tools` | 插件 zod strict，不透传 | 走路径 B |
| 正常文本回答（没有 tool_calls） | 插件吞掉了 tools 但仍调模型 | 走路径 B |

`debug` 响应里的 `resolvedParams` 是判断「参数到底传没传进去」的唯一证据。

---

## B. 自研插件（能确定拿到 tools）

平台支持自研 integration plugin：

```bash
npm i -g @lark-apaas/action-plugin-cli
apaas-plugin config init          # 配 registry + cookie
apaas-plugin init @bubu/ai-tools --template single-dynamic
```

插件内定义 action `chatWithTools`，input schema：

```ts
const Input = z.object({
  messages: z.array(z.any()),
  tools: z.array(z.any()).optional(),
  tool_choice: z.string().optional(),
  model: z.string().optional(),
});
```

handler 里用平台的 HTTP 客户端调模型网关（凭证由平台注入 context，不写死），把 `tools` 原样带上，返回原始 `choices[0].message`。

发布与安装：

```bash
pnpm build && apaas-plugin publish
fullstack-cli action-plugin install @bubu/ai-tools
```

然后新增 capability 指向它（`pluginKey: "@bubu/ai-tools"`），`native-tools.ts` 把 `capabilityId` 换掉即可，其它代码不用动。

**尚未确认**：插件 handler 能否拿到模型网关地址与凭证（`ActionContext` 里有没有）。这需要平台文档或联调确认——这是路径 B 唯一的未知项。

---

## C. 提示词 ReAct（已上线，作为兜底）

- 协议层：`server/modules/ai/react-prompt.ts`（纯函数，7 种方言解析 + JSON 修复 + 参数校验 + 孩子端护栏）
- 循环：`server/modules/ai/react.ts`（≤4 步，连续 2 次解析失败降级，三级兜底保证一定有话）
- 自测：`npm run audit:react`（30 项断言，本地可跑）

---

## 两条路的关系

```
AI_NATIVE_TOOLS=1
  └─ runNativeTools（原生 tool_calls）
        ├─ 拿到 tool_calls → 执行 → 回填 role:tool → 继续
        └─ 没拿到 / 报错 → 自动回落 runReAct（提示词）
AI_NATIVE_TOOLS 未设置
  └─ runReAct（提示词）
```

返回值里带 `path: 'native' | 'react'` 与 `nativeToolCalls`，上线后看这两个字段就知道插件到底有没有透传。

`chat_messages.tool_payload` 存 trace，可复盘每一步。

---

## 建议排期

1. 平台 dev 环境跑一次 A 的 debug 调用（10 分钟，决定后面两周的方向）
2. 若透传 → 灰度 `AI_NATIVE_TOOLS=1`，观察 `path` 与 `degraded` 比例
3. 若不透传 → 确认 `ActionContext` 是否能拿模型凭证；能则做 B，不能则长期用 C
