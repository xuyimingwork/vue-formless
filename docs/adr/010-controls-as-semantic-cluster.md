# ADR-010：`createFormControls` 是语义输入簇，不是表单 schema

- **状态**：Accepted（修订）
- **日期**：2026-08-18
- **修订**：
  - 2026-08-18 — 补文件夹比喻与「界面领域 ≠ 后端实体」。
  - 2026-08-18 — 簇的边界是归属（是不是该域的 control），不是项数。
  - 2026-08-18 — 绑定拆成 `model` / `prop` / `path`，见 [ADR-011](./011-model-and-path.md)。
  - 2026-08-18 — Schema `validation` 不是 ElForm 数组；标签策略 `:formless.validate`。见 [ADR-012](./012-input-item-and-rule-compile.md)。
- **来源**：相对 [ADR-009](./009-controls-as-protagonist.md) 的定位收口（工厂是什么、故意不做什么）

## 背景

两端大家都会，中间没法落：

| 粒度 | 复用时怎么疼 |
|------|----------------|
| 每个输入一个 `.vue` | 太碎：`NameInput.vue` 的文件和道具税，姓名这种不配拥有一个文件 |
| 一个 `UserForm.vue` | 太整：布局、必填、筛选/编辑、提交焊死；下一页只要三个字段或改两列，只能拷贝或开一堆 props |

[ADR-009](./009-controls-as-protagonist.md) 已把主角收成控件、工厂收成 `createFormControls`。若把工厂当成「字段登记处」或「表单描述块」，就会往表上堆联动、**本场是否必填**、跨格规则——抽象从「批量声明组件」膨胀成表单引擎。

需要钉死：**多出来的那一层抽象是什么，以及写进 controls 即越界的事。**

## 决策

### 1. 补的是中间层：有名字的输入，还不是一张表单

`createFormControls` = **快捷声明一簇逻辑上相关的语义输入**（命名 + 默认画法 + 默认绑定）。产出的 `<User.Name />` 就是组件，只是用一张表批量声明，不必先变成文件，也不必先变成 Form。

簇里的「有关联」是同一套业务词汇和默认绑定（都是 User 身上的输入，默认绑 `name` / `mobile`），**不是**同一套排版、同一套必填、同一次提交。

等价于前端有一个 `user/` 目录：`NameInput.vue`、`GenderInput.vue`、`AgencyInput.vue`。工厂是少建这些文件、又给它们**统一交互**（进 FormView 就绑、`<User.Name />` 点名、`:formless="{ validate: 'required' }"` 开必填）的办法。文件夹是「真拆成组件」时的落点；表是同一件事的便宜写法。

这带一点领域，但是 **界面上的 User 输入词汇**，不是后端 User 聚合：有点模型（名词、默认绑哪、会什么校验），产物和复用仍是组件。`User.Agency` 是「用户表单上的机构格」，不是 Agency 域的根。

**项多不是问题**，只要都是该输入域的 control：登记 40 项、某页只点 8 个，和 `user/` 下 40 个文件只引用 8 个一样。假领域是把订单字段、整页无关的查询时间塞进 `User.*`，或强迫一次铺完整张表。`User.CreateTime` 与 `User.CreateTimeRange` 都是用户创建时间的输入，筛选用区间不改变归属，见 [ADR-009](./009-controls-as-protagonist.md) §4。

```text
ElInput / AgencySelect     通用输入（已有）
User.Name / User.Agency    ← 本层：有业务名、默认绑哪、属于这一簇
页面模板                   摆放、这场 required、提交（已有）
```

这是一层可跳过的薄抽象：同一套输入要在不同布局、不同必填、不同宿主里被**点名**时才值；一页用一次、再也不会点到，不如手写。

### 2. 工厂表回答身份；`validation` 属于身份，策略不属于

| 在 controls 里 | 不在 controls 里 |
|----------------|------------------|
| 谁、怎么画（输入 `component` / 默认 `props`）、控件口（`model`）、默认叶子（`prop`）、默认导航（`path`）、默认 `label` | 控件间联动、**本场策略**、跨控件规则、布局（span / Col） |
| **`validation`：这个输入会什么**（空值怎么判、格式对不对、文案） | |

控件上**要写** `validation`，因为那是语义输入的一部分（手机号知道号段、姓名知道 trim 后才算填了）。形状 **不是** ElForm `RuleItem[]`，**不得**写 `required: true`、`trigger`。不要叫 `rules`（以免像宿主）。控件表**不决定**这场怎么跑它们。标签不得覆盖 `validation` 或 `component`。

模板只写策略，不写规则体：

```vue
<User.Name :formless="{ validate: 'required' }" />
<User.Mobile :formless="{ validate: 'required' }" />
<User.Email />                                <!-- 选填：空不报，有值仍校格式 -->
<User.Keyword :formless="{ validate: 'none' }" />
```

```ts
name: {
  label: '姓名',
  component: ElInput,
  validation: { empty: { /* trim 后为空 */, message: '请输入姓名' } },
},
mobile: {
  label: '手机',
  component: ElInput,
  validation: {
    empty: { /* 非空 */, message: '请输入手机号' },
    format: { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
  },
}
```

策略写在 `:formless.validate`（适配层投影到 Item，见 [ADR-012](./012-input-item-and-rule-compile.md)）：

| `:formless.validate` | 含义 |
|----------------------|------|
| 不写 / `'optional'` | 选填：空不报；有值仍跑格式 |
| `'required'` | 必填：空值 + 格式 |
| `'none'` | 本场不跑 |

筛选与编辑点同一套 `<User.Mobile />`：编辑 `validate: 'required'`，筛选不写或 `'none'`。

### 3. 写进 controls 即越界

- **控件间联动**（省变市 options、改类型显隐、清下游）：页面 / 流程（`watch`、事件、拉数）。例外：完全发生在**单个** `component` 内部的（树选 `loadData`、时间范围自限区间）。
- **本场策略**：`:formless.validate`（`'required'` / 不写 = `'optional'` / `'none'`）。不要在簇上写死本场必填（那是这场用法，不是「手机号会什么」）。筛选与编辑应能点同一套 `User.Name` 而必填不同。投影见 [ADR-012](./012-input-item-and-rule-compile.md)。
- **跨控件约束**（两个独立的开始/结束时间）：跟 FormView 上那份对象走，或提交时再判；不写进 `User.EndTime` 的 schema。一个 `CreateTimeRange` 控件绑两端，则区间约束仍写在该 control 的 `validation` 上。
- **布局**：FormView 托管栅格 + 模板 `:formless.span`；整段退出托管则不写 `layout`。语义输入不把自己包成 Col。
- **别人的格**：订单字段、与 User 无关的查询时间不要进 `User.*`。筛选用 `CreateTimeRange` 不算越界。

`label` 与 `validation` 都可以留在工厂（叫什么、会校验什么）；不要把「本场必填」和规则体焊成同一份 FormItem DSL。`component` 是输入，FormItem 在适配层，见 [ADR-012](./012-input-item-and-rule-compile.md)。

## 备选方案

1. **一格一个 SFC**（`user/NameInput.vue` …）：复用最干净，文件税不可接受为默认；工厂就是这个文件夹的便宜写法。
2. **整张 `UserForm` + props 开关**：实现快，复用边界错误；已否决为默认。
3. **Formily 式 reaction / 在 controls 里写死本场必填或 `dependsOn`**：把簇重新做成表单 schema；与「`validation` 是身份、策略是标签」冲突，已否决。
4. **不为中间层提供工厂，业务自己拼**：零抽象，gap 仍在；本库选择提供这一层，且停在这一层。

## 后果

- **正向**：有人提「在 schema 里配级联 / 把本场必填写进控件表」时，用本文挡。`validation` 写在 control 上；怎么跑由 `:formless.validate` 决定。复用单元是簇里的标签，不是 Form。
- **代价**：先声明簇再在模板点名（两处）；调试栈多一个工厂组件。
- **关联**：控件主角、页级所有权、列表见 [ADR-009](./009-controls-as-protagonist.md)；`model` / `path` 见 [ADR-011](./011-model-and-path.md)；命名空间标签见 [ADR-003](./003-namespaced-field-components.md)；配置单元见 [ADR-005](./005-view-model-as-unit.md)；布局见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)；Item / `toItemProps` / 槽协议见 [ADR-012](./012-input-item-and-rule-compile.md)。
