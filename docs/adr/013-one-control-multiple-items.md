# ADR-013：一颗 control、多格 Item

- **状态**：Accepted（修订）
- **日期**：2026-08-19
- **修订**：
  - 2026-08-19 — 多口在宿主上怎么校验拆到 [ADR-014](./014-multi-vmodel-host-validation.md)；本文只保留壳的次数。
  - 2026-08-19 — 宿主 Item `prop` 的编码（一格控件键 vs 两格叶子路径）是适配层约定，不是内核 snapshot 字段。
  - 2026-08-19 — 关掉外层壳用 schema `item: false` + `layout: false`（与 FormView 同名，只覆盖缺省）；工厂走 `useFormItem()`；页面临场格是 `FormView.Item`（真 props，不是 `:formless`）。`shell` 废止。
  - 2026-09-01 — 关 Col 不再写 schema / 标签 `layout`；组合体 `'self'` 外层不包 Col，密度只在 FormView。见 [ADR-017](./017-composite-item-self.md)。
  - 2026-08-31 — 组合体关壳改为控件 `formless.item: 'self'`（一次去掉外层 Item+Col）；与业务 `item: false`（不要表单项、可留 Col）分开。见 [ADR-017](./017-composite-item-self.md)。
- **来源**：相对 [ADR-012](./012-input-item-and-rule-compile.md) / [ADR-011](./011-model-and-path.md) / [ADR-010](./010-controls-as-semantic-cluster.md)。日期范围要两套 `col-item-picker` 时，012 的「一颗 control 只 wrap 一次」把身份和壳焊死了。

## 背景

[ADR-005](./005-view-model-as-unit.md) 把日期范围当成 **一个控件、两（多）个持久化字段**。[ADR-010](./010-controls-as-semantic-cluster.md) 把区间约束写在 **这一颗** control 的 `validation` 上，而不是拆成 `User.StartDate` / `User.EndDate`。[ADR-011](./011-model-and-path.md) 用 `model: ['start','end']` + `prop: ['startTime','endTime']` 接两个 v-model 口。

[ADR-012](./012-input-item-and-rule-compile.md) 却规定渲染是：

```text
Col? → Item(slots.default = 输入) → component
```

Control 只交 **一个** body，工厂 `wrap` **一次**。这只覆盖「一个格子里一个（可复合的）输入」：

```text
DateRangeOne：  Col → Item → DateRange（一颗 type=daterange 的 picker）
```

中后台更常见的是两格，各自有 label 和错误位：

```text
DateRangeTwo：  Col → Item → picker
               Col → Item → picker
```

若把现成「自带 Col/FormItem」的 DateRange 丢进 `component`，外面再 wrap 一次，会套娃。若拆成两颗 control，名字和区间校验都裂开：`:formless.validate` 要写两次；`validation` 看不到另一端；和 010「区间写在这一颗上」对着干。

需要钉死：**身份（control）和壳（Item）的基数可以不是 1:1**；两格仍是同一颗 `<User.DateRange />`；壳只有一种，不要为 TwoInput 另做一套 Item。

## 决策

### 1. 两个基数

| 单元 | 是什么 | 次数 |
|------|--------|------|
| **control** | 身份：`component` / `model` / `prop` / `path` / `label` / `validation`；模板上一颗标签 | 一次 |
| **Item** | 一格壳：Col? + 宿主 FormItem（适配组件 + slot）+ 默认槽里的输入 | 0 / 1 / N |

默认仍是 **1 control = 1 Item**（`Name`、OneInput）：工厂自动 `wrap`，widget 不碰壳。  
TwoInput 是例外：1 control、**N 次**同一颗壳。  
块级（`AgencyList`）可以是 0 次 Item；不是本文主路径，仍按 012 暂不作为默认能力。

`component` 仍然只接输入，**不含** Col / FormItem。多出来的格子不是把栅格焊进 widget，而是 widget **多次实例化 FormView 提供的那颗 Item**。

### 2. 两种 DateRange，同一颗 Item

对照必须成立，否则会做出两套壳：

| | DateRangeOne | DateRangeTwo |
|--|-------------------|-------------------|
| 簇 | 一颗 control，`model` / `prop` 双口 | 一样 |
| 标签 | `<User.DateRange :formless="{ validate: 'required' }" />` | 一样 |
| `validation` | 一份（空值 + 区间） | 一样 |
| 写入 | `v-model:start/end` → 工厂 `update` → FormView `emit` | 一样 |
| **Item 次数** | 1（工厂 `useFormItem()`） | 2（widget `useFormItem('start'/'end')`） |
| widget 里 | 一颗 daterange picker，**不**调 Item | `item: 'self'`，两次 Item，各包一个 picker；**fragment 根**（不要再套 Row） |
| Item 上的宿主 `prop` | 适配编码（Element 一格多口常用控件键，见 [ADR-014](./014-multi-vmodel-host-validation.md)） | 适配按口派生叶子路径（`fromTime` / `buyers.0.fromTime`） |

「底层一样」= `useFormItem` / `FormView.Item` 都走 FormView 闭包里的 `wrap`（Col + 同一颗适配 Item）。不是两种 Item 组件。

OneInput **不要**在 `.vue` 里再取 Item：工厂已经 `useFormItem()`。Two **必须** `item: 'self'`（见 [ADR-017](./017-composite-item-self.md)），否则整颗外面还有一层 Col+Item。

### 3. Two：关掉外层壳，按口取壳

组合体在控件上自述 `item: 'self'`（[ADR-017](./017-composite-item-self.md)），不要在 schema 再抄 `item`。FormView 是这页缺省；`'self'` 关掉工厂那一次整格。**不要**把 `item` 放进标签 `:fl:` 当这场袋子（显式 `:fl:item="true"` 开回外层 Item 除外）。

```ts
dateRange: {
  component: DateRangeTwo, // formless.item: 'self' + model
  prop: ['fromTime', 'toTime'],
  validation: {
    empty: { message: '请选择日期范围' },
    format: { /* 一对值：结束不早于开始 */ },
  },
}
```

工厂：总是 `useFormItem()`（无参）。未 `'self'` 时这一次 wrap 与 012 相同；`item: 'self'` 时这一次是透传，并把 binding / extras **provide** 给 widget。内层 `useFormItem('start')` **仍走 FormView 缺省**（不继承 `'self'`）。标签显式 `:fl:item="true"` 时工厂再包外层 Item（页开 layout 则为 `Col → Item → Row`），内层格进这颗 Row（[ADR-017](./017-composite-item-self.md) 第 4 档）。

Widget **不得** `inject` 整份 form `model`，也不得自己调 `update`。读写真值只走 `defineModel('start')` / `defineModel('end')`。

取壳按 **v-model 口名**（`'start'`），不对叶子键 `'fromTime'`。

```vue
<script setup>
const start = defineModel('start')
const end = defineModel('end')
const StartItem = useFormItem('start')
const EndItem = useFormItem('end')
</script>
<template>
  <StartItem label="开始日期">
    <el-date-picker v-model="start" />
  </StartItem>
  <EndItem label="结束日期">
    <el-date-picker v-model="end" />
  </EndItem>
</template>
```

`useFormItem('start')` 返回的就是那颗 **FormView.Item**，snapshot 已按该口填好。格上用 **真 props**（`label` / `span`），不要再填叶子，也不要 `:formless`（那只属于 control 标签，避免抢输入的名字）。

没有包围的 namespaced control 时，`useFormItem('start')` 应失败：口名无从解析。FormView `:item="false"` 时 hook **不** throw，Item 层透传（可能仍包 Col）。

### 3.1 临场一格：`FormView.Item`

和 Two 内部是同一颗壳。没有 control 身份；接线、文案写在这颗上：

```vue
<FormView.Item prop="remark" label="备注" :span="24" v-slot="{ field }">
  <el-input v-bind="field" />
</FormView.Item>
```

`field` 是 `applyControlBinding` 的结果。禁止 `v-model="form.remark"`。未声明 attrs 落到宿主 Item。默认字段（`Name`）继续走工厂，不要每格手写 `FormView.Item`。

独立 widget 用 `useFormItem`，不要 `import { FormView } from 'vue-formless'` 再写 `FormView.Item`：内核那颗没有项目里的 ElCol / ElFormItem。

### 3.2 参数分层（不要混）

| 层 | 写哪 | 有什么 |
|----|------|--------|
| 页 | FormView | `v-model`、`layout`、`form`、`item`；其余 attrs → Form |
| 身份 | ControlSchema | `component` / `props` / `label` / `validation`；`model` / `prop` / `path`；`item`（关 Item；`'self'` 关外层整格） |
| 这场 | control 上的 `:formless` | `label` / `prop` / `path` / `validate` / `span`。**没有** `item` / `layout` |
| 格 | `FormView.Item` / `useFormItem` 返回值 | 真 props：`label` / `span` / `prop` / `path` / `validate` |

### 4. 校验与 span

`:formless.validate` 仍写在 **一颗** `<User.DateRange />` 上。一格多口时 ElForm 的 `value`、口值 getter、红字挂载点见 [ADR-014](./014-multi-vmodel-host-validation.md)。两格时该口叶子 `prop` 的 `fieldValue` 是真值；跨口区间仍用 014 的整份口值，不要在适配层写另一端叶子名。

`:formless.span` 仍是 **一颗 control 标签一个数**。Two 每格宽度由该格 Item 的 `span` 写（或 FormView `defaultSpan`）；不要把标签上的 `span` 解释成两格总宽。以后若要 `span: [12, 12]` 另议，不堵在本文。

### 5. 实现边界

- 壳只有一条实现：`wrap` ≡ `FormView.Item` ≡ `useFormItem(…)` 拿到的组件。工厂无参 `useFormItem()`，不要另开 `ctx.wrap` 给作者。
- `Item` / `Col` 不得放进深 `reactive` 的 FormContext（012 已否，栈溢出）。
- 默认字段（`Name`）继续自动 wrap；禁止变成每格手写 `FormView.Item`。
- One 不必在 widget 里调无参 hook。

## 备选方案

1. **拆成 `StartDate` / `EndDate` 两颗 control**：DOM 两格最省事；身份和区间校验裂开；已否为 DateRange 的默认。真是两个独立时间点再用。
2. **只支持 OneInput**：双口 `model`/`prop` 够用；中后台两格 label/红字覆盖不到；已否为唯一形态。
3. **schema `ports: []` 由工厂展开两格**：widget 保持「纯输入」；复合结构（中间插 `~`、第三格、不规则 span）表达力差，工厂开始像迷你表单 schema，与 010 冲突；已否为 v1。
4. **`:formless.bare` 当主开关**：策略袋和「我是复合体」拧在一起；已否。用 schema `item` / `'self'`。
5. **`useFormView()` 把 `model` / `update` 交给 widget**：可就地改、可按叶子键自己写，绕过 FormView 写口；已否。hook 只取壳。
6. **`useFormItem(prop)` 参数当叶子键（`startTime`）**：换绑 / `path` 时 Item 对不上；已否。参数是 **口名** `start`。
7. **通用 `Item` + `port('start')` 在模板拼 `:formless`**：和 `useFormItem('start')` 同一件事，绑的时机更晚、更啰嗦；口级糖收在 hook。格上用 `label` / `span`，不把 `:formless` 套到格上。
8. **Two 专用 Item 实现**：与「底层一样」冲突；已否。
9. **widget 内 import ElCol / ElFormItem**：绕过适配，换宿主要改控件；已否。
10. **schema `shell: false`**：与 FormView `item` / `layout` 两套词；已否，改同名覆盖。
11. **`:formless.item` / `:formless.layout`**：把身份开关塞进这场袋子；已否。

## 后果

- **正向**：`<User.DateRange />` 仍是一个名字、一份 `validate`、一份区间规则；OneInput / TwoInput 只是壳的次数；012 的输入/Item 分缝对复合体仍然成立。
- **代价**：`item: 'self'` + `useFormItem('start')` 是新的作者面；宿主 `prop` 按壳粒度由适配分叉（一格常用控件键、两格按口），须与 Form 投影键一致，见 [ADR-014](./014-multi-vmodel-host-validation.md)。
- **关联**：Item 合成见 [ADR-012](./012-input-item-and-rule-compile.md)（一 control 一 wrap 由本文修订）；绑定见 [ADR-011](./011-model-and-path.md)；多口宿主校验见 [ADR-014](./014-multi-vmodel-host-validation.md)；区间写在 control 上见 [ADR-010](./010-controls-as-semantic-cluster.md)；写口见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)；控件单元见 [ADR-005](./005-view-model-as-unit.md)。
