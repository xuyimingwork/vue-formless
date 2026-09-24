# ADR-016：fl → 宿主 props

- **状态**：Accepted（修订）
- **日期**：2026-08-26
- **修订**：
  - 2026-09-10 — §3 组树开关改前缀：`:fl:cell` → `:fl:tree`、`:fl:layout` → `:fl:grid`、`:col:*` → `:cell:*`、`:row:*` → `:layout:*`；`fl:` 定为「参与派生的语义源」，其余通道为机械落地。见 [ADR-021](./021-channel-prefix-and-form-item.md)。
  - 2026-09-18 — 去掉 `createFormFields` 第二参（簇级 `props`）：输入 props 只剩 `schema.props` 一层，覆盖链为 模板 > `schema.props`。§1 / §2 的「簇第二参」不再存在。
  - 2026-09-24 — **最终收束**：通道名收为 `fl:` / `layout-item:` / `layout:` / `item:`（`:col:*` → `layout-item:*`、`:row:*` → `layout:`；`fl:tree` / `fl:grid` 未落地，开关仍写 `fl:layout`）；`FormCell` → `FormField`；密度写在 `layout.props`（`layout.column` / `layout.gutter` 已退场）；`ItemFl` snapshot = `model` / `prop`（下标对齐）+ `getValues()`（未实现）+ extras，不再是 `binding`。见下。
  - 2026-09-24（补）— snapshot 定名 **`FormFieldFormless`**（`ItemFl` 作废），未归一化的 `fl` 袋定名 **`FormFieldFormlessRaw`**；`getValues()` 删除，snapshot 补 `field`。extras 仍只扩 `FieldSchema`，经 `extends` 流进 snapshot 与 `fl:*` 标签。
- **来源**：[ADR-012](./012-input-item-and-rule-compile.md) / [ADR-015](./015-formless-config-groups.md)。本文钉 **转化与覆盖**：`fl` 如何变成 Form / Item / Input 的 props，以及谁赢。

## 背景

`label` 是跨层语义：同一份「姓名」要变成 Item 的 `label`、空校验文案、Input 的 `placeholder`。015 把 extras 只推进 Item `props.fl`，placeholder 走输入无前缀 attrs，两边对不上。让每个 Input 声明接 `fl` 税高，且各自发明覆盖规则。

## 决策

**`props` 一种槽、两种写法，都是默认值**：对象 = 静态默认；函数 = 从该层 snapshot 算出的默认。不是「拿到已有宿主 props 再 transform」。Form / Item **不再**吃 `props.fl`。内核 merge：**近的赢**；`undefined` 不算写过。只有 control 的 v-model 口（`$bindings`）与工厂壳的 `component` 锁死。

### 1. 工厂

```ts
createFormView({
  layout: {
    Row: ElRow,
    Col: ElCol,
    props: { column: 2, gutter: 16 },   // 密度写在 layout.props（或标签 :layout:*）
  },
  form: {
    component: ElForm,
    props: (fl) => ({ model: fl.modelValue }),
  },
  item: { component: ElFormItem, props: toEpItemProps },
})

createFormFields(schema)   // 输入 props 只有 schema.props 一层（第二参已废，见修订）
```

- 每颗 control 的 `props` 同样是对象或函数。一层里二选一；既要静态又要跟 `fl`，写进函数。
- `layout` / `form` / `item` 均可省。有 `layout` 则 Row+Col 都要。不要 `input`。项目密度写 `layout.props`（`layout.column` / `layout.gutter` 已退场）。
- Form snapshot 含 `modelValue`（FormView 的写口数据）。映射到宿主（如 ElForm `model`）写在 `form.props` 里，和其它默认值一样可被 `<FormView :model="b" />` 盖掉。内核 **不**写死 `model`。
- Item 公约数是普通宿主 props。`item.props` 吃 `ItemFl` snapshot：`model` / `prop`（下标对齐）+ `getValues()`（未实现）+ extras（`label` / `validate` 等）。

### 2. 覆盖

```text
control: 模板裸名 > schema.props；$bindings（v-model 绑定）覆盖同名裸名
Item:    :item: / @item: > item.props
Form:    <FormView> 无前缀 > form.props
锁死:    control 的 v-model 口；工厂壳的 component（标签 fl:component 不覆盖 schema）
```

`<FormView v-model="a" :model="b" />`：写口仍是 `a`；ElForm 的 `model` 是 `b`。

覆盖粒度是宿主 prop 名。`:item:foo` 能盖住，当且仅当 `item.props` 产出了 `foo`。改语义源走 `:fl:label`，转化会一起重算。

### 3. 非这条路径

- 组树开关（`fl:form` / `fl:item` / `fl:layout` / `fl:field`、`layout-item:span` / `layout-item:place`、`layout:*`）——内核自己用
- 槽 / 事件（`#item:label`、`@item:validate`）——已有通道
- FormView `expose` 代理内层 Form 的 `validate()`
- `FormField` 手写 default、复合控件内部 picker：不自动吃到 field `props` 函数，不 clone 用户 vnode

## 不纳入

- 开放自定义 merge
- `createFormFields` 上的 Item / Form 映射
- Form 投影 model（[ADR-014](./014-multi-vmodel-host-validation.md)）；`form.props` 留位

## 关联

通道 [015](./015-formless-config-groups.md)；输入与 Item [012](./012-input-item-and-rule-compile.md)；FormView 公约数 [008](./008-form-view-vmodel-and-grid-gcd.md)。
