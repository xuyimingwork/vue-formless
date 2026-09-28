# vue-formless 函数式 props 配置

> 本文梳理 formless 中「可以用函数形式配置 props」的所有位置、函数签名、收到的快照参数（snapshot）以及求值 / 覆盖规则。以代码为准（`packages/vue-formless/src`），与 [`design.md`](./design.md) §10 / §11 / §12 / §16.3 对应。

---

## 1. 唯一载体：`HostProps<T>`

所有函数式 props 都由同一个类型承载（`shared/field-schema.ts`）：

```ts
export type HostProps<TFl> =
  | Record<string, unknown>
  | ((fl: TFl) => Record<string, unknown> | undefined)
```

即**同一配置位既可以写静态对象，也可以写「快照 → 宿主 props」的纯函数**。函数是映射器（mapper）：无副作用、按需重算，把 formless 归一化后的快照投影成某一层宿主组件要的 props。（`layout.props` 与 `form.props` 是例外：二者都没有 snapshot，只能是静态对象，见 §3.1 / §3.2。）

求值口径（`shared/props-overlay.ts` 的 `resolveProps`；`FormField` / `FormItem` 现内联同一逻辑）：

```ts
if (spec == null) return {}
if (typeof spec === 'function') return omitUndefined(spec(fl) ?? {})
return omitUndefined(spec)
```

- 函数返回 `undefined` / `null` 视为空对象。
- 返回值里值为 `undefined` 的键**被剔除**（`omitUndefined`），因此不会经 overlay 覆盖下层。
- 静态对象同样过一遍 `omitUndefined`。

叠加是**一层浅合并**（`{ ...默认, ...覆盖 }`，后面的层赢）。`props-overlay` 的 `mergeAttrs`（含「`undefined` 不覆盖」口径）与 `resolveProps` 待重构，当前各调用点直接展开各层。

---

## 2. 总览：哪些配置位支持函数式

| # | 配置位 | 类型 | 形参（snapshot） | 投影到 | 求值时机 |
|---|--------|------|------------------|--------|----------|
| 1 | `createFormView({ layout: { props } })` | `Record<string, unknown>`（仅静态，**不支持函数**） | —（无 snapshot） | LayoutView（formless 自带壳） | FormView 每次 render |
| 2 | `createFormView({ form: { props } })` | `Record<string, unknown>`（仅静态，**不支持函数**） | —（无 snapshot） | 宿主 Form（ElForm…） | FormView 每次 render |
| 3 | `createFormView({ item: { props } })` | `HostProps<FormFieldFormless>` | `FormFieldFormless` | 宿主 Item（ElFormItem…） | FormItem 每次 render |
| 4 | `createFormItem({ props })`（内核私有，被 #3 使用） | `HostProps<FormFieldFormless>` | `FormFieldFormless` | 宿主 Item | FormItem 每次 render |
| 5 | `createFormFields({ 字段: { props } })`（即 `FieldSchema.props`） | `HostProps<FormFieldFormless>` | `FormFieldFormless` | control（本格输入组件） | `FormFieldCore` 每次 render |
| 6 | `FormFieldCore` 的 `preset.props` / `control`（内核私有，由 #5 经工厂壳带入） | `HostProps<FormFieldFormless>` | `FormFieldFormless` | control | `FormFieldCore` 每次 render |

要点：

- #3 与 #4 是同一实现（`createFormView` 内部调 `createFormItem(options.item)`）。
- #5 与 #6 是同一实现：`FieldSchema.props` 由工厂壳作为 `preset.props` 传给 `FormFieldCore`，由 core 就着自己算出的快照求值。
- **只有这几处**；其中 `layout.props` / `form.props` 都是静态对象，不是函数位（`layout.props` 没有可投影的快照；写口按 no-prefix 规则以裸名 `modelValue` 落到宿主 Form，也没有快照）。`createLayoutView` 没有 `props` 配置位（它只有 `Row` / `Col` / `column`）；`layout.column` 已退场（密度改在 `layout.props` 里声明）。control 的静态 `formless`（`ControlFormless`）是**对象**，不是函数。

---

## 3. snapshot 的精确形状

`layout.props` 与 `form.props` 都没有 snapshot（见 §3.1 / §3.2），实际只有一份。

### 3.1 `layout.props`：无 snapshot（仅静态）

```ts
createFormView({ layout: { Row, Col, props: { column: 2, gutter: 16 } } })
```

- 没有快照形参：`layout.props` 只能是静态对象（`Record<string, unknown>`），直接作为 LayoutView 的默认 props。
- 密度写在 `layout.props`（或经标签 `:layout:column` 等覆盖）。
- 注意：LayoutView 的 `disabled` 由内核**固定**为 `!fl:layout`，永远覆盖 `layout.props` 的产出（内核拥有 `disabled`）。

### 3.2 `form.props`：无 snapshot（仅静态）

写口 `modelValue` 不是 FormView 的声明 prop，按 no-prefix 规则以裸名落到宿主 Form，因此没有可投影的快照——`form.props` 只能是静态对象（`Record<string, unknown>`）。宿主的口名与 `modelValue` 不同（如 ElForm 的 `model`）时，适配层包一层 `MyForm`：声明 `modelValue` 并转发给宿主，同时把宿主实例方法透出给 FormView 的 ref 代理。

### 3.3 `FormFieldFormless`（#3 / #4 / #5 / #6）

**归一化后的每格快照**：内核 wiring + extras。

```ts
export interface FormFieldFormless extends FieldSchemaExtras {
  /** 本格 v-model 口，下标与 prop 对齐；非字符串口留 undefined 占位 */
  model: (string | undefined)[]
  /** 本格位置，下标与 model 对齐；没有任何一层绑定时整体为 undefined */
  prop: (string | undefined)[] | undefined
  /** 组装位置（§8）；'auto' 已被解掉，只会是这三种之一 */
  field: 'wrap' | 'embed' | 'wrap-embed'
  /** 宿主 Item 壳开关（§9）：页默认 ← 格值，裸 attr 算 true，恒为布尔 */
  item: boolean
  /** extras：adapter 经 module augmentation 声明的键，如 label / validation */
  [extra: string]: unknown
}
```

- `model` / `prop` 是**本格合并结果的归一化数组**（`schema` 预设 ← 标签 `fl:*`，标签近的赢）。
- `prop` 数量不超过 `model`；多口一格在宿主 Item `prop` 装不下时，适配层自己决定不绑（`undefined`）。
- `item` 把「页级 `:fl:item` 默认 + 格上 `fl:item`」解成一个布尔，无论谁读快照都拿到同一个值（下方「归一化的边界」）。
- extras 由 `FieldSchema` 经 `declare module 'vue-formless'` 增强进来（`label` 等），所以快照里 `fl.label` 可用，标签上 `:fl:label` 也自动可用。

> `FormFieldFormlessRaw` 是**未归一化**的 `fl` 袋（声明形态），不是这里的函数形参；它是 `FormField` / `FormItem` 的 `fl` prop 与 `FormFieldCore.preset.fl` 的输入。

#### 归一化的边界：只有内核解释的键被归一

`FormFieldFormless` 的实现就是一次薄合并（`assembly/FormField.tsx`）：

```ts
const formless = computed(() => ({
  ...propFormless.value,   // 其余键逐字带过：component / unread props / 适配层 extras
  model: model.value,      // 归一化成 (string | undefined)[]
  prop: prop.value,        // 归一化成 (string | undefined)[] | undefined
  field: field.value,      // 归一化成 'wrap' | 'embed' | 'wrap-embed'
  item: item.value,        // 归一化成 boolean
}))
```

即：**四个内核键被归一化**（`model` / `prop` / `field` / `item`），这四个在类型里也显式声明；其余键（`component`、内核不读的 `props`、适配层 extras）**逐字透传**，只经索引签名 `[extra: string]: unknown` 可达。

`item` 的归一化口径（`design.md` §9）：

```ts
getAttrBoolean(true, 页 fl:item（经 FORM_FIELD_KEY 下来）, 格 fl.item)
```

- 近的赢：格上 `fl:item` > 页 `:fl:item` > 默认 `true`。
- 裸 attr（`fl:item`，值为 `''`）算 `true`。
- 结果恒为布尔，所以**同一份快照里的 `item` 对每个消费者都是同一个值**。

> 页级默认怎么下来的：FormView 在 `FORM_FIELD_KEY` 上多提供一个 `fl` 成员——**下行的页 `fl`，只装 FormField 会读的那部分**（类型就是 `{ item?: boolean }`；`fl:layout` / `fl:form` 是 FormView 自己的开关，它已自行消费、不下行）。FormFieldCore 在自己这一层把页默认与格值合并。它随 `access` / 壳资源一起透传，但只有最近的 FormView 回答，所以组合体内层格拿到的是同一个页默认。值是**原始 attrs 形态**（裸 `fl:item` 是 `''`），与格值一起交给 `getAttrBoolean` 归一。

于是「这一格是否挂宿主 Item」在两侧口径一致：

| 写法 | 快照里的 `.item`（control 的 `props` 与 `item.props` 同值） |
|------|--------------------------------------------------------|
| 不写 `fl:item` | `true`（页默认） |
| `fl:item`（裸 attr → `''`） | `true` |
| 页 `:fl:item="false"`、格上不写 | `false`（Item 壳不渲染，`item.props` 不跑） |
| `:fl:item="false"` | `false` |

---

## 4. 各配置位详解

### 4.1 `createFormView({ layout: { props } })` → LayoutView

```ts
createFormView({
  layout: {
    Row: ElRow,
    Col: ElCol,
    // 仅静态对象
    props: { column: 2, gutter: 16 },
  },
})
```

- 形参：**无**（没有 snapshot）。
- 投影：LayoutView 的 props（`disabled` 除外）。
- 覆盖顺序（`assembly/create-form-view.tsx`）：

```text
{ ...layout.props, ...页 layout:* 桶 }
// 之后 disabled={!layout} 再固定覆盖
```

即：工厂 `layout.props` 是默认值，标签 `:layout:column` 等 overlay 在其上，`disabled` 永远内核说了算。

### 4.2 `createFormView({ form: { props } })` → 宿主 Form

```ts
createFormView({
  form: {
    component: MyForm,             // MyForm 声明 modelValue → 宿主 ElForm 的 model
    props: { labelWidth: '80px' }, // 仅静态对象；标签裸名 attr 覆盖其上
  },
})
```

- 形参：**无**（没有 snapshot）。
- 投影：宿主 Form props（静态默认值）。
- 覆盖顺序：

```text
{ ...form.props（静态对象）, ...页 default 桶（裸名 modelValue 与监听都照落宿主） }
```

- `modelValue` **不是** FormView 的声明 prop：裸名 `modelValue` 会随 default 桶落到宿主 Form；`onUpdate:modelValue` / `onUpdate:model-value` 监听既被 FormView 用来推进写口，也一并落到宿主 Form（不再被剥掉）。宿主若要用它，自行声明 `modelValue`（如 `MyForm`）；口名不同就由这层适配组件映射。

### 4.3 `createFormView({ item: { props } })` → 宿主 Item

```ts
createFormView({
  item: {
    component: ElFormItem,
    props: (fl) => ({
      label: fl.label,
      prop: fl.prop?.length === 1 ? toDotPath(fl.prop[0]!) : undefined,
      rules: compileRules(fl),
    }),
  },
})
```

- 形参：`FormFieldFormless`。
- 投影：宿主 Item（ElFormItem）props；**宿主 `prop` 的编码是适配层私事**（点分路径 / 名字 / 不绑）。
- 覆盖顺序：`{ ...item.props(formless), ...item 桶 }`（item 桶 = `item:*` 通道，props 与监听同一袋；裸名不进 Item）。
- 只有 `fl.item` 为真且工厂绑了 `component` 时才渲染宿主 Item 并求值。
- `fl.item` 到这里已经是**归一化后的布尔**（页默认 + 裸 attr 已在 `FormFieldCore` 解掉），与 control 侧 `props` 看到的完全同值（§3.3）。`createFormItem` 不再自己合并页默认。

### 4.4 `createFormItem({ props })`（内核私有）

`createFormView` 内部用它组装 Item；与 #4.3 完全同型。`CreateFormItemOptions` 只有 `component` / `props` 两项——页级 `fl:item` 默认不在这一层，由 `FormFieldCore` 从 `FORM_FIELD_KEY.fl`（下行的页 `fl`，只有 `item`）取页默认后合并（§3.3）。

### 4.5 `createFormFields` / `FieldSchema.props` → control

```ts
const User = createFormFields({
  name: {
    label: '姓名',
    component: ElInput,
    props: (fl) => ({
      placeholder: typeof fl.label === 'string' ? `请填写${fl.label}` : undefined,
    }),
  },
  mobile: {
    component: ElInput,
    props: { placeholder: '11 位手机号' },   // 静态对象同样支持
  },
})
```

- 形参：`FormFieldFormless`（含本格合并后的 `model` / `prop` / `field` / `item` 与 extras）。
- 投影：本格 control 的 props（输入组件的默认 props）。
- 求值在 `FormFieldCore` 内、**看到快照之后**（`preset.props(formless)`）；不能在工厂创建期求值。`item` 与 `item.props` 侧同值（§3.3），所以「这一格是否挂宿主 Item」可以直接读 `fl.item === false`。
- control props 的完整合并（`FormFieldCore.controlAttrs`）：

```text
mergeProps(bind.events,  { ...preset.props(formless),  ...裸名 control 桶 },  bind.values)
```

参数顺序即融合顺序。外部两层（schema `props` ← 标签裸名）先按「覆盖」合成一层——同名监听如 `preset.props` 的 `onClick` vs 标签 `@click`，近的赢；`bind` 再交给 Vue 的 `mergeProps`（`events` 在前、`values` 在最后）：**写口监听（`onUpdate:xxx`）先跑、外部监听追加其后**，两个都触发；**数据键（`modelValue` 等）覆盖外部**（与 SFC 编译器 `v-model` + `@update:xxx` 同一实现）。

### 4.6 `FormFieldCore` 的 `preset.props` / `control`（内核私有）

```ts
props: {
  preset?: { fl: FormFieldFormlessRaw; props?: HostProps<FormFieldFormless> }
  control: HostProps<FormFieldFormless>   // Object 或 Function
  ...
}
```

- 工厂壳 `createFormField` 把 `schema.props` 作为 `preset.props` 传入；公开标签 `FormField` 无预设。
- `control` 桶既可能是静态对象（裸名 attrs），也可能是函数——由 `HostProps` 联合类型承载。求值逻辑同上。

---

## 5. 求值时机与覆盖纪律

| 维度 | 规则 |
|------|------|
| 求值时机 | 都在**渲染期**（FormView / FormItem / FormFieldCore 的 render 或对应 computed）按当前快照求值，非创建期一次性 |
| 快照来源 | `FormFieldFormless` 由 `FormFieldCore` 合并 `preset.fl` 与标签 `fl` 后现算（`model` / `prop` / `field` 均为 computed，懒读）；`layout.props` / `form.props` 无 snapshot |
| 快照形态 | `FormFieldFormless` 的 `model` / `prop` / `field` / `item` 是归一化的（这四者在类型里显式声明）；其余键（`component` / 内核不读的 `props` / extras）逐字透传，只经索引签名可达。`fl.item` 的页默认来源是 `FORM_FIELD_KEY.fl`——只装 `FormField` 会读的部分（`{ item?: boolean }`）（§3.3） |
| 返回值 | `Record<string, unknown> | undefined`；`undefined` 键被剔除，不参与覆盖 |
| overlay | 一层浅合并（`{ ...默认, ...覆盖 }`，后面的层赢）；`props-overlay` 的 `mergeAttrs` / `resolveProps` 待重构，当前 FormView / FormField / FormItem 都直接展开各层 |
| 语义源 vs 机械覆盖 | `fl:*` 是语义源（改它触发派生重算），`item:` / `layout-item:` / `layout:` / 裸名是机械值（直接落地）；二者共存是 source vs override，不是冲突 |
| 惰性输入 | `FormViewContext.access` 的 `access(prop)` 与 `FormFieldContext.fl` 接受 `MaybeRefOrGetter`（getter/ref/值），这是**惰性输入**而非「函数式 props」，不要与 `HostProps` 混淆 |

---

## 6. 最小示例（Element Plus 全量）

```ts
import { ElCol, ElForm, ElFormItem, ElInput, ElRow } from 'element-plus'
import { createFormFields, createFormView, type FormFieldFormless } from 'vue-formless'

declare module 'vue-formless' {
  interface FieldSchema {
    label?: string
  }
}

export const FormView = createFormView({
  layout: {
    Row: ElRow,
    Col: ElCol,
    // #1 仅静态：密度默认值
    props: { column: 2 },
  },
  form: {
    // #2 无 snapshot，仅静态；写口裸名 modelValue 由 MyForm 承接并映射到 ElForm model
    component: MyForm,
  },
  item: {
    component: ElFormItem,
    // #3 函数式：快照 → 宿主 Item props
    props: (fl: FormFieldFormless) => ({
      label: fl.label,
      prop: fl.prop?.length === 1 ? String(fl.prop[0]).replace(/\[(\d+)\]/g, '.$1') : undefined,
    }),
  },
})

export const User = createFormFields({
  name: {
    label: '姓名',
    component: ElInput,
    // #5 函数式：快照 → control 默认 props
    props: (fl) => ({ placeholder: `请填写${String(fl.label ?? '')}` }),
  },
})
```

---

## 7. 一览速查

```ts
type FormFieldFormless = {
  model: (string | undefined)[]
  prop: (string | undefined)[] | undefined
  field: 'wrap' | 'embed' | 'wrap-embed'
} & /* extras，如 label */

type HostProps<T> = Record<string, unknown> | ((fl: T) => Record<string, unknown> | undefined)
```

| 配置位 | 签名 |
|--------|----------|
| `createFormView.layout.props` | 静态对象（无 snapshot；不支持函数） |
| `createFormView.form.props` | 静态对象（无 snapshot；不支持函数） |
| `createFormView.item.props` | `(fl: FormFieldFormless) => props` |
| `createFormItem.props`（私有） | `(fl: FormFieldFormless) => props` |
| `FieldSchema.props` / `createFormFields({ x: { props } })` | `(fl: FormFieldFormless) => props` |
| `FormFieldCore.preset.props` / `control`（私有） | `(fl: FormFieldFormless) => props` |

两条口径提醒：

- `FormFieldFormless` 类型里显式声明的是**内核归一化的四个键**（`model` / `prop` / `field` / `item`）；`component` / 内核不读的 `props` 只在索引签名下，类型是 `unknown`，需要自己窄化。
- `item` 已在 `FormFieldCore` 归一到布尔（页默认 ← 格值，裸 attr 算 `true`），**control 侧与 Item 侧同值**——不再有「两处口径不同」这一说。详见 §3.3。
