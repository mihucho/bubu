# DESIGN.md · 布布的学习小天地

> 前端设计标准。**唯一权威视觉契约**，代码与 AI 生成一律以此为准。
> 产品依据：`docs/产品设计-v3.md` + `docs/产品设计-v3.1-研究校准.md`（NN/g 儿童实测、Apple 1.3 Kids Category、《移动互联网未成年人模式建设指南》）。
> 本文替代 `AGENTS.md` 中「设计规范」一节；产品规则仍以 AGENTS.md 与产品文档为准。

---

## 1. Visual Theme

**Philosophy**：孩子端是一本会动的童话书，家长端是一张安静的控制台。同一个品牌，两种密度。

**Direction**：soft-warm, rounded, playful-but-legible, low-noise

**Personality**：温柔、可信、有惊喜感；不幼稚、不吵闹、不赛博

**Reference**：Soft Warm 视觉方向（教育/C 端）+ 儿童可用性实证约束

### 一套视觉 + 两套密度（最重要的一条）

> **统一**：色板、圆角体系、clay 双阴影、页面底渐变+光斑、浅渐变头图、主按钮渐变、图标砖、动效曲线。
> **差异只留在尺寸与密度**：孩子端 72/56px、正文 16px、卡片占屏；家长端 40/36px、正文 14px、信息密集。
> 判据：「看起来是同一个产品」靠前者，「用起来顺手」靠后者。

| 维度 | 孩子端 Kids | 家长端 Parent |
| --- | --- | --- |
| 视觉基调 | 渐变头图 + clay 卡片 + 动效 | **同一套**（渐变更矮、阴影更轻、动效更少） |
| 主操作高度 | **72px** | 40px |
| 次操作高度 | **56px** | 36px |
| 正文字号 | **16px** | 14px |
| 数据字号 | 28px（关键 32px） | 24px |
| 每屏信息量 | 1 个主动作 + ≤3 张卡 | 尽量多，可滚动表格 |
| 圆角 | 20 / 28（大卡） | 12 |
| 阴影 | clay 双阴影（强） | clay 双阴影（轻） |
| 动效 | 必须（每个动作有反馈） | 仅 150ms 淡入 |
| 颜色使用 | 品牌粉紫 + 彩色图标砖 | **同一套**，饱和度略降 |

> 违反此表的实现一律视为缺陷，不是风格差异。

---

## 2. Color Palette

### 2.1 Brand（孩子端）

| Token | HEX | OKLCh | 用途 |
| --- | --- | --- | --- |
| `--k-pink` | `#FF85C1` | oklch(76.9% 0.162 350.8) | 品牌粉，**仅装饰/填充，禁止承载白字** |
| `--k-pink-soft` | `#FFB3D9` | oklch(84.9% 0.100 348.0) | 大面积渐变起点 |
| `--k-pink-50` | `#FFD7EC` | oklch(91.9% 0.052 345.2) | 浅粉卡片底 |
| `--k-purple` | `#A855F7` | oklch(62.7% 0.233 303.9) | 品牌紫，装饰/填充 |
| `--k-purple-soft` | `#C4A6F5` | oklch(78.0% 0.114 301.2) | 大面积渐变终点 |
| `--k-purple-50` | `#EDE0FD` | oklch(92.6% 0.041 305.8) | 浅紫卡片底 |
| `--k-grad-hero` | `#FFB3D9 → #C4A6F5` | — | 孩子端顶部头图（**配深紫文字**） |
| `--k-grad-cta` | `#DB2777 → #7C3AED` | — | 主按钮（**配白字，4.6–5.7:1**） |

### 2.2 Text & Surface

| Token | HEX | OKLCh | 对比度（实测） | 用途 |
| --- | --- | --- | --- | --- |
| `--k-text` | `#4A2666` | oklch(34.9% 0.111 307.6) | 11.93 on white / 5.33 on `#FF85C1` | 主文字 |
| `--k-text-strong` | `#2E1065` | oklch(28.3% 0.135 291.1) | 12.78 on `#FFE4F0` | 渐变底上的标题 |
| `--k-text-sub` | `#7C4FB0` | oklch(52.3% 0.151 303.0) | 5.83 on white / 5.28 on `#FFF0F5` | 次文字（**替代原 `#8B5FBF`**） |
| `--k-bg` | `#FFF0F5 → #F3E8FF` | — | — | 页面背景（竖向渐变） |
| `--k-surface` | `#FFFFFF` | oklch(100% 0 0) | — | 卡片 |
| `--k-surface-2` | `#FBF7FF` | oklch(98.1% 0.011 308.3) | — | 分区/输入底 |
| `--k-border` | `#FFD7EC` | oklch(91.9% 0.052 345.2) | 非文字 | 卡片描边 |

### 2.3 Accent & Semantic

| Token | HEX | OKLCh | 对比度 | 规则 |
| --- | --- | --- | --- | --- |
| `--k-gold` | `#FFD700` | oklch(88.7% 0.182 95.3) | 1.40 on white | **只做星星图标/填充，永不作为文字色** |
| `--k-gold-text` | `#A16207` | oklch(55.4% 0.121 66.4) | 4.92 on white | 需要"金色数字"时用它 |
| `--k-success` | `#22C55E` | — | 2.28 on white | 仅填充/图标 |
| `--k-success-text` | `#15803D` | oklch(52.7% 0.137 150.1) | 5.02 on white | 成功文字 |
| `--k-danger` | `#DC2626` | oklch(57.7% 0.215 27.3) | 4.83 on white | 仅家长端使用；**孩子端不出现红色警告** |

### 2.4 对比度红线（实测，必须遵守）

| 组合 | 比值 | 判定 |
| --- | --- | --- |
| 白字 on `#FF85C1` | **2.24** | ❌ 禁止（原设计正在用，必须改） |
| 白字 on `#A855F7` | 3.96 | ⚠️ 仅 ≥24px 粗体可用 |
| `#8B5FBF` on `#FFF0F5` | **4.24** | ❌ 原次文字色不达标 → 改 `#7C4FB0` |
| `#4A2666` on `#FF85C1` | 5.33 | ✅ |
| `#2E1065` on `#FFE4F0` | 12.78 | ✅ 渐变头图首选 |
| 白字 on `#DB2777` | 4.60 | ✅ |
| 白字 on `#7C3AED` | 5.70 | ✅ |

**结论**：孩子端顶部用**浅色渐变 + 深紫文字**；需要白字的按钮/家长端头图用**深渐变 `#DB2777→#7C3AED`**。禁止"浅粉底 + 白字"。

### 2.5 家长端 palette

| Token | HEX | 用途 |
| --- | --- | --- |
| `--p-bg` | `#F8F9FB` | 页面底 |
| `--p-surface` | `#FFFFFF` | 卡片/行 |
| `--p-border` | `#E7E5EE` | 1px 分隔 |
| `--p-text` | `#1B1230` | 主文字 |
| `--p-text-sub` | `#6B6480` | 次文字 |
| `--p-accent` | `#7C3AED` | 唯一强调色（按钮/选中） |
| `--p-accent-weak` | `#F3E8FF` | 选中底色 |

---

## 3. Typography

### 3.1 Font Stacks

```css
--font-kids: "HarmonyOS Sans SC", "MiSans", "PingFang SC", "Source Han Sans SC",
             "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif;
--font-number: "Nunito", "HarmonyOS Sans SC", "PingFang SC", ui-rounded, sans-serif;
--font-parent: -apple-system, "PingFang SC", "HarmonyOS Sans SC", system-ui, sans-serif;
```

- 汉字一律系统黑体（可读性优先），**不使用幼圆/手写体**（笔画变形影响识字）。
- 数字与拉丁字母用 Nunito（圆润），数字必须 `font-variant-numeric: tabular-nums` 防跳动。
- 不加字距（`letter-spacing: 0`），儿童阅读不需要负字距。

### 3.2 Scale

| Level | Kids | Parent | Weight | Line-height | 用途 |
| --- | --- | --- | --- | --- | --- |
| Display | 32px | 24px | 800 | 1.2 | 关键数字（星星总数） |
| H1 | 22px | 20px | 700 | 1.3 | 页面标题 |
| H2 | 18px | 16px | 700 | 1.4 | 卡片标题 |
| Body | **16px** | 14px | 500 | 1.6 | 正文/任务名 |
| Note | 14px | 13px | 400 | 1.5 | 辅助说明 |
| Micro | 12px | 12px | 500 | 1.4 | 导航标签/徽章 |
| Data | **28px** | 24px | 800 | 1.15 | 数据卡数字 |

**孩子端最小字号 12px，且 12px 只用于导航标签**；其余一律 ≥14px。

---

## 4. Component Styles

### 4.1 Button

```css
/* Primary — 孩子端 */
.btn-kids-primary{
  min-height:72px; padding:0 28px; border-radius:999px;
  background:linear-gradient(135deg,#DB2777,#7C3AED); color:#fff;
  font-size:18px; font-weight:700;
  box-shadow:0 6px 18px rgba(219,39,119,.28);
  transition:transform .15s ease, box-shadow .15s ease;
}
.btn-kids-primary:active{ transform:scale(.97); box-shadow:0 3px 10px rgba(219,39,119,.24); }

/* Primary — 家长端 */
.btn-p{ min-height:40px; padding:0 16px; border-radius:12px;
  background:#7C3AED; color:#fff; font-size:14px; font-weight:600; }
.btn-p:active{ background:#6D28D9; }
```

| Variant | Kids | Parent |
| --- | --- | --- |
| Primary | 渐变填充，72px，圆角 999 | 纯紫填充，40px，圆角 12 |
| Secondary | 白底 + 2px `--k-pink` 描边，56px | 白底 + 1px `--p-border` |
| Ghost | 仅文字/图标，56px | 仅文字 |
| Danger | **孩子端不提供** | 红字 + 二次确认 |

状态必须齐全：default / active / disabled（`opacity:.45` + `pointer-events:none`）/ loading（三点跳动，禁转圈细线）。

### 4.2 TaskCard（孩子端核心组件）

```
┌──────────────────────────────┐  bg #FFF, border 2px #FFD7EC, radius 20, padding 16
│  [icon 40]  叫叫阅读          │  任务名 18/700 #4A2666
│  ●●●○○  完成得 ⭐3            │  圆点=次数（>5 用点阵+文字），奖励前置 14/500
│  ┌────────────────────────┐  │  主操作整宽 72px 高
│  │        + 1 次          │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
已达标：border #22C55E, bg #F0FDF4, 右上角 ✓ 印章, 按钮变为「已完成 · 点错了？改一下」
```

- 整卡可点（≥96px 高），但**卡内只允许一个按钮**，禁止并排两个可点区域（误触源）。
- 点错恢复用**文字大按钮**「点错了？改一下」，不用撤销箭头（NN/g：孩子找橡皮擦，找不到 undo）。

### 4.3 ChestProgress（宝箱进度，替代分数）

```html
<div class="chest-row"><!-- 8 格由家长任务数决定 -->
  <span class="chest is-open">🎁</span> ×3
  <span class="chest">□</span> ×5
  <p>还差 5 个</p>
</div>
```
- 格子 32×32，间距 6px；已开格用金色填充 + 微光，未开格用 `--k-purple-50` 描边。
- **永远不写 `3/8`**，数字只出现在"还差 N 个"的文案里。

### 4.4 Navigation（孩子端 5 格）

```css
.nav-kids{ height:72px; padding-bottom:env(safe-area-inset-bottom);
  background:#fff; border-top:1px solid #FFD7EC;
  display:grid; grid-template-columns:repeat(5,1fr); }
.nav-kids__item{ display:flex; flex-direction:column; align-items:center; gap:3px;
  min-height:56px; font-size:12px; color:#7C4FB0; }
.nav-kids__item[aria-current="page"]{ color:#DB2777; font-weight:700; }
```
- 5 格：本周 / 阅读 / 动起来 / 说说话 / 我的。
- 商店、闯关、签到不做导航项，作为首页「我的小世界」大卡片（≥96px，每卡承载一个状态数字）。
- 图标 26px SVG（`currentColor`），**禁止 emoji 作功能图标**。

### 4.5 Input / Stepper / Switch（家长端）

| 组件 | 规格 |
| --- | --- |
| Input | 高 44px，radius 12，border `#E7E5EE`，focus `0 0 0 3px #C4A6F5` |
| NumberStepper | 触控区 40×40，中间数字 16/700，行内直接改（不跳详情页） |
| Switch | 44×26，开启 `#7C3AED`，孩子端不出现 |
| Select/Sheet | 底部弹出，radius 24 顶部，遮罩 `rgba(27,18,48,.4)` |

### 4.6 两个密码页共用同一套视觉

| 元素 | 规格（两端一致） |
| --- | --- |
| 页面底 | 浅粉紫渐变 + 两处光斑 |
| 顶部图标 | 92px 白圆 + clay 外投影，内嵌 26px 线性图标 / 孩子头像 64px |
| 标题 | 20px / 800 / `#2E1065` |
| 说明 | 14px / `#7C4FB0` |
| 密码点 | 16px 圆点，填充用 `#BE97F2→#8E5BE0` 渐变 + 微投影 |
| 数字键 | 60px 高 / 圆角 20 / 白底 clay 投影 / 22px 800 |
| 辅助键 | 60px / `#F7F1FE` 底 / 14px 700 |
| 底部链接 | 12.5px / 700 / 次要色 |

### 4.6.1 ParentGate（家长密码）

```
家长自设 6 位数字密码 · 大键盘 · 只显示圆点
通过后 20 分钟内免重复输入
连续 5 次错误 → 静默退回孩子端
```
- 不用认知题：挡不住"孩子看过家长输入"，反而每次增加家长摩擦。
- 只在需要"大人能力"的地方触发：家长端入口、导出、删除、外链、延长使用时间。
- 家长门后所有界面切换为`家长端密度`（见 §1）。

### 4.7 Empty / Error State

| 场景 | 视觉 |
| --- | --- |
| 孩子端空 | 大插图 120px + 一句鼓励 + 一个主按钮，禁止"暂无数据" |
| 家长端空 | 16px 说明 + 一个"用模板开始"按钮 |
| 网络失败 | 布布疑惑表情 + 「咦，没接上，再点一次」+ 重试按钮 |

### 4.8 导出图规范

| 类型 | 画布 | 说明 |
| --- | --- | --- |
| 小日记 / AI 日报 | 1080×1440（3:4） | 顶部孩子头像+昵称+日期，正文，底部寄语+落款 |
| 家长周报 | 1920×1080（16:9） | 数据块 + 一句 AI 观察 + 下周建议 |

背景用 `--k-grad-hero` 浅色，正文 `--k-text`，落款 12px `--k-text-sub`；导出仅家长端触发。

---

## 5. Layout

### 5.1 Shell

```css
.shell{ max-width:430px; margin:0 auto; min-height:100dvh;
  background:linear-gradient(180deg,#FFF0F5,#F3E8FF);
  padding-top:env(safe-area-inset-top); }
.shell--parent{ max-width:720px; background:#F8F9FB; }
```

- 设计稿基准 375px，实机 320–430px 自适应。
- 孩子端**不出现系统状态栏区域内容**（顶部留 safe-area 即可）。
- 家长端与孩子端**共用路由域但不同 shell**，切换时整页重排（不做局部渐变过渡）。

### 5.2 Spacing Scale

| Token | Value | 用途 |
| --- | --- | --- |
| `--sp-1` | 4px | 图标与文字 |
| `--sp-2` | 8px | 紧凑 |
| `--sp-3` | 12px | 卡片间距（品牌值） |
| `--sp-4` | 16px | 页面内边距（品牌值） |
| `--sp-5` | 20px | 卡片内边距（大卡） |
| `--sp-6` | 24px | 区块间隔 |
| `--sp-8` | 32px | 大区块 |
| `--sp-12` | 48px | 顶部头图下沿 |

### 5.3 Radii

| Token | Value | 用途 |
| --- | --- | --- |
| `--r-sm` | 12px | 小标签、家长端卡片 |
| `--r-md` | 16px | 输入框、内嵌块 |
| `--r-card` | 20px | 标准卡片（品牌值） |
| `--r-lg` | 28px | 大卡/模态顶部 |
| `--r-pill` | 999px | 按钮、徽章 |

---

## 6. Depth & Elevation

| Level | Shadow | 用途 |
| --- | --- | --- |
| Flat | none | 家长端全部、孩子端贴底元素 |
| Raised（孩子端） | `0 4px 16px rgba(168,85,247,.10)` | 卡片 |
| Raised（家长端） | `0 1px 2px rgba(27,18,48,.06)` | 卡片 |
| Floating | `0 8px 28px rgba(168,85,247,.16)` | 底部弹层 |
| Overlay | `0 16px 48px rgba(27,18,48,.20)` | 模态/庆典层 |

**彩色投影只允许使用紫色家族**，禁止黑色阴影（会显脏）。

Z-index：base 0 / sticky 200 / dropdown 300 / modal 400 / celebration 500 / toast 600。

### Motion（本设计的第 7 个维度）

| 动作 | 时长/曲线 | 说明 |
| --- | --- | --- |
| 点击反馈 | 150ms `ease-out` | scale .97 |
| 盖章打卡 | 300ms `cubic-bezier(.34,1.56,.64,1)` | 回弹 |
| 星星飞入 | 700ms `ease-in-out` | 沿贝塞尔抛物线 |
| 达标翻色 | 400ms `ease-out` | 边框+底+印章 |
| 庆典撒星 | 3000ms，**可点跳过** | 不阻塞操作 |
| 页面切换 | 220ms 横向淡入 | 仅孩子端 |

- `prefers-reduced-motion: reduce` → 全部降级为 150ms 淡入，庆典改为静态卡片。
- 任何动效不得阻塞输入，不得产生无法跳过的遮罩。

---

## 7. Cautions

### Never Do

1. **浅粉底压白字**（`#FF85C1` 上白字 = 2.24:1），或把品牌粉/紫直接当文字色。
2. **孩子端出现**：外链、购买、广告、分享、删除、"设置"字样、失败红字、排行榜、他人数据。
3. **分数式进度**（`3/8`、`85/100`）不带图形——必须画格子/点阵/填充条。
4. **小于 56px 的可点元素**，或**卡内并排两个按钮**（6–10 岁误触主因）。
5. **底部导航超过 5 格**、标签 10px、贴边无安全区。
6. **撤销箭头/齿轮/⋯等抽象图标**表达关键动作；孩子不认识 undo。
7. **会清零的连续天数威胁**（"你将失去 7 天火焰"）。
8. **星星与金钱/屏幕时间直接挂钩**（"1⭐=1 元"）——外驱依赖，长期反噬。
9. **AI 回复长段落**（孩子端 ≤40 字/条）。
10. **emoji 当功能图标**（必须 SVG）。
11. **红/绿作为唯一状态信号**（色盲）——必须叠加图标或文字。
12. **孩子端弹两次确认**；消耗星星确认一次即可。
13. **品牌粉紫当错误色**；错误只存在于家长端。
14. **黑色阴影、纯灰 #ccc 边框**（脏、破坏童话感）。

### Prefer

- 用**实物隐喻**：宝箱、关卡地图、宠物喂食、印章、贴纸。
- 用**图形**表达进度与数量；数字只做补充。
- 用**大按钮 + 整卡可点**替代小图标。
- 错误恢复用文字按钮「点错了？改一下」。
- 文案一律正向：「再攒 15 颗」而非「星星不足」。
- 孩子端鼓励语由台词池随机，家长可静音。

---

## 8. Responsive Behavior

| Name | Width | Behavior |
| --- | --- | --- |
| Small mobile | 320–374 | 卡片 padding 12，任务名 16px，宝箱格 28px |
| Mobile (baseline) | 375–430 | 设计基准，全部规格如上 |
| Large mobile | 431–639 | 居中 430 列，背景延伸满屏 |
| Tablet | 640–1024 | 孩子端：首页卡片双列；家长端：两列主页（左列表右详情） |
| Desktop | >1024 | 孩子端固定 430 居中（模拟手机）；家长端最大 960 两列 |

### Adaptation Rules

- 优先纵向堆叠；孩子端**不出现横向滚动容器**（唯一例外：说说话快捷气泡横滑）。
- 底部导航固定，`padding-bottom: env(safe-area-inset-bottom)`。
- 字体不随视口缩放（不做 `vw` 字号）；仅 Small mobile 降一档。
- 横屏：孩子端提示"竖过来更好玩"并锁定内容（建议 `orientation` 支持竖屏）。
- 触控目标在任何断点都不低于 56px（孩子端）/36px（家长端）。

---

## 9. Agent Prompt Guide

### Key Instructions

1. **先判断端**：`kids` 还是 `parent`。两端的尺寸、密度、颜色使用完全不同，先选密度表再写样式。
2. **触控先行**：孩子端任何可点元素 ≥56px，主操作 72px；先设定尺寸再谈美观。
3. **不许出现分数**：进度用格子/点阵/填充条，数字只用于"还差 N 个"。
4. **颜色只从 token 取**，禁止硬编码 `#FF85C1` 上的白字；写前查对比度红线（§2.4）。
5. **每个动作都有反馈**：点击 150ms scale，打卡盖章，达标翻绿，拒绝静默。
6. **图标用 lucide SVG**，26px（导航）/ 40px（任务图标），`currentColor`。
7. **文案用儿童化映射**：错题→关卡、达标→宝箱、兑换成功→收到啦、星星不足→再攒 N 颗。
8. **禁止在 `children` 组件内引入 `confirm` 弹窗两次、`window.alert`、外链 `<a target="_blank">`**。
9. 家长端不做花哨动效，用边框与灰度分层，不用阴影堆叠。
10. 生成任何页面后自检：①触控尺寸 ②对比度 ③是否有分数 ④是否出现禁用元素。

### Quick CSS Snippet

```css
:root{
  /* brand */
  --k-pink:#FF85C1; --k-pink-soft:#FFB3D9; --k-pink-50:#FFD7EC;
  --k-purple:#A855F7; --k-purple-soft:#C4A6F5; --k-purple-50:#EDE0FD;
  --k-grad-hero:linear-gradient(180deg,#FFB3D9 0%,#C4A6F5 100%);
  --k-grad-cta:linear-gradient(135deg,#DB2777 0%,#7C3AED 100%);
  /* text */
  --k-text:#4A2666; --k-text-strong:#2E1065; --k-text-sub:#7C4FB0;
  --k-bg:linear-gradient(180deg,#FFF0F5 0%,#F3E8FF 100%);
  --k-surface:#FFFFFF; --k-surface-2:#FBF7FF; --k-border:#FFD7EC;
  /* accent */
  --k-gold:#FFD700; --k-gold-text:#A16207;
  --k-success:#22C55E; --k-success-text:#15803D;
  /* sizing (kids) */
  --tap-primary:72px; --tap-secondary:56px; --tap-gap:16px;
  --nav-h:72px; --nav-label:12px;
  --fs-body:16px; --fs-note:14px; --fs-title:22px; --fs-data:28px; --fs-display:32px;
  /* shape */
  --r-sm:12px; --r-md:16px; --r-card:20px; --r-lg:28px; --r-pill:999px;
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px; --sp-6:24px; --sp-8:32px;
  --shadow-card:0 4px 16px rgba(168,85,247,.10);
  --shadow-float:0 8px 28px rgba(168,85,247,.16);
  /* parent */
  --p-bg:#F8F9FB; --p-surface:#FFF; --p-border:#E7E5EE;
  --p-text:#1B1230; --p-text-sub:#6B6480; --p-accent:#7C3AED; --p-accent-weak:#F3E8FF;
  --p-control:40px; --p-control-sm:36px; --p-fs-body:14px;
}
```

---

## 附：TODO（本设计标准尚未覆盖）

- [ ] 插图/宠物绘制规范（表情、姿态、尺寸、色彩上限）
- [ ] 声音与语音台词音频清册（时长、音量、可静音点）
- [ ] 深色模式（暂不做，儿童产品白天使用为主）
- [ ] 动态字体/无障碍字号缩放（P1）
