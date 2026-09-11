# vue-formless 设计文档

> 本文件是 vue-formless 的**完整设计规格**，是代码实现的唯一权威依据。历史决策记录见 [`docs/adr/`](./adr/README.md)；当 ADR 与本文件冲突时，以本文件为准（本文吸收了 ADR-001 ~ ADR-021 的结论，并做了收束：`LayoutCell → LayoutItem`、移除 `FormItem` 概念、`FormField` 上位、绑定下沉并输出 `$bindings`）。

---

## 1. 概述与设计哲学

vue-formless 是一套**与 UI 库解耦的表单框架**。它不提供表单控件，而是提供把「任意输入组件 + 任意 UI 库的 Form/FormItem/Row/Col」组装成可写表单的**粘合层**。

核心张力：**Schema 复用 vs Template 定制**。结论是**不做一个全量 JSON 布局引擎**，而是取平衡——用「页级域表 + 命名空间 Field + FormView/Context」表达结构，布局与定制仍留在模板里。

三条不变的原则：

1. **控件主角**：可摆放单元是 Field（`<User.Name />`），键是控件名（`agency`），不是 DTO 字段名（`agencyId`）。
2. **formless 只跟自己的壳交互**：formless 内核只见 `LayoutView` / `LayoutItem` / 宿主 `Item`，不见 Row/Col；Row/Col 是布局包内部的事。
3. **写口就是 v-model**：FormView 以 Vue 常规 `v-model` 接入可写状态，不是 `v-model:fl` 或 `fl.modelValue`。

---

## 2. 词表

两套平行叙事（布局 vs 表单）：

```text
布局                表单
LayoutView          FormView
LayoutItem          FormField
```

| 名字 | 就是 | 不是 |
|------|------|------|
| **LayoutView** | 一行栅格窗口（Row、格登记、`disabled`） | 表单 |
| **LayoutItem** | 一格 Col + blank | 表单项、字段 |
| **FormView** | 表单根：v-model、可选宿主 Form、页级 LayoutView | 格子 |
| **FormField** | 一格表单 UI 兼绑定单元：`LayoutItem` + 可选 ElFormItem + Input（模板上的 `<User.Name />` 或裸 `<FormField>`） | 数据字段、HTML input、MUI FormControl |
| **Input** | schema/工厂的 `component`，只谈 v-model | 格、壳 |
| **Form** | 仅宿主 ElForm | 内核组件名 |
| **Item** | 仅宿主 ElFormItem（label/error） | 内核组件名 |

- HTML 的 form control = Input；MUI FormControl ≈ FormField。
- 公开作者面：`FormView`、`FormField`、`createFormFields`。工厂产出的 `<User.Name />` 就是一颗 FormField。
- 中文叙事用「表单域 / 控件」，不写「接口字段」。

### 更名表（本文为最终态）

```text
FormCell            → FormField（FormItem 概念移除，合并进 FormField）
FormCellProps       → FormFieldProps
FormCellComponent   → FormFieldComponent
FormCellTagProps    → FormFieldTagProps
FormCellSlotProps   → FormFieldSlotProps
FormViewItemProps   → FormFieldTagProps（保留 deprecated 别名）
LayoutCell          → LayoutItem
LayoutCellProps     → LayoutItemProps
useFormCell         → 删除（由 `fl:model` 取代）
FORM_CELL_PORT_KEY  → 删除
bindingForPort      → 内核私有（由 `fl:model` 取代）
```

`FormCell → FormField` 的理由：格子（cell）与组装件（field）本就是一颗组件，拆成 `FormCell` / `FormField` 两层徒增词表；合并后 `FormField` 是唯一格子单位，`item` 一词只保留给宿主 ElFormItem。`LayoutCell → LayoutItem` 的理由：cell 指「一格」，item 指「一项」；基于 `span` 的栅格逻辑里「一项」更准。同时让 `cell` 一词彻底退出 formless 词表，避免「FormCell 与 LayoutCell 哪个是 cell」的歧义。

---

## 3. 架构分层

两个包：

```
packages/
  layout/          栅格引擎（UI 无关）：LayoutView + LayoutItem + calculate-layout
  vue-formless/    表单粘合层：FormView + FormField + 工厂 + 绑定
```

`vue-formless` 依赖 `@vue-formless/layout`，并把 layout 的导出转出口（`createLayoutView`、`LayoutItem`）。

分层职责：

- **layout**：只管栅格——行窗口、格登记、`span`/`take`/`place`/`show` 归一化、空白格计算。不知道表单、v-model、Item。
- **formless**：把参数分给宿主 Form/Item/Input 与 LayoutItem；把 v-model 归集到 FormView；按配置挂树。

---

## 4. 组件模型：宿主 + 包裹关系

### 4.1 宿主

每个 formless 组件包一个 UI 库组件：

| 组件 | 宿主（以 Element Plus 为例） |
|------|------------------------------|
| FormView | ElForm |
| FormField | ElInput（及同类的输入组件） |

宿主组件由 `createFormView` 的工厂参数绑定，不是硬编码。未绑定宿主的组件退化为「只渲染 formless 壳」。

### 4.2 包裹关系（由外到内）

```text
FormView   包裹  ElForm、LayoutView
FormField  包裹  LayoutItem、ElFormItem、ElInput、（LayoutView 仅 wrap-embed 内层）
```

组件树 = 概念树 = 文件树：

```text
FormView
 └─ LayoutView（页级窗口）
     ├─ FormField → LayoutItem → ElFormItem? → Input
     └─ FormField → LayoutItem → ElFormItem? → Input
```

注意：`LayoutView` 只在 `fl:field="wrap-embed"` 时作为**内层窗口**由 FormField 塞进外层格（ElFormItem 之内），不是 FormField 自身无条件包裹。

---

## 5. 配置通道（前缀体系）

由于组件除了宿主还包了其它组件，属性需要按前缀路由到不同目标。

### 5.1 总规则

> **无前缀 = 这颗组件的主宿主；`前缀:` = 你要配置的那个 formless 侧子组件。**

| 前缀 | 目标组件 | 说明 |
|------|---------|------|
| 裸名（无前缀） | 主宿主 | FormView→ElForm / FormField→ElInput |
| `item:` | 宿主 ElFormItem | FormField 上，越过 ElInput 去够宿主 Item 壳 |
| `layout-item:` | LayoutItem | FormField 上 |
| `layout:` | LayoutView | FormField 上（wrap-embed 内层）；FormView 上（页级） |
| `fl:` | formless 内核 | 各组件自身的语义配置 |

读法：**前缀是「配置谁」，裸名是「配置主子」。**

### 5.2 前缀剥皮（一次）

**FormField** 剥（一次，不再剥两遍）：

```text
fl:*           → 自消费（fl:field 决定组装树；fl:model/fl:prop 建立绑定）
item:*         → 去前缀 → ElFormItem（宿主 Item 壳）
layout-item:*  → 去前缀 → LayoutItem
layout:*       → 去前缀 → LayoutView（仅 wrap-embed 内层）
裸名            → 丢 ElInput
```

`layout-item:span` 不写 `item:layout-item:span`：两级前缀连写太长，`layout-item:` 已唯一指 LayoutItem。

### 5.3 各组件可吃的前缀

| 组件 | 裸名 | `layout:` | `layout-item:` | `item:` | `fl:` |
|------|------|-----------|----------------|---------|-------|
| FormView | ElForm | 页窗口 | — | — | ✓ |
| FormField | ElInput | 仅 wrap-embed 内层 | 本格 | 宿主 Item 壳 | ✓ |

### 5.4 主宿主缺席时裸名消失

完整规则两句：**裸名给主宿主；主宿主没渲染，裸名就丢掉（不报错、不转发）。**

- FormView：`fl:form` 关（`'auto'` 下嵌套）或无宿主 Form 时，裸名不进任何元素。
- FormField：`component` 为空时 `input = null`，裸名一起丢（slot 模式手写 Input）。
- FormField：`fl:item=false` 或工厂没绑 Item 时，`item:*` 整包不用（宿主 ElFormItem 没渲染）。

想在主宿主可能缺席时仍生效，用显式前缀（`item:` / `layout-item:` / `layout:`）。

---

## 6. `fl:` 内核键

| 键 | 值域 | 作用 |
|----|------|------|
| `fl:model` | `string \| string[]` | 本格认领的 v-model 口（§7） |
| `fl:prop` | `string \| string[]` | 绑定位置：FormView 根到叶子的路径（§7） |
| `fl:item` | `boolean` | 是否渲染 ElFormItem 壳（§9） |
| `fl:field` | `'embed' \| 'wrap' \| 'wrap-embed'` | FormField 组装模式（§8） |
| `fl:layout` | `boolean` | 是否渲染 LayoutView（§9） |
| `fl:form` | `'auto' \| boolean` | 是否渲染 ElForm（§9） |

语义轴（重要）：**`fl:*` 是语义源，改它触发派生重算；`item:` / `layout-item:` / `layout:` / 裸名是机械值，直接落地不触发重算。**

例：`fl:label` → 适配同时算 Item `label` 与空校验文案；`item:label` → 直接盖宿主 Item 的 `label`。二者共存是「source vs override」，不是冲突。

---

## 7. 绑定模型：model / prop / `$bindings`

### 7.1 model 与 prop 的定义

- **`prop`**：某个输入组件的输入/输出要绑定到 FormView v-model 的哪个属性（位置）。从根到叶子，可含 `buyers[0].name`。
- **`model`**：输入组件提供的哪些属性可做 v-model 绑定（口名）。默认 `'modelValue'`；多口如 `['start', 'end']`。

两者是一体两面，配对使用：`model[i] ↔ prop[i]` 按下标对齐。`prop` 数量不得超过 `model` 数量。

### 7.2 归属：都在 FormField 上

`model` / `prop` 的处理统一落在 **FormField** 上——因为「从 FormView 读值、按口写回」这步封装在 FormField，且允许用户手写 `<FormField>` 独立建立绑定。

**`fl:model` 永远表示「这一个 FormField 认领哪个/哪些口」**，区别只在「口清单 + 口到 prop 的映射」从哪来：

| 场景 | 口清单来源 | `fl:model` 语义 |
|------|-----------|----------------|
| namespaced Field 内（`<User.Xxx>`） | widget 静态 `formless.model`（锁在 component，标签不能覆盖） | **选口**：从已声明清单里挑一个，位置按 `model[i] ↔ prop[i]` 下标对齐取 |
| 临场格 `<FormField>` | 无清单 | **声明口**：直接给口名，`fl:prop` 直接给位置 |

两种场景产物相同：`{ [port]: value, 'onUpdate:' + port: fn }`——同一个动作、信息源不同。

规则：

- widget 的 `model`（口名）仍锁在 component/widget 静态 `formless` 上；`<User.Xxx>` 上的 `fl:model` **非法**。
- Field 内 `fl:model` 必须是已声明口的子集，凭空声明口非法（throw）。
- `fl:prop` 允许空值、禁止空字符串（空字符串是非法位置，不能用来盖 schema）。

### 7.3 `$bindings`：FormField 的 slot 输出

FormField 在 default slot 内输出绑定对象，命名为 **`$bindings`**（复数、扁平、可一把 `v-bind`）：

```vue
<FormField fl:model="start" fl:prop="extra">
  <template #default="{ $bindings }">
    <ElInput v-bind="$bindings" />
  </template>
</FormField>
```

`$bindings` 是扁平对象，多口时直接摊开：

```ts
$bindings = {
  start: model.xxx,
  'onUpdate:start': fn,
  end: model.yyy,
  'onUpdate:end': fn,
}
```

FormField 内部是宿主 ElFormItem 的 default slot 透传，`$` 前缀用于和宿主库未来可能的 slot props 撞名隔离：

```vue
<ElFormItem>
  <template #default="slotProps">
    <slot v-bind="{ ...slotProps, $bindings }" />
  </template>
</ElFormItem>
```

`$bindings` 本质是 `applyControlBinding(model, binding, update)` 的产物（见 §14）。现有实现里的 `field` 即其前身——本次是**改名 + 加 `$` 前缀**，不是新概念。

### 7.4 混用场景

`FormField` 与命名空间 Field 可混用——两者就是同一颗组件（绑定都落在 FormField）；临场 `<FormField>` 用 `:component` 或 slot 指定 Input：

```vue
<FormView>
  <User.Name />
  <User.Age />
  <FormField fl:prop="extra" :component="ExtraInput" />
</FormView>
```

页面直接 `<FormField><Input v-model="form.xxx" /></FormField>` **禁止**（绕过了 formless 的写回）；必须 `fl:prop` + `:component`（或 slot `{ $bindings }`）。

---

## 8. 组装模式：`fl:field`

「是否渲染 ElFormItem」与「FormField 自身组装成什么树」是**两根正交轴**，分别由 `fl:item` 与 `fl:field` 表达。

`fl:field` 三态：

| `fl:field` | 树 |
|-----------|----|
| `'wrap'` | `FormField → LayoutItem → ElFormItem? → Input` |
| `'embed'` | `FormField → Input`（内部 FormField 进**页** LayoutView） |
| `'wrap-embed'` | `FormField → LayoutItem → ElFormItem? → LayoutView → FormField…` |

```text
wrap:
  FormField
    LayoutItem
      ElFormItem?
        Input

embed:
  Input               ← FormField 只渲 Input，登记进页 LayoutView

wrap-embed:
  FormField             ← 外层格；:layout-item:span / :layout-item:place
    LayoutItem
      ElFormItem?       ← 这一格的 item（分组 label）
        LayoutView      ← 内层窗口；:layout:*
          FormField → Input
          FormField → Input
```

规则：

- 省略 = `'wrap'`。
- **整颗替换**（标签 > widget > schema；近的赢），不做 `wrap`∪`embed` 智能合并。
- 内核 `switch (field)`，配错就按错的树渲（套娃、裂格、少壳），不补救。
- `:layout:column` / `:layout:gutter` 只对 `'wrap-embed'` 的内层 LayoutView 有效；打在 `'wrap'` 叶子上忽略（可 warn）。
- 内层 LayoutView **不**继承页 `fl:layout` / `:layout:column` / 工厂 `layout.props`：省略则用 LayoutView 自身缺省。

widget 静态 `formless` 里的组合身份：

```ts
defineOptions({
  formless: { field: 'embed', model: ['start', 'end'] },
})
```

分组壳须显式第三种：

```vue
<Range.DateRangeTwo :fl:field="'wrap-embed'" layout-item:span="max" />
```

---

## 9. 壳开关：`fl:item` / `fl:layout` / `fl:form`

三个「要不要渲染某层壳」的开关：

| 键 | 值域 | 语义 | 默认 |
|----|------|------|------|
| `fl:item` | boolean | 这一格是否渲染 ElFormItem（去 label/error 但保留格子） | 工厂绑 Item 时 `true` |
| `fl:layout` | boolean | 是否渲染 LayoutView（译成 `disabled = !fl:layout`） | `false` |
| `fl:form` | `'auto' \| boolean` | 是否渲染 ElForm | `'auto'`（根开、嵌套关） |

- `fl:item` 合并：标签 `fl:item` > schema/widget `item` > 页 `FormView :fl:item`。没写 ≠ `true`（跟页）。
- `fl:item=false` 只是「有格、无 label/error」，**不是**「不要 FormField」。
- `fl:layout` 是 formless 语义（是否启用栅格），内核翻转成 LayoutView 的 `disabled`。
- `fl:form='auto'`：根 FormView 开、嵌套 FormView 关；显式 `true`/`false` 赢。

---

## 10. `createFormView`：绑定宿主壳

`createFormView(options)` 一次性绑定宿主 Form/Item 与 Row/Col，返回 FormView 组件。

### 10.1 参数

```ts
interface CreateFormViewOptions {
  layout?: {
    Row: Component
    Col: Component
    props?: (fl: LayoutFl) => Record<string, unknown>   // 传给 LayoutView
  }
  form?: {
    component: Component
    props?: (fl: FormFl) => Record<string, unknown>      // 传给 ElForm
  }
  item?: {
    component: Component
    props?: (fl: ItemFl) => Record<string, unknown>      // 传给 ElFormItem
  }
}
```

三个 `props` **统一为函数形式**（映射器：`snapshot → 宿主 props`，纯函数、无副作用）。snapshot 类型：

```ts
type LayoutFl = { layout: boolean }        // 是否启用栅格（未翻转前的语义侧）
type FormFl   = { modelValue: unknown }    // 写口数据
type ItemFl   = { fieldKey: string; binding: ResolvedControlBinding; getValues: () => unknown[] } & FieldSchemaExtras
```

各自 snapshot：

| `props` 函数 | snapshot（形参） | 投影到 |
|-------------|-----------------|-------|
| `layout.props` | `{ layout: boolean }` | LayoutView（formless 自己，`disabled` 名字固定） |
| `form.props` | `{ modelValue }` | ElForm（host，`modelValue → model` 随库变） |
| `item.props` | `{ fieldKey, binding, getValues, ...extras }` | ElFormItem（host，`label → label`、`binding → prop` 随库变） |

- `layout.column` 退场，密度改在 `layout.props` 里声明（或经标签 `:layout:column` 覆盖）。
- `layout.props` 函数形式唯一的内建动作是 `fl:layout → disabled` 极性翻转（LayoutView 无宿主投影，不像 form/item 要翻译库各自的 prop 名）；为形式统一保留函数签名。

### 10.2 示例（Element Plus）

```ts
export const FormView = createFormView({
  layout: {
    Row: ElRow,
    Col: ElCol,
    props: (fl) => ({ disabled: !fl.layout }),
  },
  form: {
    component: ElForm,
    props: (fl) => ({ model: fl.modelValue }),
  },
  item: {
    component: ElFormItem,
    props: (fl) => ({
      label: fl.label,
      prop: fl.binding.props[0],
      rules: compileRules(fl),
    }),
  },
})
```

### 10.3 FormView 的 props

```ts
interface FormViewProps {
  modelValue?: unknown          // 写口（声明 prop，不落宿主 Form）
  'fl:layout'?: boolean
  'layout:column'?: number      // 本页 LayoutView 密度
  'fl:form'?: 'auto' | boolean
  'fl:item'?: boolean
}
```

- `modelValue` 是声明 prop；`onUpdate:modelValue` 监听从 attrs 读取，二者**都不落到宿主 Form**。
- 其它 `:layout:*`（如 gutter）走 attrs 落到宿主 Row。
- FormView `expose` 一个 Proxy，把宿主 Form 实例的方法透出（`validate` 等）。

### 10.4 FormView 提供的 Context

`provide(FORM_VIEW_KEY, ...)`：

| 字段 | 含义 |
|------|------|
| `model` | 当前 FormView 的 `modelValue`（父快照，勿改） |
| `update(prop, value)` | 上报字段写入 |
| `Item` | 宿主 ElFormItem（未绑则为 `undefined`） |
| `itemProps` | 宿主 Item 的默认 props（`props` 函数） |
| `item` | 本层 `:fl:item` |
| `LayoutView` | 工厂绑定的 LayoutView（wrap-embed 用它建内层窗口） |

**不** provide：`wrap` 函数、页 `layout` 开关、工厂 `column`。

---

## 11. `createFormFields`：页级域表

`createFormFields(schema, options?)` 声明**语义输入簇**（不是表单 schema），产出 PascalCase 的 Field 组件表。

```ts
const User = createFormFields({
  name:    { component: ElInput },
  age:     { component: ElInputNumber, model: 'modelValue', prop: 'age' },
  timeRange: {
    component: DateRangeTwo,
    model: ['start', 'end'],
  },
})
```

模板：

```vue
<FormView v-model="form">
  <User.Name />
  <User.Age :fl:prop="'buyers[0].age'" />
  <User.TimeRange />
</FormView>
```

### 11.1 FieldSchema

```ts
interface FieldSchema {
  component?: Component        // 输入 widget（只接 Input）
  props?: HostProps<ItemFl>    // 输入默认 props（静态或快照函数）
  model?: string | string[]    // v-model 口名（默认 'modelValue'；锁在 component）
  prop?: string | string[]     // 位置（默认 = fieldKey；:fl:prop 可盖）
  item?: boolean               // 这一格 ElFormItem 开关
  field?: 'embed' | 'wrap' | 'wrap-embed'  // 组装模式
  // ...extras（label / validation 等，经 module augmentation 扩展）
}
```

`component` 只接输入；`props` / `model` / `prop` / `item` / `field` 是内核键；其余键是 **extras**（`label`、`validation`…），进 Item/Input 转化函数的 snapshot。

### 11.2 覆盖来源（近的赢）

四种来源，**近的赢、`undefined` 不算写过**：

```text
工厂 options < schema / widget 静态 formless < 标签（template attrs）
```

- `field` 三态**整颗替换**，不做字段级智能合并。
- `model` 锁在 component/widget，标签不能覆盖（v-model 口是身份）。
- `prop` 有值才盖 schema。

---

## 12. 投影与覆盖：props 函数 + overlay

### 12.1 overlay 链

每层宿主的最终 props 由 `overlayProps(...layers)` 叠加，**后面的层赢、`undefined` 不覆盖、空字符串是值**：

```text
FormView:   overlay(form.props(snapshot), hostAttrs（剥掉 v-model 端口）)
FormField（宿主 Item 壳）: overlay(item.props(snapshot), { itemAttrs, inputAttrs }, itemListeners)
FormField（Input）:        overlay(cluster.props(snapshot), schema.props(snapshot), inputAttrs（剥掉 v-model 端口）)
```

### 12.2 语义源 vs 机械覆盖

| 通道 | 语义 | 例 |
|------|------|-----|
| `fl:*` | 语义源：改它触发派生重算 | `fl:label` → 同时算 Item `label` 与空校验文案 |
| `item:` / `layout-item:` / `layout:` / 裸名 | 机械值：直接落地，不触发重算 | `item:label` 直接盖宿主 Item `label` |

---

## 13. 布局包：LayoutView / LayoutItem / 24 栅格

### 13.1 `createLayoutView({ Row, Col, column? })` → LayoutView

```ts
interface LayoutViewProps {
  disabled?: boolean
  column?: number
}
```

- `disabled`：不渲染 Row，直接透传 children（表单布局关闭）。
- `column`：窗口列数；`mergeColumn(工厂 column, props.column)` 取后一个非空。
- 内部用 `useDomChildren` 观测真实 DOM 顺序，格按 DOM 序登记。
- `LayoutItem` 通过 `inject(LAYOUT_VIEW_KEY)` 拿 `register(span, place)`，返回 `{ span, blank, ref, place, Col, disabled }`。

### 13.2 `LayoutItem`（原 LayoutCell）

```ts
interface LayoutItemProps {
  span?: ColSpanRaw      // '1'..'24' | '1x'..'Nx' | 'max' | number
  place?: ColPlace       // 'auto' | 'start' | 'end'
  take?: 'rest'          // 落地行占用（ADR-018；省略 = span）
  show?: 'auto' | 'required'  // 窗口折叠必展示（ADR-019；省略 = 'auto'）
}
```

- `span` 只决定宿主 Col 实宽；`place` 决定对齐；`take` 决定纸带占用；`show` 决定窗口折叠是否必展示。
- 归一化：`normalizeColSpan(raw, column)`（`1x` = `24/column`，`max` = 24，clamp 1..24）；`normalizeColPlace`。
- 渲染：`LayoutBlanks(before)` + `HostCol` + `LayoutBlanks(after)`，`disabled` 时直接透传 children。

### 13.3 布局算法（`calculate-layout`）

- 先切可见集（有 `row` 窗口时：`budget = row*24`，先扣 required，再按 DOM 序灌 auto）。
- 再 `calculateLayout`（paper-tape）：按 `place`+`span` 落地，`take='rest'` 再拉到落地行行尾。
- `calculateBlanks` 算前后空白格。

栅格模数 `GRID_TOTAL = 24`；缺省 `DEFAULT_COLUMN = 1`。

---

## 14. 数据流：读与写

### 14.1 读（FormView → Input）

```
FormView.modelValue
  → getIn(model, prop)                          // 每个口按 prop 读值
  → applyControlBinding(model, binding, update)
      = { [port]: value, 'onUpdate:'+port: fn }  // 即 $bindings
  → v-bind 到 Input 的 v-model 口
```

### 14.2 写（Input → FormView）

```
Input 触发 update:port(value)
  → applyControlBinding 的 fn：update(prop, value)
  → FormView.update(prop, value)
      → createModelWriter：pending 累积，nextTick 合并
      → setIn(model, prop, value)  // 不可变写：克隆沿途层级
      → emit(更新后的整对象) → onUpdate:modelValue
```

关键性质：

- **不可变**：`setIn` 永不 mutate 源对象，克隆沿途每一层（数组 `[...arr]`、对象 `{...base}`）。
- **同 tick 合并**：多个字段同 tick 写入合并成一次 emit。
- **嵌套继承**：嵌套 FormView 无 v-model 时继承祖先的 `model`/`update`，写直接转发到祖先 writer（所有层同 tick 合并到根）。

### 14.3 多口

`model: ['start','end']` + `prop: ['a','b']` 时，`applyControlBinding` 产出 `{ start, onUpdate:start, end, onUpdate:end }`。Field 内 `fl:model='start'` 只取 `models.indexOf('start')` 对应下标的口 + prop，形成单口 `$bindings`。

---

## 15. model path：getIn / setIn / parsePath

- `getIn(root, path)`：不可变读，缺中间节点读作 `undefined`，不 throw。
- `setIn(root, path, value)`：不可变写，克隆沿途；非法/空 path 原样返回 `root`。
- `parsePath(path)`：路径语法解析。

path 语法：

```text
path     := segment ('.'? segment)*    一个可选 '.'；前导/尾随/连续 '.' 非法
segment  := name | '[' index ']' | '[' quoted ']'
name     := [a-zA-Z_$0-9][a-zA-Z0-9_$]*
index    := [0-9]+                     数组下标，仅括号形式
quoted   := '"' keychar* '"' | "'" keychar* "'"   转义 '\'
```

例：`name`、`buyers[0].name`、`[2].title`、`map["x.y"].title`。

- 数组项仅用 `[0]` 寻址；`map.0.name` 或 `map["0"]` 是**对象键**（数字键 map 可达）。
- 读取仅限**自有属性**（`hasOwnProperty.call`），原型链不是数据（`constructor`/`__proto__` 读作 undefined）。
- `parsePath` 失败返回 `undefined`（不 throw），调用方负责处理。

---

## 16. 内部结构

### 16.1 文件清单（`packages/vue-formless/src`）

| 文件 | 职责 |
|------|------|
| `FormView.tsx` / `create-form-view.ts` | 根：v-model、可选 Form、页级 LayoutView、provide context |
| `FormField.tsx`（原 `FormCell.tsx`） | 一格 + 组装：LayoutItem + 可选 ElFormItem + Input + `$bindings`；剥 attrs 一次、switch(field)、v-model 归集 |
| `create-form-fields.ts` | 域表工厂，产出 PascalCase Field 标签 |
| `injection-keys.ts` | `FORM_VIEW_KEY`、`FIELD_RUNTIME_KEY`（删 `FORM_CELL_PORT_KEY`） |
| `context.ts` | `useFormContext()` |
| `control-model.ts` | `resolveControlBinding` / `applyControlBinding` / `bindingForPort`（转私有） |
| `model-path.ts` / `parse-model-path.ts` | 不可变 get/set + 路径解析 |
| `overlay-props.ts` | `resolveProps` / `overlayProps` |
| `split-fallthrough.ts` | 前缀剥皮：`fl:`/`item:`/`layout:`/`layout-item:`/裸名 |
| `fl-config.ts` | schema extras、widget formless、shell keys、`stripPortBindings` |
| `item-adapter.ts` | `FieldSchema` / `ItemFl` / tag props 类型 |
| `use-form-view-model-value.ts` | 写口归集 + `createModelWriter` |
| `case.ts` | `camelToPascal` / `pascalToCamel` |
| `widget-props.ts` | widget 公开 props 推断（v-model 口剥离） |
| `index.ts` | 公开导出 |

### 16.2 注入键与 Context

```ts
interface FormContext {
  model: unknown
  update: (prop: string, value: unknown) => void
  Item?: Component
  itemProps?: HostProps<ItemFl>
  item: boolean
  LayoutView: Component
}

interface FieldRuntime {
  fieldKey: string
  binding: ResolvedControlBinding
  extras: Record<string, unknown>
  item?: boolean
}
```

- `FIELD_RUNTIME_KEY`：namespaced Field 提供，子孙 FormField 读它拿绑定（组合体切片，如 `embed` 下 `<FormField fl:model="start">`）。
- FormField 无 `FieldRuntime` 时（裸 `<FormField>` 或工厂顶层格），从 `fl:prop` / `fl:model` 自解析绑定。

### 16.3 FormField 的运行时装配

```
setup:
  provide(FIELD_RUNTIME_KEY, runtime)
  useFormlessProps(attrs)  → { props, layoutProps, layoutItemProps, formlessProps }
render:
  binding = resolveControlBinding(fieldKey, { model: lockedModel, prop: lockedProp }, { prop: tagFl.prop })
  field = resolveFieldMode(tagFl['field'], internalField, schema['field'])
  mergedProps = overlay(cluster.props(snapshot), schema.props(snapshot), stripPortBindings(inputAttrs, models))
  modelBindings = applyControlBinding(model, binding, update)
  input = h(widget, { ...mergedProps, ...modelBindings }, inputSlots)   // widget = component 或 slot 手写
  switch (field): embed → input；否则 h(LayoutItem, cellAttrs, () => (itemOn ? h(ElFormItem, itemProps, () => input) : input))
    wrap-embed 时 cellBody = h(LayoutView, {...layoutAttrs}, () => input)
```

---

## 17. 类型系统

- `NamespacedFields<S>`：把 `Record<string, FieldSchema>` 映射成 `{ Name: FormFieldComponent<...> }`（PascalCase key）。
- `WidgetTagProps<Def>`：widget 公开 props 剥掉 v-model 口（`LockedVModelKeys`），避免 `<User.Name>` 上写 `modelValue` 覆盖绑定。
- `ComponentPublicProps<C>`：从 Vue 构造器/函数组件推断 `$props`。
- `FlExtraProps<T>`：`label` → `'fl:label'` 的可选标签 props。
- `FormFieldProps` / `FormFieldTagProps`：内核 `fl:`/`layout:`/`layout-item:` 键 + extras 推导。

---

## 18. 扩展与适配（module augmentation）

extras（`label`、`validation` 等）不写死在内核，经 module augmentation 扩展：

```ts
declare module 'vue-formless' {
  interface FieldSchema {
    label?: string
    validation?: ValidationSpec
  }
}
```

- 内核只读核心键（`component`/`model`/`props`/`prop`/`item`/`field`），其余 schema 键与 `fl:*` extras **不解释**，进 Item/Input 转化函数的 snapshot。
- `ItemFl` / `FormFieldProps` / `FormFieldTagProps` 从 extras 推导（`label` → snapshot `label` 与 `:fl:label`）。
- widget 静态 `formless` 通过 `ComponentCustomOptions.formless` 声明（`model`/`item`/`field`/`prop`）。

---

## 19. 公开 API 面

```ts
// 工厂
createFormView(options) → FormView
createFormFields(schema, options?) → NamespacedFields

// 组件
FormView
FormField
LayoutView（createLayoutView 产出）
LayoutItem

// 类型
FormViewProps, FormViewComponent, CreateFormViewOptions
FieldSchema, FormFieldProps, FormFieldComponent, NamespacedFields
ItemFl, FieldSchemaExtras, WidgetFormless
ControlProp, ControlVModel, ResolvedControlBinding
HostProps, ColSpanRaw, ColPlace

// 工具
useFormContext, getIn, setIn, parsePath
overlayProps, resolveProps
resolveControlBinding, applyControlBinding
camelToPascal, pascalToCamel
```

移除：`useFormCell`、`FORM_CELL_PORT_KEY`、`bindingForPort`（转内核私有）。

---

## 20. 实现要点与边界

1. **prefix 剥一次**：FormField 剥一次，变成宿主 Item 壳 / Input / 内层 LayoutView 的真 props；不再剥两遍。
2. **formless 内核不预声明** `label` / `validate`（这些是 extras）。
3. **`fl:span` 丢弃**（开发态 warn）：宽走 `layout-item:span`。
4. **Col 只吃数字 `span`、Row 只吃 `gutter`**：`:fl:span` 已否。
5. **页面 `<FormField>` 临场格**可写 `fl:item` / `fl:prop` / `fl:model` / `:component`；格上宽用 `layout-item:*`。
6. **不公开** `FormView.Layout` / `FormView.Item`；**不开放**自定义 merge / 自定义前缀；**没有** `form:` 前缀（当前无需从字段够到宿主 Form）。
7. **组合体只写身份**：`formless: { field: 'embed', model: [...] }`；分组壳显式 `'wrap-embed'`。

---

## 21. 落地顺序建议

1. 词表与类型：`FormField` 上位（`FormItem` 移除）、`fl:field`、通道常量改名。
2. `split-fallthrough.ts`：前缀常量与 bag 改名（`row:`→`layout:`、`col:`→`layout-item:`）。
3. `FormCell.tsx` → 并入 `FormField.tsx`：绑定下沉、`$bindings` 输出、支持 `:component`、删 `useFormCell`。
4. `create-form-view.ts`：`layout.column` → `layout.props`（函数形式）。
5. `FormField.tsx`：`switch(field)` 键名跟进。
6. layout 包：`LayoutCell` → `LayoutItem`。
7. 测试 / playground / README / 旧 ADR 交叉标注。
