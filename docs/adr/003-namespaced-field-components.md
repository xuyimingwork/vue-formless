# ADR-003：命名空间字段组件（`<User.Name />`）

- **状态**：Accepted
- **日期**：2026-08-12
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

采用 **Proxy 工厂生成的命名空间组件**，按领域实体重命名导出：

```ts
export const UserFields = createFormFields({ /* schema */ })
// 使用侧：import { UserFields as User } from '...'
```

```vue
<User.Name :span="12" />
<User.IdCard :span="24">
  <template #append>...</template>
</User.IdCard>
```

要点：

- Schema 键 → 按需 `defineComponent`（访问时才创建，可缓存）
- 用泛型把 `keyof Schema` 映射为组件类型，配合 Volar 补全与拼写检查
- 字段组件吸收 FormItem + 栅格 span；透传插槽与布局相关 props

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

## 后果

- **正向**：模板语义化、可混排多模型（`User.*` + `Order.*`）；临场定制不退回整页手写。
- **代价**：依赖 Vue 3 命名空间组件 + 良好的类型体操；调试栈会出现工厂生成的组件名，需约定 `name: Field_${key}`。
- **关联**：数据如何注入见 ADR-004（FormContext，而非闭包绑死 model）。
