# ADR-003：命名空间字段组件（`<User.Name />`）

- **状态**：Accepted（修订）
- **日期**：2026-08-12
- **修订**：
  - 2026-08-14 — schema 键小驼峰，命名空间组件自动大驼峰；默认绑定可被渲染期覆盖；label/rules 由 formless 注入 component。
  - 2026-08-17 — 标签按控件命名（`Agency` 而非 `AgencyId`）；工厂推荐名 `createFormControls`；`:component` 整颗替换降为逃逸。见 [ADR-009](./009-controls-as-protagonist.md)。
  - 2026-08-18 — 绑定拆成 `model` + `prop` + `path`。见 [ADR-011](./011-model-and-path.md)。
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
<User.Name required />
<User.IdCard :span="24">
  <template #append>...</template>
</User.IdCard>
```

要点：

- Schema / model 键为**小驼峰**；暴露给模板的组件名为**大驼峰**（`name` → `Name`，`idCard` → `IdCard`），由工厂自动转换
- `createFormControls` 建立控件 → component / 默认 props / 默认 label / `model`（v-model 口）/ `prop`（叶子键）/ `path`（导航）/ `rules`；`markRaw` 在工厂内处理。联动、本场是否启用、布局不进这张表（[ADR-010](./010-controls-as-semantic-cluster.md)）
- `model` / `prop` / `path` 见 [ADR-011](./011-model-and-path.md)；省略则 `modelValue` ↔ 控件键
- 渲染期可用 label / props / `prop` / `path` 覆盖默认；`:component` 整颗替换仅为逃逸（ADR-009）；场景开关如 `required` 打在标签上，不把规则体写进模板
- 默认 label 由 formless **传给** 控件（或适配层 Item）；FormItem 壳属于适配，不在内核登记一套控件目录
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
- **关联**：数据如何注入见 ADR-004（FormContext，而非闭包绑死 model）；栅格见 ADR-007 / ADR-008；工厂定位与非目标见 [ADR-010](./010-controls-as-semantic-cluster.md)。
