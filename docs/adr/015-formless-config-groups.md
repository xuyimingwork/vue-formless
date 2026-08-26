# ADR-015：Formless 配置通道

- **状态**：Accepted
- **日期**：2026-08-24
- **修订**：
  - 2026-08-25 — extras 的 TS 形状由适配 module augmentation 声明，内核 FormControlProps 只含 path/prop/span/item/layout。
- **来源**：[ADR-008](./008-form-view-vmodel-and-grid-gcd.md) / [ADR-011](./011-model-and-path.md) / [ADR-012](./012-input-item-and-rule-compile.md) / [ADR-013](./013-one-control-multiple-items.md)。本文钉 **配置怎么写、进哪一层**。不改 `component` 不含 Item、不改写口、不改 `useFormItem` 吃口名。

## 决策

**无前缀 = 该层宿主；`fl:` = Formless。** `User.Xxx` 额外保留 **`:item:`** 给宿主 Item。FormView 写口仍是 Vue 常规 **`v-model`**（顶层 `modelValue`），不是 `v-model:fl`，也不是 `fl.modelValue`。

### 1. 通道

| 组件 | 无前缀 | `fl:` | 另 |
|------|--------|--------|-----|
| `User.Xxx` | → `component` | `path` `prop` `span` + boolean `item`/`layout` + extras | `:item:` / `@item:` / `#item:` → 宿主 Item |
| `FormView` | → 适配 Form | 聚成 Form 的 `props.fl`：`layout`、`form`、`item`。内核也用这三项组树 | **`v-model` → Form 顶层 `modelValue`** |
| `FormView.Item` | → 适配 Item | `path` `prop` `span` + boolean `layout` + extras。**无 `fl:item`、无 `fl:model`** | 无 `:item:`。选口不在标签上 |

内核 `h(Form, { fl, modelValue, ...attrs })`；`h(Item, { fl, ...itemAttrs })`。`fl` 在适配组件上声明即可。

- **Form `fl`**：只有 `{ layout, form, item }`。数据是顶层 `modelValue`。
- **Item `fl`**：extras + 内核算出的 `controlKey` / `binding` / `getValues`。**不要**放 widget 的 `model` 列表/口名，也不放外层已消费的 `item` / `layout` 壳开关，也不放整表 `modelValue`。

### 2. 页开能力，子项只能关

wrap 仍是 `Col? → Item? → body`。FormView 打开某项能力后，下面的格默认都开；schema / 控件静态 `formless` / `User.Xxx` 只能再关。页没开栅格时，标签 `true` 不能单独把某一格的 Col 开回来。

| 层 | `item` | `layout` |
|----|--------|----------|
| FormView | `:fl:item`（工厂有 Item 时默认开） | `:fl:layout`：`false` / `true` / `{ column, gutter }`（密度只在这里） |
| schema 或控件静态 `formless` | 显式 `item: false` 关工厂那一次 Item | 显式 `layout: false` 关工厂那一次 Col |
| `User.Xxx` | `:fl:item="false"` 这一场再关 | `:fl:layout="false"` 这一场再关 Col。**不是**密度对象 |

工厂始终 `useFormItem()` 一次（无参 = 当前 control 的整份接线）。`item: false` / `layout: false` 只把这一层壳藏掉，**不是没绑定**。内层 `useFormItem('start')` 从同一份接线按口切开，壳跟页，不继承外层那两个 `false`。

`FormView.Item` 不要 `:fl:item`，也不要 `:item:`。格上可以有 boolean `:fl:layout`（页已开栅格时关 Col）。

### 3. `useFormItem(port?)`

- **无参**：当前 control 的整份接线。`model: ['start','end']` + `prop: ['startTime','endTime']` → `{ start, end }` 都绑上。工厂外包、DateRangeOne 一格，都是这个。无参 + 多口 **不 throw**。
- **有参** `useFormItem('start')`：按 **口名**（不是叶子键）切开。
- 标签上 **没有 `fl:model`**。控件内 `v-model="start"` 是控件自己的口（工厂已焊到 FormView）。
- 页面 `<FormView.Item><Input v-model="form.xxx" /></FormView.Item>` **禁止**。

### 4. path / prop（不重开 [ADR-011](./011-model-and-path.md)）

- `prop`：叶子；`path`：导航。表格只盖 `:fl:path`。
- **有值才盖** schema：`undefined` = 没写；**空字符串算有值**。
- **`prop` 不允许空字符串**（非法，不能用来盖）。

### 5. 控件静态 `formless`

跟 widget 走的键写在控件上，避免每张表抄 `model` / 关外层壳：

```ts
formless: {
  item: false,
  layout: false,
  model: ['start', 'end'],
}
```

与 schema 合并：`model` 以控件为准；`item` / `layout` 任一方 `false` 即关。控件上声明了就不强制 schema 再抄一遍。

### 6. 内核与适配分工

- 内核读核心键：`component`、`model`、`props`、`path`、`prop`、`item`、`layout`。其余 schema 键与 `fl:*` extras **不解释**，原样进 Item `fl`。extras 的 TypeScript 形状由适配 `declare module 'vue-formless'` 扩充（`ControlSchema` / `FormControlProps` / `FormViewItemProps` / `ItemFl`），内核不预声明 `label` / `validate`。
- 内核 **删除 `identity-rules`**。`validation` / `validate` 是不透明 extras；默认 `'optional'` 和编 `rules` 都在适配（playground `toEpRules`）。
- Col 只吃内核算出的 `span`；Row 只吃页 `fl:layout` 的 `gutter`。外层这次 wrap 无 Col 则这次不用 `span`。

## 不纳入

- `:fl:model` / 格上改 `model`
- `v-model:fl`、Form 的 `fl.modelValue`
- 公开 `FormLayout`
- 合并 `path` 与 `prop`
- 无参 `useFormItem()` 在多口时 throw

## 关联

写口 [008](./008-form-view-vmodel-and-grid-gcd.md)；`model`/`prop`/`path` [011](./011-model-and-path.md)；输入与 Item [012](./012-input-item-and-rule-compile.md)；一 control 多格 [013](./013-one-control-multiple-items.md)；多口校验 [014](./014-multi-vmodel-host-validation.md)。
