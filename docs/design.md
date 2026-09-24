# vue-formless 设计文档

> 本文件是 vue-formless 的**完整设计规格**。**以代码与 [`decision.md`](./decision.md) 为准**：当本文与代码或 decision.md 冲突时，按代码与 decision.md 修正本文。历史决策记录见 [`docs/adr/`](./adr/README.md)。
>
> 本文吸收了 ADR-001 ~ ADR-021 的结论，并做了收束：`LayoutCell → LayoutItem`、`FormCell` / `FormItem` 概念移除、`FormField` 上位、绑定下沉并输出 `$bindings`、组装位置键为 `fl:field`、通道为 `fl` / `layout-item` / `layout` / `item`。ADR-020 / 021 提出的 `cell` 三态与 `fl:tree` / `fl:grid` / `cell:` / `row:` 词表已被本文取代（见 §2、§5）。

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
| **control** | 被 FormField 消费的那颗输入组件：schema `component` / `fl:component` 的值，只谈 v-model | 格、壳、宿主库的 FormControl |
| **Form** | 仅宿主 ElForm | 内核组件名 |
| **Item** | 仅宿主 ElFormItem（label/error） | 内核组件名 |

- **术语约定：被 FormField 消费的 component 一律叫 control。** `widget` / `Input` 不再是它的同义词；`component` 只作为键名出现（schema key / `fl:component`），不作名词。
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
FormViewItemProps   → 删除
LayoutCell          → LayoutItem
LayoutCellProps     → LayoutItemProps
useFormCell         → 删除（由 `fl:model` 取代）
FORM_CELL_PORT_KEY  → 删除
bindingForPort      → 删除（由 `fl:model` + `FORM_FIELD_KEY.getProp` 取代）
FIELD_RUNTIME_KEY   → FORM_FIELD_KEY
```

本轮重构的收敛（`FormFieldCore` 内联后）：

```text
overlayProps        → mergeAttrs
toAttrBoolean       → getAttrBoolean
field-identity.ts   → 删除（身份 / 快照逻辑并入 FormFieldCore）
fl-keys.ts          → 删除
use-form-view-model → use-form-view-value
control-binding.ts  → 只剩 ControlVModel / ControlProp 两个类型
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

每个通道有两种形态：**props**（`item:label-width`）与**监听**（模板 `@item:validate`，Vue 把 v-on 编译成 attr `onItem:validate`，`@item:update:modelValue` → `onItem:update:modelValue`）。监听前缀由通道名**派生**（`on` + PascalCase + `:`，见 `dispatch.ts` 的 `CHANNEL_PREFIX_TABLE`），不单独维护常量表；剥掉监听前缀后按 Vue 的 `onXxx` 命名还原目标 prop（`validate` → `onValidate`，`update:modelValue` → `onUpdate:modelValue`；实现就是 `on` + `upperFirst`，冒号及其后原样带过）。

### 5.2 通道分发：`dispatch` + `useDispatch`

通道表在 `dispatch.ts`（`fl` / `layout-item` / `layout` / `item`；通道名就是标签前缀去掉冒号，不另存常量表），剥皮只有一个原语，**一次分桶**：

```ts
dispatch(bag, channels, { prefix })   // 每通道一桶 + default 残差；prefix 默认 'drop'
                                      // 'drop' = 剥前缀的 props + 还原成 onXxx 的监听，同一袋
                                      // 'keep' = 输入键形原样（前缀与监听拼写都不动）
```

- **分桶天然隔离**：不同通道能剥出**同名键**（`fl:span` 与 `layout-item:span` 都 → `span`，`fl:column` 与 `layout:column` 都 → `column`），但各进各桶，故「一个通道一袋」是原语的形状，不是调用点要守的纪律。
- 桶内 **props 先、监听后**，故同一键冲突时监听赢（`item:onClick` vs `@item:click`）。
- `default` 是**残差**，不是「无冒号键」：`onUpdate:modelValue`（v-model 写口，DOM-case 的 `onUpdate:model-value` 同理）这种含冒号的裸名照样留下。裸 `item`（或裸 `item:`）不被吃，也留在这里。
- **不筛值、不丢键**：每个键恰好进一个桶或 `default`，值原样（`undefined` 也照传）。
- 通道集是**闭集数组**，props 与监听两种形态一视同仁：`dispatch` 不区分收到的是 tag attrs 还是 slot 名，同一规则、同一条路径（`onItem:xxx` slot 名照样剥成 `onXxx`）。
- **两种投影**：`prefix` 只改**被认领通道**的键形，`default` 两模式完全一致。`keep` 是给**转发**用的：桶内键保留输入拼写，因此可被同一张通道表**再认领一次**（`dispatch(dispatch(bag, ch, { prefix: 'keep' })[ch], ch)[ch]` 等于 `dispatch(bag, ch)[ch]`）——将来父组件把某一通道原样交给子组件时走这条。它不是调用点常备项，也不是「另一种归一化」。`resolveKey` 不为它长分支：`keep` 只用它的通道归属，丢掉它算出的 `key` / `type`。

各调用点**声明自己认领哪些通道**（不再有共享的 `FormlessPropBags`）。attrs 侧走 `useDispatch`（一次分桶 + 每桶一个 ref，桶名是通道名的 camelCase 拼写，由 `Channel` 类型派生：`layout-item` → `layoutItem`）：

```text
useDispatch(attrs, VIEW_ATTR_CHANNELS)   → fl / layout / default
                            页：layout-item:* / item:* 都不是页通道，在 default 里透传
useDispatch(attrs, FIELD_ATTR_CHANNELS)  → fl / layout / layoutItem / item / default
                            公开 FormField 与工厂壳都走这里；工厂壳再把自己的预设层叠在 fl 桶上
dispatch(slots, FIELD_SLOT_CHANNELS) → item 桶是宿主 Item 槽，default 桶是 control 槽
```

`dispatch` 与 `useDispatch` 分工：前者是**平值原语**（`dispatch(slots, …)` 是唯一调用点——槽名既不是组件的 attrs 也不在响应式上下文里）；后者是 **attrs 关口**（加响应式包装与桶名）。`dispatch(slots, …)` 拿不到响应式包裹，也不该被 camelize——Vue 不归一化槽名，`item:label-width` 归一成 `labelWidth` 就再也匹配不上。


通道归谁：`layout:` 只给 LayoutView（FormField 仅 wrap-embed 内层），`layout-item:` 只给本格 LayoutItem，`item:` 只给宿主 Item 壳。**`FormView` 没有 LayoutItem**，故 `layout-item:` 不是页通道——和 `item:` 一样留在 `default` 里原样透传给宿主 Form。

`fl:` 与其它通道**一视同仁**：`onFl:*` 照样剥成 `onXxx` 进同一个袋子。内核目前不 emit 事件，所以这个袋子实际用不到——但「今天没有监听」不是通道级属性，不值得为它单开一条分支。`layout-item:span` 不写 `item:layout-item:span`：两级前缀连写太长，`layout-item:` 已唯一指 LayoutItem。

### 5.3 各组件可吃的前缀

| 组件 | 裸名 | `layout:` | `layout-item:` | `item:` | `fl:` |
|------|------|-----------|----------------|---------|-------|
| FormView | ElForm | 页窗口 | —（透传） | —（透传） | ✓ |
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
| `fl:field` | `'auto' \| 'embed' \| 'wrap-embed'`（类型里仍含 `'wrap'`，等价 `'auto'`） | FormField 组装位置（§8） |
| `fl:component` | `Component` | 本格 control（临场格 / 工厂预设；§7.4） |
| `fl:layout` | `boolean` | 是否渲染 LayoutView（§9） |
| `fl:form` | `'auto' \| boolean` | 是否渲染 ElForm（§9） |

**`FieldSchema` 的核心键都有对应的 `fl:` 标签键**（`component` / `model` / `prop` / `item` / `field`，extras 是 `fl:label`…）；唯一例外是 `props`——它可能是快照函数，装不进 attrs，因此走 `control` 通道的第一层（§16.3）。工厂壳因此只是「拿 schema 的剩余键当一层预设」：作者写在标签上的键与工厂叠下去的键是同一套**桶键**（前缀已由 `dispatch` 剥掉，§16.3）。

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

**`fl:model` 永远表示「这一个 FormField 认领哪个/哪些口」**，区别只在「口清单 + 口到 prop 的映射」从哪来。判别依据是**这一格有没有自有 `fl:prop`**：

| 场景 | 自有 `fl:prop` | `fl:model` 语义 | 位置来源 |
|------|----------------|----------------|----------|
| 组合体内层格（包在组合体 control 的模板里） | 不写 | **选口**：从祖先已声明口里挑（可挑多个） | 祖先 FormField 的 `FORM_FIELD_KEY.getProp(model)`，按下标对齐返回对应位置 |
| 身份根 / 临场格 `<FormField>` | 写 | **声明口**：直接给口名 | 自有 `fl:prop` |

两种场景产物相同：`$bindings = { [port]: value, 'onUpdate:' + port: fn }`——同一个动作、信息源不同。

清单解析顺序（`FormFieldCore`）：

- `model`：`标签 fl:model` > `schema.model` > `control 静态 formless.model` > `['modelValue']`。
- `prop`：`标签 fl:prop` / `schema.prop` > 祖先 `getProp(model)`。

规则（**按当前实现，不是「身份锁定」模型**）：

- **只有 `component` 被工厂壳锁住**：`createFormField` 取 `component: schema.component ?? 标签.fl:component`——schema 声明了 `component` 时标签的 `fl:component` 不生效；schema 未声明时，标签 `fl:component` 才作为临场格生效（§7.4）。
- **`model` / `prop` / `item` / `field` 不被锁定**：工厂壳把它们当预设层，与标签按 `{ ...preset.fl, ...标签.fl }` 合并，标签可覆盖（含 `fl:model`）。
- 没有自有 `fl:prop` 时向祖先 `getProp(model)` 取位置；祖先答不出（如凭空声明一个祖先没有的口）**不 throw**：该口 `prop[i]` 为空，`$bindings` 里被跳过。
- `fl:prop` 里空 / 空白字符串**不 throw**：该口被跳过（不参与绑定）。

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

`$bindings` 是 `FormFieldCore` 的 `bind` computed（见 §14）：对每个 `model[i]`，若口名与 `prop[i]` 都非空，则取最近 FormView 的 `access(prop[i])`，产出 `{ [toCamel(口名)]: access.value.value, ['onUpdate:' + toCamel(口名)]: access.update }`。它此前名为 `field`——本次是**改名 + 加 `$` 前缀**，不是新概念，类型在 `FormFieldSlotProps`。

### 7.4 混用场景

`FormField` 与命名空间 Field 可混用——两者就是同一颗组件（绑定都落在 FormField）；临场 `<FormField>` 用 `fl:component` 或 slot 指定 control：

```vue
<FormView>
  <User.Name />
  <User.Age />
  <FormField fl:prop="extra" fl:component="ExtraInput" />
</FormView>
```

页面直接 `<FormField><ElInput v-model="form.xxx" /></FormField>` **禁止**（绕过了 formless 的写回）；必须 `fl:prop` + `fl:component`（或 slot `{ $bindings }`）。

---

## 8. 组装模式：`fl:field`

「是否渲染 ElFormItem」与「FormField 自身组装成什么树」是**两根正交轴**，分别由 `fl:item` 与 `fl:field` 表达。

组装树由**两根轴**合成，而不是一个枚举：

- **位置**（placement）——`fl:field`，可写 `'auto' | 'embed' | 'wrap-embed'`（类型里仍含 `'wrap'`，实现按 `'auto'` 处理）。schema 与标签按「近的赢」合并（两者都是 use-site）。
- **体**（nature）——control 静态 `formless.field: 'embed'`，只表示「我是组合体：被成格时需要内层窗口」。它**不是**一个合并层：`FormFieldCore` 渲染时读出来，与位置结合，决定渲哪棵树。

`ControlFormless.field` 因此只有可选 `'embed'` 一个值——它说的是**体**，不是位置。`'wrap'` / `'wrap-embed'` 写在 control 上没有意义：近的赢会让标签盖过它，而且它也要求不了内层窗口的密度（密度是标签的 `layout:` 通道）。

合成表：

| `fl:field`（位置） | 叶子 control（体 = 无） | 组合体 control（体 = `'embed'`） |
|--------------------|------------------------|-----------------------------------|
| `'auto'`（省略） | `'wrap'` | `'embed'` |
| `'embed'` | `'embed'` | `'embed'` |
| `'wrap-embed'` | `'wrap-embed'` | `'wrap-embed'` |

`'wrap'`：类型上允许，但外层真值域已排除它，实现把外层 `'wrap'` 当 `'auto'`（叶子 → `'wrap'`、组合体 → `'embed'`）。decision.md「field 渲染场景」明确外层只取 `'auto'` / `'embed'` / `'wrap-embed'`：叶子默认就是 wrap，组合体的 wrap 由 `'wrap-embed'` 表达，`'wrap'` 没有存在必要。

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

- 省略 = `'auto'`：跟随 control 的体。非法值也落回 `'auto'`。
- **同轴近的赢**（标签 > schema）。`'auto'` 是「本格没意见」，不等于 `'wrap'`。
- **异轴是合成**（位置 × 体）：组合体默认 `'embed'`；要把它包成一格并拿到内层窗口，写 `'wrap-embed'`。当前实现**没有**「`'wrap'` + 组合体 → `'wrap-embed'`」这一档。
- `'wrap-embed'` 仍可写：它是**逃生口**——control 漏报（或无法声明）组合体时，页面 / schema 直接写它强制内层窗口。叶子 control 上写它没有意义（内层窗口里没有可分格的 FormField）。
- 内核 `switch (tree)`，配错就按错的树渲（套娃、裂格、少壳），不补救。
- `:layout:column` / `:layout:gutter` 只对 `'wrap-embed'` 的内层 LayoutView 有效；打在 `'wrap'` 叶子上忽略（可 warn）。
- 内层 LayoutView **不**继承页 `fl:layout` / `:layout:column` / 工厂 `layout.props`：省略则用 LayoutView 自身缺省。

control 静态 `formless` 里的组合身份：

```ts
defineOptions({
  // 只有体；位置留在 fl:field
  formless: { field: 'embed', model: ['start', 'end'] },
})
```

分组壳：把组合体包成一格并拿到内层窗口，直接写 `'wrap-embed'`（不存在「写 `'wrap'` 自动升格」这一步）：

```vue
<Range.DateRangeTwo :fl:field="'wrap-embed'" layout-item:span="max" />
```

control 漏报时的逃生口：

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

- `fl:item` 合并：`FormView` 提供的那层 `FormItem`（包装层）用 `getAttrBoolean(true, 页 fl:item, 格 fl.item)` 归一（近的赢）；`FormItem` 拿到假值就只透传 children、不装宿主 Item。`FormFieldCore` 只要有 `FormItem` 壳资源就一律交给它，不自己判 `item`。标签 `fl:item` > schema/control `item` > 页 `FormView :fl:item`；没写 ≠ `true`（跟页）。裸 `fl:item`（attr 空串）算 `true`。
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

`item` 实际是「组装 Item」的原料：`createFormView` 调 `createFormItem(options.item)` 得到组装件 `FormItem`（内核私有，不进 `index.ts`），把宿主 component 与 `props` 规格收进来；页级 `fl:item` 默认不在组装件里，而由 FormView 提供的 `FormItem` 包装层合并：

```ts
interface CreateFormItemOptions {
  component?: Component                                  // 宿主 Item；未绑 = 只透传 children
  props?: (fl: ItemFl) => Record<string, unknown>        // 传给宿主 Item
  fl?: MaybeRefOrGetter<Record<string, unknown>>         // 本层页 fl 包（页级 fl:item 默认）
}
```

- `component` / `props` 是工厂规格。`CreateFormItemOptions` 里仍有可选的 `fl`（`MaybeRefOrGetter`），但当前 `createFormView` 未传它；页级 `fl:item` 由包装层 `getAttrBoolean(true, 页 fl:item, 格 fl.item)` 合并（该 `MaybeRefOrGetter` 口子留给将来「页级默认响应式」）。

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
- `layout.props` 只是 LayoutView 的默认值（密度等）；`disabled` 由内核固定为 `!fl:layout`，永远覆盖 `layout.props` 的产出（近的赢）。

### 10.2 示例（Element Plus）

```ts
export const FormView = createFormView({
  layout: {
    Row: ElRow,
    Col: ElCol,
    props: { column: 2 },
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

FormView 同时 provide **两个键**：`FORM_VIEW_KEY`（只给嵌套 FormView 继承）与 `FORM_FIELD_KEY`（给 FormField 消费，见 §16.2）。

**`FORM_VIEW_KEY`**：只装本层运行时，随 FormView 实例变化；嵌套 FormView 继承三件套（同源：都绑在这一层或祖先的 v-model 上）：

| 字段 | 含义 | 消费方 |
|------|------|--------|
| `value: ComputedRef<unknown>` | 当前 FormView 的 `modelValue`（父快照，勿改） | 嵌套 FormView（继承读源 / 拼 `fl.modelValue`） |
| `getIn(path)` | 相对本源的位置读 | 嵌套 FormView |
| `setIn(path, value)` | 相对本源的位置写（唯一写通道，终点在 owner 层） | 嵌套 FormView（转发到祖先 `setIn`） |

`FORM_VIEW_KEY` 只有一个消费者：**嵌套 FormView**（读/写源 + 判嵌套）。FormField 不再 inject 它。

**`FORM_FIELD_KEY`**：FormField 唯一消费的上行上下文（`FormFieldContext`），见 §16.2 —— FormView 在这里提供 `access(prop)`（model 源：读值 + 写回）+ `FormItem` / `LayoutView`（壳资源）；**不**提供 `getProp`，因此内层 FormField 没有可继承的身份映射，自己成为身份根。

**不** provide：`wrap` 函数、页 `layout` 开关、页 `column`、`fl:form`、宿主 Form 实例（宿主 Form 只走 FormView 的 `expose` proxy）。

---

## 11. `createFormFields`：页级域表

`createFormFields(schema)` 声明**语义输入簇**（不是表单 schema），产出 PascalCase 的 Field 组件表。

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
  model?: string | string[]    // v-model 口名（默认 'modelValue'；缺省由 control 静态 formless 兜底；标签 fl:model 可盖，§7.2）
  prop?: string | string[]     // 位置（默认 = 域名表的键；fl:prop 可盖）
  item?: boolean               // 这一格 ElFormItem 开关
  field?: 'auto' | 'embed' | 'wrap-embed'  // 组装位置（类型仍含 'wrap'，实现按 'auto'）
  // ...extras（label / validation 等，经 module augmentation 扩展）
}
```

`component` 只接输入；`props` / `model` / `prop` / `item` / `field` 是内核键；其余键是 **extras**（`label`、`validation`…），进 Item/control 转化函数的 snapshot。

### 11.2 覆盖来源（近的赢）

工厂预设层与标签是**同一套键**（`fl:*`），**近的赢、`undefined` 不算写过**：

```text
schema 预设层（键 → fl:* 预设） < 标签（template attrs）
```

- `field`（位置）在预设层与标签间**同轴近的赢**；标签值直接覆盖预设值，非法值在渲染时落回 `'auto'`（当前实现不做「非法回退到预设」）。control 的 `formless.field`（体）**不在这条链上**：它在渲染时读取并与位置合成（§8）。
- `model` / `prop` / `item` 同样由标签覆盖 schema（工厂壳把它们当预设层，与标签按 `{ ...preset.fl, ...标签.fl }` 合并）。
- **只有 `component` 被锁**：`createFormField` 取 `schema.component ?? 标签.fl:component`——schema 有 `component` 时标签 `fl:component` 不生效。
- 「口 → 位置」的身份映射不走这条链：没有自有 `fl:prop` 时向祖先 `getProp` 取（§7.2 / §16.2）。

---

## 12. 投影与覆盖：props 函数 + overlay

### 12.1 overlay 链

每层宿主的最终 props 由 `mergeAttrs(...layers)` 叠加，**后面的层赢、`undefined` 不覆盖、空字符串是值**：

```text
FormView:   mergeAttrs(form.props(snapshot), hostAttrs（剥掉 v-model 端口）)
FormField（绑定面）: 有 fl:prop → 身份根；否则 prop = 祖先 getProp(model)（§7.2）
FormField（宿主 Item 壳）: mergeAttrs(item.props(snapshot), itemAttrs)   // itemAttrs = item 桶：props 与监听同一袋；裸名不进 Item（§5.2）
FormField（control）:      mergeAttrs(preset props（在 FormFieldCore 里就着 ItemFl 求值）, controlAttrs（裸名）, bindings)
```

`FieldSchema.props` 可能是**快照函数**，attrs 只能装平值，所以它经工厂壳的 `preset` 带进 `FormFieldCore`，由 core 就着自己算出的快照（`model` / `prop` / `field` / extras；`getValues` 尚未实现，§16.3）求值——求值口径因此与 `item.props` 一致（§16.3）。

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
}
```

- `span` 只决定宿主 Col 实宽；`place` 决定行内落位 / 占行模式。（`take` 已否，见 ADR-018。ADR-019 的 `show` / LayoutView `row` 窗口**尚未落地**——当前 `LayoutItem` 只有 `span` / `place`，`LayoutView` 只有 `disabled` / `column`。）
- 归一化：`normalizeColSpan(raw, column)`（`1x` = `24/column`，`max` = 24，clamp 1..24）；`normalizeColPlace`。
- 渲染：`LayoutBlanks(before)` + `HostCol` + `LayoutBlanks(after)`，`disabled` 时直接透传 children。

### 13.3 布局算法（`calculate-layout`）

- `calculateLayout`（paper-tape）：按 `place`+`span` 落地（`place` 同时决定行内落位与占行模式）。
- `calculateBlanks` 算前后空白格。

（ADR-019 的「先切可见集」窗口筛选尚未落地，见 §13.2。）

栅格模数 `GRID_TOTAL = 24`；缺省 `DEFAULT_COLUMN = 1`。

---

## 14. 数据流：读与写

### 14.1 读（FormView → control）

```
FormFieldCore（setup）
  → model = 标签 fl:model ?? schema.model ?? control 静态 formless.model ?? ['modelValue']
  → prop  = 标签/schema fl:prop ?? 祖先 FORM_FIELD_KEY.getProp(model)
  → 每个口 i：access = FORM_FIELD_KEY.access(prop[i])（access 由最近 FormView 提供）
  → bind = { [toCamel(口名)]: access.value.value, ['onUpdate:'+toCamel(口名)]: access.update }  // 即 $bindings
  → v-bind 到 control（或经 slot 的 $bindings）
```

### 14.2 写（control → FormView）

```
control 触发 update:port(value)
  → onUpdate:port = access.update(prop[i])（access 由最近 FormView 提供）
  → access.update → setIn(prop, value)（setIn 由 useFormViewValue 给出）
  → 非 owner 层（inherit）：直接转发祖先 setIn（不建自己的 flush 路径）
  → owner 层：bindPathAccess(bound).setIn
      → pending 累积，nextTick 合并
      → path-access 纯函数 setIn(source.value, prop, value)  // 不可变写：克隆沿途层级
      → 写回 bound → onUpdate:modelValue
```

owner 层的 `bound` 是本层 v-model 口折成的一个 get/set computed：`get` 取受控 `modelValue` 或本地值、`set` 更新本地值并把重建后的整对象交给 `onUpdate:modelValue` listener（`use-form-view-value.ts` 的 `useFormViewValue`）。`bindPathAccess(bound)` 把 `path-access` 的 `getIn` / `setIn` 绑在这条缝上（返回 `PathAccess`）。

关键性质：

- **不可变**：`setIn` 永不 mutate 源对象，克隆沿途每一层（数组 `[...arr]`、对象 `{...base}`）。
- **同 tick 合并**：多个字段同 tick 写入合并成一次 emit。
- **单一写通道**：`FormViewContext.setIn` 是整棵子树唯一的写入口，一路转发到 owner 层的 `setIn` 写入通道；只有 owner 层 emit（否则多层各自从自己的 props 快照重建整值、互相覆盖）。
- **嵌套继承**：嵌套 FormView 无 v-model 时整个源从祖先继承（`value` / `getIn` / `setIn` 都转发），路径始终相对同一个根，所有层同 tick 合并到根。
- **model 源与身份解耦**：`access` 永远由最近的 FormView 回答（经 `FORM_FIELD_KEY` 下行），`getProp` 永远由最近的身份根 FormField 回答；FormField 不闭包 model。

### 14.3 多口

`model: ['start','end']` + `prop: ['a','b']` 时，`bind` 产出 `{ start, onUpdate:start, end, onUpdate:end }`。Field 内 `fl:model='start'` 经祖先 `getProp(['start'])` 只取对应下标的位置，形成单口 `$bindings`。

---

## 15. model path：getIn / setIn / parsePath

`path-access.ts` 分两半：**纯核**（root 每次传入）与**绑定 façade**（root 绑死一次）。

纯核（`path-access.ts`）：

- `getIn(root, path)`：不可变读，缺中间节点读作 `undefined`，不 throw。
- `setIn(root, path, value)`：不可变写，克隆沿途；非法/空 path 原样返回 `root`。
- `parsePath(path)`：路径语法解析。

绑定 façade：

- `bindPathAccess(source)`：把上面这对绑到一个可写源（`WritableSource`：get/set `value`，
  writable computed 或 ref），返回 `PathAccess`（`getIn(path)` / `setIn(path, value)`，
  root 隐式）。`getIn` 读源的当前值；`setIn` 同 tick 合并、nextTick 单次写回源
  （`source.value = next`），是不可变写。FormView owner 层用它（§14.2）。

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
| `create-form-view.tsx` | 根：v-model、可选 Form、页级 LayoutView、provide context |
| `create-form-item.tsx` | 组装宿主 Item：`createFormItem({ component, props })` → `FormItem`（收 FormField 的 `fl` / `item` 两个 prop；`props.fl.item` 为假时直接透传 children） |
| `FormField.tsx` | 内核装配件 `FormFieldCore` + 工厂壳 `createFormField` + 公开标签 `FormField`：`FormFieldCore` 收 `preset` + 五个通道桶（`fl` / `layoutItem` / `layout` / `item` / `control`）做 LayoutItem + 可选 FormItem + control + `$bindings`、按 `fl:field` 选树、v-model 归集、无条件 provide |
| `create-field-component.tsx` | 已无调用点（`createFormFieldComponent` 是死代码，待清理）；`FieldSchemaInput` / `FieldFactoryInput` 类型仍被 `create-form-fields.ts` 引用 |
| `create-form-fields.ts` | 域表工厂，产出 PascalCase Field 标签（每项走 `createFormField`） |
| `injection-keys.ts` | `FORM_VIEW_KEY`、`FORM_FIELD_KEY` |
| `control-binding.ts` | 只剩 `ControlVModel` / `ControlProp` 两个类型 |
| `path-access.ts` / `path-parse.ts` | 不可变 get/set + 路径解析；`bindPathAccess(source)` 把 get/set 绑到可写源上（`PathAccess` / `WritableSource`，§15） |
| `props-overlay.ts` | `resolveProps` / `mergeAttrs` / `HostProps` |
| `dispatch.ts` | 通道表 `CHANNELS`（`fl` / `layout-item` / `layout` / `item`）；前缀由通道名派生（不写字面量常量），kebab → camel 归 `utils.toCamel`；`dispatch(bag, channels, { prefix })`（一次分桶）：每通道一桶 + `default` 裸名残差；`prefix: 'drop'`（默认）= props + 还原成 `onXxx` 的监听同袋，`prefix: 'keep'` = 输入键形原样（可被同一张表再认领，供转发；`default` 两模式一致）；`onXxx` 命名还原（`on` + `upperFirst`）、读键（`resolveKey(raw, channels)`：前缀表全局、按本次认领的 `channels` 过滤，返回 `{ key, type?, channel? }`，认领不到则只余 `key` 落 `default`） |
| `use-form-attrs.ts` | 通道认领的 attrs 关口：`useDispatch(attrs, channels, options?)` → 每桶一个 ref（`BucketRefs<C>`：桶名 = 通道名 camelCase，由 `Channel` 经 `utils.ToCamel` 派生；只给认领的通道建桶）+ 三个通道集：`VIEW_ATTR_CHANNELS`（`fl` / `layout`，`layout-item:` / `item:` 都透传，§5.3）/ `FIELD_ATTR_CHANNELS`（`fl` / `layout` / `layout-item` / `item`）/ `FIELD_SLOT_CHANNELS`（随 render 交给 `dispatch(slots, …)`：`item` 桶 → 宿主 Item 槽，`default` 桶 → control 槽） |
| `utils.ts` | 通用工具（按 lodash 命名，无 formless 语义）：`upperFirst` / `UpperFirst`、`toCamel` / `ToCamel`（kebab → camel，通道名 / 桶名共用）、`omit` / `omitUndefined`、`getAttrBoolean`（Vue 布尔 attr 语义） |
| `control-config.ts` | `ControlFormless` 类型 + `ComponentCustomOptions.formless` 增强（`FormFieldCore` 直接读 `component.formless`） |
| `field-mode.ts` | `isFieldMode` |
| `field-schema.ts` | `FieldSchema` / `ItemFl` / tag props 类型 |
| `use-form-view-value.ts` | 源解析：`useFormViewValue()`（本层 v-model 口 + 祖先源 → `value` / `getIn` / `setIn`，并 provide `FORM_VIEW_KEY`）、`useValueMeta` / `ValueSource` / `PORT_NAMES` / `PORT_EVENTS` |
| `control-props.ts` | control 公开 props 推断（v-model 口剥离） |
| `index.ts` | 公开导出 |

### 16.2 注入键与 Context

vue-formless 内两根注入键，各是一个**作用域**（layout 包另有 `LAYOUT_VIEW_KEY`，见 §13.1）：

| 键 | 提供者 | 装什么 | 消费者 |
|----|--------|--------|--------|
| `FORM_VIEW_KEY` | FormView | 本层运行时 `value` / `getIn` / `setIn` | 嵌套 FormView |
| `FORM_FIELD_KEY` | FormView + FormField（接力） | model 源 `access` + 身份映射 `getProp?` + 壳资源 | FormField |

FormField **只消费 `FORM_FIELD_KEY`**，不再 inject `FORM_VIEW_KEY`。`FORM_FIELD_KEY` 的内容由上层 FormView 与每颗 FormField **共同提供**：

- FormView 供 `access`（model 源）+ `FormItem` / `LayoutView`（壳资源），**不**供 `getProp`——即无条件截断外层身份；
- 每颗 FormField 在 setup 里无条件 provide `{ ...context, getProp }`：`getProp` 由本格自己实现（用本格 `model` / `prop` 映射子级的口名），`access` 与壳资源透传。

**向下只继承绑定维度。** `item` / `field` / `component` / `props` / extras 是**本格物化值**，不参与向下合并——否则组合体的 `item: false` 会传染内层格（背 §9），组合体的 `label` 会盖到内层格。`getProp` 也不继承：它每次都被本格重写。

**身份 = 「本格有没有自有 `fl:prop`」**（不是单独的身份层字段）。有自有 `fl:prop` 即身份根，自声明位置；没有则 `prop = 祖先 getProp(model)`，只按口取位置。`model[i] ↔ prop[i]` 下标对齐。内核**不发身份名**（ADR-011 §6 修订）：工厂域名表的键只当 `fl:prop` 的缺省位置；宿主 `prop` 怎么编、要不要编，是适配层的私事（§10.2）。多口一格时一个宿主 `prop` 装不下，适配层就不绑（`prop: undefined`，ElFormItem 不注册）——该格因此**不参与宿主校验 / 重置**，要宿主校验就把口拆成格（`fl:field="wrap-embed"`）。`FORM_CELL_PORT_KEY` 已删（口切片改由 `fl:model` 承担）。

```ts
/** 嵌套 FormView 继承的读/写源：三个成员同源，都绑在这一层或祖先的 v-model 上。 */
interface FormViewContext {
  value: ComputedRef<unknown>                  // 本源整值（父快照，勿改）
  getIn(path: string): unknown                 // 相对本源的位置读
  setIn(path: string, value: unknown): void    // 相对本源的位置写（唯一写通道，终点在 owner 层）
}

/** FormField 唯一消费的上行上下文（FormView 与每颗 FormField 共同提供）。 */
interface FormFieldContext {
  /** 口名数组 → 对应位置数组（身份映射，由本格 FormField 提供；祖先缺省 = 不存在）。 */
  getProp?(model: (string | undefined)[]): (string | undefined)[]
  /** model 源：按路径读值 + 写回（FormView 提供，FormField 透传）。 */
  access(prop?: MaybeRefOrGetter<string>): { value: ComputedRef, update: (v: unknown) => void }
  FormItem?: Component        // 壳资源（FormView 提供，FormField 透传）
  LayoutView?: Component      // 壳资源（同上）
}
```

**model 源与身份分轴。** 一次绑定解析 = 两步：`model → prop`（`getProp`，本格或祖先）再 `prop → (value, update)`（`access`，最近 FormView）。`access` 只有 FormView 一个回答者；`getProp` 每颗 FormField 都重写（用本格映射回答子级），所以组合体内层格天然接上祖先的口 → 位置映射，而外层身份不会漏进新的身份根。

`FORM_FIELD_KEY` 逐项的存在理由（谁缺了它就做不了什么）：

| 能力 | 缺了会怎样 | 出处 |
|------|-----------|------|
| `access` | 读不出 `$bindings` 值、写不回 | §14.1 |
| `getProp` | 组合体内层格不知道「口对应哪个位置」，`fl:model` 选口无从谈起 | §7.2 / §14.3 |
| `FormItem` | FormField 渲不出宿主 Item 壳（label/error 全丢） | §4.1 / §9 / §12.1 |
| `LayoutView` | `wrap-embed` 无法按工厂 Row/Col 建内层窗口 | §8 |

- **身份根**（自有 `fl:prop`）直接用自己的 `prop`；没有自有 `fl:prop` 的切片**只消费**祖先 `getProp`——保住 ADR-013 的 1 身份 : N 格。
- 临场格 / 裸 `<FormField>` 也是身份根：没有祖先清单，`fl:model` + `fl:prop` 即声明（§7.2）。
- 身份映射只装绑定维度；其余 key 不上行（见上文「向下只继承绑定维度」）。

### 16.3 FormField 的运行时装配

**一颗 Field 的装配只有一份实现：`FormFieldCore`。** 它收 `preset`（工厂壳带来的 `{ fl, props }`）与**五个通道桶**（`fl` / `layoutItem` / `layout` / `item` / `control`）——没有别的私有参数、没有侧信道。两个调用方按同一个动作抵达它：各自 `dispatch` 自己的包，在**桶键空间**里把层叠好再递下去。桶键就是没有前缀的键，所以「层」从头到尾不需要拼回前缀。

```
FormField（公开标签，createFormField() 无预设）：零预设，桶直传
  { fl, layoutItem, layout, item, default: control } = useDispatch(attrs, FIELD_ATTR_CHANNELS)
  h(FormFieldCore, { fl, layoutItem, layout, item, control }, slots)

工厂壳 createFormField({ name, component, props, ...preset })：
  render:
      tag = useDispatch(attrs, FIELD_ATTR_CHANNELS)
      // component / props 解构在外：前者是锁定键，后者走 preset 而不是预设桶
      fl = { ...tag.fl, component: component ?? tag.fl.component }   // 只有 component 锁定
      h(FormFieldCore, { preset: { fl: preset, props }, fl, ...tag 其余四桶, control }, slots)
```

```
FormFieldCore（唯一装配点）：
  props: { preset: { fl, props }, fl, layoutItem, layout, item, control }   // control = 对象或 (formless) => 对象
  setup:
    context = inject(FORM_FIELD_KEY, null)      // 祖先的 access + 身份映射 + 壳资源
    propFormless = { ...preset.fl, ...fl }      // schema 预设 ← 标签 fl（标签近的赢，§11.2）
    model = normalizeModel(propFormless.model) || control 静态 formless.model || ['modelValue']
    prop  = normalizeProp(propFormless.prop)  || context?.getProp?.(model)   // 无自有 prop 才按口解析祖先位置
    bind  = 按口组装 { [toCamel(口名)]: access.value.value, ['onUpdate:'+toCamel(口名)]: access.update }
    provide(FORM_FIELD_KEY, { ...context, getProp })   // 无条件：getProp 本格重写，其余透传
    field = 合成(propFormless.field（外层位置）, control 静态 formless.field === 'embed'（内层体）)   // §8 表
    formless = { ...propFormless, model, prop, field }   // 快照：FormItem 的 fl / 各处 props 函数看到的
  render:
    controlAttrs = { ...resolveProps(preset.props, formless), ...control, ...bind }  // bind 最后：v-model 覆盖同名裸名
    Control = fl.component ? h(fl.component, controlAttrs, controlSlots)
                           : slots.default?.({ $bindings: bind })      // 无 component 时 slot 手写
    field === 'embed'      → pureControl
    field === 'wrap-embed' → LayoutView({ ...layout }) → pureControl
    其余（'wrap'）         → pureControl
    再套 FormItem({ fl: formless, item }, slots)（有壳资源时）→ 最外层 LayoutItem({ ...layoutItem })
```

层叠就是两处**浅合并**（`{ ...preset.fl, ...fl }`、`{ ...preset.props 求值, ...control, ...bind }`）加一处**显式锁定**：`component ?? tag.fl.component`。只有 `component` 不可被标签覆盖；其余 `fl:*`（含 `fl:model` / `fl:prop` / `fl:item` / `fl:field` 与 extras）都是标签近的赢（§11.2）。`fl:field` 缺省时落回 schema 值，值非法时按 `'auto'` 兜底（§8）。

`preset.props` 与 `item.props` 都可能是**快照函数**，必须留到看到 `formless` 之后再求值——`FormFieldCore` 因此不预求值：它拿 `formless`（含标签覆盖后的 `model` / `prop` / `field`）调 `preset.props(formless)`，`FormItem` 则拿同一份 `formless` 当 `fl` 传给 `item.props`。工厂壳因此**不 provide**：身份映射只有 `FormFieldCore` 一处提供。

当前代码的未完成项（O 记为待办）：

- `preset.props(formless)` 的形参还**没有 `getValues`**（`ItemFl.getValues` 无人实现），所以「多口取现值」这类映射暂时写不出来。
- `controlAttrs` 里 `bind` 是**整键覆盖**：同名裸事件会被 `onUpdate:xxx` 直接盖掉，尚未与传入事件融合。
- 公开标签 `FormField` 的 props 类型是 `FormFieldTagProps` 的同义别名（`FormFieldProps = FormFieldTagProps`），没有额外声明。

`prop` / `bind` / `field` / `formless` 都是 `computed`（懒读）：`fl:prop` 可能被标签重述、`access` 来自祖先 FormView，所以位置与 model 都不能在 setup 拍死——`context?.getProp` / `context?.access` 每次现取。

---

## 17. 类型系统

- `NamespacedFields<S>`：把 `Record<string, FieldSchema>` 映射成 `{ Name: FormFieldComponent<...> }`（PascalCase key）。
- `ControlTagProps<Def>`：control 公开 props 剥掉 v-model 口（`LockedVModelKeys`），避免 `<User.Name>` 上写 `modelValue` 覆盖绑定。
- `ComponentPublicProps<C>`：从 Vue 构造器/函数组件推断 `$props`。
- `FlExtraProps<T>`：`label` → `'fl:label'` 的可选标签 props。
- `FieldMode`：`'auto' | 'wrap' | 'embed' | 'wrap-embed'`（写入口径；`'auto'` 省略即跟随 control 的体）。
- `FormFieldProps`：公开 props 类型，当前就是 `FormFieldTagProps` 的同义别名（`ControlTagProps` 再往上叠 control 的公开 props）。
- `FormFieldTagProps`：内核 `fl:`/`layout:`/`layout-item:` 键 + extras 推导（不单独导出）。

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
createFormFields(schema) → NamespacedFields             // 工厂：页级域表
FormField                                              // 临场格 / slot 模式
createLayoutView({ Row, Col, column? }) → LayoutView   // @vue-formless/layout 转出口
LayoutItem                                             // @vue-formless/layout 转出口

// 类型
FormViewProps, FormViewComponent, CreateFormViewOptions
FieldSchema, FieldSchemaExtras, FieldMode, FieldSchemaInput
FormFieldProps, FormFieldComponent, FormFieldSlotProps, NamespacedFields
ItemFl, ControlFormless, ControlProp, ControlVModel, HostProps
CreateLayoutViewOptions, LayoutViewProps, LayoutItemProps, LayoutItemSpan, LayoutItemPlace
```

- `FormView` / `LayoutView` 是工厂**产物**，不作为独立值导出；`FormViewComponent` 仅为类型。
- 私有（不导出，可随内核演进）：`FormViewContext` / `FormFieldContext`、`FORM_VIEW_KEY` / `FORM_FIELD_KEY`、`FormFieldCore` / `createFormField` / `FormFieldTagProps` / `normalizeModel` / `normalizeProp`、`useFormViewValue` / `useValueMeta` / `ValueSource` / `PORT_NAMES` / `PORT_EVENTS`、`getIn` / `setIn` / `parsePath` / `bindPathAccess` / `WritableSource` / `PathAccess`、`resolveProps` / `mergeAttrs`、`dispatch` / `useDispatch` / `CHANNELS` / `VIEW_ATTR_CHANNELS` / `FIELD_ATTR_CHANNELS` / `FIELD_SLOT_CHANNELS`、`createFormItem` / `CreateFormItemOptions`、`isFieldMode`、`FieldFactoryInput` / `FieldSchemaInput`（`create-field-component.tsx` 残留）、`upperFirst` / `toCamel` / `getAttrBoolean`。
- 定制路径只有三条：`$bindings` slot（§7.3）、`fl:component` 临场格（§7.4）、module augmentation（§18）——都不需要够到内核。

---

## 20. 实现要点与边界

1. **通道声明一次**：`dispatch` 一次分桶，每个调用点（`use*`）声明自己认领的通道，同一通道不落两袋；一个通道的 props 与监听永远同去一个目标。
2. **formless 内核不预声明** `label` / `validate`（这些是 extras）。
3. **`fl:span` 丢弃**（开发态 warn）：宽走 `layout-item:span`。
4. **Col 只吃数字 `span`、Row 只吃 `gutter`**：`:fl:span` 已否。
5. **页面 `<FormField>` 临场格**可写 `fl:item` / `fl:prop` / `fl:model` / `fl:component`；格上宽用 `layout-item:*`。
6. **不公开** `FormView.Layout` / `FormView.Item`；**不开放**自定义 merge / 自定义前缀；**没有** `form:` 前缀（当前无需从字段够到宿主 Form）。
7. **组合体只写体**：`formless: { field: 'embed', model: [...] }`（体，不是位置）；要把它包成一格并拿到内层窗口，位置显式写 `'wrap-embed'`——**没有**「`'wrap'` + 组合体 → `'wrap-embed'`」的自动升格；control 漏报时也用 `'wrap-embed'` 逃生（§8）。
8. **两层作用域各只装自己那点东西**：`FORM_VIEW_KEY` = 嵌套 FormView 的读/写源（`value` / `getIn` / `setIn`）；`FORM_FIELD_KEY` = FormField 的上行上下文（`access` / `getProp?` / 壳资源），由 FormView 与每颗 FormField 接力提供（`getProp` 每颗都重写）。身份映射不上行任何其它 key（§16.2）。
9. **内核不发身份名**（ADR-011 §6 修订，v1 范围）：snapshot 只给归一化数组 `model` / `prop`（下标对齐，§10.1）；声明的 `getValues()` 目前**尚未实现**（见 §16.3 待办）。宿主 Item 的 `prop` 是**纯适配编码** —— 单口 → 位置；多口一格 / 位置编不出来 → **不绑**（`undefined`，宿主不注册该格，也不校验 / 不重置）。要宿主校验就把口拆成格（`fl:field="wrap-embed"`）。

---

## 21. 落地顺序建议

1. 词表与类型：`FormField` 上位（`FormItem` 移除）、`fl:field`、通道常量改名。
2. `channels.ts` / `attrs.ts`：前缀常量与 bag 改名（`row:`→`layout:`、`col:`→`layout-item:`）。（已落地）
2b. **通道分发合一**（已落地）：`channels.ts` / `attrs.ts` / `slots.ts` 三个文件合并为 `dispatch.ts`（通道表 + 前缀派生 + 一次分桶原语）+ `use-form-attrs.ts`（通道集由这层持有），`pickAttrs` / `omitAttrs` / `splitSlots` 退场；`getAttrBoolean` 归 `utils.ts`。此前 2b 的 `splitFlAttrs` / `takePrefixed` / `splitFormlessProps` / `useFormlessProps` / `item-fallthrough.ts` 退场与响应式包装回调用点不变。

2c. **`useDispatch` 统一 + `keep` 投影**（已落地）：`useFormViewAttrs` / `useFormFieldAttrs` 两个 hook 合成 `useDispatch(attrs, channels, options?)`，桶名由 `Channel` 经 `ToCamel` 派生（`layout-item` → `layoutItem`），通道集改为导出的 `VIEW_ATTR_CHANNELS` / `FIELD_ATTR_CHANNELS`（`FIELD_SLOT_CHANNELS` 不变，`dispatch(slots, …)` 照旧）；`dispatch` 增可选 `{ prefix: 'keep' | 'drop' }`（默认 `'drop'`），`keep` 保留输入键形、可被同一张表再认领，供父组件把某通道原样交给子组件。行为不变，属重构 + 新投影。
3. `FormCell.tsx` → 并入 `FormField.tsx`：绑定下沉、`$bindings` 输出、支持 `fl:component`、删 `useFormCell`。
4. `injection-keys.ts`：`FORM_FIELD_KEY` 值改为 `FormFieldContext`；`FormField.tsx` 只 inject `FORM_FIELD_KEY`、无条件 provide；工厂壳改为纯「schema → `fl:*` 预设 attrs」，无私有参数。（后修订：装配件抽成 `FormFieldCore`，收 `preset` + 五个通道桶；工厂壳不再预求值 `props`，改由 core 就着同一份快照求值——见 §16.3。再后修订：`field-identity.ts` 退场，身份 / 快照逻辑并入 `FormFieldCore`；`FormFieldContext` 收敛为 `access` / `getProp?` / 壳资源；`getModelBinding` / `getPropBinding` 两名作废——见 §16.2。）
5. **裸名口径对齐 §5.2**：FormField 的宿主 Item 不再吃裸名（`item:*` 才有），工厂求出的 control props 因此不会漏到 ElFormItem 上；`fl:label` 走快照 → 适配 Item `label`。
6. `field-schema.ts`：`ItemFl` 拆平（去掉 `binding`，暴露 `model` / `prop`）；适配器 `props` 函数跟进（playground `toEpItemProps`）。（已落地）
7. `create-form-view.ts`：`layout.column` → `layout.props`（函数形式）。
8. `FormField.tsx`：`switch(tree)` 键名跟进（已落地）。
9. layout 包：`LayoutCell` → `LayoutItem`。
10. 测试 / playground / README / 旧 ADR 交叉标注。
11. **废 `fl:key` / `ItemFl.fieldKey` / `fieldIdentityKey`**（ADR-011 §6 修订，已落地）：内核不再下发身份名；宿主 `prop` 归适配层自决，多口一格不绑宿主（§20.9）。`fl-keys.ts`（`omitShellKeys` / `SHELL_KEYS`）随之删除（已落地）。
