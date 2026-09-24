# ADR-018：不实现 `cell:take`（行内占用保持单一 `place` 轴）

- **状态**：Rejected（2026-09-15 决定不实现；不再落地）
- **日期**：2026-09-04
- **修订**：
  - 2026-09-10 — 通道前缀重写：原提案的 `take` 挂在 `cell:`（LayoutCell），不再是 `col:take`；窗口键 `column` 挂 `layout:`。见 [ADR-021](./021-channel-prefix-and-form-item.md)。
  - 2026-09-15 — **否决**：不实现 `take`（连通道键一起）。「这一格吃多少行内占用」保持 `place` 单轴。§提案 保留为历史记录。
  - 2026-09-24 — **通道名最终为 `layout-item:take`**（原 `cell:`）；结论不变：`LayoutItemProps` 仍只有 `span` / `place`，无 `take`。
- **来源**：相对 [ADR-007](./007-layout-adapter-and-span-priority.md) / [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)。下文 §提案 是 2026-09-04 的原始设计，**已否**，只为留证。

## 决策：不实现 `take`

「实宽」与「行占用」**本来就分离**，承担这件事的是 `place`，不需要新 prop。

`calculateOccupied`（`packages/layout/src/calculate-layout.ts`）里 `$occupied ≠ span` 是常态：`place="start"` 吃 `rest + span`、`place="end"` 吃 `rest` 或 `rest + 24`。原提案的前提「`span` 同时是实宽和纸带占用」只在 `place="auto"` 下成立——`place` 已经不是纯对齐，它是**行内落位 / 占行模式**。再加一个 `take` 是在同一个轴上再开一次口。

格上没有 `take`：`LayoutItemProps` 仍只有 `span` / `place`，`register(span, place)` 签名不动，`cell:` 通道不加键。

### 理由

**1. `take` 会立刻造出一个条件轴，而它承诺的自由度几乎全是空的。**

`take` 一旦划出「区域」，`place` 就从「行内对齐」降级成「区域内的对齐」，而**它的定义域取决于 `take`**：`take == span` 时区域 = 格子本身（`place` 无内容）、`take < span` 不可表示、只有 `take > span` 才有 `place` 可言。这不是两个独立维度（独立维度只是笛卡尔积变大），是**条件格**——每个组合都要给行为或给「忽略」规则，作者还要学「内层轴什么时候是活的」。这类说明是永久维护成本。

而 v1 的 `take="rest"` 恰好落在退化点上：区域的**右边界就是行右边界**，所以「区域内 start / end / center」的 3×3 里

- 靠右 → 区域右边界 = 行右边界 → **就是现有的 `place="end"`**
- 居中 → 区域中心随 `cursor` / `column` 漂，没有稳定含义
- 靠左 → 唯一一个新值

即**模型承诺 9 格、只交付 1 格**。剩下 8 格是替未来需求预留的，而预留的方式是「把门开着」。

**2. 区域宽度是运行时值，不适合承载第二个轴。**

`take="rest"` 的区域宽 `24 - cursor` 随 `column`、前面的格、`v-if` 变；行却是恒 24。让「区域内对齐」作用在宽度不定的容器上，画面不可推断——「填充区域内居中」在 4 列和 6 列下是两个不同相对位置，作者无法心算。稳定容器（行）才配承载 `place`。

**3. 动机场景在本 ADR 里已被自己否掉。**

§提案 原文写着「行内『占 2x 轨道、只用 1x 控件』在中后台对过没有独立场景」。条件轴的代价，是为一个已经判定没有真页的场景预备的。

**4. 代价对比。**

- 不实现：短控件要独占落地行时，用**下一格 `place="start"`**（封本行、下一行起头），或本格 `place="end"`（吃满落地行、Col 靠右）。两者都是现有能力，零新 API。ADR-018 当年担心的「意图写在邻居上、中间项 `v-if` 会漏封」是真代价，但那是**文档问题**（写清 `start` 的用法），不是新增一个会长期拉扯模型的新轴的理由。
- 实现：多一个 prop + 一个通道键 + `field-schema` 类型 + `register` 签名 + 空白格前后拆分；且未知键会透过 `LayoutItem` 的 `{...attrs}` 漏成宿主 `el-col` 的真属性。

**5. 将来真需要「格内对齐」时，它是独立的一格语义，不是 `take`。**

若哪天真出现「占 2x、控件在 2x 内靠左/居中」，该谈的是 **span 内部的对齐**（稳定容器 = 自己声明的 `span`），而不是挂在 `take` 上、让 `place` 的作用域变成条件式。等需求出现再单独议。

判断依据：**如果一个新 prop 的价值只是「让某个未来需求不用被否决」，而不是今天就多交付一个行为，它该等那个需求真的出现。**

### 当前排法对照

短控件独占落地行（`span=8`，本行余 10）：

```vue
<!-- 意图写在下一格：封本行，下一行起头 -->
<LayoutItem span="8">到达时间</LayoutItem>
<LayoutItem span="8" place="start">…</LayoutItem>
```

`place="end"` 仍可用于「吃满落地行、Col 靠右」（区域右边界 = 行右边界，见理由 1）。

## 提案（已否，仅留证）

> 以下为 2026-09-04 原始设计。**不实现**，保留以记录当时的取舍。

### 背景

`span` 同时是宿主 Col 宽度和（`place: auto` 时）纸带占用。到达时间、开关、上传入口需要：

- 控件仍是真 `1x` / `2x` Col，才能跟页级 `column` 走
- 落地那一行后面不许再贴格

下一格 `place="start"` 能排出同一张图，但「独占一行」写在邻居上：中间项 `v-if` 掉了就会漏封行。

曾考虑 `span="rest"`（Col 宽 = 本行剩余）或让作者自己补一颗空白格。两者都会把作者卷进游标运算，且没有「不能低于 span」：剩余 3 时会把格压成 3，或在已经吃满的行后再补出一整行空 Row。

行内「占 2x 轨道、只用 1x 控件」在中后台对过没有独立场景（要靠右用后一格 `place="end"`；要对齐轨道应写 `span="2x"`）。不为此开 `take="+1x"`。

### 提案内容

1. **增加 `take`，默认等于 `span`**：`span` 只负责宿主 Col 实宽（`1x` / `Nx` / `max` / 1–24）。`take` 负责纸带吃多少。`take` 缺省 = `span`，现有格子零成本。FormView 通道 `:col:take`，LayoutItem `take`。v1 只认 `'rest'` 与省略。
2. **`take="rest"`：先按 `auto` 落地，再吃完落地行**。最低占用是 `span`。本行剩余 `< span` 时先换行，再在新行占满 24；本行剩余 `≥ span` 时留在本行，吃掉剩余全部。
3. **不把 `rest` 放进 `span`**：`span="rest"` 表示 Col 宽随剩余变，没有下限，也换不了「剩余 3 → 新行再占满」。

原始改造方案：`calculateOccupied` 在 `take === 'rest'` 时把占用拉到落地行行尾；`calculateBlanks` 拆出格后 pad；`LayoutItem` 在 HostCol **后**渲 `LayoutBlanks`。

### 当年已否的备选

1. **只文档下一格 `place="start"`**：零 API，但意图在邻居上；`v-if` 漏封。
2. **`span="rest"` / 作者补空白格**：把游标交给页面；剩余 `< span` 语义错误。
3. **`take="max"` 表示 24**：与 `span="max"` 同词不同义。
4. **`place="row"`**：和 `start`/`end` 不是同一轴。
5. **完整 `take` 语法（`2x` / `+1x`）**：行内多占一列轨道没有真页。

## 不纳入

- `take`（任何值：`'rest'` / `'max'` / `+1x` / 绝对格数）及其通道键
- `span="rest"`
- 行内占 2x、画 1x（要靠右用 `place="end"`；要对齐轨道应写 `span="2x"`）
- 筛选条折叠（见 [ADR-019](./019-layout-row-window.md)）

## 后果

- **正向**：行内占用保持 `place` 单轴，模型闭合；不新增 prop / 通道键 / 类型 / `register` 签名；未知键漏成宿主 `el-col` 属性的隐患少一处。
- **代价**：「短控件独占落地行」的意图只能写在下一格 `place="start"`（或本格 `place="end"`），中间项 `v-if` 时需自行补封行；文档要把这条写清。不提供 `take` 那种「把意图留在本格」的写法。
- **代码**：`take` 从未落地，仅 `attrs.test.ts` 的夹具引用过，已清（2026-09-15）。
- **关联**：栅格公约数见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)；密度与 Item 例外见 [ADR-007](./007-layout-adapter-and-span-priority.md)；通道见 [ADR-015](./015-formless-config-groups.md) / [ADR-021](./021-channel-prefix-and-form-item.md)；筛选窗口见 [ADR-019](./019-layout-row-window.md)。
