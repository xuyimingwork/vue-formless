# 类型

公开面 = **5 个运行时值 + 11 个消费者必须命名的类型**。

## 运行时值

```ts
createFormView(options) → FormView
createFormFields(schema) → FormFields
FormField
createLayoutView({ Row, Col, column? }) → LayoutView
LayoutItem
```

## 公开类型（11 个）

```ts
// createFormView
CreateFormViewOptions
FormViewComponent
FormViewProps

// createFormFields
FormFields

// FormField
FormFieldComponent
FormFieldSlotProps

// 声明 / 绑定
FormFieldCustomOptions   // module augmentation 锚点，也是 extras 域本身
CreateFormFieldOptions   // 工厂入参
FormControlFormless      // control 静态 formless 增强
FormFieldFormless        // 适配层快照
FormFieldProps           // 公开标签 props
```

## 私有类型（不导出）

派生类型可经索引访问取到，不单独导出：

```ts
FormFieldFormlessRaw, FormFieldFormlessFieldRaw, FormFieldFormlessField,
FormFieldVModelRaw, FormFieldVModel, FormFieldPropRaw, FormFieldProp,
ToFormlessProps, HostProps
// 内部：FormViewContext, FormFieldContext, FormFieldCore, createFormField,
// dispatch, useDispatch, getIn/setIn/parsePath, ...
```

## layout 包类型

不再从内核转出口，需要就：

```ts
import type {
  CreateLayoutViewOptions, LayoutViewProps, LayoutItemProps,
  LayoutItemSpan, LayoutItemPlace,
} from '@vue-formless/layout'
```

## 快照 `FormFieldFormless`

```ts
interface FormFieldFormless extends FormFieldCustomOptions {
  model: (string | undefined)[]
  prop: (string | undefined)[] | undefined
  field: 'wrap' | 'embed' | 'wrap-embed'
  item: boolean
}
```

封闭形状，读未声明的键编译报错。详见[函数式 props](/guide/functional-props)。

## 相关

- [类型系统](/guide/typescript)
