# `fl:` 内核键

`fl:` 是 formless 内核的语义通道。改这些键会触发派生重算。

## 键表

| 键 | 值域 | 作用 | 默认 |
|----|------|------|------|
| `fl:model` | `string \| readonly string[]` | 本格认领的 v-model 口 | `'modelValue'` |
| `fl:prop` | `string \| readonly string[]` | 绑定位置（根到叶子） | 域表键原样 |
| `fl:item` | `boolean` | 是否渲染宿主 Item 壳 | 绑 Item 时 `true` |
| `fl:field` | `'auto' \| 'embed' \| 'wrap-embed'` | 组装位置 | `'auto'` |
| `fl:component` | `Component` | 本格 control（临场格 / 工厂预设） | — |
| `fl:layout` | `boolean` | 是否渲染 LayoutView | `false` |
| `fl:form` | `'auto' \| boolean` | 是否渲染 ElForm | `'auto'` |

## 语义要点

### `fl:model`

- 在**身份根**（具名标签 / 临场格）上是**声明**，与 `fl:prop` 一样可覆盖 schema。
- 在**组合体内层格**上是**选口**（在已声明口里挑）。

### `fl:prop`

- 位置从根到叶子，`buyers[0].name` 直接绑嵌套列表。
- 空 / 空白字符串不 throw，该口跳过。

### `fl:item`

- 合并后恒为布尔：标签 > schema/control > 页 `:fl:item`。
- 裸 `fl:item`（空串）算 `true`。

### `fl:field`

- `'auto'`：跟随 control 的体。
- 合成表见[组装模式 fl:field](/guide/fl-field-assembly)。

### `fl:component`

- **唯一被工厂壳锁死的键**：`schema.component ?? 标签.fl:component`。

### `fl:layout` / `fl:form`

- FormView 自己的开关，**不下行**给子 Field。

## 派生规则

`CreateFormFieldOptions` 的核心键都有对应 `fl:` 标签键（`props` / `name` 除外），类型由 `ToFormlessProps` 派生不手抄。extras（`label` 等）经 `FormFieldCustomOptions` 增强进来，标签自动可用 `fl:label`。

## 相关

- [配置通道](/guide/channels)
- [前缀通道](/api/channels)
