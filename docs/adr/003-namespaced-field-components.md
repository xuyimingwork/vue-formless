# ADR-003：命名空间字段组件（`<User.Name />`）

- **状态**：Accepted（修订）
- **日期**：2026-08-12
- **修订**：
  - 2026-08-14 — schema 键小驼峰，命名空间组件自动大驼峰；默认绑定可被渲染期覆盖。label/rules 注入目标后改为适配层 Item（2026-08-18，ADR-012）。
  - 2026-08-17 — 标签按控件命名（`Agency` 而非 `AgencyId`）；工厂推荐名 `createFormControls`。见 [ADR-009](./009-controls-as-protagonist.md)。
  - 2026-08-18 — 绑定拆成 `model` + `prop` + `path`。见 [ADR-011](./011-model-and-path.md)。
  - 2026-08-18 — `component` 只接输入；label / Item props 进适配层 `toItemProps`。见 [ADR-012](./012-input-item-and-rule-compile.md)。
- **来源**：动态表单架构设计推演

## 背景

模型进 Schema 之后，模板侧仍需高信息密度的字段引用方式。常见写法：

```vue
<Field name="username" />
```

信息密度低，像填 XML 属性，破坏模板连贯性，且「字段名」与「默认控件」在视觉上分离。

期望形态接近业务实体访问：`user.name` → `<User.Name />`，同时保留插槽定制（如 `#append` 查询按钮）。

Vue 3 模板编译器原生支持带 `.` 的标签（Namespaced Components），为对象路径作组件标签提供了前提。

## 决策

采用 **工厂生成的命名空间组件**，按领域实体重命名导出：

```ts
export const User = createFormControls({
  name: { label: '姓名', component: ElInput },
  timeRange: {
    label: '时间',
    component: TimeRange,
    model: ['start', 'end'],
    prop: ['startTime', 'endTime'],
  },
})
```

```vue
<User.Name :formless="{ validate: 'required' }" />
<User.IdCard :formless="{ span: 24 }">
  <template #append>...</template>
</User.IdCard>
```

要点：

- Schema / model 键为**小驼峰**；暴露给模板的组件名为**大驼峰**（`name` → `Name`，`idCard` → `IdCard`），由工厂自动转换
- `createFormControls` 建立控件 → **输入** `component` / 默认 props / 默认 label / `model`（v-model 口）/ `prop`（叶子键）/ `path`（导航）/ `validation`；`markRaw` 在工厂内处理。联动、本场策略、布局不进这张表（[ADR-010](./010-controls-as-semantic-cluster.md)）
- `component` 不含 FormItem；label 与校验投影进适配层 Item，见 [ADR-012](./012-input-item-and-rule-compile.md)
- `model` / `prop` / `path` 见 [ADR-011](./011-model-and-path.md)；省略则 `modelValue` ↔ 控件键
- 渲染期用 `:formless` 覆盖同名键（`label` / `prop` / `path`）及此场键（`validate` / `span`）；**不可**覆盖 `component` / `model` / `validation`；不把规则体写进模板
- 顶层 attrs / 事件 / 无前缀插槽给 `component`；Item 用 `:item:xxx` / `@item:xxx` / `` #[`item:xxx`] ``（ADR-012）
- 按需 `defineComponent`（创建簇时生成 PascalCase 属性）；泛型把 schema 键映射为 PascalCase 组件类型

推荐命名空间：

| 写法 | 评价 |
|------|------|
| `<User.Name />`（领域实体名） | **首选**：语义即业务域，噪音低 |
| `<Field.Name />` | 通用库内命名，可接受 |
| `<FormFields.Name />` | 偏长，信息噪音略高 |
| `<F.Name />` | 过短，可读性差 |

## 备选方案

1. **统一 `<Field name="x" />`**：类型好做，信息密度差，已否决为默认 DX。
2. **解构字段组件** `const { Name, Gender } = Fields`：去掉前缀后易与 HTML/UI 组件冲突，且 setup 需手工解构、模板丢失「属于某模型」的锚点——**明确拒绝**。
3. **JSX/TSX 动态属性组件**：类型更友好，但偏离多数 Vue SFC 习惯，不作默认路径。
4. **Schema 直接写 PascalCase 键**：与 model / JSON 不一致，增加双份键名；已否决。

## 后果

- **正向**：模板语义化、可混排多模型（`User.*` + `Order.*`）；临场定制不退回整页手写；schema 与 model 键对齐。
- **代价**：依赖 Vue 3 命名空间组件 + 良好的类型体操；调试栈会出现工厂生成的组件名，需约定 `name: Field_${PascalKey}`。
- **关联**：数据如何注入见 ADR-004（FormContext，而非闭包绑死 model）；栅格见 ADR-007 / ADR-008；工厂定位见 [ADR-010](./010-controls-as-semantic-cluster.md)；输入 / Item / 校验合成见 [ADR-012](./012-input-item-and-rule-compile.md)。
