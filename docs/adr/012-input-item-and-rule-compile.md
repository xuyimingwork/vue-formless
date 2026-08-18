# ADR-012：输入、Item 与校验合成

- **状态**：Accepted（修订）
- **日期**：2026-08-18
- **修订**：
  - 2026-08-18 — 标签配置收进 `:formless`；顶层 attrs / 事件 / 无前缀槽给输入；Item 事件 `@item:xxx`。
  - 2026-08-18 — Schema `validation`；`:formless.validate`；`toItemProps`；去掉标签换 `component`、去掉 `bare`。
  - 2026-08-18 — Item 原生 props 走 `:item:xxx`，盖在 `toItemProps` 上。
  - 2026-08-18 — Control 只渲染输入，壳由 FormView 注入的 `wrap` 包；Item/Col 不进 FormContext。
  - 2026-08-18 — 整表 `disabled` 走宿主表单；FormView 不再广播 `readonly` / `disabled`。
- **来源**：相对 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md) / [ADR-010](./010-controls-as-semantic-cluster.md) 的后续收口（`component` 接什么、Item 挂在哪、规则与策略如何变成宿主 `rules`、一颗标签如何分流）

## 背景

`<User.Xxx />` 在 DOM 上会变成三层：可选的列格子、表单项（label / 错误）、真正的输入。推演与实现曾把后两层焊进 `component`（如 `epField(ElInput)` 产出 FormItem + 输入），并让 control 上的 `rules` 原样成为 `ElFormItem` 的规则数组。

后果：

- 接入一颗业务控件（`AgencySelect`、`AgencyList`）必须先包 FormItem，税高，也和各家「Input 不管 label / error」的拆法拧着
- 身份规则、本场必填、`trigger` 焊在同一份 Element `RuleItem` 上，筛选和编辑无法点同一套 `<User.Mobile />` 而策略不同
- 若把 `span` / `required` / `label` 做成顶层保留字，输入自己的同名 props 被封死，Item 侧也无法加字段

需要钉死：`component` 是谁、Item 挂在哪、两边约束在哪合成、标签上 **Formless 配置** 与 **输入自身 API** 如何分开，且不假定内层是 `ElInput`。

## 决策

### 1. `component` 只接输入

control 的 `component` 是 **只谈 v-model 的控件**（可带业务 `props` / 自己的插槽）。**不含** FormItem。

```ts
name: { label: '姓名', component: ElInput }
agency: { label: '机构', component: AgencySelect }
```

| 交给输入 | 不交给输入 |
|----------|------------|
| `v-model` 口（[ADR-011](./011-model-and-path.md) 的 `model`） | `label` |
| `disabled` / `readonly` | `validation`、错误展示 |
| placeholder、options、控件自己的槽 / 事件 | Item 的 `prop`、Col 的 `span` |

`ElSelect` + `options` → 选项列表 这类薄封装仍算输入侧适配，和 FormItem 不是一层。换控件位写在本页 `createFormControls`，**标签不得覆盖 `component`**。

### 2. Item 投影挂在 `createFormView`

与 Row/Col 同一条适配缝，项目级一次：

```ts
createFormView({
  Row: ElRow,
  Col: ElCol,
  Item: ElFormItem,
  toItemProps: (ctx) => /* 宿主 Item 的原生 props */,
})
```

渲染顺序：`Col?` → `Item(toItemProps(…))` → `component(v-model, …)`。Control **不** `h(Item)` / `h(Col)`：FormView 把宿主组件闭包进 `wrap`，控件只交 body 与 `:formless` / `:item:` 快照。Item/Col 不得放进深 `reactive` 的 FormContext（会把组件做成 Proxy，渲染栈溢出）。

- **Col**：仅当 `layout` 托管时包。整段退出托管：该 `FormView` 不写 `layout`，手写 Row/Col。单格 `bare` **暂不开放**。
- **Item**：同时提供 `Item` + `toItemProps` 则包（**与是否托管栅格无关**）。内核 **不**写死 `label` / `prop` / `rules` / `required`。无 Item 时不套表单项。
- **输入**：始终是 Schema 上的 `component`

`toItemProps` 吃的是 Formless 已合并快照（`label`、`validation`、`validate`、`formItemProp`、`:formless`），产出宿主 Item props。编 ElForm `rules` 是 Element 适配的内部细节，不是内核插件点。

外层仍用业务侧 `el-form` 做 `validate()` / `resetFields()` 宿主（[ADR-004](./004-form-layout-and-context.md)）。

单格跳过 Item（块级 `AgencyList`）暂不作为默认能力。

### 3. `validation` 在 Schema，策略在 `:formless.validate`

**静态（ControlSchema）**：这个输入会什么。校验收成一组 `validation`，不要和 `component` / `label` 平铺，也不要叫 `rules`（以免像 ElForm）。**不得**出现 `required: true`、`trigger`。标签 **不能** 覆盖 `validation` 或 `component`。

```ts
mobile: {
  label: '手机',
  component: ElInput,
  validation: {
    empty: { /* trim / 非空 */, message: '请输入手机号' },
    format: { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
  },
}
```

一个控件绑两端时，区间约束仍写在该 control 的 `validation` 上。

**运行时（`:formless`）**：这场怎么用。覆盖静态同名键（`label` / `prop` / `path`）+ 仅此场（`validate` / `span`）：

| `:formless.validate` | 含义 |
|----------------------|------|
| 不写 / `'optional'` | 选填：空不报；**有值仍跑格式** |
| `'required'` | 必填：空值 + 格式 |
| `'none'` | 本场不跑 |

**投影**：`toItemProps(snapshot)` → Item 原生 props。跨格约束仍走页面 / 提交。

### 4. 两条通道：`:formless` vs 输入自身

模板仍是 `<User.Name />`。生成组件只声明 **一个** 配置 prop `formless`（可拓展，不占输入的名字）；其余 attrs / 事件 / 无前缀槽全部给 `component`。

```vue
<User.Name
  :formless="{ validate: 'required', span: 12, label: '姓名' }"
  :item:label-width="123"
  placeholder="请输入"
  clearable
  @blur="onBlur"
  @item:validate="onItemValidate"
>
  <template #append>查询</template>
  <template #[`item:label`]>
    姓名 <el-tooltip />
  </template>
</User.Name>
```

| 能力 | 通道 | 覆盖 |
|------|------|------|
| 改接线 / 文案 | `:formless` 同名键 | `label`、`prop`、`path` |
| 此场策略 / 布局 | `:formless` 仅运行时键 | `validate`、`span`（`bare` 暂无） |
| 改输入自己的面 | 顶层 attrs / `@blur` / 无前缀槽 | `placeholder`、`#append`、`#item` |
| Item 面 | `:item:xxx` / `@item:xxx` / `` #[`item:xxx`] `` | Item 的 props / 事件 / 槽 |

不可在标签覆盖：`component`、`model`、`validation`。

簇里的 `props` 与顶层 attrs 合并后给输入。整表禁用走宿主表单（如 `el-form disabled`）；单格 `disabled` / `readonly` 是输入自己的 attrs，不经 FormContext 广播。

`:item:xxx` 是宿主 Item 原生 props（如 `label-width`），**不是** Formless 语义。默认 Item 形状仍由 `toItemProps` 投影；`:item:` 盖在投影结果上（可盖掉 `label` 等）。不要把各家 Item 长尾塞进 `:formless`。

### 5. Item 前缀协议

内层不一定是 Input。内核 **不按 ElInput 分类槽名**，也不为未知 Item 写死白名单。

```text
属性 item:xxx        → Item 的 xxx（`:item:label-width` → `label-width`）
槽 /^item:(.+)$/     → Item 的 slot $1
事件 onItem:xxx      → Item 的 onXxx（`onItem:update:modelValue` → `onUpdate:modelValue`）
其余 attrs / 槽 / 事件 → component 原名
```

合并顺序：`toItemProps(快照)` → `:item:` attrs → `@item:` 事件。

Item 的 **default** 由内核填入控件，用户从不提供。规范槽写法只认 `` #[`item:label`] ``（静态 `#item.label` 是 v-slot 修饰符，已否）。`:item:label-width` 与 `@item:validate` 都是 Vue 一等带冒号绑定，不必方括号。

## 备选方案

1. **`epField` 把 FormItem 焊进每颗 `component`**：接入税高。已否。
2. **control 上直接写 ElForm `rules` 数组**：已否。Schema 用 `validation`。
3. **顶层保留字 `required` / `span`**：已否；改为一只袋子 `:formless`。
4. **标签覆盖 `component`**：先点名再整颗替换，语义拧。已否。
5. **`:formless.bare`**：单格退出托管尚未定用法，暂不开放。整段不写 `layout` 即可手写栅格。
6. **内核 `toRules` 只编 `rules` 数组**：假定所有 Item 都有 `rules` prop。已否；改为 `toItemProps`。
7. **按 ElInput 分流槽 / 双前缀 / 开放 `item-*` / 内核白名单 Item 槽**：已否。`item:` 机械转发。

## 后果

- **正向**：业务控件按 v-model 接入；Item 形状全在适配层；校验身份与这场策略分离；输入 API 不被偷名。
- **代价**：日常写成 `:formless="{ validate: 'required' }"`；`:item:` / `` #[`item:label`] `` 无 Volar 补全。
- **关联**：语义簇见 [ADR-010](./010-controls-as-semantic-cluster.md)；栅格见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)；命名空间标签见 [ADR-003](./003-namespaced-field-components.md)；绑定见 [ADR-011](./011-model-and-path.md)；控件单元见 [ADR-005](./005-view-model-as-unit.md)。
