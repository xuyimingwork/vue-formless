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
  - 2026-09-09 — 通道加 `cell`；`item` 仅 boolean；`FormView.Cell` / `useFormCell`；`FieldSchema` / `fieldKey`。废止 `'self'`，见 [ADR-020](./020-form-view-cell-field.md)。
- **来源**：[ADR-008](./008-form-view-vmodel-and-grid-gcd.md) / [ADR-011](./011-model-and-path.md) / [ADR-012](./012-input-item-and-rule-compile.md) / [ADR-013](./013-one-control-multiple-items.md) / [ADR-020](./020-form-view-cell-field.md)。本文钉 **配置怎么写、进哪一层**。不改 `component` 不含 Item、不改写口、不改 `useFormCell` 吃口名。

## 决策

**无前缀 = 该层宿主；`fl:` = Formless；`row:` / `col:` = 布局。** `User.Xxx` 额外保留 **`:item:`** 给宿主 Item。FormView 写口仍是 Vue 常规 **`v-model`**（顶层 `modelValue`），不是 `v-model:fl`，也不是 `fl.modelValue`。

### 1. 通道

| 组件 | 无前缀 | `fl:` | `row:` / `col:` | 另 |
|------|--------|--------|-----------------|-----|
| `User.Xxx` | → `component` | `prop` + boolean `item` + `cell` + extras | `col:span` `col:place` `col:take` `col:show`；`wrap-embed` 上 `row:column` `row:gutter` | `:item:` / `@item:` / `#item:` → 宿主 Item |
| `FormView` | → 适配 Form | 组树 `layout`(boolean) / `form` / `item` | `row:column` `row:gutter` `row:row`（声明 props） | **`v-model` 是 FormView 写口** |
| `FormView.Cell` | → 适配 Item | `prop` + extras + boolean `item`。**无 `fl:model`、无 `fl:layout`** | `col:span` `col:place` `col:take` `col:show` | 无 `:item:` |

内核 `h(Form, overlay(form.props(snapshot), attrs))`；FormCell 内 `h(Item, overlay(item.props(snapshot), itemAttrs))`。Snapshot 只进 `props` 函数，不是宿主 prop。

- **Form snapshot**：`{ layout, form, item, modelValue }`。`form` 是 boolean（auto 已在内核解开）。`modelValue` 是 FormView 写口数据；映射到宿主 `model` 是 `form.props` 的默认值。
- **Item snapshot**：extras + 内核算出的 `fieldKey` / `binding` / `getValues`。**不要**放 widget 的 `model` 列表/口名，也不放外层已消费的 `item` / `cell` 壳开关，也不放整表数据。

### 2. 页开 Item；Col 跟 LayoutView

FormCell **始终**包 LayoutCell；Col 是否画出跟最近 LayoutView（`:fl:layout` / `disabled`）。`item: boolean` 只关/开这一格里的 ElFormItem。合并：标签 `fl:item` > schema/widget `item` > 页 `FormView :fl:item`。没写 ≠ `true`（跟页）。

`cell` 三态整颗替换（标签 > widget > schema；省略 = `'wrap'`），见 [ADR-020](./020-form-view-cell-field.md)。**没有**格级 `:fl:layout`。

| 层 | `item` | `cell` / layout |
|----|--------|-----------------|
| FormView | `:fl:item`（工厂有 Item 时默认开） | `:fl:layout` boolean；密度工厂 + `:row:*` |
| schema 或控件静态 `formless` | boolean 关/开 ElFormItem | `cell: 'wrap' \| 'embed' \| 'wrap-embed'` |
| `User.Xxx` | `:fl:item` | `:fl:cell`；宽用 `:col:span` |

`FormView.Cell` 临场格可写 `:fl:item` / `:fl:prop`；格上宽用 `:col:*`。

工厂产出 FormField：按 `cell` 组树。`item: false` = 有格、无 label/error。内层 `useFormCell('start')` 从同一份接线按口切开，壳跟页。

### 3. `useFormCell(port?)`

- **无参**：页级 / wrap 格（`FormView.Cell`）。
- **有参** `useFormCell('start')`：按 **口名**（不是叶子键）切开；须在 namespaced Field 内。
- 标签上 **没有 `fl:model`**。控件内 `v-model="start"` 是控件自己的口（工厂已焊到 FormView）。
- 页面 `<FormView.Cell><Input v-model="form.xxx" /></FormView.Cell>` **禁止**（须 `:fl:prop` + slot `{ field }`）。

### 4. prop（不重开 [ADR-011](./011-model-and-path.md)）

- `prop`：从 FormView 根到叶子的位置（可含 `buyers[0].name`）。表格盖 `:fl:prop`。
- **有值才盖** schema：`undefined` = 没写。
- **`prop` 不允许空字符串**（非法，不能用来盖）。

### 5. 控件静态 `formless`

跟 widget 走的键写在控件上，避免每张表抄 `model` / 组装形态：

```ts
formless: {
  cell: 'embed',
  model: ['start', 'end'],
}
```

与 schema 同一份 bag：`cell` / `item` / `model` / `prop` / extras；近的赢（整颗 `cell` 替换）。分组壳写 `:fl:cell="'wrap-embed'"`，见 [ADR-020](./020-form-view-cell-field.md)。

### 6. 内核与适配分工

- 内核读核心键：`component`、`model`、`props`、`prop`、`item`、`cell`。其余 schema 键与 `fl:*` extras **不解释**，进 Item/Input 转化函数的 snapshot。extras 只扩 `FieldSchema`；`ItemFl` / `FormFieldProps` / `FormCellTagProps` 从 extras 推导（`label` → snapshot `label` 与 `:fl:label`）。内核不预声明 `label` / `validate`。见 [ADR-016](./016-fl-project-and-overlay.md)。
- 内核 **删除 `identity-rules`**。`validation` / `validate` 是不透明 extras；默认 `'optional'` 和编 `rules` 都在适配（playground `toEpRules`）。
- Col 只吃内核算出的数字 `span`；Row 只吃该层 LayoutView 的 `gutter`。`:fl:span` 丢掉（开发态 warn）。
- 布局模块导出 `createLayoutView` / `LayoutCell`。否：`place="center"`、开放 Col 透传、`:col:justify`。

## 不纳入

- `:fl:model` / 格上改 `model`
- `v-model:fl`、Form 的 `fl.modelValue`
- 公开 `FormLayout` / `FormView.Layout`（实现层内部 Layout 可以有）
- 控件 / 格上 boolean `:fl:layout`（Col 只跟最近 LayoutView）
- `item: 'self'`；内核合并 wrap+embed

## 关联

写口 [008](./008-form-view-vmodel-and-grid-gcd.md)；`model`/`prop` [011](./011-model-and-path.md)；输入与 Item [012](./012-input-item-and-rule-compile.md)；一 Field 多格 [013](./013-one-control-multiple-items.md)；多口校验 [014](./014-multi-vmodel-host-validation.md)；View/Cell/Field [020](./020-form-view-cell-field.md)。
