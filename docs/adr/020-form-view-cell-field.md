# ADR-020：FormView / FormCell / FormField 与 `cell` 三态

- **状态**：Accepted
- **日期**：2026-09-08
- **来源**：layout 抽离之后 formless 结构对照；相对 [009](./009-controls-as-protagonist.md) / [012](./012-input-item-and-rule-compile.md) / [013](./013-one-control-multiple-items.md) / [017](./017-composite-item-self.md) 的词表与壳模型重写。
- **废止**：[017](./017-composite-item-self.md)（`item: 'self'`、`wrapCol` / `extraRow`、四档壳表）。013「一颗身份、N 格」仍成立，组装改由本文 `cell` 三态表达。
- **库尚未发 1.0**：词汇准确优先于兼容；允许整表更名。

## 背景

layout 已经解决栅格：`LayoutView` 管行与开关，格子登记进 View，算法在 `calculate-layout`。formless 本应只做三件事：

1. 把参数分给宿主 Form / Item / Input / LayoutCell
2. 把 v-model 归集到 FormView
3. 输入自包含格子时，按配置挂树（进页 Row，或外层再包一格并套内层 LayoutView）

现状却把「包不包 Col / 要不要内层 Row」做成 `resolveControlShell` 真值表，用 `ControlFrame` + `useFormItem` 函数装配代替组件树。对照 layout（View + Item 对偶、文件即概念），formless 读起来乱。

乱的根不是「表单比栅格难」，而是 **一个词同时指三层东西**：

| 写法 | 实际动的 |
|------|----------|
| `item: false` | 不要宿主 ElFormItem，**格子还在**（表单构建里去 label） |
| `item: 'self'` | 不要 **外层整颗壳**（Item+Col），格子画在 component 里 |
| 内核 `FormItem` | 又是格子又是 ElFormItem 的壳 |

`defineOptions.formless` 与 schema 应是 **同一份配置、两档优先级**。`'self'` 写在组件上像自述，写进 schema 则不通。`composite` / `control` 用户想不到。把 `item` 做成 `true | false | 'self'`，是在装饰开关上编码结构身份。

布局开不开是 **LayoutView** 的事。`LayoutCell`（原 LayoutItem）没有独立 `disabled`。FormCell 再留格级 layout 开关，等于把 layout 的职责抢回来。

## 决策

### 1. 词表（两套平行叙事）

```text
布局                表单
LayoutView          FormView
LayoutCell          FormCell
                    FormField
```

| 名字 | 就是 | 不是 |
|------|------|------|
| **LayoutView** | 一行栅格窗口（Row、登记、`disabled`） | 表单 |
| **LayoutCell** | 一格 Col + blank | 表单项、字段 |
| **FormView** | 表单根：v-model、可选宿主 Form、页级 LayoutView | 格子 |
| **FormCell** | 一格表单 UI：`LayoutCell` + 可选 ElFormItem | 数据字段、Input、组装模式 |
| **FormField** | 一颗可声明、可摆放的绑定单元（模板上的 `<User.Name />`） | HTML 的 input；MUI 的 FormControl |
| **Input** | schema / 工厂的 `component`，只谈 v-model | 格、壳 |
| **Item** | 仅宿主 ElFormItem（label / error） | 内核组件名 |

HTML 的 form control = Input。MUI FormControl ≈ FormCell。本库 1.0 **不**再用 FormControl 当公开主词。

[ADR-009](./009-controls-as-protagonist.md) 否掉的是 **键跟 DTO 走**（`User.AgencyId`），不是英文 Field 不能用。工厂改为 `createFormFields`；**键仍是控件名** `agency`，不是 `agencyId`。中文说「表单域 / 控件」，不要写成「接口字段」。

公开作者面：`FormView`、`FormCell`、`createFormFields`。embed 内部：`useFormCell(port)`。`FormField` 是内核组装件（工厂产出的标签就是一颗 Field）。

旧名 → 1.0：

```text
LayoutItem              → LayoutCell
FormItem                → FormCell
FormControl             → FormField
FormView.Item           → FormCell
useFormItem             → useFormCell
createFormControls      → createFormFields
item: 'self'            → cell: 'embed'
ControlSchema           → FieldSchema
controlKey              → fieldKey（实现层一并改）
```

### 2. FormCell = 始终 LayoutCell，可选 ElFormItem

手写 `<FormCell>` 时，预期 **具备布局**。因此 LayoutCell **划归 FormCell**，不由 FormField 单独决定 `wrapCol`。

```text
<LayoutCell span place>
  { itemOn ? <HostItem>{slot}</HostItem> : slot }
</LayoutCell>
```

- **没有** FormCell 上的 layout / Col 开关。开不开栅格跟最近 LayoutView；无 inject 或 View `disabled` 时 LayoutCell 已透传。
- 宿主 Item 来自 FormView 工厂 `item.component`（inject）。没绑则永远只留 LayoutCell。
- **`item: boolean` 只关/开这一格里的 ElFormItem。** `item: false` = 有格、无 label/error。不是「不要 FormCell」。
- `wrap-embed` 的内层 LayoutView **不进 FormCell**。由 FormField 放进外层 FormCell 的 default slot。

`item` 合并（只这一格、只 boolean）：标签 `fl:item` > schema `item` > 页 `FormView :fl:item`。没写 ≠ `true`（跟页）。`'self'` 非法。

FormContext 给 Cell 的是 `Item` + `itemProps` + `item`（本层 `:fl:item`），**不是** `wrap()` 函数。`createControlWrap` 并进 FormCell。

Props：`col:span` / `col:place` → LayoutCell；无前缀 attrs → 宿主 Item（临场格）；`fl:item`；临场 `fl:prop` + slot `{ field }`。与 layout 一样并列导出（`FormView` + `FormCell`），不挂 `FormView.Cell`。

### 3. FormField 与 `cell` 三态

FormField 做传参、v-model 归集，并按 **一个键、三个字面量** 组树。省略 = `'wrap'`。

`defineOptions.formless` 与 FieldSchema **同一份 bag**（含 `cell` / `item` / `model` / `prop` / extras），近的赢：**整颗 `cell` 替换**，不做 `wrap`∪`embed` 智能合并。

```ts
cell?: 'wrap' | 'embed' | 'wrap-embed'
item?: boolean
model?: string | string[]
prop?: string | string[]
```

| `cell` | 树 |
|--------|----|
| `'wrap'` | `FormField → FormCell → Input` |
| `'embed'` | `FormField → Input`（内部 FormCell 进 **页** LayoutView） |
| `'wrap-embed'` | `FormField → FormCell → LayoutView → FormCell…` |

```text
wrap:
  FormCell
    Input

embed:
  Input
    FormCell FormCell     ← 登记进页 LayoutView

wrap-embed:
  FormCell                ← 外层格；:col:span / :col:place
    ElFormItem?           ← 这一格的 item（分组 label）
      LayoutView          ← context 里同一颗工厂 LayoutView；:row:*
        FormCell → Input
        FormCell → Input
```

内核 `switch (cell)`，**没有** `wrap && embed`。配错就按错的树渲（套娃、裂格、少壳），不补救。

组合体只写身份：

```ts
defineOptions({
  formless: { cell: 'embed', model: ['start', 'end'] },
})
```

分组壳必须显式第三种，不能在 `embed` 上再写 `wrap` 指望拼出来：

```vue
<Range.DateRangeTwo :fl:cell="'wrap-embed'" col:span="max" />
```

标签 `:fl:cell="'wrap'"` 盖住 widget 的 `'embed'` 会变成叶子树——这是配置错误。

`:row:column` / `:row:gutter` 只对 `'wrap-embed'` 的内层 LayoutView 有效；打在 `'wrap'` 叶子上忽略（可 warn）。内层 LayoutView **不**继承页 `:fl:layout` / `:row:column` / 工厂 `layout.column`：省略则用 LayoutView 自身缺省（与 layout 包嵌套约定一致）。

`useFormCell(port)`：同一颗 FormCell，binding 切到该 v-model 口。无参 FormCell 给临场格。禁止再为「外包」维护 `ControlFrame` / `getFrame()`。

### 4. FormView

仍：v-model 归集（嵌套可 inherit）、可选宿主 Form（`fl:form` auto）、页级 LayoutView（`:fl:layout` 只做 boolean 开关；密度工厂 + `:row:*`）。

provide：`model` / `update`、宿主 `Item` + `itemProps`、本层 `item`、工厂 `LayoutView`（wrap-embed 新建内层窗口）。**不** provide `wrap`、页 `layout` 开关、工厂 `column`；**不**让 FormCell 读 layout 决定是否包 Col。

### 5. 实现结构（目标）

组件树 = 概念树 = 文件树：

- [`FormView`](../../packages/vue-formless/src/FormView.tsx) / `createFormView`：根
- [`FormCell`](../../packages/vue-formless/src/FormCell.tsx)：一格
- [`FormField`](../../packages/vue-formless/src/FormField.tsx) + [`create-form-fields.ts`](../../packages/vue-formless/src/create-form-fields.ts)：薄工厂，每项挂一颗 Field
- 纯函数保留：`control-model`（可改名 field-model）、`form-model-writer`、`overlay-props`、`model-path`

删除或收掉：`resolveControlShell` 的 `wrapCol` / `extraRow` / `'self'`、`wrap-control.ts`、`ControlFrame`、工厂里剥两遍 attrs 再塞 frame。前缀剥一次，变成 FormCell / Input / 内层 LayoutView 的真 props。

建议落地顺序：

1. 词表与类型：`cell` 三态、`item` 仅 boolean；LayoutCell 导出对齐。
2. FormCell：inject Item、始终 LayoutCell；临场格测试。
3. FormField：`switch (cell)` + binding/overlay；工厂改 `createFormFields`。
4. DateRangeTwo：`cell: 'embed'`；分组 demo：`:fl:cell="'wrap-embed'"`。
5. 删旧壳路径；修订 009/010/012/013/015 用词。

## 备选方案

1. **保留 `item: 'self'`**：组件上能读，schema 上怪；与 `item: false` 撞名。否。
2. **`wrap` + `embed` 两 boolean，内核 AND 出第三种树**：标签写 `wrap` 能「保留」widget 的 embed。否——同一键无法表达三种树的整颗替换；要第三种树就写 `'wrap-embed'`。
3. **`type: 'input' | 'control'`**：身份诚实，但做成作者开关不像原子配置；`cell` 三态同时描述树，不必再加 type。
4. **FormCell 上再加 layout 开关**：与 LayoutView 契约重复。否。
5. **删掉 `item: false`**：FormCell 永远带 ElFormItem。会失去「去 chrome、留格」；若再把 `item: false` 理解成「不要 FormCell」，叶子会丢布局。保留 boolean `item`，只让它指 ElFormItem。
6. **继续用 FormControl**：与 HTML form control 相反，与 MUI FormControl 也不齐。1.0 改 Field。
7. **运行时探测内部是否已有 FormCell**：ADR-017 已否（Vue 3.6 dry-run、setup 两次）。仍靠静态 `cell`。

## 后果

- **正向**：layout 与 formless 同构（View/Cell）；`item` 与 `cell` 各管一层；组合体配置在 schema 里说得通；配错可见，内核不再用真值表模拟第三种树。
- **代价**：017 / 工厂 / playground 整表更名；作者要记住分组壳写 `wrap-embed`；009 的「控件表」中文叙事要改成「域 / Field」，并继续强调键不是 DTO。
- **关联**：009（主角仍是可摆放单元，英文改 Field）；010（工厂改名，仍不是表单 schema）；012（component 仍只接 Input；壳是 FormCell）；013（基数仍 1 Field : N Cell）；015（通道加 `cell`，去掉 `'self'`）；016（overlay 不变）；008（FormView 职责不变，格子改 Cell）。
- **不纳入**：公开 `FormView.Layout`；格级 `:fl:layout`；`item: 'self'`；内核合并 wrap+embed。
