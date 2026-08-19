# ADR-008：FormView、`v-model` 与栅格适配公约数

- **状态**：Accepted（修订）
- **日期**：2026-08-13
- **修订**：
  - 2026-08-13 — 适配挂载、`v-model`、公约数与空白 Col；见正文。
  - 2026-08-14 — 页级密度收拢为 `layout: boolean | { column, gutter }`，默认 `false`。
  - 2026-08-18 — 控件不就地改对象；FormView 是唯一写入点，同 tick 合并 patch 后 `emit` 新对象。
  - 2026-08-18 — 适配公约数补上 Item + `toItemProps`；`component` 不含 FormItem。见 [ADR-012](./012-input-item-and-rule-compile.md)。
  - 2026-08-18 — FormContext 不再下传 `column` / `gutter` / `defaultSpan`；密度由 FormView `wrap` 与 Row 自己用。
  - 2026-08-18 — FormView 不再广播 `readonly` / `disabled`；整表禁用留给宿主表单。
  - 2026-08-18 — 栅格模量钉死 24；`:formless.span` 即宿主 Col span。不再配置 `total`。
  - 2026-08-19 — 可选 `Form` 适配（slot，内核填 default）；组树 `Form? → Row? → 字段`。栅格仍是 `:layout`，**再次否决**拆出公开的 `FormLayout`（简单表会 FormView / ElForm / FormLayout 套娃）。`toItemProps` 不再是工厂选项，见 [ADR-012](./012-input-item-and-rule-compile.md)。
  - 2026-08-19 — 实例配置：`v-model` / `layout` / `form` / `item`。工厂只绑组件。FormView `ref` expose 内层 Form。
- **来源**：相对 [ADR-004](./004-form-layout-and-context.md) / [ADR-007](./007-layout-adapter-and-span-priority.md) 的后续澄清（命名、数据口、适配面与占位策略）

## 背景

ADR-004 将运行时粘合命名为 `FormLayout`，并同时承担 FormContext 与布局宿主。ADR-007 约定消费外部 Row/Col、不自研栅格，但未钉死：

- 根组件在「只管 Context」时是否仍叫 Layout
- 表单数据以 `:model` 还是 `v-model` 进入 Context
- 外部适配的最小公约数是什么；`gutter` / `offset` / 换行等落在哪一侧
- 若拆成 Provider + Grid，主路径是否被迫两层嵌套

进一步推演后需要收口，避免实现期 API 摇摆。

## 决策

### 1. 根组件命名为 `FormView`

- **`FormView`**：对外主入口；名称中性，不预设「一定在管栅格」
- 第一职责是提供 **FormContext**（可写表单状态、`wrap`）
- 第二职责（可选）是托管栅格：按 span 编排外部 Row/Col；密度留在 FormView，不进 Context
- 第三职责（可选）是套适配 **`Form`**：内核 `h(Form, attrs, { default: () => 字段树 })`，投影 model 给宿主表单校验（[ADR-014](./014-multi-vmodel-host-validation.md)）

组树顺序由 **formless 决定**（适配只转发 slot，不得自己 `if` 丢掉 default）：

```text
Form?（工厂有 Form 且 `form` 未关）
  └ Row?（`:layout` 开启才包）
        └ 字段（每格 wrap：Col? → Item?（`item` 未关）→ 输入）
```

简单表单页面只有一颗 `FormView`，不要再套 `FormLayout`，也不要用户手写 `el-form`：

```vue
<FormView ref="formRef" v-model="form" label-width="96px" :layout="{ column: 2, gutter: 16 }">
  <User.Name />
  <User.DateRange />
</FormView>
```

`form` / `item` 在工厂绑了对应组件时 **默认开**。`label-width` / `disabled` 等未声明 attrs 落到 `Form`。FormView 的 `ref` **代理内层 Form**（内核不声明 `validate` 等方法）。表格等用 `:form="false"`；工厂不传 `Form` 则永远不包。

奇怪布局：不写 `layout`，在同一颗 FormView 里手写 Row/Col（仍可有 Form）。同一页多段密度：外层 FormView 包 Form，内层 `:form="false"` 只托管 layout。**不要**为此再引入 `FormLayout`，也不要让内层再包 Form。

ADR-004 中的 `FormLayout` 名称由本文废止为推荐对外名；**也不**作为栅格子组件复活。文档与实现统一：`FormView` = 数据根 + 可选 Form + 可选栅格。

### 2. 表单数据口使用 `v-model`

```vue
<FormView v-model="user" :layout="{ column: 2, gutter: 16 }">
  <User.Name />
</FormView>
```

理由：

- `<User.Name />` **不**在页面模板上绑 `v-model`。ElForm 的 `:model` 只给校验/重置用，真正写入在每个输入的 `v-model="form.xxx"`。Formless 收掉这些口之后，作者能指认的写入点只剩 `FormView` 的 `v-model`。
- 因此 **FormView 必须是改动真实发生的位置**：控件经 Context `update(prop, value, path?)` 上报，FormView `emit('update:modelValue', next)`，由父级 `v-model` 赋值。
- 根上单向 `:model` 对齐的是 Element 的校验袋，不是本库的写口；已否。

实现约定：

- `modelValue` 放入 Context **只读**（父级快照）；写入只走 `update`
- **禁止**就地改共享引用；每次提交一份浅拷贝新对象 `{ ...modelValue, ...patch }`
- 同一 tick 内多次 `update`（双口控件同时改 `start`/`end`，或联动导致多个控件一起写）必须先合并 patch，在 `nextTick` **只 emit 一次**。Vue 的 props 更新是异步批处理、事件处理是同步的：若每次 `update` 都按当前 `props.modelValue` spread 后立刻 emit，第二次仍看到旧对象，先写的键会丢
- 父级绑定必须可赋值（`ref` / 可写属性）。`reactive` 对象无法被 `v-model` 整包替换
- 页级密度收在 **`layout`**（见下），不再散落 `default-span` / `gutter` / `columns`

### 2.1 `layout`：`boolean | { column, gutter }`，默认 `false`

与 HTML 布尔属性一致：**不写 = false = 纯 Context**（不托管栅格）。

```ts
layout?: boolean | {
  column?: number  // 一行几列；defaultSpan = 24 / column
  gutter?: number
}
```

| 写法 | 含义 |
|------|------|
| 不写 / `:layout="false"` | 不托管，业务手写 Row/Col |
| `layout` / `:layout="true"` | 托管；密度用默认（当前 `column: 2`, `gutter: 16`；后续可按容器宽度推断） |
| `:layout="{ column: 4, gutter: 12 }"` | 托管；显式页级密度 |

字段上的 `:formless.span` 是宿主 Col 的 span（24 格，如整行 24、半行 12），不是「占几个 column 槽」。超出公约数时退出托管：该 `FormView` 不写 `layout`，手写外部栅格。单格 `bare` 暂不开放。

### 2.2 `form` / `item`：实例开关，默认开

工厂绑的是 **哪颗组件**；这一页开不开由 FormView 布尔 props 决定（与 `layout` 同属实例配置，默认相反：`layout` 不写即关，`form`/`item` 工厂有组件则默认开）。

| 写法 | 含义 |
|------|------|
| 不写 / `form` / `:form="true"` | 包工厂 `Form`；`ref` 转到它 |
| `:form="false"` | 不包 Form（表格、内层只托管 layout） |
| 不写 / `item` / `:item="true"` | 每格包工厂 `Item`（`snapshot` + `:item:`） |
| `:item="false"` | 这一页不包 Item；单格仍可用以后的 `shell: false` |

```vue
<!-- 表单页 -->
<FormView ref="formRef" v-model="form" :layout="{ column: 2 }" label-width="96px" />

<!-- 表格：只要 Context + Item -->
<FormView v-model="order" :form="false" />
```

Vue 组件 ref 不会自动变成子组件：FormView `expose` 代理内层 Form 的 ref；适配 `Form` 同样代理宿主实例。内核不知道 `validate` 这些方法名。`:form="false"` 时代理目标为空。

### 3. 适配公约数：`Row` + `Col(span)` + 可选 `Form` / `Item`

接外部栅格等于只吃**能力公约数**。策略层（密度、补白、换行）由 `FormView` 主控；若把底层 Row/Col 原生 props 全量透传，会与托管算法抢方向盘。Form / Item：内核 **不**写死 `label` / `prop` / `rules` / `model`；适配组件自己转，用 slot 接收内核填好的 default。

**挂载方式**：项目级一次 `createFormView({ Row, Col, Form?, Item? })`。`Form` / `Item` 是适配 **组件**，用 Vue slot 接收内核填好的 default；转换（如 `toEpItemProps`）留在适配内部，**不是**工厂选项。不在内核写死某一组件库。栅格模量固定 24。不提供官方 Element 适配包；playground 展示这一次绑定。

```ts
export const FormView = createFormView({
  Row: ElRow,
  Col: ElCol,
  Form: EpForm,   // 可选；内部 h(ElForm, { model: 投影, ...attrs }, slots)
  Item: EpItem,   // 可选；内部把 snapshot 转成 ElFormItem props，转发 slots
})
```

| 能力 | 归属 | 说明 |
|------|------|------|
| **span**（24 格占位） | 外部 Col（托管时必须） | `:formless.span` 即 Col 的 `span`；缺省为 `24 / column`。模量钉死 24，不配置 `total` |
| **Row 容器** | 外部（托管时必须） | 经典栅格下 Col 的 span 依赖行容器；由 FormView 在 Form **内侧**套上 |
| **Form**（校验容器） | 外部（需要 `validate()` 时） | 内核有则 `h(Form)`，无则字段树原样出门；投影 model 见 [ADR-014](./014-multi-vmodel-host-validation.md) |
| **Item**（label / 错误） | 外部（校验呈现时） | 内核有则 `h(Item, snapshot, slots)`，无则只渲输入；宿主 `rules` / `label` / `prop` 是适配自己转的，见 [ADR-012](./012-input-item-and-rule-compile.md) |
| **gutter** | `FormView` → Row **可选透传** | Row 有则生效；无则间距能力不可用，**不影响**排版算法 |
| **换行 / 类 offset / 行末补齐** | `FormView` 算法 | 一律渲染**空白 `Col(span=n)`**，不调用外部 `offset` / `push` / `pull` |
| **字段级 `xs/sm/md`、任意 Col / FormItem 透传** | 不做默认能力 | 超出公约数时**退出托管**，手写外部栅格（不写 `layout`） |

最小接入条件：

```text
能渲染「24 格上 span 份」的列格子 + 行容器
→ createFormView({ Row, Col })

另需表单项（label / 校验）
→ 再加上 Item

另需整表 validate / 投影 model
→ 再加上 Form
```

`gutter` 不是接入门槛；空白 Col 是托管布局的统一占位手段。无 Item 则不套表单项；无 Form 则不套宿主表单。`component` 始终是输入（ADR-012）。包不包 Form / Item / Col **只由 formless 决定**（工厂有没有组件、实例 `form` / `item` / `:layout`、`shell: false`），适配必须渲 `slots.default`。

### 4. 主路径一层嵌套；拆原语仅用于逃逸

不强制业务在「始终要布局」时写：

```vue
<FormProvider>
  <FormGrid>...</FormGrid>
</FormProvider>
```

约定：

- **主路径**：单一 `FormView`（Context + 可选 `Form` + 可选 `:layout` 栅格），一层即可
- **逃逸**：不启用托管时，同一颗 FormView 里手写 Row/Col；不要拆公开的 `FormLayout`，不要嵌套第二颗带 `Form` 的 FormView
- 若实现层拆 Provider / Grid，对外仍合成在 `FormView`，避免主路径 FormView / ElForm / FormLayout 三层套娃

## 备选方案

1. **继续叫 `FormLayout` + `pure`**：能表达逃逸，但「Layout 却 pure」语义拧；已否决为推荐名。
2. **根上 `:model` 对齐 Element**：ElForm 的 `:model` 是校验用只读入口，不是写口；本库控件已不绑 v-model，根必须是真 `v-model`。已否决。
3. **就地改 `modelValue.xxx`、不 emit**：实现简单，但改动不经过 v-model，与「FormView 是唯一写入点」矛盾；双口同时更新也无法在聚合层合并。已否决。
4. **每次 `update` 立刻 `{ ...props.modelValue, [k]: v }` 并 emit**：单次写入可用；同一 tick 两次 emit 时 props 仍是旧对象，后一次覆盖前一次。必须 tick 内合并 patch。
5. **自研 Row/Col 或默认 CSS Grid**：扩大库内能力、减少适配，但与周边中后台页面栅格心智分裂；ADR-007 已否决，本文不翻案。
6. **开放 Col `offset` / 断点 props**：表达力强，易与页级密度、空白补齐算法打架；改为空白 Col，超出则退出托管。
7. **对外强制 Provider + Grid 两层（公开 `FormLayout`）**：职责干净，简单表单变成 FormView → ElForm → FormLayout 套娃，多一个概念；**再次否决**为对外 API。栅格继续 `:layout`。夹心 slot 让用户写 `el-form` 同样否决为主路径（见 012 / 014）。
8. **把 FormItem 焊进 `component`（`epField`）**：接入税高，与「只吃公约数」一致地否决；Item 挂在 `createFormView`，见 ADR-012。

## 后果

- **正向**：根命名与「可纯 Context」一致；`v-model` 是真实写口；同 tick 多口写入不丢键；适配面锁在 span + 可选 Form/Item 公约数；奇怪布局有退出通道且主路径仍一层。
- **代价**：各 UI 库只能映射公约数能力；无 Row/Col 则无法启用托管布局；无 Item 则无表单项；无 Form 则无整表 `validate` 投影；`gutter` 为尽力透传；`v-model` 侧必须用 `ref`；有 Form 时 `validate` 走 FormView expose。
- **关联**：静态 Fields 与 Context 职责见 [ADR-004](./004-form-layout-and-context.md)；外部栅格与 span 优先级见 [ADR-007](./007-layout-adapter-and-span-priority.md)；Item / Form slot 见 [ADR-012](./012-input-item-and-rule-compile.md)；多口投影见 [ADR-014](./014-multi-vmodel-host-validation.md)。
