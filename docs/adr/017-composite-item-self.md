# ADR-017：组合体 control、`item: 'self'` 与壳合并

- **状态**：Accepted（修订）
- **日期**：2026-08-31
- **修订**：
  - 2026-08-31 — 初版：`item: 'self'`；标签壳通道无效。
  - 2026-09-01 — **外部 `:fl:item` 高于内部**（含内部 `false` + 标签 `true` 按 true）。`'self'` + 标签显式 `true` 时工厂多一颗内层 Row。本文含改造清单。
  - 2026-09-01 — 收掉控件 / 格级 boolean `layout`。Col 只跟 FormView `:fl:layout`；第 4 档内层 Row 同此。
  - 2026-09-01 — 第 4 档内层改为控件自挂 `LayoutView`（同一颗 `createLayoutView`）。宽 `:col:span`；内层密度 `:row:*`。
- **来源**：[ADR-012](./012-input-item-and-rule-compile.md) / [ADR-013](./013-one-control-multiple-items.md) / [ADR-015](./015-formless-config-groups.md)。013 的「一颗 control、N 格 Item」仍成立；关壳与合并顺序以本文为准。

## 背景

工厂默认把 `component` 当成 **input**，wrap 一次：`Col? → Item? → input`。

组合体（开始/结束两格、省市区+详情四格）是 **同一类**：一颗身份、多个后端叶子、内部联动、N 格进当前页 Row。不能拆成 N 颗 control。漏关外层壳会套娃。

013/015 用 `item: false` + `layout: false`。两个问题：`false` 和「自己铺格」意图拧了；「子项只能关」让标签无法把内部关掉的 Item 再打开。

## 决策

### 1. 三层来源；外部最高（只合 `item`）

| 层 | 写哪 | `item` 取值 |
|----|------|-------------|
| FormView | `:fl:item` | boolean（有 Item 适配则默认开） |
| 内部 | `defineOptions.formless` 或 schema | `true` / `false` / `'self'`；省略 = 未写 |
| 外部 | 标签 `:fl:item` | **boolean**；**没写 ≠ true** |

FormView `:fl:layout` 是页级栅格（密度对象 / `true` / 关），**不是**控件壳通道。控件袋、schema、标签、格上都没有 boolean `layout`。

标签没有 `:fl:item="'self'"`。`'self'` 只出现在内部。

合并（只合 `item`）：

```text
结果 = FormView
若内部有写 → 盖过 FormView
若外部有写 → 盖过内部（也盖过 FormView）
```

因此 `<AgencyList :fl:item="true" />` 在内部 `false` 时 **按 true**：工厂包 Item。这改掉 015「子项只能关」。

内部 `'self'` 的含义：控件会自己 `useFormItem(口名)` 铺格。未被子项外部 `true` 盖过时，工厂 **不要** 外层 Item，也 **不要** 外层 Col（cell 已含 Col）。不必再写 `layout: false`。

包不包 Col：页开了 `:fl:layout` 则包（`'self'` 外层除外）。没有「这一格关 Col」。

### 2. 四种结果形态

| # | 条件（合并后） | 外层 Item | 外层 Col | 内层 Row |
|---|----------------|-----------|----------|----------|
| 1 | 跟页（内部未写 `'self'`/`false`，外部未写） | 页开则包 | 页开 layout 则包 | 无 |
| 2 | 不要 Item（内部 `false`，外部没写成 `true`） | 不包 | 跟页 | 无 |
| 3 | 自己铺格（内部 `'self'`，外部没写成 `true`） | 不包 | 不包 | 无；格进 **页 Row** |
| 4 | 自己铺格 + 外面还要 Item（内部 `'self'` **且** 外部 **显式** `:fl:item="true"`） | 包 | 页开 layout 则包 | **有**；格进这颗 Row |

第 4 档是唯一「内外都有 Item」。不要用 FormView 默认 `item: true` 触发（没写外部就不算显式 true）。

```text
页 LayoutView
  └── LayoutItem              ← 外层；:col:span / :col:place
        └── Item              ← 外层；:item: / 分组 label 有效
              └── LayoutView  ← 控件挂的同一颗；:row:*
                    ├── LayoutItem → Item → input
                    └── LayoutItem → Item → input
```

页没开 layout（没有 Row 适配或本层 `isLayoutEnabled === false`）：第 4 档只包外层 Item，**不**插内层 Row、**不**包外层 Col（内层 `useFormItem` 本就不会包 Col）。

内层 `useFormItem(口名)` **不继承** `'self'`：Item 跟 **页**（以及该格自己的 extras）；Col 跟页有没有 Row。格上没有 `:fl:layout`。

### 3. 控件自述；簇不抄壳

```ts
defineOptions({
  formless: {
    item: 'self',
    model: ['start', 'end'],
  },
})
```

```ts
dateRangeTwo: {
  component: DateRangeTwo,
  prop: ['fromTime', 'toTime'],
}
```

内部 `item`：控件 `formless` 与 schema 任一写下即算内部有写；`'self'` 与 `false` 冲突应失败。`model` 仍以控件为准。

### 4. 壳通道何时有效

| 标签 | 第 3 档（纯 `'self'`） | 第 4 档（`'self'` + `:fl:item="true"`） | 其它 |
|------|------------------------|----------------------------------------|------|
| `:fl:item` | 未写则保持 `'self'`；写了就按 §1 覆盖 | 正是本档的开关 | 覆盖内部 |
| `:col:span` / `:col:place` | **无效**（无外层 Col） | 外层格 | 外层格 |
| `:row:column` / `:row:gutter` | 忽略（叶子 warn） | 内层 LayoutView | 忽略 |
| `:item:` / `@item:` / `#item:` | **无效** | 外层 Item | 外层 Item |
| `:fl:prop` / `:fl:validate` | 有效（身份） | 有效 | 有效 |

内层格上的 `label` / `:col:span` 始终是格自己的。

### 5. 不自动拆壳

零配置检测根是 cell、先跑 widget render、下一拍改树、Teleport 进 Row：仍否。理由同初版（Vue 3.6 dry-run、setup 两次、插不进行内位置）。组合体第一拍靠静态 `'self'`。

## 不纳入

- 簇上两个组件槽；`useFormField` / `cell` / `wrap: false` 主词
- `layout: 'self'`；控件 / 格上 boolean `:fl:layout`
- `:item:start:xxx`
- 标签 `:fl:item="'self'"`
- 用嵌套 FormView 当第 4 档的实现（控件挂 LayoutView 即可）
- 公开 LayoutItem / `FormView.Layout` / `place="center"` / 开放 Col 透传
- 把组合体拆成 N 颗 control 当默认

## 改造方案

相对现状：`item`/`layout` 只认 boolean；`false` 只能关；`DateRangeTwo` 写两个 false；标签 `true` 不能开回 Item。

### A. 内核类型与合并

1. `WidgetFormless.item`、`ControlSchema.item`：`boolean | 'self'`。
2. `FormControlProps['fl:item']` 仍是 `boolean`。
3. 抽出 `resolveControlShell({ pageItem, pageLayoutOn, internal, tag })`（建议 `packages/vue-formless/src/control-shell.ts`）：
   - 输入：页 item 开否、页 layout 开否、内部 `item`、标签 `item`（`undefined` = 没写）。无内部/标签 `layout`。
   - 输出：`wrapItem`、`wrapCol`、`extraRow`、`self`（内部是否 `'self'`，供通道/测试）。
   - item 轴：`itemMerged = tag.item ?? internal.item ?? pageItem`，但 `'self'` 只能来自内部：若 `tag.item === undefined` 且内部为 `'self'`，则 `itemMerged = 'self'`；若 `tag.item === true` 且内部为 `'self'` → `wrapItem: true`、`extraRow: true`（且 `pageLayoutOn` 时 `wrapCol: true`）；若 `tag.item === false` → `wrapItem: false`，内部 `'self'` 时 `wrapCol: false`。
   - Col：`wrapCol = pageLayoutOn`，纯 `'self'` 时强制 `false`。`extraRow = self && tagItem === true && pageLayoutOn`。
4. 内部控件 vs schema：`widget.item ?? schema.item`；`'self'` 与 `false` 同时出现 throw。
5. `readWidgetFormless` 认出 `'self'`。

### B. wrap 与工厂

1. `WrapControlMeta` 增加 `innerRow?: boolean`（仅工厂无参那一次为 true）。
2. `createControlWrap` 增加可选 `Row`；`innerRow && Row` 时：`body → Row(gutter) → Item? → Col?` 的顺序为 **先 Item 包 Row、Col 包 Item**（与 §2 树一致：`Col → Item → Row → 格`）。gutter 从 FormLayout 闭包来（与页 Row 相同），Context-only 无 Row 则忽略 `innerRow`。
3. FormLayout 的 `createControlWrap` 传入 `Row`。
4. `ControlFrame`：用 `wrapItem`/`wrapCol`/`extraRow` 替代或并存 `skipOuterItem`/`skipOuterLayout`。无参 `useFormItem()` 把 `extraRow` 传进 `wrap`。
5. 纯 `'self'`：`itemAttrs` 不要丢（第 4 档还要用）；第 3 档无宿主，开发态可对 `:item:` / `:fl:span` warn。
6. 有参 `useFormItem`：Item 不跟外层 `'self'`；Col 跟页 Row。

### C. 行为对照（必写测试）

| 内部 | 外部 | 页 item / layout | 期望 |
|------|------|------------------|------|
| 未写 | 未写 | 开 / 开 | 叶子 `Col-Item-input` |
| 未写 | `false` | 开 / 开 | 无 Item，有 Col |
| 未写 | `true` | **关** / 开 | **有 Item**（外部开回） |
| `false` | 未写 | 开 / 开 | 无 Item，有 Col |
| `false` | `true` | 开 / 开 | **有 Item**（AgencyList 这场要表单项） |
| `'self'` | 未写 | 开 / 开 | 无外层；N 格进页 Row |
| `'self'` | `true` | 开 / 开 | `Col-Item-Row-` 内层格 |
| `'self'` | `true` | 开 / **关** | 外层 Item，无外层 Col、无内层 Row |
| `'self'` | `false` | 开 / 开 | 同纯 `'self'` |
| `'self'` + schema `false` | — | — | throw |

`readWidgetFormless`、工厂集成（两格 fragment、第 4 档出现 Row）都要测。

### D. Playground / 调用方

1. `DateRangeTwo.vue`：`item: 'self'`，删 `layout: false`。
2. `range.ts`：删抄写的 `item`/`layout`。
3. 可选 demo：`<Range.DateRangeTwo :fl:item="true" col:span="max" col:place="end" />` 看分组壳 + 内层 LayoutView。
4. 文档/DemoShell 一句：组合体自述 `'self'`；标签 `true` 加外层 Item。

### E. 文档

1. 本文（已收口）。
2. 015：删「子项只能关」；改为三层合并、外部最高；静态袋示例改 `'self'`。
3. 013 Two 示例与代价句已指向 `'self'`，补第 4 档一句。
4. README 关系图保持 017。

### F. 建议提交切分

1. `resolveControlShell` + 单测（不改渲染）。
2. wrap `innerRow` + 工厂接合并 + DateRangeTwo 迁移。
3. 第 4 档 playground + 015/013 字句。

### G. 风险

- **破坏**：标签 `:fl:item="true"` 现在几乎无意义（本来就开）；改成「开回」后，内部 `false` 的控件会被包 Item。搜 `:fl:item="true"`。
- 第 4 档外层 Item 的 `prop` 编码走 014 一格多口（控件键 + 投影），与内层按口叶子并存，适配要能两套同时存在。
- 内层 Row 的 `gutter` 与页 Row 相同；不要再开一套密度。

## 后果

- **正向**：`'self'` 表达自己铺格；外部能开回 Item；第 4 档用内层 Row 避免 Col 套 Col；主路径仍是格进页 Row。
- **代价**：015「只能关」废止；合并函数要比两个 `=== false` 更长；第 4 档要接 Row 进 wrap。
- **关联**：012、013、014、015、011、010。
