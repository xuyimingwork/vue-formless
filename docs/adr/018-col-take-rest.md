# ADR-018：`col:take="rest"`（实宽与行占用分离）

- **状态**：Accepted
- **日期**：2026-09-04
- **来源**：相对 [ADR-007](./007-layout-adapter-and-span-priority.md) / [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)。到达时间等短控件要独占落地行，但不能把 Col 拉成 `max`（`width: 100%` 会跟 `column` 脱节）。

## 背景

`span` 同时是宿主 Col 宽度和（`place: auto` 时）纸带占用。到达时间、开关、上传入口需要：

- 控件仍是真 `1x` / `2x` Col，才能跟页级 `column` 走
- 落地那一行后面不许再贴格

下一格 `place="start"` 能排出同一张图，但「独占一行」写在邻居上：中间项 `v-if` 掉了就会漏封行。

曾考虑 `span="rest"`（Col 宽 = 本行剩余）或让作者自己补一颗空白格。两者都会把作者卷进游标运算，且没有「不能低于 span」：剩余 3 时会把格压成 3，或在已经吃满的行后再补出一整行空 Row。

行内「占 2x 轨道、只用 1x 控件」在中后台对过没有独立场景（要靠右用后一格 `place="end"`；要对齐轨道应写 `span="2x"`）。不为此开 `take="+1x"`。

## 决策

### 1. 增加 `take`，默认等于 `span`

`span` 只负责宿主 Col 实宽（`1x` / `Nx` / `max` / 1–24）。`take` 负责纸带吃多少。`take` 缺省 = `span`，现有格子零成本。

FormView 通道：`:col:take`。LayoutItem：`take`。

v1 **只认** `'rest'` 与省略。不认 `max`（易与 `span="max"` 的 24 混淆）、不认 `+1x` / `+2`、不认绝对格数。

### 2. `take="rest"`：先按 `auto` 落地，再吃完落地行

最低占用是 `span`。本行剩余 `< span` 时先换行（与现在 `auto` 一样封旧行），再在**新行**占满 24。本行剩余 `≥ span` 时留在本行，吃掉**剩余全部**（不是永远 24）。

`span=8`：

| 本行剩余 | 行为 |
|----------|------|
| 10 | 留在本行，占用 10：Col 8 + 后空白 2 |
| 3 | 封掉 3，换行，新行占用 24：Col 8 + 后空白 16 |
| 8 | 放本行，占用 8，无尾空白 |
| 行首（剩余 24） | 占用 24：Col 8 + 后空白 16 |

多出来的空白仍是 fragment 里的 Col，渲在 **HostCol 后面**（`place="end"` 的 pad 仍在前面）。

与下一格 `place="start"` 画面常等价；`take` 把意图留在本格，挡中间条件渲染。

### 3. 不把 `rest` 放进 `span`

`span="rest"` 表示 Col 宽随剩余变，没有下限，也换不了「剩余 3 → 新行再占满」。查询格要变宽（操作区吃剩余）是另一张图，用 `place="end"` 或将来单独议，不堵在本文。

控件 CSS 限宽（`200px` / 百分比）否：对不齐 `column` 与 gutter。

## 备选方案

1. **只文档下一格 `place="start"`**：零 API。意图在邻居上；`v-if` 漏封。保留为不写 `take` 时的排法，不当唯一手段。
2. **`span="rest"` / 作者补空白格**：把游标交给页面；剩余 `< span` 语义错误。已否。
3. **`take="max"` 表示 24**：与 `span="max"` 同词不同义；行中时会先换行再占 24，不是「吃完落地行」。已否为 `rest` 的别名。
4. **`place="row"`**：也能封行尾，但和 `start`/`end`（空在前面）不是同一轴；封行尾是占用，不是对齐。已否。
5. **完整 `take` 语法（`2x` / `+1x`）**：行内多占一列轨道没有真页。已否为 v1。

## 不纳入

- `span="rest"`
- `take="+1x"` / `"+2"` / 绝对加点 / `take="max"`
- 行内占 2x、画 1x（后一格 `end` 或本格 `span="2x"`）
- 筛选条折叠（见 [ADR-019](./019-layout-row-window.md)）

## 改造方案

1. `ColSpanRaw` 不动。增加 `ColTakeRaw = 'rest'`（省略 = span）。
2. `calculateOccupied`：先按 `place` + `span` 落地（`rest` 时落地规则同 `auto`）；若 `take === 'rest'`，再把占用拉到落地行行尾。
3. `calculateBlanks` 拆出格后 pad；`LayoutItem` 在 HostCol **后**渲 `LayoutBlanks`。
4. 单测：剩余 10 / 3 / 8 / 0；与后一格 `start` 画面对照；`end` + `take="rest"`（已在行尾则尾 pad 为 0）。
5. playground-layout 加一格「短控件 + `take=rest`」；文档写清与 `start` 的分工。

## 后果

- **正向**：短控件实宽仍跟 `column`；独占落地行写在自己身上；不引入第二套模量。
- **代价**：格上多一个可选 prop；空白 Col 分前后两截。
- **关联**：栅格公约数见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)；密度与 Item 例外见 [ADR-007](./007-layout-adapter-and-span-priority.md)；通道见 [ADR-015](./015-formless-config-groups.md)；筛选窗口见 [ADR-019](./019-layout-row-window.md)。
