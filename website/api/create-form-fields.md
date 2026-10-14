# createFormFields

`createFormFields(options)` 声明语义输入簇，产出 PascalCase 的命名空间 Field 组件表。

```ts
import { createFormFields } from 'vue-formless'

export const User = createFormFields({
  name: { label: '姓名', component: ElInput },
  timeRange: { component: DateRange, model: ['start', 'end'] },
})
```

模板里用 `<User.Name />`、`<User.TimeRange />`。

## 参数

```ts
function createFormFields<const S extends { [K in keyof S]: CreateFormFieldOptions }>(
  options: S,
): FormFields<S>
```

键可写 camelCase（`timeRange`）或 kebab-case（`time-range`），两者先 `toCamel` 再 `upperFirst` 成标签名（`<User.TimeRange />`）。归一化**只作用于标签名**：默认 `prop` 仍是键原样。

### `CreateFormFieldOptions`

```ts
interface CreateFormFieldOptions extends FormFieldCustomOptions {
  component?: unknown           // 本格 control（只接输入）
  props?: HostProps<FormFieldFormless>   // 输入的默认 props（静态或快照函数）
  model?: FormFieldVModelRaw    // v-model 口名，默认 'modelValue'
  prop?: FormFieldPropRaw       // 位置，默认 = 域名表的键原样
  item?: boolean                // 这一格 ElFormItem 开关
  field?: FormFieldFormlessFieldRaw  // 组装位置：'auto' | 'embed' | 'wrap-embed'
  name?: string                 // 仅调试用组件名；createFormFields 自动注入
  // ...extras 来自 FormFieldCustomOptions（label / validation 等）
}
```

- `component` 只接输入，**不含** FormItem / Col。
- 内核键：`component` / `props` / `model` / `prop` / `item` / `field` / `name`。
- 其余键是 extras，来自锚点 `FormFieldCustomOptions`（见[module augmentation](/guide/module-augmentation)）。

## 返回值

### `FormFields<S>`

```ts
type FormFields<S> = {
  [K in keyof S & string as UpperFirst<ToCamel<K>>]: FormFieldComponent<FormControlProps<S[K]>>
}
```

每个标签是一颗 `FormFieldComponent`，props 为 `fl:*` 键 + control 公开 props（v-model 口剥离）。

## 覆盖规则

| 键 | 锁定？ |
|----|--------|
| `component` | **锁死**：`schema.component ?? 标签.fl:component` |
| `model` / `prop` / `item` / `field` | 不锁，标签可覆盖（近的赢） |

## 相关

- [创建域表](/guide/create-form-fields)
- [model 与 prop](/guide/model-and-prop)
