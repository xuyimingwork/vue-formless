# ADR-012：输入、Item 与校验合成

- **状态**：Accepted（修订）
- **日期**：2026-08-18
- **修订**：
  - 2026-08-18 — 标签配置收进 `:formless`；顶层 attrs / 事件 / 无前缀槽给输入；Item 事件 `@item:xxx`。
  - 2026-08-18 — Schema `validation`；`:formless.validate`；`toItemProps`；去掉标签换 `component`、去掉 `bare`。
  - 2026-08-18 — Item 原生 props 走 `:item:xxx`，盖在 `toItemProps` 上。
  - 2026-08-18 — Control 只渲染输入，壳由 FormView 注入的 `wrap` 包；Item/Col 不进 FormContext。
  - 2026-08-18 — 整表 `disabled` 走宿主表单；FormView 不再广播 `readonly` / `disabled`。
  - 2026-08-19 — 「一颗 control 只 wrap 一次」由 [ADR-013](./013-one-control-multiple-items.md) 修订：默认仍如此；复合体可多次 `useFormItem`。关壳见 [ADR-017](./017-composite-item-self.md) `item: 'self'`。
  - 2026-08-19 — 多口 control 的宿主校验见 [ADR-014](./014-multi-vmodel-host-validation.md)。
  - 2026-08-19 — `Form` / `Item` 均为适配组件 + slot；内核填 default、决定是否跳过壳。`toItemProps` 不再是 `createFormView` 选项。无公开 `FormLayout`。见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)。
  - 2026-08-19 — wrap 把 `snapshot` 交给 Item；实例 `form` / `item` 开关见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)。
  - 2026-08-19 — snapshot 给 `binding` + `getValues()`，不预计算宿主 `prop`。编码在适配 Item（与 Form 投影键对齐）。见 [ADR-014](./014-multi-vmodel-host-validation.md)。
  - 2026-09-14 — snapshot 不再给身份名（`fieldKey` 废，见 [ADR-011](./011-model-and-path.md) 修订）：多口一格时适配层写出 `prop: undefined`（宿主不注册 / 不校验），不再有「控件键 + 投影」兜底。
  - 2026-08-25 — 丢掉 `:formless` 袋。通道改为 `fl:` + Form/Item `props.fl`；`:item:` 仍只给 `User.Xxx`。内核不再导出 `identity-rules`。见 [ADR-015](./015-formless-config-groups.md)。
  - 2026-08-26 — Form/Item 不再吃 `props.fl`。转化是 `item.props` / control `props`（对象或函数）；覆盖见 [ADR-016](./016-fl-project-and-overlay.md)。
  - 2026-09-01 — 无 Col：不开 FormView `:fl:layout`，或 `'self'` 外层；不再用 schema `layout: false`。
  - 2026-09-09 — `component` 仍只接 Input；壳是 FormCell；组合体 `cell` 三态见 [ADR-020](./020-form-view-cell-field.md)。`item` 仅 boolean（ElFormItem）。
  - 2026-09-24 — **最终收束**：`:formless` 袋 → `fl:*` 逐键平铺；`FormCell` → `FormField`；`item: 'self'` 已废；`useFormItem` 未落地（内层格写 `<FormField fl:model>`）；壳通道为 `item:` / `layout-item:` / `layout:` + 裸名；只有 `component` 被工厂壳锁死，`model` / `prop` / `item` / `field` 标签可覆盖（见下）。
- **来源**：相对 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md) / [ADR-010](./010-controls-as-semantic-cluster.md) 的后续收口（`component` 接什么、Item 挂在哪、规则与策略如何变成宿主 `rules`、一颗标签如何分流）

## 最终状态（2026-09 收束）

本文的分工结论仍成立（`component` 只接输入；Form / Item 由 `createFormView` 工厂绑宿主；`validation` 是 schema 静态，`validate` 是 use-site 策略），词表与通道按 `design.md` 收束：

| 本文 | 最终 |
|------|------|
| `:formless="{ … }"` 袋 | `fl:*` 逐键平铺（`fl:label` / `fl:prop` / `fl:model` / `fl:item` / `fl:field` / `fl:validate`） |
| `:formless.validate` | `:fl:validate` |
| `:item:xxx` / `@item:xxx` / `#[item:xxx]` | 不变（宿主 Item 通道） |
| `:col:span` / `:col:place` | `layout-item:span` / `layout-item:place` |
| `:row:*` | `layout:*` |
| `FormCell` | `FormField`（`FormItem` 只指宿主 ElFormItem） |
| `item: 'self'` / `:formless.bare` | 已废；关壳写 `fl:item="false"`，组合体只写体 `formless.field: 'embed'` |

**「标签不得覆盖」只剩 `component`**：工厂壳取 `schema.component ?? 标签.fl:component`（`design.md` §11.2）。`model` / `prop` / `item` / `field` 现在都由标签覆盖 schema——本文「不可在标签覆盖 `model`」一句按代码作废。`validation` 仍不在标签上覆盖（它是 schema 静态键，`fl:` 上没有对应标签）。

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

`ElSelect` + `options` → 选项列表 这类薄封装仍算输入侧适配，和 FormItem 不是一层。换控件位写在本页 `createFormFields`，**标签不得覆盖 `component`**。

### 2. Form / Item 挂在 `createFormView`；slot 由内核填

与 Row/Col 同一条适配缝，项目级一次：

```ts
createFormView({
  layout: { Row: ElRow, Col: ElCol },
  form: { component: ElForm },
  item: { component: ElFormItem, props: toEpItemProps },
})
```

`form.component` / `item.component` 可以是裸宿主。内核：

```text
h(Form?, { ...form.props(fl), ...attrs }, { default: () =>
  Row?（:layout）→ 字段
})
每格 wrap：h(Col?, { span }, () => h(Item?, { ...item.props(fl), ...item: }, { default: () => 输入 }))
```

- **body 由 formless 渲**：`slots.default` 一定是字段树或输入。适配只 `h(ElForm, …, slots)` / `h(ElFormItem, 转换(snapshot), slots)`，必须转发 default。
- **无 Form / 无 Item / 无 Col**：内核 **不** `h()` 那一层（工厂不传、`:form="false"` / `:item="false"`、schema `item: false` / `'self'`、不开 `layout`）。不要在适配里 `if` 丢掉 default。
- Control **不** `h(Item)` / `h(Col)` / `h(Form)`。Item/Col/Form 不得放进深 `reactive` 的 FormContext。
- 内核 **不**写死 `label` / `prop` / `rules`；转换是工厂 `item.props`（playground `toEpItemProps` / `toEpRules`）。snapshot 给 `binding`、`getValues()`、`validation` / `validate`（2026-09-14 起不含身份名）；宿主 `prop` 由 `item.props` 纯编码（单口 → 位置；多口一格 → `undefined` 不绑宿主，见 [ADR-011](./011-model-and-path.md) 修订 / [ADR-014](./014-multi-vmodel-host-validation.md)）。见 [ADR-016](./016-fl-project-and-overlay.md)。
- `:item:` attrs 盖在适配转换结果上（协议见 §5）。

有 `Form` 时页面 **不**手写 `el-form`；`validate()` / `resetFields()` 走 FormView expose。整表 `disabled` 是落到 `Form` 的 attrs。无 `Form`（表格、非表单）字段树照渲。

单格跳过 Item（`AgencyList`、schema `item: false`）由 formless 不 `h(Item)`，不是 `:formless.bare`。

不把栅格拆成公开的 `FormLayout`（[ADR-008](./008-form-view-vmodel-and-grid-gcd.md)）。

### 3. `validation` 在 Schema，策略在 `:fl:validate`

**静态（FieldSchema）**：这个输入会什么。校验收成一组 `validation`，不要和 `component` / `label` 平铺，也不要叫 `rules`（以免像 ElForm）。**不得**出现 `required: true`、`trigger`。标签 **不能** 覆盖 `validation` 或 `component`。

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

一个控件绑两端时，区间约束仍写在该 control 的 `validation` 上。多口时宿主 `value` 与口值 getter 见 [ADR-014](./014-multi-vmodel-host-validation.md)。

**运行时（`:fl:`）**：这场怎么用。覆盖静态同名键（`label` / `prop`）+ 仅此场（`span`）：

| `:fl:validate` | 含义 |
|-----------------|------|
| 不写 / `'optional'` | 选填：空不报；**有值仍跑格式** |
| `'required'` | 必填：空值 + 格式 |
| `'none'` | 本场不跑 |

**投影**：适配 Item 把 snapshot 转成宿主 props。跨格约束仍走页面 / 提交。多口见 [ADR-014](./014-multi-vmodel-host-validation.md)。

### 4. 两条通道：`fl:` vs 输入自身

模板仍是 `<User.Name />`。所有 `fl:*` 键都是**平铺的标签 props**（没有 `:formless` 袋子）；不在 `fl:` / `item:` / `layout:` / `layout-item:` 里的 attrs / 事件 / 无前缀槽全部给 `component`。

```vue
<User.Name
  fl:validate="'required'"
  layout-item:span="12"
  fl:label="'姓名'"
  item:label-width="123"
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
| 改接线 / 文案 | `fl:` 同名键 | `fl:label`、`fl:prop`、`fl:model` |
| 此场策略 / 布局 | `fl:validate` / `layout-item:*` / `layout:*` | `fl:validate`、`layout-item:span` |
| 改输入自己的面 | 顶层 attrs / `@blur` / 无前缀槽 | `placeholder`、`#append`、`#item` |
| Item 面 | `:item:xxx` / `@item:xxx` / `` #[`item:xxx`] `` | Item 的 props / 事件 / 槽 |

不可在标签覆盖：`component`（工厂壳锁）；`validation` 是 schema 静态键，`fl:` 上没有对应标签。`model` / `prop` / `item` / `field` 均可被标签覆盖（`design.md` §11.2）。

簇里的 `props` 与顶层 attrs 合并后给输入。整表禁用走宿主 `Form` 的 attrs（如落到 ElForm 的 `disabled`）；单格 `disabled` / `readonly` 是输入自己的 attrs，不经 FormContext 广播。

`:item:xxx` 是宿主 Item 原生 props（如 `label-width`），**不是** Formless 语义。默认 Item 形状由适配 Item 自己转 snapshot；`:item:` 盖在转换结果上。不要把各家 Item 长尾塞进 `fl:`。

### 5. Item 前缀协议

内层不一定是 Input。内核 **不按 ElInput 分类槽名**，也不为未知 Item 写死白名单。

```text
属性 item:xxx        → Item 的 xxx（`:item:label-width` → `label-width`）
槽 /^item:(.+)$/     → Item 的 slot $1
事件 onItem:xxx      → Item 的 onXxx（`onItem:update:modelValue` → `onUpdate:modelValue`）
其余 attrs / 槽 / 事件 → component 原名
```

合并顺序：适配转换(快照) → `:item:` attrs → `@item:` 事件。

Item 的 **default** 由内核填入控件，用户从不提供。规范槽写法只认 `` #[`item:label`] ``（静态 `#item.label` 是 v-slot 修饰符，已否）。`:item:label-width` 与 `@item:validate` 都是 Vue 一等带冒号绑定，不必方括号。

## 备选方案

1. **`epField` 把 FormItem 焊进每颗 `component`**：接入税高。已否。
2. **control 上直接写 ElForm `rules` 数组**：已否。Schema 用 `validation`。
3. **顶层保留字 `required` / `span`**：已否；改为一只袋子 `:formless`。
4. **标签覆盖 `component`**：先点名再整颗替换，语义拧。已否。
5. **`:formless.bare`**：单格退出 Item 走 schema `item: false` / 内核跳过 `h(Item)`，见 [ADR-013](./013-one-control-multiple-items.md)。整段不写 `layout` 即可手写栅格。不拆公开 `FormLayout`。
6. **内核 `toRules` 只编 `rules` 数组**：假定所有 Item 都有 `rules` prop。已否；改为适配 Item 内部转换。
7. **按 ElInput 分流槽 / 双前缀 / 开放 `item-*` / 内核白名单 Item 槽**：已否。`item:` 机械转发。
8. **`Form: ({ FormBody }) => if xxx`**：无 Form 应由内核跳过 `h(Form)`，不要适配丢掉 default。已否为默认。
9. **页面 `v-slot="{ model }"` 手写 `el-form`**：多一份绑定、易绑回 DTO；主路径由适配 `Form` 包。已否。
10. **公开 `FormLayout` 组件**：与 FormView / Form 套娃；[ADR-008](./008-form-view-vmodel-and-grid-gcd.md) 再次否决。

## 后果

- **正向**：业务控件按 v-model 接入；Form / Item 形状全在适配层；无 Form / 无 Item 由内核跳过壳；校验身份与这场策略分离。
- **代价**：日常写成 `:formless="{ validate: 'required' }"`；`:item:` 无 Volar 补全；有 Form 时 `validate` 走 FormView ref。
- **关联**：语义簇见 [ADR-010](./010-controls-as-semantic-cluster.md)；栅格与 Form 组树见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)；命名空间标签见 [ADR-003](./003-namespaced-field-components.md)；绑定见 [ADR-011](./011-model-and-path.md)；控件单元见 [ADR-005](./005-view-model-as-unit.md)；一 control 多 Item 见 [ADR-013](./013-one-control-multiple-items.md)；多口宿主校验见 [ADR-014](./014-multi-vmodel-host-validation.md)。
