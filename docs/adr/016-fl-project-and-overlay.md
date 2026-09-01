# ADR-016：fl → 宿主 props

- **状态**：Accepted
- **日期**：2026-08-26
- **来源**：[ADR-012](./012-input-item-and-rule-compile.md) / [ADR-015](./015-formless-config-groups.md)。本文钉 **转化与覆盖**：`fl` 如何变成 Form / Item / Input 的 props，以及谁赢。

## 背景

`label` 是跨层语义：同一份「姓名」要变成 Item 的 `label`、空校验文案、Input 的 `placeholder`。015 把 extras 只推进 Item `props.fl`，placeholder 走输入无前缀 attrs，两边对不上。让每个 Input 声明接 `fl` 税高，且各自发明覆盖规则。

## 决策

**`props` 一种槽、两种写法，都是默认值**：对象 = 静态默认；函数 = 从该层 snapshot 算出的默认。不是「拿到已有宿主 props 再 transform」。Form / Item **不再**吃 `props.fl`。内核 merge：**近的赢**；`undefined` 不算写过。只有 Input 的 v-model 口锁死。

### 1. 工厂

```ts
createFormView({
  layout: { Row: ElRow, Col: ElCol },
  form: {
    component: ElForm,
    props: (fl) => ({ model: fl.modelValue }),
  },
  item: { component: ElFormItem, props: toEpItemProps },
})

createFormControls(schema, {
  props: (fl) => ({
    placeholder: typeof fl.label === 'string' ? `请填写${fl.label}` : undefined,
  }),
})
```

- 每颗 control 的 `props` 同样是对象或函数。一层里二选一；既要静态又要跟 `fl`，写进函数。
- `layout` / `form` / `item` 均可省。有 `layout` 则 Row+Col 都要。不要 `input`。项目密度写 `layout.column` / `layout.gutter`（不是 `layout.props`）。内核默认 1/0。
- Form snapshot 含 `modelValue`（FormView 的写口数据）。映射到宿主（如 ElForm `model`）写在 `form.props` 里，和其它默认值一样可被 `<FormView :model="b" />` 盖掉。内核 **不**写死 `model`。
- Item 公约数是普通宿主 props。`item.props` 吃 `ItemFl` snapshot（`label` / `validate` / `binding` / `getValues`）。

### 2. 覆盖

```text
Input: 模板 > control.props > 簇第二参.props
Item:  :item: / @item: > item.props
Form:  <FormView> 无前缀 > form.props
锁死:  Input v-model 口
```

`<FormView v-model="a" :model="b" />`：写口仍是 `a`；ElForm 的 `model` 是 `b`。

覆盖粒度是宿主 prop 名。`:item:foo` 能盖住，当且仅当 `item.props` 产出了 `foo`。改语义源走 `:fl:label`，转化会一起重算。

### 3. 非这条路径

- 组树开关（`:fl:form` / `:fl:item` / `:fl:layout`、`:col:span` / `:col:place`、`:row:*`）——内核自己用
- 槽 / 事件（`#item:label`、`@item:validate`）——已有通道
- FormView `expose` 代理内层 Form 的 `validate()`
- `FormView.Item` 手写 default、复合控件内部 picker：不自动吃到 control `props` 函数，不 clone 用户 vnode

## 不纳入

- 开放自定义 merge
- `createFormControls` 上的 Item / Form 映射
- Form 投影 model（[ADR-014](./014-multi-vmodel-host-validation.md)）；`form.props` 留位

## 关联

通道 [015](./015-formless-config-groups.md)；输入与 Item [012](./012-input-item-and-rule-compile.md)；FormView 公约数 [008](./008-form-view-vmodel-and-grid-gcd.md)。
