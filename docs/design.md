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
| **FormField** | 一格表单 UI 兼绑定单元：`LayoutItem` + 可选 ElFormItem + control（模板上的 `<User.Name />` 或裸 `<FormField>`） | 数据字段、HTML input、MUI FormControl |
| **control** | 被 FormField 消费的那颗输入组件：schema `component` / `fl:component` / `:component` 的值，只谈 v-model | 格、壳、宿主库的 FormControl |
| **Form** | 仅宿主 ElForm | 内核组件名 |
| **Item** | 仅宿主 ElFormItem（label/error） | 内核组件名 |

- **术语约定：被 FormField 消费的 component 一律叫 control。** `widget` / `Input` 不再是它的同义词；`component` 只作为键名出现（schema key / `fl:component` / `:component`），不作名词。
- control 对应 HTML 的 form control；MUI FormControl ≈ FormField（壳），不是 control。
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
FIELD_RUNTIME_KEY   → FORM_FIELD_KEY（`FieldRuntime` 并入身份层 `ResolvedControlBinding`，不再是整份运行时）
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

- **layout**：只管栅格——行窗口、格登记、`span`/`place`/`show` 归一化、空白格计算。不知道表单、v-model、Item。
- **formless**：把参数分给宿主 Form/Item、control 与 LayoutItem；把 v-model 归集到 FormView；按配置挂树。

---

## 4. 组件模型：宿主 + 包裹关系

### 4.1 宿主

每个 formless 组件包一个 UI 库组件：

| 组件 | 宿主（以 Element Plus 为例） |
|------|------------------------------|
| FormView | ElForm |
| FormField | control（`component` 指向的输入组件，如 ElInput） |

宿主组件由 `createFormView` 的工厂参数绑定，不是硬编码。未绑定宿主的组件退化为「只渲染 formless 壳」。

### 4.2 包裹关系（由外到内）

```text
FormView   包裹  ElForm、LayoutView
FormField  包裹  LayoutItem、ElFormItem、control、（LayoutView 仅 wrap-embed 内层）
```

组件树 = 概念树 = 文件树：

```text
FormView
 └─ LayoutView（页级窗口）
     ├─ FormField → LayoutItem → ElFormItem? → control
     └─ FormField → LayoutItem → ElFormItem? → control
```

注意：`LayoutView` 只在 `fl:field="wrap-embed"` 时作为**内层窗口**由 FormField 塞进外层格（ElFormItem 之内），不是 FormField 自身无条件包裹。

---

## 5. 配置通道（前缀体系）

由于组件除了宿主还包了其它组件，属性需要按前缀路由到不同目标。

### 5.1 总规则

> **无前缀 = 这颗组件的主宿主；`前缀:` = 你要配置的那个 formless 侧子组件。**

| 前缀 | 目标组件 | 说明 |
|------|---------|------|
| 裸名（无前缀） | 主宿主 | FormView→ElForm / FormField→control |
| `item:` | 宿主 ElFormItem | FormField 上，越过 control 去够宿主 Item 壳 |
| `layout-item:` | LayoutItem | FormField 上 |
| `layout:` | LayoutView | FormField 上（wrap-embed 内层）；FormView 上（页级） |
| `fl:` | formless 内核 | 各组件自身的语义配置 |

读法：**前缀是「配置谁」，裸名是「配置主子」。**

每个通道有两种形态：**props**（`item:label-width`）与**监听**（模板 `@item:validate`，Vue 把 v-on 编译成 attr `onItem:validate`，`@item:update:modelValue` → `onItem:update:modelValue`）。监听前缀由通道名**派生**（`on` + PascalCase + `:`，见 `channels.ts` 的 `listenerPrefix`），不单独维护常量表；剥掉监听前缀后按 Vue 的 `onXxx` 命名还原目标 prop（`validate` → `onValidate`）。

### 5.2 通道路由：`pickAttrs` / `omitAttrs`

通道表在 `channels.ts`（`fl:` / `layout:` / `layout-item:` / `item:`），剥皮只有两个原语（`attrs.ts`）：

```ts
pickAttrs(attrs, channel)     // 一个通道：剥前缀的 props + 还原成 onXxx 的监听，同一个袋子
omitAttrs(attrs, channels)    // 裸名残差：所列通道（props ∪ 监听）整包拿掉，其余原样
```

- **pick 只能一个通道**：不同通道能剥出**同名键**（`fl:span` 与 `layout-item:span` 都 → `span`，`fl:column` 与 `layout:column` 都 → `column`），合并即静默串味。
- **omit 可以多个通道**：只做键删除，没有 namespace 问题。
- pick 返回里 **props 先、监听后**，故同一键冲突时监听赢（`item:onClick` vs `@item:click`）。
- 裸名残留是**残差**，不是「无冒号键」：`onUpdate:modelValue`（v-model 写口，DOM-case 的 `onUpdate:model-value` 同理）这种含冒号的裸名照样留下。
- 守卫 `key.length > prefix.length`：裸 `item`（或裸 `item:`）不被吃，仍算裸名。

各调用点**声明自己认领哪些通道**（不再有共享的 `FormlessPropBags`）：

```text
工厂壳      pick fl
FormView    pick fl / layout                     omit fl, layout, layout-item
FormField   pick fl / layout / layout-item       omit fl, layout, layout-item → controlProps
            pick item（宿主 Item 壳）              omit item → controlAttrs（再 stripPortBindings）
```

通道归谁：`layout:` 只给 LayoutView（FormField 仅 wrap-embed 内层），`layout-item:` 只给本格 LayoutItem，`item:` 只给宿主 Item 壳。**`FormView` 没有 LayoutItem**，故 `layout-item:*` 与其它内核通道一起被 omit 掉（不落到宿主 Form）；`item:` 不是 FormView 的通道，目前原样透传给宿主 Form。

`fl:` 与其它通道**一视同仁**：`onFl:*` 照样剥成 `onXxx` 进同一个袋子。内核目前不 emit 事件，所以这个袋子实际用不到——但「今天没有监听」不是通道级属性，不值得为它单开一条分支。`layout-item:span` 不写 `item:layout-item:span`：两级前缀连写太长，`layout-item:` 已唯一指 LayoutItem。

### 5.3 各组件可吃的前缀

| 组件 | 裸名 | `layout:` | `layout-item:` | `item:` | `fl:` |
|------|------|-----------|----------------|---------|-------|
| FormView | ElForm | 页窗口 | — | —（透传） | ✓ |
| FormField | control | 仅 wrap-embed 内层 | 本格 | 宿主 Item 壳 | ✓ |

每格 `✓` 同时吃该通道的**监听形态**（`@layout:gutter` / `@item:validate`），`fl:` 也不例外。

组合体 control 内手写的 `<FormField>` 也是 FormField，同一张表：裸名是 **control**，label/宽度走 `item:label` / `item:label-width`。

### 5.4 主宿主缺席时裸名消失

完整规则两句：**裸名给主宿主；主宿主没渲染，裸名就丢掉（不报错、不转发）。**

- FormView：`fl:form` 关（`'auto'` 下嵌套）或无宿主 Form 时，裸名不进任何元素。
- FormField：`component` 为空时 `control = null`，裸名一起丢（slot 模式手写 control）。
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
| `fl:component` | `Component` | 本格 control（临场格 / 工厂预设；§7.4） |
| `fl:layout` | `boolean` | 是否渲染 LayoutView（§9） |
| `fl:form` | `'auto' \| boolean` | 是否渲染 ElForm（§9） |

**`FieldSchema` 的每个核心键都有一个 `fl:` 孪生键**（`component` / `props` / `model` / `prop` / `item` / `field`，extras 是 `fl:label`…）。工厂壳因此只是「把 schema 译成一层 `fl:*` 预设 attrs」：作者写在标签上的键与工厂写下去的键是同一套（§16.3）。

**内核没有「身份名」键**（ADR-011 §6 修订）。`createFormFields` 的域名表键只当 `fl:prop` 的缺省值（位置），不另发一个名字下行；宿主 `prop` 怎么编（点分路径 / 名字 / 不绑）是适配层的私事（§12.2）。

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
| 组合体内层格（`<User.Xxx>` 的 control 里） | 祖先 FormField 提供的身份层 `model`（锁在 component，标签不能覆盖） | **选口**：从已声明清单里挑一个，位置按 `model[i] ↔ prop[i]` 下标对齐取 |
| 身份根 / 临场格 `<FormField>` | 无清单 | **声明口**：直接给口名，`fl:prop` 直接给位置 |

两种场景产物相同：`{ [port]: value, 'onUpdate:' + port: fn }`——同一个动作、信息源不同。

规则：

- control 的 `model`（口名）仍锁在 component/control 静态 `formless` 上；`<User.Xxx />` **标签自身**的 `fl:model` 非法（身份已锁，工厂壳挡下，§16.3）。
- **选口 / 声明口的判别依据 = 是否命中祖先身份层**（§16.2）：命中 → 按下标对齐取 `prop`；未命中（身份根）→ `fl:model` + `fl:prop` 即声明。
- 命中身份层时，`fl:model` 必须是已声明口的子集，凭空声明口非法（throw）。
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

`$bindings` 本质是 `modelBindings(layer)` 的产物（见 §14；`layer` 由 `createFieldLayer` 建）。它此前名为 `field`——本次是**改名 + 加 `$` 前缀**，不是新概念，改动已落到 `FormField.tsx` 与 `FormFieldSlotProps`。

### 7.4 混用场景

`FormField` 与命名空间 Field 可混用——两者就是同一颗组件（绑定都落在 FormField）；临场 `<FormField>` 用 `:component` 或 slot 指定 control：

```vue
<FormView>
  <User.Name />
  <User.Age />
  <FormField fl:prop="extra" :component="ExtraInput" />
</FormView>
```

页面直接 `<FormField><ElInput v-model="form.xxx" /></FormField>` **禁止**（绕过了 formless 的写回）；必须 `fl:prop` + `:component`（或 slot `{ $bindings }`）。

---

## 8. 组装模式：`fl:field`

「是否渲染 ElFormItem」与「FormField 自身组装成什么树」是**两根正交轴**，分别由 `fl:item` 与 `fl:field` 表达。

`fl:field` 三态：

| `fl:field` | 树 |
|-----------|----|
| `'wrap'` | `FormField → LayoutItem → ElFormItem? → control` |
| `'embed'` | `FormField → control`（内部 FormField 进**页** LayoutView） |
| `'wrap-embed'` | `FormField → LayoutItem → ElFormItem? → LayoutView → FormField…` |

```text
wrap:
  FormField
    LayoutItem
      ElFormItem?
        control

embed:
  control             ← FormField 只渲 control，登记进页 LayoutView

wrap-embed:
  FormField             ← 外层格；:layout-item:span / :layout-item:place
    LayoutItem
      ElFormItem?       ← 这一格的 item（分组 label）
        LayoutView      ← 内层窗口；:layout:*
          FormField → control
          FormField → control
```

规则：

- 省略 = `'wrap'`。
- **整颗替换**（标签 > control > schema；近的赢），不做 `wrap`∪`embed` 智能合并。
- 内核 `switch (field)`，配错就按错的树渲（套娃、裂格、少壳），不补救。
- `:layout:column` / `:layout:gutter` 只对 `'wrap-embed'` 的内层 LayoutView 有效；打在 `'wrap'` 叶子上忽略（可 warn）。
- 内层 LayoutView **不**继承页 `fl:layout` / `:layout:column` / 工厂 `layout.props`：省略则用 LayoutView 自身缺省。

control 静态 `formless` 里的组合身份：

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

- `fl:item` 合并：标签 `fl:item` > schema/control `item` > 页 `FormView :fl:item`。没写 ≠ `true`（跟页）。
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
type ItemFl   = { model: string[]; prop: string[]; getValues: () => unknown[] } & FieldSchemaExtras
```

`ItemFl.model` / `ItemFl.prop` 是**本格合并结果的归一化数组**（下标即配对，§7.1）——`binding` 不再进 snapshot，适配器按 `model[i] ↔ prop[i]` 自己对齐。

各自 snapshot：

| `props` 函数 | snapshot（形参） | 投影到 |
|-------------|-----------------|-------|
| `layout.props` | `{ layout: boolean }` | LayoutView（formless 自己，`disabled` 名字固定） |
| `form.props` | `{ modelValue }` | ElForm（host，`modelValue → model` 随库变） |
| `item.props` | `{ model, prop, getValues, ...extras }` | ElFormItem（host，`label → label`、`prop → prop` 随库变） |

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
      // 单口 → 该口位置；多口一格一个宿主 prop 装不下 → 不绑（undefined），
      // 该格不参与宿主 validate / resetFields；要宿主校验就 wrap-embed 拆格（ADR-014 v1）
      prop: fl.prop.length === 1 ? toDotPath(fl.prop[0]!) : undefined,
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

**FormView → 子孙方向只有 `FORM_VIEW_KEY` 一个键**（另有一层身份键 `FORM_FIELD_KEY`，由身份根 FormField 提供，见 §16.2）。`provide(FORM_VIEW_KEY, ...)` 的能力分两组：

**A. 本层运行时**（随 FormView 实例变化；嵌套 FormView 继承 `model` / `update`）

| 字段 | 含义 | 消费方 |
|------|------|--------|
| `model` | 当前 FormView 的 `modelValue`（父快照，勿改） | FormField（`$bindings` / `getValues`）、嵌套 FormView（继承读源） |
| `update(prop, value)` | 上报字段写入 | FormField、嵌套 FormView（转发到祖先 writer） |
| `item` | 本层 `:fl:item`，即格的 `fl:item` merge 底层默认 | FormField |

**B. 工厂绑定资源**（同一 `createFormView` 下恒定）

| 字段 | 含义 | 消费方 |
|------|------|--------|
| `Item` | 宿主 ElFormItem（未绑则为 `undefined` = 永不包 Item） | FormField |
| `itemProps` | 宿主 Item 的默认 props（`props` 函数） | FormField（overlay 底层） |
| `LayoutView` | 工厂绑定的 LayoutView（wrap-embed 用它建内层窗口） | FormField |

`FORM_VIEW_KEY` 有三个消费者：**FormField**、**嵌套 FormView**（只吃 A 组的 `model` / `update` + 判嵌套）、以及 formless 自身。

**不** provide：`wrap` 函数、页 `layout` 开关、页 `column`、`fl:form`、宿主 Form 实例（宿主 Form 只走 FormView 的 `expose` proxy）。

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
  component?: Component        // 本格 control（只接输入）
  props?: HostProps<ItemFl>    // 输入默认 props（静态或快照函数）
  model?: string | string[]    // v-model 口名（默认 'modelValue'；锁在 component）
  prop?: string | string[]     // 位置（默认 = 域名表的键；:fl:prop 可盖）
  item?: boolean               // 这一格 ElFormItem 开关
  field?: 'embed' | 'wrap' | 'wrap-embed'  // 组装模式
  // ...extras（label / validation 等，经 module augmentation 扩展）
}
```

`component` 只接输入；`props` / `model` / `prop` / `item` / `field` 是内核键；其余键是 **extras**（`label`、`validation`…），进 Item/control 转化函数的 snapshot。

### 11.2 覆盖来源（近的赢）

五种来源，**近的赢、`undefined` 不算写过**：

```text
祖先 FormField 身份层（只含绑定维度） < 工厂预设层（schema → fl:*） < 标签（template attrs）
```

- 身份层只提供口 ↔ 位置映射（`ResolvedControlBinding`）；`item` / `field` / `component` / `props` / extras 是**本格物化值**，不参与向下合并（§16.2）。
- 工厂预设层与标签是**同一套键**（`fl:*`），只是层序不同：`overlay(preset, tagAttrs)`。
- `field` 三态**整颗替换**，不做字段级智能合并；非法值不参与替换（落回预设层）。
- `model` / `component` 锁在 schema/control，标签不能覆盖（身份已锁）。

---

## 12. 投影与覆盖：props 函数 + overlay

### 12.1 overlay 链

每层宿主的最终 props 由 `overlayProps(...layers)` 叠加，**后面的层赢、`undefined` 不覆盖、空字符串是值**：

```text
FormView:   overlay(form.props(snapshot), hostAttrs（剥掉 v-model 端口）)
FormField（绑定面）: 身份根 = fl:prop/fl:model 声明；切片 = 祖先身份层 + fl:model 选口（§16.2）
FormField（宿主 Item 壳）: overlay(item.props(snapshot), itemAttrs)   // itemAttrs = pickAttrs(…, 'item')：props 与监听同一袋；裸名不进 Item（§5.2）
FormField（control）:      overlay(schema/cluster props（工厂已求值）, controlAttrs（剥掉 v-model 端口）)
```

`FieldSchema.props` 可能是**快照函数**，attrs 只能装平值，所以工厂壳在渲染时用**同一套身份 / snapshot helper**（`field-identity.ts`）把它求值成平值，再当裸名 attrs 传下去——求值口径因此与 `item.props` 完全一致，不会各算一套。

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
- `LayoutItem` 通过 `inject(LAYOUT_VIEW_KEY)` 拿 `register(span, place)`，返回 `{ span, blank, ref, place, Col, disabled }`。`LAYOUT_VIEW_KEY` 是 layout 包唯一的注入键，与 §16.2 的两根 formless 键并列、互不相干。

### 13.2 `LayoutItem`（原 LayoutCell）

```ts
interface LayoutItemProps {
  span?: LayoutItemSpan  // '1'..'24' | '1x'..'Nx' | 'max' | number
  place?: LayoutItemPlace // 'auto' | 'start' | 'end'
  show?: 'auto' | 'required'  // 窗口折叠必展示（ADR-019；省略 = 'auto'）
}
```

- `span` 只决定宿主 Col 实宽；`place` 决定行内落位 / 占行模式；`show` 决定窗口折叠是否必展示。（`take` 已否，见 ADR-018：行内占用不再单开一条轴。）
- 归一化：`normalizeColSpan(raw, column)`（`1x` = `24/column`，`max` = 24，clamp 1..24）；`normalizeColPlace`。
- 渲染：`LayoutBlanks(before)` + `HostCol` + `LayoutBlanks(after)`，`disabled` 时直接透传 children。

### 13.3 布局算法（`calculate-layout`）

- 先切可见集（有 `row` 窗口时：`budget = row*24`，先扣 required，再按 DOM 序灌 auto）。
- 再 `calculateLayout`（paper-tape）：按 `place`+`span` 落地（`place` 同时决定行内落位与占行模式）。
- `calculateBlanks` 算前后空白格。

栅格模数 `GRID_TOTAL = 24`；缺省 `DEFAULT_COLUMN = 1`。

---

## 14. 数据流：读与写

### 14.1 读（FormView → control）

```
FormView.modelValue
  → getIn(model, prop)                          // 每个口按 prop 读值
  → modelBindings(layer)                        // layer = createFieldLayer(() => binding, () => model, update)
      = { [port]: value, 'onUpdate:'+port: fn }  // 即 $bindings
  → v-bind 到 control 的 v-model 口
```

### 14.2 写（control → FormView）

```
control 触发 update:port(value)
  → layer.setValue(port, value)：口名在层内解析为 prop
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

`model: ['start','end']` + `prop: ['a','b']` 时，`modelBindings(layer)` 产出 `{ start, onUpdate:start, end, onUpdate:end }`。Field 内 `fl:model='start'` 只取 `models.indexOf('start')` 对应下标的口 + prop，形成单口 `$bindings`。

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
| `create-form-view.ts` | 根：v-model、可选 Form、页级 LayoutView、provide context |
| `FormField.tsx`（原 `FormCell.tsx`） | 一格 + 组装：LayoutItem + 可选 ElFormItem + control + `$bindings`；剥 attrs 一次、switch(fieldMode)、v-model 归集；`fl:component` 临场控件 |
| `create-field-component.ts` | 单 Field 工厂壳：把 schema 译成一层 `fl:*` 预设 attrs，交给 `FormField`（无私有参数、不 provide） |
| `create-form-fields.ts` | 域表工厂，产出 PascalCase Field 标签 |
| `injection-keys.ts` | `FORM_VIEW_KEY`、`FORM_FIELD_KEY` |
| `context.ts` | `useFormContext()` |
| `control-binding.ts` | `resolveControlBinding` / `bindingForPort` / `createFieldLayer` / `modelBindings` / `stripPortBindings`（转私有） |
| `path-access.ts` / `path-parse.ts` | 不可变 get/set + 路径解析 |
| `props-overlay.ts` | `resolveProps` / `overlayProps` / `HostProps` |
| `channels.ts` | 通道表 `CHANNELS`（前缀 `fl:` / `layout:` / `layout-item:` / `item:`）；`channelPrefix` / `listenerPrefix`（监听前缀派生，不写字面量常量） |
| `attrs.ts` | 通道路由原语：`pickAttrs`（单通道，props + 监听同袋）/ `omitAttrs`（多通道，裸名残差）+ `toAttrBoolean`；`onXxx` 命名还原（私有 `toOnKey`） |
| `slots.ts` | slot 路由：`item:*` → 宿主 Item，其余 → control（slot 无监听形态） |
| `utils.ts` | 通用工具（按 lodash 命名，无 formless 语义）：`upperFirst` / `UpperFirst`、`omit` / `omitUndefined` |
| `control-config.ts` | control 静态 `formless` 读取（`ControlFormless` + `ComponentCustomOptions` 增强） |
| `fl-keys.ts` | schema extras、shell keys（`omitShellKeys` / `schemaExtras`） |
| `field-mode.ts` | `isFieldMode` / `resolveFieldMode` |
| `field-identity.ts` | 身份与快照 helper：`mergedFieldFl` / `resolveDeclaredBinding` / `fieldBinding` / `buildItemFl`（FormField 与工厂壳共用） |
| `field-schema.ts` | `FieldSchema` / `ItemFl` / tag props 类型 |
| `use-form-view-model.ts` | 写口归集：`useFormViewModelValue` |
| `model-writer.ts` | `createModelWriter`：同 tick 合并的不可变路径写入器 |
| `control-props.ts` | control 公开 props 推断（v-model 口剥离） |
| `index.ts` | 公开导出 |

### 16.2 注入键与 Context

vue-formless 内两根注入键，各是一个**作用域**（layout 包另有 `LAYOUT_VIEW_KEY`，见 §13.1）：

| 键 | 提供者 | 装什么 | 消费者 |
|----|--------|--------|--------|
| `FORM_VIEW_KEY` | FormView | 页作用域 `model` / `update` / `item` + 工厂资源 `Item` / `itemProps` / `LayoutView` | FormField、嵌套 FormView |
| `FORM_FIELD_KEY` | 身份根 FormField | 身份层 `FieldLayer`：`models[i] ↔ props[i]` 已对齐 **+ 按口读写访问器** | 组合体 control 内的 FormField |

二者**不可合并**：装的是两件事（页通道 / 工厂资源 vs 绑定面），提供者与换代时机不同，且同一颗 FormField 两者都要读。

**向下只继承绑定维度。** `key` / `item` / `field` / `component` / `props` / extras 是**本格物化值**，不参与向下合并——否则组合体的 `item: false` 会传染内层格（背 §9），组合体的 `label` 会盖到内层格。

`binding` = `model[i] ↔ prop[i]` 下标对齐，由身份根**算一次**、随身份层下行，内层切片只按下标取用、不重算。内核**不发身份名**（ADR-011 §6 修订）：工厂域名表的键只当 `fl:prop` 的缺省位置；宿主 `prop` 怎么编、要不要编，是适配层的私事（§10.2）。多口一格时一个宿主 `prop` 装不下，适配层就不绑（`prop: undefined`，ElFormItem 不注册）——该格因此**不参与宿主校验 / 重置**，要宿主校验就把口拆成格（`fl:field="wrap-embed"`）。`FORM_CELL_PORT_KEY` 已删（口切片改由 `fl:model` 承担）。

```ts
/** FormView → 子孙（FormField / 嵌套 FormView）的页通道 + 工厂资源。 */
interface FormContext {
  // A. 本层运行时（嵌套 FormView 继承 model / update）
  model: unknown
  update: (prop: string, value: unknown) => void
  item: boolean              // 页级 :fl:item，格的 fl:item merge 底层默认

  // B. 工厂绑定资源（同一 createFormView 下恒定）
  Item?: Component
  itemProps?: HostProps<ItemFl>
  LayoutView: Component      // wrap-embed 内层窗口
}

/** 身份根 FormField → 组合体内层 FormField 的身份层（既有 key 的一层，非新类型）。 */
interface FieldLayer extends ResolvedControlBinding {
  getValues(): unknown[]                          // 本层各位置的现值（懒读，ADR-014）
  setValue(port: string, value: unknown): void    // 按口写；位置不出层
}
```

**身份层带访问器。** 只装 `{ models, props }` 时，消费方要读/写还得自己 inject `FORM_VIEW_KEY`、再拼 `getIn` + `ctx.update(位置, 值)`——位置因此泄漏到消费方。`FieldLayer` 让身份根闭包住页作用域，对外只暴露**按口**的读写：消费方报口名，位置在层内解析（`bindingForPort`）。它不是新作用域、也不替代 `FORM_VIEW_KEY`：它是**每格对页通道的门面**，形状与 `provideFormViewContext` 里塞 `update` 一致（ADR-016）。

`FORM_VIEW_KEY` 逐项的存在理由（谁缺了它就做不了什么）：

| 能力 | 缺了会怎样 | 出处 |
|------|-----------|------|
| `model` | 读不出 `$bindings` 值、组不出 `ItemFl.getValues`、嵌套层无法继承读源 | §14.1 |
| `update` | 输入写不回 FormView（也没有祖先 writer 可转发） | §14.2 |
| `item` | 格上 `fl:item` merge 缺页级默认，退化成「工厂绑 Item 才算 true」 | §9 |
| `Item` | FormField 渲不出宿主 Item 壳（label/error 全丢）；`undefined` 是「工厂未绑」的合法态 | §4.1 / §9 |
| `itemProps` | 宿主 Item 拿不到 `props` 函数产出的默认（label/rules 等） | §12.1 |
| `LayoutView` | `wrap-embed` 无法按工厂 Row/Col 建内层窗口 | §8 |

`FORM_FIELD_KEY` 逐项的存在理由（谁缺了它就做不了什么）：

| 能力 | 缺了会怎样 | 出处 |
|------|-----------|------|
| `models` / `props` | 组合体内层格不知道「一台控件有哪些口、各自落在哪」，`fl:model` 选口与下标对齐都无从谈起 | §7.2 / §14.3 |
| `getValues()` | 内层格/适配层读不到本层各位置的现值（`ItemFl.getValues` 无源） | §14.1 |
| `setValue(port, v)` | 内层格只能自己拼 `ctx.update(位置, 值)`——把位置泄漏给消费方，身份层就不再是「按口」的门面 | §14.3 |

- **身份根**（`inject(FORM_FIELD_KEY)` 未命中）才 `provide` 身份层；命中祖先的内层切片**只消费、不重供**——保住 ADR-013 的 1 身份 : N 格。
- 临场格 / 裸 `<FormField>` 也是身份根：没有祖先清单，`fl:model` 即声明口（§7.2）。
- 身份层只装绑定维度；其余 key 不上行（见上文「向下只继承绑定维度」）。

### 16.3 FormField 的运行时装配

**FormField 只有一层配置面：它自己的标签 attrs。** 没有内核私有参数、没有侧信道——所以组件外怎么写 `<FormField …>`，工厂壳内就怎么往下传。

```
工厂壳 createFormFieldComponent:
  schemaToFieldAttrs(闭包 f(fieldKey, schema)):                 // 纯翻译
      component → fl:component      model → fl:model
      prop      → fl:prop（缺省 = 域名表的键）   item → fl:item
      field     → fl:field          extras(label…) → fl:<extra>
  render:
      fl, snapshot = 用 field-identity.ts 的 helper 现算（与 FormField 同一套）
      controlProps = overlay(cluster.props(snapshot), schema.props(snapshot))   // 快照函数在此求值
      h(FormField, overlay(preset, controlProps, tagAttrs), slots)             // 标签近的赢
  仅三处「挡」：fl:model / fl:component 由 schema 锁死（身份已锁，§7.2）；
                 非法 fl:field 落回 preset 值（§8 只认合法值整颗替换）
```

`props` 是唯一必须在工厂壳里落地的东西：attrs 只能装平值，而 `props` 可能是快照函数。求值用的身份 / snapshot **不是另算一套**，而是与 FormField 共用 `field-identity.ts`（`mergedFieldFl` / `resolveDeclaredBinding` / `fieldBinding` / `buildItemFl`），所以 `cluster.props`、`schema.props`、`item.props` 三个函数看到的是同一份 `ItemFl`（含标签 `:fl:prop` 搬家后的真实位置）。工厂壳因此**仍不 provide**：身份层只有 FormField 提供。

FormField 自己 inject-or-self：命中祖先就当切片，未命中就是身份根并 provide。

```
setup:
  fl = pickAttrs(attrs, 'fl')                      // 内核语义源
  layoutProps / layoutItemProps = pickAttrs(attrs, 'layout' | 'layout-item')
  controlProps = omitAttrs(attrs, ['fl', 'layout', 'layout-item'])   // item:* 还在里面
  formFieldContext = inject(FORM_FIELD_KEY, null)  // 命中 = 组合体内层切片
  declared = resolveDeclaredBinding(fl)            // 临场格 / 身份根：标签即声明
  if (!formFieldContext) provide(FORM_FIELD_KEY, reactive(createFieldLayer(() => declared, () => formViewContext.model, formViewContext.update)))
  binding = fieldBinding(fl, declared, formFieldContext)    // 切片：fl:model 单串选口，否则整份继承
  layer   = createFieldLayer(() => binding, () => formViewContext.model, formViewContext.update)   // 本格的口 → 位置门面
render:
  fieldMode = resolveFieldMode(fl.field)                                   // 合法值整颗替换，否则 'wrap'
  fieldFl = mergedFieldFl(formViewContext, fl)                         // 页 < 预设层 < 标签
  itemFl = buildItemFl(fieldFl, binding, layer.getValues)              // → { model, prop, getValues, ...extras }
  itemAttrs    = pickAttrs(controlProps, 'item')                       // 宿主 Item：props + 监听同一袋
  controlAttrs = stripPortBindings(omitAttrs(controlProps, ['item']), binding.models)  // 裸名只给 control（§5.2）
  itemProps  = overlay(item.props(itemFl), itemAttrs)                  // 裸名不进 Item
  bindings = modelBindings(layer)                                 // 口名 + 现值 + 按口写；位置不出层
  control = h(fl:component, { ...controlAttrs, ...bindings }, controlSlots)  // control 或 slot 手写
  switch (fieldMode): embed → control；否则 LayoutItem → (itemOn ? ElFormItem → control : control)
    wrap-embed 时 fieldBody = LayoutView({ ...layoutProps }) → control
```

作用域值用 `reactive(createFieldLayer(...))` 提供（对齐 `provideFormViewContext` 的写法）；层的每个成员都是**懒读**：`fl:prop` 可能被标签重述、嵌套 FormView 可能换 model 源，所以位置与 model 都不能在提供时拍死。

---

## 17. 类型系统

- `NamespacedFields<S>`：把 `Record<string, FieldSchema>` 映射成 `{ Name: FormFieldComponent<...> }`（PascalCase key）。
- `ControlTagProps<Def>`：control 公开 props 剥掉 v-model 口（`LockedVModelKeys`），避免 `<User.Name>` 上写 `modelValue` 覆盖绑定。
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

- 内核只读核心键（`component`/`model`/`props`/`prop`/`item`/`field`），其余 schema 键与 `fl:*` extras **不解释**，进 Item/control 转化函数的 snapshot。
- `ItemFl` / `FormFieldProps` / `FormFieldTagProps` 从 extras 推导（`label` → snapshot `label` 与 `:fl:label`）。
- control 静态 `formless` 通过 `ComponentCustomOptions.formless` 声明（`model`/`item`/`field`/`prop`）。

---

## 19. 公开 API 面

公开面 = **5 个运行时值 + 类型导出**；其余全部内核私有。

```ts
// 值（仅此 5 个）
createFormView(options) → FormView                     // 工厂：绑宿主 Form/Item/Row/Col
createFormFields(schema, options?) → NamespacedFields  // 工厂：页级域表
FormField                                              // 临场格 / slot 模式
createLayoutView({ Row, Col, column? }) → LayoutView   // @vue-formless/layout 转出口
LayoutItem                                             // @vue-formless/layout 转出口

// 类型
FormViewProps, FormViewComponent, CreateFormViewOptions
FieldSchema, FormFieldProps, FormFieldComponent, NamespacedFields
ItemFl, FieldSchemaExtras, ControlFormless
ControlProp, ControlVModel
HostProps, LayoutItemSpan, LayoutItemPlace
```

- `FormView` / `LayoutView` 是工厂**产物**，不作为独立值导出；`FormViewComponent` 仅为类型。
- 私有（不导出，可随内核演进）：`useFormContext` / `FormContext`、`FORM_VIEW_KEY` / `FORM_FIELD_KEY`、`getIn` / `setIn` / `parsePath`、`overlayProps` / `resolveProps`、`resolveControlBinding` / `bindingForPort` / `createFieldLayer` / `modelBindings` / `stripPortBindings` / `toBindingList` / `ResolvedControlBinding` / `FieldLayer`、`createModelWriter`、`upperFirst`。
- 定制路径只有三条：`$bindings` slot（§7.3）、`:component` 临场格（§7.4）、module augmentation（§18）——都不需要够到内核。

---

## 20. 实现要点与边界

1. **通道声明一次**：每个调用点用 `pickAttrs` / `omitAttrs` 声明自己认领的通道，同一通道不落两袋；一个通道的 props 与监听永远同去一个目标。
2. **formless 内核不预声明** `label` / `validate`（这些是 extras）。
3. **`fl:span` 丢弃**（开发态 warn）：宽走 `layout-item:span`。
4. **Col 只吃数字 `span`、Row 只吃 `gutter`**：`:fl:span` 已否。
5. **页面 `<FormField>` 临场格**可写 `fl:item` / `fl:prop` / `fl:model` / `:component`；格上宽用 `layout-item:*`。
6. **不公开** `FormView.Layout` / `FormView.Item`；**不开放**自定义 merge / 自定义前缀；**没有** `form:` 前缀（当前无需从字段够到宿主 Form）。
7. **组合体只写身份**：`formless: { field: 'embed', model: [...] }`；分组壳显式 `'wrap-embed'`。
8. **两层作用域各只装自己那点东西**：`FORM_VIEW_KEY` = 页通道 + 工厂资源；`FORM_FIELD_KEY` = 身份层 `FieldLayer`（口 ↔ 位置 + 按口读写）。身份层不上行任何其它 key（§16.2）。
9. **内核不发身份名**（ADR-011 §6 修订，v1 范围）：snapshot 只给归一化数组 `model` / `prop`（下标对齐，§10.1）与 `getValues()`。宿主 Item 的 `prop` 是**纯适配编码** —— 单口 → 位置；多口一格 / 位置编不出来 → **不绑**（`undefined`，宿主不注册该格，也不校验 / 不重置）。要宿主校验就把口拆成格（`fl:field="wrap-embed"`）。

---

## 21. 落地顺序建议

1. 词表与类型：`FormField` 上位（`FormItem` 移除）、`fl:field`、通道常量改名。
2. `channels.ts` / `attrs.ts`：前缀常量与 bag 改名（`row:`→`layout:`、`col:`→`layout-item:`）。（已落地）
2b. **通道路由统一**（已落地）：`channels.ts` 改通道表 + 派生的监听前缀；`attrs.ts` 只留 `pickAttrs`（单通道）/ `omitAttrs`（多通道）；`splitFlAttrs` / `takePrefixed` / `splitFormlessProps` / `useFormlessProps` / `item-fallthrough.ts` 退场，响应式包装回到调用点。
3. `FormCell.tsx` → 并入 `FormField.tsx`：绑定下沉、`$bindings` 输出、支持 `:component`、删 `useFormCell`。
4. `injection-keys.ts`：`FIELD_RUNTIME_KEY` → `FORM_FIELD_KEY`，值降为身份层 `FieldLayer`（`ResolvedControlBinding` + 按口读写访问器，`createFieldLayer` / `modelBindings`）；`FormField.tsx` 改 inject-or-self（未命中才 provide）+ `reactive(...)` 提供；身份 / 快照 helper 抽到 `field-identity.ts`；工厂壳改为纯「schema → `fl:*` 预设 attrs」，经 `overlay(preset, controlProps, tagAttrs)` 传给 FormField（无私有参数，`props` 函数在壳里用同一套 helper 求值）。
5. **裸名口径对齐 §5.2**：FormField 的宿主 Item 不再吃裸名（`item:*` 才有），工厂求出的 control props 因此不会漏到 ElFormItem 上；`fl:label` 走快照 → 适配 Item `label`。
6. `field-schema.ts`：`ItemFl` 拆平（去掉 `binding`，暴露 `model` / `prop`）；适配器 `props` 函数跟进（playground `toEpItemProps`）。（已落地）
7. `create-form-view.ts`：`layout.column` → `layout.props`（函数形式）。
8. `FormField.tsx`：`switch(fieldMode)` 键名跟进（已落地）。
9. layout 包：`LayoutCell` → `LayoutItem`。
10. 测试 / playground / README / 旧 ADR 交叉标注。
11. **废 `fl:key` / `ItemFl.fieldKey` / `fieldIdentityKey`**（ADR-011 §6 修订，已落地）：内核不再下发身份名；宿主 `prop` 归适配层自决，多口一格不绑宿主（§20.9）。`SHELL_KEYS` 去掉 `key`。
