# ADR-012：输入、Item 与校验合成

- **状态**：Accepted（修订）
- **日期**：2026-08-18
- **修订**：2026-08-18 — 标签配置收进 `:formless`；顶层 attrs / 事件 / 无前缀槽给输入；Item 事件 `@item:xxx`。
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
| `disabled` / `readonly` | 身份 `rules`、错误展示 |
| placeholder、options、控件自己的槽 / 事件 | Item 的 `prop`、Col 的 `span` |

`ElSelect` + `options` → 选项列表 这类薄封装仍算输入侧适配，和 FormItem 不是一层。换控件位走 `:formless="{ component }"` 逃逸（[ADR-009](./009-controls-as-protagonist.md)）。

### 2. Item 与规则合成挂在 `createFormView`

与 Row/Col 同一条适配缝，项目级一次：

```ts
createFormView({
  Row: ElRow,
  Col: ElCol,
  Item: ElFormItem,
  toRules: (identity, policy) => /* 宿主 FormItem 的 rules */,
})
```

渲染顺序：`Col?` → `Item(label, 路径, 合成 rules)` → `component(v-model, …)`。

- **Col**：仅当 `layout` 托管时包；`formless.bare` 逃出格子（[ADR-008](./008-form-view-vmodel-and-grid-gcd.md)）
- **Item**：适配提供了 `Item` 则包（**与是否托管栅格无关**）；label / 合成后的 `rules` / 完整路径只进 Item。无 Item 时不套表单项（规则无处呈现）
- **输入**：始终是 `component`

内核约定 Item 公约数：`label`、路径、`rules`（已是宿主形状）、`required`（策略为必填时的展示，如红星）。不开放各家 Item 全量 props。`trigger`、宿主 `{ required: true }` 只出现在 `toRules` 的产出里。

外层仍用业务侧 `el-form` 做 `validate()` / `resetFields()` 宿主（[ADR-004](./004-form-layout-and-context.md)）。规则落在每颗 Item 上，不必再维护一份页面级 `FormRules`。

单格跳过 Item（块级 `AgencyList` 自带标题）暂不作为默认能力；不够则 `bare` + 手写 Item，或将来在 `:formless` 里加字段。

### 3. 规则在 control，策略在 `:formless`，合成在适配层

**身份（control，静态）**：这个输入会什么。只写空值怎么判、格式/结构对不对、对应文案。形状不是宿主 `RuleItem[]`，**不得**出现 `required: true`、`trigger`。

```ts
mobile: {
  label: '手机',
  component: ElInput,
  rules: {
    empty: { /* trim / 非空 */, message: '请输入手机号' },
    format: { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
  },
}
```

一个控件绑两端时，区间规则仍写在该 control 的 `rules` 上（仍是身份，不是跨格）。

**策略（`:formless`，渲染时）**：这场怎么用这些规则。词表收死，不做成规则选择器：

| `:formless` | 含义 |
|-------------|------|
| 不写 / `{}` | 选填：空不报；**有值仍跑格式** |
| `{ required: true }` | 必填：空值 + 格式 |
| `{ novalidate: true }` | 本场不跑 |

模板不写规则体。`:formless.rules` 整份覆盖身份规则仅为逃逸。

**合成（适配层，渲染时）**：`toRules(identity, policy)` → Item 的 `rules`。策略在标签上，故不能在 `createFormControls` 里编死。跨格约束仍走页面 / 提交（[ADR-010](./010-controls-as-semantic-cluster.md)）。

### 4. 两条通道：`:formless` vs 输入自身

模板仍是 `<User.Name />`。生成组件只声明 **一个** 配置 prop `formless`（可拓展，不占输入的名字）；其余 attrs / 事件 / 无前缀槽全部给 `component`。

```vue
<User.Name
  :formless="{ required: true, span: 12, label: '姓名' }"
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
| 改 Formless / 簇配置 | `:formless="{ … }"` | `span`、`bare`、`required`、`novalidate`、`label`、`prop`、`path`、`component` 逃逸、`rules` 逃逸 |
| 改输入自己的面 | 顶层 attrs / `@blur` / 无前缀槽 | `placeholder`、`clearable`、`#append`、`#item` |
| Item 事件 | `@item:xxx`（vnode 键 `onItem:xxx`） | Item 的 `xxx` |
| Item 槽 | `` #[`item:xxx`] `` | Item 的 `xxx`（default 由内核填输入） |

簇里的 `props` 与顶层 attrs 合并后给输入（attrs 盖 `props`）。写入仍只走 FormView（[ADR-008](./008-form-view-vmodel-and-grid-gcd.md)）。`class` / `style` / `id` 跟输入。`FormView` 的 `disabled` / `readonly` 广播到输入，只许收紧。

`:formless` 内的字段可以加（如将来 skip Item），**不要**把各家 FormItem / Col 全量塞进袋子。超出公约数则退出托管 / 手写 Item。

不在顶层再留 `required` / `span` 布尔糖——那会重新偷输入的名字。

### 5. 插槽与 Item 事件协议

内层不一定是 Input。内核 **不按 ElInput 分类槽名**，也不为未知 Item 写死白名单。

```text
槽 /^item:(.+)$/     → Item 的 slot $1
事件 onItem:xxx      → Item 的 onXxx（`onItem:update:modelValue` → `onUpdate:modelValue`）
其余槽 / 事件        → component 原名
```

Item 的 **default** 由内核填入控件，用户从不提供。规范槽写法只认 `` #[`item:label`] ``（静态 `#item.label` 是 v-slot 修饰符，已否）。`@item:validate` 与 Vue 的 `@update:modelValue` 同属带冒号事件名。

## 备选方案

1. **`epField` 把 FormItem 焊进每颗 `component`**：接入税高；业务树选无法直接登记。已否。
2. **control 上直接写 ElForm `rules` 数组**：身份与本场必填、`trigger` 焊死。已否。
3. **顶层保留字 `required` / `span` / `label`**：输入同名 props 被封死，Item 侧无法加字段。已否；改为一只袋子 `:formless`。
4. **三个 props 袋子（col / item / input）**：日常比手写三层还重。已否。
5. **按 ElInput 分流 `#append` → 输入、`#label` → Item**：`AgencyList` 会撞。已否。
6. **双前缀 `#input-xxx` / `#item-xxx`**：内层不是 Input。已否。
7. **开放前缀 `item-*` 全部给 Item**：列表常用 `#item-title`。已否。
8. **内核白名单 Item 槽**：Item 由适配决定。已否。改用 `item:` 机械转发。
9. **模板写 `onItem:xxx`**：那是 vnode 键；模板用 `@item:xxx`。

## 后果

- **正向**：业务控件按 v-model 接入；换库只改编配；校验分层可兑现；输入 API 不被偷名；`:formless` 可加字段。
- **代价**：日常写成 `:formless="{ required: true }"`，没有 `<User.Name required />` 糖；`` #[`item:label`] `` 无 Volar 补全；实现须从「rules 透传 / EpInput 包 FormItem」迁出。
- **关联**：语义簇见 [ADR-010](./010-controls-as-semantic-cluster.md)；栅格见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)；命名空间标签见 [ADR-003](./003-namespaced-field-components.md)；绑定见 [ADR-011](./011-model-and-path.md)；控件单元见 [ADR-005](./005-view-model-as-unit.md)。
