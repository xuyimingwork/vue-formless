# ADR-015：Formless 配置通道

- **状态**：Accepted
- **日期**：2026-08-24
- **修订**：
  - 2026-08-25 — extras 的 TS 形状由适配 module augmentation 声明，内核 FormControlProps 只含 path/prop/span/item（后收掉控件级 layout）。
  - 2026-08-26 — FormView `:fl:form` 为 `boolean | 'auto'`（默认 auto）；未绑 v-model 的嵌套 FormView inherit 祖先。公开 FormLayout 仍否；内核可拆内部 Layout。
  - 2026-08-27 — 适配只扩 `ControlSchema`；`ItemFl` / `fl:*` 标签 props 从 extras 推导。
  - 2026-08-27 — 去掉独立 `path`；位置只写 `prop`。见 [ADR-011](./011-model-and-path.md)。
  - 2026-09-01 — 壳合并改为 FormView < 内部 < 外部；外部 `true` 可开回 Item。`'self'` + 标签 `true` 见 [ADR-017](./017-composite-item-self.md)。
  - 2026-09-01 — 控件 / 格上不再有 boolean `layout` / `:fl:layout`。包不包 Col 只跟 FormView `:fl:layout`（第 4 档内层 Row 同此）。见 [ADR-017](./017-composite-item-self.md)。
  - 2026-09-01 — 增加 `row:` / `col:` 通道。`:fl:layout` 只保 boolean；宽用 `:col:span` / `:col:place`。布局对外 `createLayoutView` + `LayoutItem`。
  - 2026-09-03 — 去掉 `useLayoutItem`，直接导出 `LayoutItem`。
  - 2026-09-04 — `:col:take` 见 [ADR-018](./018-col-take-rest.md)；`:row:row` / `:col:show` 见 [ADR-019](./019-layout-row-window.md)。
  - 2026-09-09 — 通道加 `cell`；`item` 仅 boolean；`FormCell` / `useFormCell`；`FieldSchema` / `fieldKey`。废止 `'self'`，见 [ADR-020](./020-form-view-cell-field.md)。
  - 2026-09-10 — **通道前缀重写**：`row:` → `layout:`（LayoutView）、`col:` → `cell:`（LayoutCell）、`fl:cell` → `fl:tree`、`fl:layout` → `fl:grid`；`FormCell` → `FormItem`；`useFormCell` 退场，按口切片改 `fl:model`。§1 表 / §3 / 不纳入以 [ADR-021](./021-channel-prefix-and-form-item.md) 为准。
  - 2026-09-14 — **Item snapshot 去掉 `fieldKey`**（内核不发身份名，见 [ADR-011](./011-model-and-path.md) 修订）：snapshot 只余 extras + `binding` + `getValues()`（+ `fl:` 面上不再有 `fl:key`）。
  - 2026-09-15 — `:col:take` 已否（[ADR-018](./018-col-take-rest.md)）：格上不再有 `take`，行内占用保持 `:col:place` 单轴。§1 表已去掉该键。
  - 2026-09-24 — **词表最终收束**（以代码 + [`design.md`](../design.md) 为准）：`FormCell` / 内核 `FormItem` → `FormField`；`LayoutCell` → `LayoutItem`；`cell:` → `layout-item:`；`fl:cell` / `fl:tree` → `fl:field`（值域 `'auto'` / `'embed'` / `'wrap-embed'`）；`fl:grid` 未落地（开关仍写 `fl:layout`）；`useFormCell(port)` 退场，按口切片改 `fl:model`（标签可写、可覆盖 schema）；工厂壳只锁 `component`。§1 表 / §2 / §3 已按此改写。
- **来源**：[ADR-008](./008-form-view-vmodel-and-grid-gcd.md) / [ADR-011](./011-model-and-path.md) / [ADR-012](./012-input-item-and-rule-compile.md) / [ADR-013](./013-one-control-multiple-items.md) / [ADR-020](./020-form-view-cell-field.md) / [ADR-021](./021-channel-prefix-and-form-item.md)。本文钉 **配置怎么写、进哪一层**。不改 `component` 不含 Item、不改写口、不改按口切片吃口名（前缀与词表见 021）。

## 决策

**无前缀 = 该层主宿主；`fl:` = Formless；`layout:` / `layout-item:` = 布局。** 命名空间 Field 额外保留 **`item:`** 给宿主 Item。FormView 写口仍是 Vue 常规 **`v-model`**（顶层 `modelValue`），不是 `v-model:fl`，也不是 `fl.modelValue`。

### 1. 通道

| 组件 | 无前缀 | `fl:` | `layout:` / `layout-item:` | 另 |
|------|--------|--------|---------------------------|-----|
| `<User.Xxx>` / 临场 `<FormField>` | → control | `prop` / `model` / boolean `item` / `field` / `component` + extras | `layout-item:span` `layout-item:place`；`wrap-embed` 上 `layout:column` `layout:gutter` | `:item:` / `@item:` / `#item:` → 宿主 Item |
| `FormView` | → 适配 Form | 组树 `layout`(boolean) / `form` / `item` | `layout:column` `layout:gutter` | **`v-model` 是 FormView 写口** |

内核走两处 host 装配：FormView `mergeAttrs(form.props(snapshot), 宿主 Form attrs)`；`FormFieldCore` 的 control 面 `mergeAttrs(resolveProps(preset.props, 快照), control 桶, $bindings)`，宿主 Item 面由 `FormItem` 做 `mergeAttrs(resolveProps(item.props, 快照), item 桶)`。Snapshot 只进 `props` 函数，不是宿主 prop。

- **Form snapshot**：`{ layout, form, item, modelValue }`。`form` 是 boolean（auto 已在内核解开）。`modelValue` 是 FormView 写口数据；映射到宿主 `model` 是 `form.props` 的默认值。
- **Item snapshot（`ItemFl`）**：extras + 本格归一化的 `model` / `prop`（下标对齐）+ `getValues()`（当前尚未实现，见 `design.md` §16.3）。**不要**放 widget 的原始口名列表，也不放外层已消费的 `item` / `field` 壳开关，也不放整表数据。

### 2. 页开 Item；格跟 LayoutView

每颗 `FormField` **始终**过 `LayoutItem`；Row / Col 画不画出跟最近 LayoutView（`fl:layout` 翻转成 `disabled`）。`item: boolean` 只关/开这一格里的宿主 ElFormItem。合并：标签 `fl:item` > schema / control `item` > 页 `FormView :fl:item`。没写 ≠ `true`（跟页）。

`fl:field`（组装位置）整颗替换（标签 > schema；省略 = `'auto'`），见 [ADR-020](./020-form-view-cell-field.md) 与 `design.md` §8。**没有**格级 `fl:layout`。

| 层 | `item` | `field` / layout |
|----|--------|------------------|
| FormView | `fl:item`（工厂有 Item 时默认开） | `fl:layout` boolean；密度工厂 `layout.props` + `layout:*` |
| schema 或控件静态 `formless` | boolean 关/开宿主 ElFormItem | `field: 'auto' \| 'embed' \| 'wrap-embed'` |
| `<User.Xxx>` | `fl:item` | `fl:field`；宽用 `layout-item:span` |

临场 `<FormField>` 可写 `fl:item` / `fl:prop` / `fl:model` / `fl:component`；格上宽用 `layout-item:*`。

工厂产出 `FormField`：按 `fl:field` 组树。`item: false` = 有格、无 label/error。`fl:model` 从同一份接线按口切开，壳跟页。

### 3. 按口切片：`fl:model`

- **页级 / wrap 格**：不写 `fl:model` 时，口取 schema / control 静态 `formless.model`，缺省 `['modelValue']`。
- **组合体内层格**：写 `fl:model="start"`，在**该 Field 已声明的口**里按名字取对应位置（[ADR-013](./013-one-control-multiple-items.md) 的一颗 Field、N 格不变）。
- **身份根**（namespaced 标签 / 临场格）：`fl:model` 与 `fl:prop` 一样是**声明**，由标签覆盖 schema——工厂壳只锁 `component`（`design.md` §11.2）。
- 页面 `<FormField><ElInput v-model="form.xxx" /></FormField>` **禁止**（须 `fl:prop` + `fl:component`，或 slot `{ $bindings }`）。

### 4. prop（不重开 [ADR-011](./011-model-and-path.md)）

- `prop`：从 FormView 根到叶子的位置（可含 `buyers[0].name`）。表格盖 `:fl:prop`。
- **有值才盖** schema：`undefined` = 没写。
- **`prop` 不允许空字符串**（非法，不能用来盖）。

### 5. 控件静态 `formless`

跟 widget 走的键写在控件上，避免每张表抄 `model` / 组装形态：

```ts
formless: {
  field: 'embed',
  model: ['start', 'end'],
}
```

与 schema 同一份 bag：`field` / `item` / `model` / `prop` / extras；近的赢（整颗 `field` 替换）。分组壳写 `fl:field="'wrap-embed'"`，见 [ADR-020](./020-form-view-cell-field.md)。

### 6. 内核与适配分工

- 内核读核心键：`component`、`model`、`props`、`prop`、`item`、`field`。其余 schema 键与 `fl:*` extras **不解释**，进 Item/control 转化函数的 snapshot。extras 只扩 `FieldSchema`；`ItemFl` / `FormFieldProps` 从 extras 推导（`label` → snapshot `label` 与 `:fl:label`）。内核不预声明 `label` / `validate`。见 [ADR-016](./016-fl-project-and-overlay.md)。
- 内核 **删除 `identity-rules`**。`validation` / `validate` 是不透明 extras；默认 `'optional'` 和编 `rules` 都在适配（playground `toEpRules`）。
- Col 只吃内核算出的数字 `span`；Row 只吃该层 LayoutView 的 `gutter`。`fl:span` 丢掉（开发态 warn）。
- 布局模块导出 `createLayoutView` / `LayoutItem`。否：`place="center"`、开放 Col 透传、`layout-item:justify`。

## 不纳入

- `v-model:fl`、Form 的 `fl.modelValue`
- 公开 `FormLayout` / `FormView.Layout`（实现层内部 Layout 可以有）
- 控件 / 格上 boolean `fl:layout`（Col 只跟最近 LayoutView）
- `item: 'self'`；内核合并 wrap+embed

（`fl:model` 不在「不纳入」里：它现在是合法的——身份根上作声明、组合体内层格上作选口，见 §3。）

## 关联

写口 [008](./008-form-view-vmodel-and-grid-gcd.md)；`model`/`prop` [011](./011-model-and-path.md)；输入与 Item [012](./012-input-item-and-rule-compile.md)；一 Field 多格 [013](./013-one-control-multiple-items.md)；多口校验 [014](./014-multi-vmodel-host-validation.md)；View/Cell/Field [020](./020-form-view-cell-field.md)。
