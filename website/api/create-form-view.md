# createFormView

`createFormView(options)` 一次性绑定宿主 Form / Item / Row / Col，返回 `FormView` 组件。

```ts
import { createFormView } from 'vue-formless'

export const FormView = createFormView({
  layout: { Row: ElRow, Col: ElCol, props: { column: 2 } },
  form: { component: MyForm },
  item: { component: ElFormItem, props: toEpItemProps },
})
```

## 参数

### `CreateFormViewOptions`

```ts
interface CreateFormViewOptions {
  layout?: FormViewLayoutBind
  form?: FormViewFormBind
  item?: FormViewItemBind
}
```

### `layout`

```ts
interface FormViewLayoutBind {
  Row: Component
  Col: Component
  /** LayoutView 默认 props（密度等），仅静态对象；标签 :layout:* 覆盖其上 */
  props?: Record<string, unknown>
}
```

`disabled` 由内核**固定**为 `!fl:layout`，永远覆盖 `layout.props` 的产出。

### `form`

```ts
interface FormViewFormBind {
  component: Component
  /** 宿主 Form 静态默认值；无快照，不支持函数 */
  props?: Record<string, unknown>
}
```

写口按 no-prefix 规则以裸名 `modelValue` 落到宿主 Form。宿主口名不同（ElForm 的 `model`）时，用 wrapper 声明 `modelValue` 并转发（见[适配任意 UI 库](/guide/adapt-ui-libs)）。

### `item`

```ts
interface FormViewItemBind {
  component: Component
  /** 宿主 Item 默认 props：静态，或从字段快照投影 */
  props?: HostProps<FormFieldFormless>
}
```

`item.props` 是**唯一支持函数**的工厂配置位，形参是归一化快照 `FormFieldFormless`（见[函数式 props](/guide/functional-props)）。

## 返回值

`FormViewComponent = DefineComponent<FormViewProps>`。

### `FormViewProps`

```ts
interface FormViewProps {
  modelValue?: unknown          // 写口；不是声明 prop，裸名落到宿主 Form
  'fl:layout'?: boolean         // 栅格开关，默认 false
  'layout:column'?: number      // 本页 LayoutView 密度
  'fl:form'?: 'auto' | boolean  // 是否渲染 ElForm，默认 'auto'
  'fl:item'?: boolean           // 每格的 Item 壳默认，默认 true（绑 Item 时）
}
```

- `modelValue` **不是**声明 prop：裸名留在 attrs，按 no-prefix 规则落到宿主 Form；宿主若要读它，自行声明 `modelValue`（如 `MyForm`）。
- `onUpdate:modelValue` 监听被 FormView 读取以推进写口，同时也照落到宿主 Form。

## 实例方法

FormView `expose` 一个 Proxy，把宿主 Form 实例的方法透出（`validate` / `resetFields` / …）：

```ts
const formRef = ref<FormInstance>()   // 用 UI 库的实例类型
await formRef.value?.validate()
```

## 提供两个 Context

| 键 | 消费者 |
|----|--------|
| `FORM_VIEW_KEY`（`value` / `getIn` / `setIn`） | 嵌套 FormView |
| `FORM_FIELD_KEY`（`access` + 壳资源 + 页 `fl`） | FormField |

两者内核私有，不导出。

## 相关

- [FormView 与 v-model](/guide/form-view-v-model)
- [适配任意 UI 库](/guide/adapt-ui-libs)
