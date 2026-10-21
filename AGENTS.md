# 布布的学习小天地 - 应用研发规范

> 本文件是 AI / 新人的唯一入口。
> - 第一~二节：**产品与设计规范**，描述的是**当前已实现**的形态。
> - 第三~八节：**工程约定**，含 lark-apaas（spark）框架的专有语法，**改代码前必须逐条对照**。
> - 产品演进方向见 `docs/产品设计-v3.md`（家庭账号 / 二孩 / 孩子端独立 / 家长端控制台），迁移路径见 `docs/产品优化方案-v2.md`。这两份是**目标**，本文件是**现状**；冲突时产品方向以 v3 为准，工程约束以本文件为准。

## 应用概述
儿童学习激励应用，移动端优先（手机竖屏），粉紫色渐变儿童友好风格。

---

## 一、设计规范

### 色彩系统
- 主渐变背景：从粉色 `#FF85C1` 到紫色 `#A855F7` 的线性渐变（从上到下）
- 页面背景：浅粉紫色渐变 `#FFF0F5` 到 `#F3E8FF`
- 卡片背景：白色 `#FFFFFF`，圆角 `20px`
- 主文字色：深紫色 `#4A2666`
- 次文字色：中紫色 `#8B5FBF`
- 星星金色：`#FFD700`
- 进度条渐变：粉色 `#FF85C1` 到紫色 `#A855F7`
- 绿色进度：`#4ADE80`
- 完成态绿色：`#22C55E`

### 排版
- 大标题：22px，加粗，深紫色
- 小标题：18px，加粗
- 正文：14px
- 小文字：12px
- 数据数字：28px，加粗

### 布局
- 手机竖屏宽度：375px 设计稿，自适应
- 卡片圆角：20px
- 内边距：16px
- 卡片间距：12px
- 底部导航栏高度：70px
- 顶部头部高度：约 200px（含状态栏、头像、数据卡片）

### 组件样式
- 按钮：渐变背景（粉到紫），圆角 25px，白色文字
- 数据卡片：2x2 网格，半透明白色背景，圆角 20px
- 任务卡片：白色背景，粉色边框，圆角 20px
- 底部导航：7 个图标，文字 10px，当前页粉色高亮

---

## 二、产品架构（当前实现）

### 数据表
全部定义在 `server/database/schema.ts`（**自动生成，见 5.1**）：

| 表 | 用途 |
| --- | --- |
| `family_accounts` | 家庭账号（登录主体） |
| `kid_profile` | 孩子档案（星星、积分、宠物等核心数据） |
| `tasks` | 本周任务 |
| `egg_tasks` | 签到彩蛋任务 |
| `mood_records` | 心情记录 |
| `reading_records` | 阅读记录 |
| `reading_tracker` | 她看了没 阅读追踪 |
| `exercise_records` | 运动记录 |
| `chat_messages` | 说说话聊天 |
| `shop_items` | 星星商店物品 |
| `exchange_records` | 兑换记录 |
| `wrong_questions` | 错题本 |

### 页面路由（`client/src/app.tsx`）
| 路由 | 页面 |
| --- | --- |
| `/setup` | 首次初始化档案（`pages/Setup`） |
| `/` | 本周首页 |
| `/reading` | 阅读 |
| `/exercise` | 动起来 |
| `/chat` | 说说话 |
| `/wrong-questions` | 错题本 |
| `/stars` | 星星商店 |
| `/parent` | 家长 |
| `/checkin` | 签到彩蛋与心情 |
| `*` | 404 |

底部导航 7 格在 `client/src/components/Layout.tsx`。

### 核心规则
- 星星：打卡任务 + 彩蛋 + 心情记录 获得；商店兑换消耗
- 阅读积分：1分钟=1积分，只涨不跌
- 本周达标：已达标任务数 / 8
- 数据联动：所有页面顶部四个数据卡片（`components/StatsHeader.tsx`）保持一致

---

## 三、技术栈

- 后端：NestJS 10 + `@lark-apaas/fullstack-nestjs-core`（平台鉴权 / DB 注入 / 统一配置）
- 前端：React 19 + Vite 8 + React Router 7 + Tailwind CSS v4 + shadcn/ui（Radix）
- 数据层：PostgreSQL + drizzle-orm（schema 由平台同步生成）
- 其他：@tanstack/react-query、react-hook-form + zod、framer-motion、lucide-react、dayjs
- Node ≥ 22、npm ≥ 10；依赖不受版本控制，拉仓库后先 `npm install`

## 四、目录结构

```
client/                    # 前端（Vite）
  index.html
  src/
    app.tsx                # 路由注册处
    index.tsx              # 入口
    pages/<模块>/<模块>Page.tsx
    components/Layout.tsx  # 底部导航 + 页面壳
    components/StatsHeader.tsx
    components/ui/         # shadcn/ui 组件（生成/维护于此，含 README 规范）
    components/business-ui/# 平台业务组件（用户/部门/群组选择等，含 README）
    contexts/              # ProfileContext / AppContext / AuthContext
    hooks/ lib/ utils/ types/
    api/index.ts           # 所有后端请求集中在此
    index.css              # 样式入口（@import 链，见 5.9）
    tailwind-theme.css     # 设计 token（CSS 变量）
    typography.css         # prose 排版
server/
  main.ts                  # bootstrap（configureApp / 视图引擎 / 端口）
  app.module.ts            # 所有 module 必须在此注册
  database/schema.ts       # ⚠️ 自动生成，禁止手改
  modules/<模块>/          # module + controller + service 三段式
  common/filters|constants|interfaces
  capabilities/*.json      # AI 能力（插件）配置
shared/
  api.interface.ts         # ⚠️ 前后端唯一类型契约
scripts/                   # 平台脚本（dev/build/prune...，多为自动生成）
docs/                      # 产品文档（v2 迁移方案 / v3 重设计）
.spark_project             # spark 工程配置（run/lint/test/hidden/restrict）
```

## 五、框架专有约定（lark-apaas spark，必须遵守）

### 5.1 生成物一律不可手改
- `server/database/schema.ts` 头部写着 `auto generated, do not edit`。改表结构的正确流程：
  1. 在数据库侧改表 → 2. `npm run gen:db-schema`（`@lark-apaas/db-schema-sync` 拉线上真实 schema）→ 3. 再改 service。
  **直接改 schema.ts 会在下次同步时被覆盖。**
- `scripts/build.sh`、`scripts/prune-smart.js`、`scripts/dev.js` 等由 `@lark-apaas/fullstack-cli` 生成；要调整行为用 `package.json` 或 `.spark_project`，不要改脚本体。
- `client/src/api/gen/` 是 openapi 生成目录（当前 `gen:openapi` 为 UNSUPPORTED 占位），已从 eslint / tsconfig 排除。

### 5.2 类型契约只有一份：`shared/api.interface.ts`
- 接口出入参类型**必须**写在这里，前后端同时 import `@shared/api.interface`。
- 禁止在 client 里另写一份 interface、也禁止在 server controller/service 里内联定义返回类型（DTO 入参可用 `server/modules/*/dto`）。
- server 侧习惯把 drizzle 行映射成 shared 接口（如 `KidService.toKidProfile`），不要把 raw row 直接返回。

### 5.3 路径别名是两套，不能混用
| 别名 | 指向 | 可用范围 |
| --- | --- | --- |
| `@/*` | `client/src` | 仅 client（vite + tsconfig.app） |
| `@client/*` | `client/` | 仅 client |
| `@server/*` | `server/` | 仅 server（tsconfig.node） |
| `@shared/*` | `shared/` | 两边都可用 |

在 server 里 `import '@/...'` 或 `import 'client/...'` 会直接编译失败；client 同理不能引 server。

### 5.4 受保护路径（`.spark_project` 的 `files.restrict`）
`client/src/api/gen`、`package.json`、`.spark_project`、`.gitignore` 属于平台受限文件。**不要为了加依赖去手改 package.json**——需要新包时说明理由并让用户确认；也不要改 `.spark_project` 的 `hidden`/`restrict` 列表。
`.spark_project` 里 `run/lint/test` 是平台读的入口（`npm run dev` / `npm run lint` / `npm run test`）。

### 5.5 鉴权只走平台
- 控制器类上标 `@NeedLogin()`（来自 `@lark-apaas/fullstack-nestjs-core`），方法里用 `req.userContext.userId` 取当前用户。
- 除 `ViewController`（渲染首页壳）和示例 `HelloController` 外，**所有 controller 都必须带 `@NeedLogin()`**。
- `auth/platform-auth.middleware.ts` 已废弃（文件头 `@deprecated`）；`auth/auth.middleware.ts` 里的自建 JWT / scrypt 密码哈希当前**没有注册到任何 module**，属于历史遗留，不要新增依赖。

### 5.6 数据库只通过注入的 DRIZZLE 访问
```ts
constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}
```
- 查询用 drizzle 的 `eq/and/gte/lt/asc` 等算子，禁止拼 SQL 字符串。
- 时间列用 schema 里导出的 `customTimestamptz`；表名导出形如 `kidProfile` / `kidProfileTable`（两个别名都可用，新代码用驼峰原表）。

### 5.7 错误与响应格式统一
- 业务异常抛 `HttpException` 子类或 `BusinessException`（`server/common/interfaces/exception.interface.ts`），**不要自己 `res.json` 错误**。
- 全局 `GlobalExceptionFilter`（已在 `app.module.ts` 注册）统一输出：
  `{ error: { code, message, details?, fieldErrors?, timestamp } }`；`code` 取自 `ResponseCode`（`server/common/constants/api_response_code.ts`）。
- 新增业务错误码先加到 `ResponseCode` 枚举，再补 HTTP 映射。
- 路径参数与列类型不匹配（典型：非法 UUID）已统一映射为 404，不要额外 try/catch。

### 5.8 前端请求与日志
- 统一用 `axiosForBackend`（`@lark-apaas/client-toolkit/utils/getAxiosForBackend`），它负责注入平台身份；**不要引入裸 axios**。
- 请求函数全部写在 `client/src/api/index.ts`，返回 shared 里的类型；出错用 `logger`（`@lark-apaas/client-toolkit/logger`）记录，不要 `console.log`。
- 401 由 `api/index.ts` 的拦截器派发 `auth:expired` 事件，页面消费该事件即可，别各写一套。
- 数据请求优先 `@tanstack/react-query`，表单优先 `react-hook-form` + `zod`。

### 5.9 样式与 UI
- Tailwind v4：样式入口是 `client/src/index.css`，用 `@import` 串起 `tailwind-theme.css`（设计 token / CSS 变量）、`typography.css`，并 `@config "../../tailwind.config.ts"`。新增全局样式加到这条 import 链，不要另起 css 入口。
- 设计 token 走 CSS 变量（`--primary` / `--foreground` / `--border` …），不要在组件里堆裸十六进制色；品牌粉紫优先用本文件第一节的色值。
- shadcn/ui 组件放在 `client/src/components/ui/`，规范见该目录 `README.md`：图标**必须** `lucide-react`，**禁用 Emoji 当图标**；Button/Badge 用 variant，自定义底色必须配对 `text-*-foreground`；`Image` 必须给 `alt` 与 `sizes`/`width`。
  - 已知偏差：任务/商店的 `icon` 字段目前存的是 emoji 字符串（`auth.service.ts` 默认数据），迁移时统一替换为 lucide 图标名。
- 业务选择类组件（用户/部门/群组）用 `components/business-ui/*`，先读该目录 `README.md` 的统一类型约定。
- 页面级组件放 `client/src/pages/<Name>/<Name>Page.tsx`，路由在 `app.tsx` 注册；新页面记得同步 `Layout.tsx` 导航（如入底部导航）。

### 5.10 服务端模块约定
- 每个模块 = `xxx.module.ts` + `xxx.controller.ts` + `xxx.service.ts`，**module 必须注册进 `server/app.module.ts`**，否则接口 404。
- 路由前缀 `@Controller('api/xxx')`，统一挂在 `/api` 下；`main.ts` 用 `configureApp` 做平台初始化。
- 新增接口返回类型从 `@shared/api.interface` 取；只读快照、`toXxx` 映射写在 service 里。
- AI 能力（CapabilityService / 插件 / prompt / 流式）的调用规范见 **5.11**，不要在 service 里硬编码 prompt 或模型 ID。

### 5.11 调用平台 AI 能力（CapabilityService）

平台 AI 能力 = 「插件 + 平台侧托管的 prompt / 模型配置」。本项目唯一实例是「说说话」的 AI 对话（`child_learning_ai_chat_1`），新增任何 AI 功能都照它复制。

**分层职责（各改各的，不要越界）**

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 能力定义 | `server/capabilities/<capability_id>.json` | pluginKey 与版本、modelID、maxTokens、temperature、prompt 模板 |
| 插件声明 | `package.json` → `actionPlugins` | 插件依赖版本（受限文件，见 5.4，需用户确认后才改） |
| 调用 | `server/modules/<模块>/<模块>.service.ts` | 注入 `CapabilityService`、组参数、消费流、做个性化替换 |
| 接口 | `server/modules/<模块>/<模块>.controller.ts` | 暴露流式/普通接口，落库 |
| 前端 | `client/src/api/index.ts` + 页面 | 读流、增量渲染、失败兜底文案 |

**注入与调用**

```ts
constructor(
  @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  @Inject(CapabilityService) private readonly capabilityService: CapabilityService,
) {}

const stream = this.capabilityService
  .load('<capability_id>')          // = server/capabilities/<id>.json 里的 id
  .callStream('<action>', params); // 流式；非流式用 call()
```

- 参数 key **必须**与 json 里 `paramsSchema.properties` 对齐，`required` 缺一即失败（当前为 `chat_role` / `user_message` / `data_context`）。
- 返回值可能是 `{ output: AsyncIterable<{ content: string }> }`，也可能直接是 AsyncIterable，**两种形态都要兼容**后再 `for await`。
- `chunk.content` 是增量片段：自己累加成完整文本，用 `AsyncGenerator` 的返回值把 `fullContent` 带出去，不要在 controller 里再拼一遍。

**prompt 只在 json 里改**

人设、口吻、回复规则、占位符（`{{input.data_context}}` / `{{input.user_message}}` / `{{input.chat_role}}`）、模型与温度全部属于能力定义。service 只负责「业务数据 → 参数」和「结果 → 前端/数据库」，禁止把 prompt 或模型 ID 写进 TS。

**业务数据注入（data_context）**

- 抽一个 `buildDataContextRaw()` 返回结构化对象，再 `JSON.stringify` 成 `data_context`；当前字段：`profile` / `weekTasks` / `eggTasks` / `todayReading` / `weekExercise` / `todayMood` / `wrongQuestions`。
- 只放回答问题必需的事实，不放 id、手机号、其他孩子的数据；数字必须来自真实查询（prompt 已约定「不许编造」）。
- 快照类型（`DataContext*`）定义在 service 内部，**不要**混进 `shared/api.interface.ts`（那是给前端用的契约）。

**流式接口（SSE）约定**

- controller 手写响应头：`Content-Type: text/event-stream`、`Cache-Control: no-cache`、`Connection: keep-alive`、`X-Accel-Buffering: no`，并 `res.flushHeaders()`。
- 帧格式：`data: {"content":"片段"}\n\n`；结束写 `data: [DONE]\n\n`；异常写 `data: {"error":"..."}\n\n` + `[DONE]`。
- **状态码发出去之后不能再抛异常**，错误只能走数据帧。
- 落库时机：流正常结束再写 AI 消息，避免半截内容进库。
- 前端**不能用 axios，也不要用 EventSource**：需要自定义 header（`X-Suda-Csrf-Token = window.csrfToken`）和 `credentials: 'include'`，只能用 `fetch` + `response.body.getReader()`，按 `\n\n` 切帧、按 `data: ` 取载荷。
- 裸 `fetch` 不经过 `client/src/api/index.ts` 的 axios 拦截器，401 需自行判断（当前未处理）。

**参考实现**

`server/capabilities/child_learning_ai_chat_1.json` · `server/modules/chat/chat.service.ts` · `chat.controller.ts` · `client/src/api/index.ts`（`streamAiReply`）· `client/src/pages/Chat/ChatPage.tsx`

**已知待改进**

- 无多轮上下文：只发当前这一句，历史和前面的回复都不参与推理。
- `chat_role` 写死 `'布布'`，插件支持 5 个角色但没有切换 UI。
- 昵称靠逐 chunk 替换字面量「布布」，被切在 chunk 边界会漏替换。
- 历史消息全量加载，无分页。

## 六、常用命令

| 命令 | 说明 |
| --- | --- |
| `npm install` | 首次/清空 node_modules 后必须执行 |
| `npm run dev` | 开发入口（`scripts/dev.sh`：沙箱平台走 `dev.js` 保活；本地先 `miaoda app sync` 再 `dev-local.js`） |
| `npm run dev:server` / `dev:client` | 单独起 Nest（watch）/ Vite |
| `npm run lint` | eslint + stylelint + type:check 串行执行（pre-commit 也调它） |
| `npm run type:check` | server / client 双侧 tsc --noEmit |
| `npm run gen:db-schema` | 从线上库同步 `server/database/schema.ts` |
| `npm run build` / `npm start` | 构建（`scripts/build.sh`）/ 生产启动（`node main.js`） |

端口默认 `SERVER_HOST=localhost`、`SERVER_PORT=3000`（`main.ts`）。日志开关在 `.env`（`LOG_DIR` / `LOG_REQUEST_BODY` / `LOG_RESPONSE_BODY`）。

## 七、代码风格
- Prettier（`.prettierrc`）+ ESLint（`@lark-apaas/fullstack-presets` 的 client/server 两套 preset）+ Stylelint，提交前由 `.githooks/pre-commit` 跑 `npm run lint`。
- TS：服务端类型注解写全（本项目风格为显式标注返回值/变量类型），前端组件用 `React.FC` 或显式返回 `JSX.Element`。
- 命名：文件组件 PascalCase（`StatsHeader.tsx`），页面目录也 PascalCase；工具/模块 camelCase 或 kebab-case（`wrong-question`）与现有目录保持一致。
- 文案、日志、注释一律中文；面向孩子的文案要口语化、短句（见 v3 第 9 节）。
- 主流程注释解释「为什么」，不复述代码。

## 八、验收清单（改完必跑）
1. `npm run type:check` 通过（client + server 双侧）
2. `npm run lint` 通过
3. 涉及表结构：`npm run gen:db-schema` 后 schema 无意外 diff（有 diff 说明你手改过生成物）
4. 涉及接口：`shared/api.interface.ts` 已同步，`client/src/api/index.ts` 已加对应函数
5. 涉及页面：`app.tsx` 路由 + 底部导航 + 顶部数据卡片联动都检查过
6. 移动端 375px 竖屏走一遍：无横向滚动、底部导航不遮挡内容
7. `.spark/e2e-test/` 下已有用例（如昵称同步）手动回归
8. 涉及 AI 能力：`capabilities/*.json` 的 `paramsSchema` 与 service 传参一致，`data_context` 字段仍是真的（不是 mock），流式失败能走到兜底文案而非白屏
9. 涉及流式接口：本地连点两次不会重复落库、中途断网不产生半截 AI 消息
