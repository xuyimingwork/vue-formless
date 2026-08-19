# ADR-014：多口 control 与宿主校验

- **状态**：Accepted（修订）
- **日期**：2026-08-19
- **修订**：
  - 2026-08-19 — 主路径改为适配 `Form` 吃投影 model；用户不手写 `el-form`。`validate()` 在 FormView ref。无 Form 时仍可不信 ElForm `value`。公开 `FormLayout` / 页面 slot 绑投影已否。
  - 2026-08-19 — 宿主 `prop` 由适配 Item / Form 编码，内核不预计算、不强制控件键。snapshot 给 `binding` + `getValues()`。
- **来源**：相对 [ADR-011](./011-model-and-path.md) / [ADR-012](./012-input-item-and-rule-compile.md)。011 允许 `model` / `prop` 数组只解决了接线；一格 Item 时宿主 Form 的 `value`、红字、`resetFields` 没着落。[ADR-013](./013-one-control-multiple-items.md) 管壳的次数，不管「几个 v-model 口时 rules 吃什么」。

## 背景

一颗 control 可以有多个 v-model 口（011）：

```ts
timeRange: {
  component: DateRangeOneInput,
  model: ['start', 'end'],
  prop: ['startTime', 'endTime'],
  validation: { empty: { /* … */ }, format: { /* 区间 */ } },
}
```

接线成立：工厂 `applyControlBinding` 灌 `v-model:start/end`，写入走 FormView `emit`。DTO 是 `{ startTime, endTime }`，**没有** `timeRange` 这个键。

宿主却只有 **一个** ElFormItem `prop` 字符串。若适配把多叶子、一格 Item 编成 **控件键**（`timeRange` / `buyers.0.timeRange`），则：

- ElForm `:model="form"` 上没有 `timeRange`，Item 拿到的 `fieldValue` 是 `undefined`
- 现有 `toEpRules` 把这个 `value` 当单字段做 `isEmptyValue` / `format`：必填永远失败，区间规则被当成空而跳过
- 若让 `toEpRules` 写死 `getIn(form, path, 'startTime')`，适配层绑死叶子名，换绑 / 换控件都要改 Element 适配
- 若让用户在 DTO 上拼 `timeRange: [start, end]`，虚拟字段漏进业务对象，和「FormView `v-model` 就是提交数据」拧着

[ADR-013](./013-one-control-multiple-items.md) 的 TwoInput 每格一个叶子，`fieldValue` 是真值；但区间 `format` 仍要看见 **一对** 口值，同样不能在 `toEpRules` 里写字段名。

需要钉死：多口时 **值从哪来、红字挂哪、作者在哪调 `validate()`、v1 不做什么**。

## 决策

### 1. 接线仍是 011；本篇只谈宿主校验

`model` / `prop` 数组语义、前缀接线（`prop` 短于 `model`）、`:formless.prop` / `path` 覆盖，一律以 011 为准。未绑定的口（如 Agency 的 `option`）**不进入**本文的口值列表。

### 2. 适配层不认叶子名

适配 Item 内部编规则（如 `toEpRules`）只吃：

- 该 control 的 `validation`
- 这场 `:formless.validate`
- **已经取好的值**：单口是标量；多口是与已绑定 `prop` 对齐的列表（下称口值）

叶子名、`path`、`getIn(form, 'startTime')` 只活在内核：按 binding `getIn(model, path, prop[i])`。口值随 DTO 现取（投影 getter 或 `() => values`），不能在 Item 首次渲染时拍死。

`empty.validate` / `format.validate` 的参数仍是 `unknown`（标量或列表）。怎样算空、怎样算区间合法，写在 **簇的 `validation` 里**，由控件作者解释这对值，不由 Element 适配解释字段名。

### 3. 一格多口：适配决定 host `prop`；投影键必须对齐

DateRangeOneInput（默认 wrap 一次）一格挂不住两个叶子。Element 适配通常把宿主 Item `prop` 编成 **控件键**，不是两个叶子，也不是 `'$startTime,endTime'`。这是 **适配内部约定**，不是内核 snapshot 字段；Naive 等可以换成别的挂载点。

内核只给 `binding` + `controlKey` + `getValues()`。`EpItem` 写出 `prop`，`EpForm` 用 **同一套编码** 做投影键（真实叶子 + 该键 → 现取口值，如 `timeRange → [start, end]`）。ElFormItem 的 `fieldValue` 才能对上、watch 才能随改随消红字。投影的 setter（`resetFields`）必须拆回叶子再走 `update` / `emit`，禁止就地改 DTO。

DTO（`FormView` 的 `v-model`）**没有** `timeRange`。有适配 `Form` 时，投影发生在 Form 适配里，不是内核替 ElForm 选键。

### 4. 整表 `validate()`：FormView 的 ref

有 `Form` 时用户 **不**写 `el-form`（[ADR-008](./008-form-view-vmodel-and-grid-gcd.md) / [ADR-012](./012-input-item-and-rule-compile.md)）：

```vue
<FormView ref="formRef" v-model="form" label-width="96px" :layout="{ column: 2 }">
  <User.DateRange :formless="{ validate: 'required' }" />
</FormView>
```

```ts
await formRef.value?.validate()
```

`v-model` 仍是 DTO。适配 `Form` 使用投影。`toEpRules` 可以信 ElForm 传入的 `value`（此时已是口值）。DateRangeOneInput 不自己画错误。

无 `Form`（表格等）：没有宿主 `validate()`；若仍套了 Item，validator 应 **忽略** 可能为 `undefined` 的 `value`，改用内核口值 getter——这是降级，不是表单页主路径。

### 5. 与 013（多格 Item）的关系

| | OneInput（一格） | TwoInput（两格） |
|--|------------------|------------------|
| 壳 | 013：工厂 `useFormItem()` 一次 | 013：`item: false` + `layout: false` + `useFormItem('start'/'end')` |
| 宿主 Item `prop` | 适配编码（Element 常用控件键） | 适配按口叶子路径（`fieldValue` 是真值） |
| `empty` / required | 本文：对 **整份口值** 判空 | 该格 ElForm `value`（单叶子）；策略仍是标签上那一份 `:formless.validate` |
| 区间 `format` | 本文：对整份口值 | 仍是该 control 的 `validation`；用同一套口值（闭包 `getValues()`），不要在 `toEpRules` 里写另一端叶子名 |

两格时单格 empty 可以信 ElForm 的 `value`；跨口约束仍走本文的口值列表。身份始终一份 `validation`。

### 6. 未绑定的口

`prop.length < model.length` 时，多出来的 model 口不进口值、不进 Item.prop。Agency 只绑 `agencyId` 时，校验只看见这一个叶子。

## 备选方案

1. **用户在 DTO 上拼 `timeRange`**：虚拟键漏进提交数据；已否。
2. **`toEpRules` 写死 `startTime` / `endTime`**：适配层绑死表单形状；已否。
3. **Item.prop = `'$startTime,endTime'`**：叶子名进挂载点，换绑要改字符串，`validateField` 难用；已否。Element 一格多用控件键。
4. **内核 snapshot 预计算 `formItemProp`**：把 Element 编码焊进内核，换宿主要改 snapshot；已否。内核只给 `binding` / `getValues()`。
5. **页面 `v-slot="{ model }"` 手写 `el-form`**：用户要记投影不是 DTO；已否为主路径。主路径适配 `Form` + FormView expose。
6. **公开 `FormLayout`，ElForm 夹在 FormView 与 Layout 中间**：简单表三层套娃；[ADR-008](./008-form-view-vmodel-and-grid-gcd.md) 再次否决。组树由内核 `Form? → Row? → 字段`。
7. **只忽略 `value`、ElForm 仍绑裸 DTO**：提交能出红字，但 `fieldValue` watch / `resetFields(控件键)` 不对；仅作无 `Form` 时的降级，不是表单页默认。
8. **拆成 `StartDate` / `EndDate` 两颗 control 来「修好」单 value**：身份和区间校验裂开；已否为多口控件的默认（与 013 一致）。

## 后果

- **正向**：多口接线（011）和宿主红字拆开；表单页不污 DTO、不手写 `el-form`；host `prop` 与投影键同属适配；`toEpRules` 保持无字段名；013 的两格只解决壳。
- **代价**：适配要做投影 Proxy（getter 口值、setter 走 `update`）；`validate` 走 FormView expose；无 Form 时仍须口值 getter 降级。
- **关联**：接线见 [ADR-011](./011-model-and-path.md)；Form / Item slot 见 [ADR-012](./012-input-item-and-rule-compile.md)；组树见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)；多格 Item 见 [ADR-013](./013-one-control-multiple-items.md)；区间写在 control 上见 [ADR-010](./010-controls-as-semantic-cluster.md)。
