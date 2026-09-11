# ADR-021：通道前缀 = 目标组件（FormCell → FormItem）

- **状态**：Accepted
- **日期**：2026-09-10
- **来源**：相对 [ADR-015](./015-formless-config-groups.md) / [ADR-016](./016-fl-project-and-overlay.md) / [ADR-020](./020-form-view-cell-field.md) 的通道与词表重写；复核 [ADR-011](./011-model-and-path.md) / [ADR-013](./013-one-control-multiple-items.md) / [ADR-018](./018-col-take-rest.md) / [ADR-019](./019-layout-row-window.md)。
- **修订**：015（§1 通道表 / §3 / 不纳入）、016（§3 组树开关清单）、020（词表 `FormCell` → `FormItem`）、011（§5 `fl:model` 说明）、018 / 019（`col:` → `cell:`、`row:` → `layout:`）。
- **库尚未发 1.0**：词汇准确优先于兼容（同 [ADR-020](./020-form-view-cell-field.md)）。

## 背景

[ADR-015](./015-formless-config-groups.md) 把通道钉成 **无前缀 = 该层宿主；`fl:` = Formless；`row:` / `col:` = 布局**。这条规则能跑，但解释不了三个具体问题。

### 1. 前缀命名的是宿主元素，而 formless 只跟 LayoutView / LayoutCell 交互

`row:` 同时指「宿主 Row 元素」和「布局层」。两个键去了完全不同的地方：

- `gutter` 是**透传**：LayoutView **没有**声明它，靠 `{...attrs}` 落到宿主 `<el-row>`。
- `column` 是**窗口算法**：`LayoutView` 的声明 prop，进 `mergeColumn`，Row 根本收不到。

```tsx
// packages/layout/src/create-layout-view.tsx
props: {
  disabled: { type: Boolean, default: false },
  column: { type: Number, default: undefined },
},
...
return <HostRow ref={rowRef} {...attrs} data-layout-row="">
```

`col:` 同理：`span` / `place` 是 `LayoutCell` 的 props（`LayoutCellProps`），而 ADR-018 / 019 加进来的 `take` / `show` **不写进 Col**，只是格子对 LayoutView 的登记指令。同一个前缀下「给宿主元素的」和「只给算法的」混装。

### 2. `prop` 三义

| 写法 | 实际是什么 |
|------|-----------|
| `<User.Name prop="…">` | widget 的 prop（落 DOM） |
| `<FormCell prop="…">` | 宿主 Item 的 prop（经 `inputAttrs` 覆盖适配产出） |
| `fl:prop` | formless 的绑定位置 |

`FormCell` 的 `itemProps` 把 `inputAttrs` 叠在适配输出之上：

```tsx
// packages/vue-formless/src/FormCell.tsx
const { itemAttrs, itemOn: itemListeners, inputAttrs } = splitFallthrough(props.value)
return overlayProps(
  resolveProps(ctx.itemProps, itemFl.value),
  { ...itemAttrs, ...inputAttrs },
  itemListeners,
)
```

于是同一块属性位上有两条规则。而 ADR-015 §1 又写「FormCell 无 `:item:`」——代码支持、文档否认，两边已经漂了。

### 3. `FormCell` 的名字不指它的主宿主

`FormCell` 的裸名实际落到宿主 **FormItem**（不是 Col）。名字叫 Cell，却把裸名给了 Item，用户无从判断「不写前缀的属性去哪」。同一个词两套机制且其中一套没有名字：

- schema 的 `label` 是 `fl:` → 语义源，经适配投影成 Item `label`；
- `FormCell` 的裸 `label` 是 → 直接当 Item prop 下传（机械覆盖）。

### 4. 根因

- 前缀按**宿主元素（Row / Col）**命名，但 formless 只见 `LayoutView` / `LayoutCell` / 宿主 `Item`。换宿主要改前缀名，本身就是耦合。
- 「无前缀」对 `FormView`（→ Form）、`FormField`（→ Input）、`FormCell`（→ Item）含义各不相同，却没有一条能念出来的规则。
- 布局层把「窗口算法键」与「宿主元素键」塞进同一个前缀，制造了 `column`/`gutter`、`span`/`take` 两组内部混装。

## 决策

### 1. 一条规则：前缀 = 目标组件；无前缀 = 主宿主

> **无前缀 = 这颗组件的主宿主；`前缀:` = 你要配置的那个 formless 侧子组件。**

三颗组件的主宿主，就是它们名字里包的东西（沿用 [ADR-020](./020-form-view-cell-field.md) 的分层）：

```text
FormView   包裹 宿主 Form        裸名 → Form
FormField  包裹 Input            裸名 → Input
FormItem   包裹 宿主 FormItem    裸名 → FormItem
```

这条规则能解释现有每一个前缀：`item:` = 越过主宿主去够 FormItem；`cell:` = 够 LayoutCell；`layout:` = 够 LayoutView；`fl:` = 够 formless 内核。

### 2. 词表：View / Item / Field

```text
布局                   表单
LayoutView             FormView
LayoutCell             FormItem
                       FormField
```

`LayoutView` ↔ `FormView` 是「窗口 / 根」，`LayoutCell` ↔ `FormItem` 是「一格」。日常称呼上 `LayoutCell` 就叫 cell（[ADR-018](./018-col-take-rest.md) / [019](./019-layout-row-window.md) 全篇「格」，`create-layout-view` 注释 `cells are LayoutCell`），于是 `cell:` 有唯一候选。

`FormItem` = `LayoutCell` + 可选宿主 FormItem（[ADR-020](./020-form-view-cell-field.md) §2 的树不变）。

### 3. `FormCell` 改名 `FormItem`

理由就是 §1 的规则：**它的主宿主是宿主 FormItem，名字必须说出来。** 同 `FormView` 包 Form、`FormField` 包 Input——「名字 = 我包了它」。

连带好处：`cell` 一词腾给 `LayoutCell`（§5）；否则 `cell:` 会同时暗示 `FormCell` 与内层 `LayoutCell`。

旧名 → 1.0：

```text
FormCell           → FormItem
FormCellProps      → FormItemProps
FormCellComponent  → FormItemComponent
FormCellTagProps   → FormItemTagProps
FormCellSlotProps  → FormItemSlotProps
FormViewItemProps  → FormItemTagProps（保留 deprecated 别名）
useFormCell        → 删除（§7）
```

### 4. 前缀表

| 前缀 | 目标组件 | 装什么 |
|------|---------|--------|
| `fl:` | formless 内核 | 绑定 / 组树 / 壳开关 / 语义 extras：`fl:prop` `fl:model` `fl:item` `fl:tree` `fl:label` `fl:validate` |
| `layout:` | `LayoutView` | 窗口键：`layout:column` `layout:gutter` `layout:row`（原 `row:`） |
| `cell:` | `LayoutCell` | 格键：`cell:span` `cell:place` `cell:take` `cell:show`（原 `col:`） |
| `item:` | 宿主 `Item` | 越过主宿主时用：`item:label` `item:label-width` `item:prop` |
| 裸名 | 当前组件的主宿主 | FormView→Form / FormField→Input / FormItem→FormItem |

读法：**前缀是「配置谁」，裸名是「配置主子」。** 不再按宿主元素（Row / Col）命名——`layout:` / `cell:` 指的是 formless 侧组件；`LayoutView` 怎么转给 `Row`、`LayoutCell` 怎么转给 `Col`，是 layout 包内部的事。

各组件吃哪些前缀：

| 组件 | 裸名 | `layout:` | `cell:` | `item:` | `fl:` |
|------|------|-----------|---------|---------|-------|
| `FormView` | 宿主 Form | 页窗口 | — | — | ✓ |
| `FormField` | Input | 仅 `fl:tree='wrap-embed'` 内层 | 本格 | ✓ | ✓ |
| `FormItem` | 宿主 Item | — | 本格 | = 裸名（等价别名） | ✓ |

三个归位说明：

- `take` / `show` 归 `cell:`（不再是 `col:`）：它们是「这一格」的策略，和 `span` / `place` 同属 `LayoutCell`。这样 `cell:` 内部与 `item:` / `layout:` 一样纯——**一个前缀只对一颗组件**。
- `gutter` 归 `layout:` 而不是 `row:`：作者配的是「这个布局窗口的间距」，窗口自己转发给 Row；同构于 `item:label` 配 Item。
- `item:` 只在 `FormField` 上有「越过主宿主」的作用；在 `FormItem` 上主宿主已是 Item，`item:*` 与裸名等价。

`layout:column`（LayoutView 自己消费）与 `layout:gutter`（LayoutView 转发给 Row）同前缀，因为**目标都是 LayoutView**；转给谁对作者不可见。

### 5. `layout:` / `cell:` 取代 `row:` / `col:`

```diff
- <User.Name col:span="16" />
+ <User.Name cell:span="16" />
- <FormView :row:column="3" :row:gutter="16">
+ <FormView :layout:column="3" :layout:gutter="16">
- <LayoutItem show="required" place="end" />
+ <LayoutCell show="required" place="end" />
```

顺带消掉 [ADR-019](./019-layout-row-window.md) 的 `:row:row` 叠词（→ `layout:row`）。019 当初为 `column` / `row` 对称才接受叠词；`layout:` 下不再需要。

`span` / `place` **不拆成两个前缀**：作者写的 `cell:span` 就是算法输入，归一化后的值又直接变成 Col 的 `span`（`LayoutCell` 里 `span={span.value}`）。输入即输出、一次声明，不做「`layout:span` 给算法 + `cell:span` 给 Col」的二分。

### 6. `fl:` = 参与派生的语义源；其余 = 机械落地

前缀之外的第二条轴，必须写进文档：

| 通道 | 语义 | 例 |
|------|------|-----|
| `fl:*` | **语义源**：改它会引起派生重算 | `fl:label` → 适配同时算 Item `label` 与空校验文案 |
| `item:*` / `cell:*` / `layout:*` / 裸名 | **机械值**：直接落到目标，不触发重算 | `item:label` 直接盖宿主 Item 的 `label` |

于是 `fl:label` 与 `item:label` 同时在，是设计而非冲突：前者是 source，后者是 override。[ADR-016](./016-fl-project-and-overlay.md) §2 的覆盖链（近的赢、`undefined` 不算写过）不变。

`fl:prop` 与 `item:prop` 同理：前者是绑定输入（`getIn(model, prop)`），后者是直接盖宿主 `prop` 字符串（适配从 `fl:prop` 派生的那个）。[ADR-011](./011-model-and-path.md) §6「宿主 Item `prop` 不由内核决定」不变。

### 7. `useFormCell` 退场；按口切片改 `fl:model`

- 删 `useFormCell(port?)`：无参支 = `FormItem` + 一次重复的 `useFormContext()` 守卫；有参支只转发 `default` 槽，走它时 `#item:*` 会丢。
- embed 内层格改 `<FormItem fl:model="start">`（[ADR-013](./013-one-control-multiple-items.md) 的一颗 Field、N 格不变）。
- `fl:model` = **从该 Field 已声明的 `model` 口里选一个**（原 `bindingForPort` 的行为），**不是**覆盖身份。语义上对齐 [ADR-011](./011-model-and-path.md) §1 把 `model` 注释成「组件 v-model 口」的用法；ADR 里写死「**选择 ≠ 覆盖**」。
- 只在 namespaced Field 内合法；否则 throw（沿用原 `port` 的守卫）。
- `<User.Xxx>` 上的 `fl:model` **非法**：`model` 仍锁在 component / widget `formless`（[ADR-011](./011-model-and-path.md) §5 / [ADR-015](./015-formless-config-groups.md) §不纳入）。
- `bindingForPort` 退出公开导出（`index.ts` 移除），转内核私有；错误文案由 `useFormCell("…")` 改为 `fl:model="…"`。
- 删 `FORM_CELL_PORT_KEY`（不再需要 provide / inject 传递）。

### 8. 两个避撞改名

| 现在 | 改成 | 原因 |
|------|------|------|
| `fl:cell`（组树三态） | `fl:tree` | 与 `cell:`（LayoutCell）肉眼难分；它描述的是组装树 |
| `fl:layout`（boolean 开关） | `fl:grid` | 与 `layout:`（窗口）同框出现会读混；`layout:` 完整让给窗口 |

`fl:tree` 仍是 `'wrap' | 'embed' | 'wrap-embed'`，整颗替换（[ADR-020](./020-form-view-cell-field.md) §3 不变）。`fl:item` 仍是 boolean 壳开关，与 `fl:tree` 正交（见备选 5）。

### 9. 主宿主缺席时，裸名消失

完整规则两句：**裸名给主宿主；主宿主没渲染，裸名就丢掉（不报错、不转发）。**

- `FormView`：`fl:form` 关（`'auto'` 下嵌套）或无宿主 Form 时，裸名不进任何元素（`if (!Form) return body`）。
- `FormItem`：`fl:item=false` 或工厂没绑 Item 时，`itemProps` 整包不用。
- `FormField`：`component` 为空时 `input = null`，裸名一起丢。

想在「主宿主可能缺席」时仍生效，用显式前缀（`item:` / `cell:` / `layout:`）。

### 10. 覆盖来源轴不变

四种来源（工厂 options < schema / widget `formless` < 标签）与 [ADR-016](./016-fl-project-and-overlay.md) 一致：**近的赢；`undefined` 不算写过。** 本 ADR 只改「值去哪一层」，不改「谁赢」。

## 备选方案

1. **把布局算法键（`column` / `take` / `show` / `row`）收进 `fl:`**（「少一个前缀」方案）：`gutter` 字面就是转发 `<el-row>` 的，叫 `fl:gutter` 是假话，只能留在 `row:`——于是 `row:` 只为装一个键而存在，`fl:` 变成「内核语义 + 布局策略」混合袋。**省不掉任何前缀**（现状 4 个、本方案 4 个）。否。
2. **保留 `col:` / `row:` 命名**：与「formless 只跟 LayoutView / LayoutCell 交互」矛盾；`column`/`gutter`、`span`/`take` 的内部混装解释不掉。否。
3. **`layout-cell:span`**：语义正确但太长。`LayoutCell` 日常就叫 cell，取 `cell:`。否为 `layout-cell:`。
4. **结构化对象 `:layout="{ column: 4 }"` / `:cell="{ span: 12 }"` / `:item="{ label }"`**：真 props、Volar 可校验、一个部件一个名字；但不是平铺 attrs，且与 [ADR-013](./013-one-control-multiple-items.md) 已否的 `:formless` 袋子形似（动机相反）。保留为将来选择，v1 否。
5. **合并 `item` 与 `tree` 成一根轴**（`fl:item="wrap" | "embed" | "wrap-embed" | false`）：同一个键要同时说「组树」与「要不要 label/error」，正是 [ADR-020](./020-form-view-cell-field.md) 备选 1 / 2 否掉的。保留两条正交轴。否。
6. **保留 `FormCell` 名**：`cell:` 会同时暗示 `FormCell` 与 `LayoutCell`；且名字不指主宿主。否。
7. **保留 `useFormCell(port)`**：两个入口拿同一颗组件，无参支冗余、有参支丢槽。否（§7）。
8. **`col:span` 与算法拆成两个前缀**（`layout:span` 计算 + `cell:span` 透传）：输入即输出，拆开要写两遍并规定谁赢。否（§5）。

## 不纳入

- 公开 `FormView.Layout` / `FormView.Cell`
- 在 `<User.Xxx>` 上用 `fl:model` 改 widget 的 v-model 口（`fl:model` 只允许在 Field 内**选口**）
- `:fl:cell` / `:fl:layout`（改 `fl:tree` / `fl:grid`）
- `form:` 前缀（当前无需从字段够到宿主 Form；需要时另议）
- 开放自定义 merge / 自定义前缀

## 改造方案

内核：

1. `split-fallthrough.ts`：`COL_PREFIX = 'cell:'`、`ROW_PREFIX = 'layout:'`；`COL_KEYS = { span, place, take, show }`、`ROW_KEYS = { column, gutter, row }`；`FormlessPropBags` 的 `rowProps` / `colProps` → `layoutProps` / `cellProps`（`FormView` / `FormField` / `FormItem` 的取用同步改）。
2. `FormCell.tsx` → `FormItem.tsx`：组件名 / 类型名全改；口切片从 `inject(FORM_CELL_PORT_KEY)` 改为读 `formlessProps.value.model`；删 `useFormCell`；`:row:*` 警告文案改 `layout:*`。
3. `control-model.ts`：`bindingForPort` 函数保留、错误文案改 `fl:model`；`index.ts` 移除导出。
4. `injection-keys.ts`：删 `FORM_CELL_PORT_KEY`。
5. `item-adapter.ts`：`FormCellTagProps` → `FormItemTagProps`；`FormFieldProps` / `FormItemTagProps` 的 `col:*` → `cell:*`、`row:column` → `layout:column`；`'fl:cell'` → `'fl:tree'`；`FormViewItemProps` 别名改指 `FormItemTagProps`。
6. `create-form-view.ts`：`FormViewProps` 的 `'row:column'` → `'layout:column'`；`fl:layout` → `fl:grid` 读取。
7. `FormField.tsx`：`tagFl.cell` → `tagFl.tree`、`resolveCellMode` 参数名跟进；`:row:*` 警告文案。
8. `index.ts`：导出 `FormItem` / `FormItemProps` / `FormItemSlotProps` / `FormItemTagProps`；删 `useFormCell` / `FORM_CELL_PORT_KEY` / `bindingForPort`。
9. `layout` 包：`LayoutCell` 增 `take` / `show` 时沿用 `cell:`（ADR-018 / 019 落地）；本 ADR 只保证通道名。

测试 / playground / 文档：

10. `create-form-fields.test.ts`：`useFormCell` 两处改 `h(FormItem, { 'fl:model': 'start', … })`；`col:span` 等改 `cell:span`。
11. `playground/src/ep/form-view.ts`、`demos/formless/*.vue`：`fl:layout` → `fl:grid`、`:row:column` → `:layout:column`、`col:span` → `cell:span`、`fl:cell` → `fl:tree`、`useFormCell` → `<FormItem fl:model>`。
12. `README.md` / `README.en.md` 通道表同步。
13. 015（§1 表、§3 整节、不纳入、来源句）、016（§3 组树开关清单）、020（词表）、011（§5 `fl:model` 说明）、018 / 019（`col:` → `cell:`、`row:` → `layout:`）、本索引。

落地顺序建议：本文 → 内核改名与通道常量 → 测试 → playground → 旧 ADR 交叉标注。

## 后果

- **正向**：一条规则（前缀 = 目标组件、裸名 = 主宿主）解释全部通道；`layout:` / `cell:` 各自只对一颗组件，`fl:` 回到「内核语义源」；`FormItem` 名字与主宿主一致；`cell` 一词唯一；`prop` 三义收敛为「`fl:prop` 绑定 vs `item:prop` 机械覆盖」两条明说的通道；`useFormCell` 退场后按口切片只剩 `fl:model` 一个入口。
- **代价**：`FormCell` → `FormItem` 是全局重命名（类型、导出、测试、playground、多篇 ADR）；`col:` / `row:` 两个熟前缀消失；`fl:cell` / `fl:layout` 两个字段改名；`take` / `show` 在 018 / 019 落地时要与 `span` / `place` 一起从 `col:` 迁到 `cell:`；`fl:item`（壳开关）与 `item:`（宿主通道）同根不同 namespace，文档须点明。
- **关联**：通道 [015](./015-formless-config-groups.md)；投影与覆盖 [016](./016-fl-project-and-overlay.md)；词表与三态 [020](./020-form-view-cell-field.md)；绑定 [011](./011-model-and-path.md)；一格多口 [013](./013-one-control-multiple-items.md) / [014](./014-multi-vmodel-host-validation.md)；格占用 [018](./018-col-take-rest.md)、窗口 [019](./019-layout-row-window.md)；写口 [008](./008-form-view-vmodel-and-grid-gcd.md)。
