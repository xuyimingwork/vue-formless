# 类型系统

formless 的类型命名法 = **Scope + Role**。前缀写 Scope（四个概念词），后缀写 Role。

## Scope 词表

四个概念词，其余名字一律前置：

```text
FormView    表单根
FormItem    宿主 ElFormItem（不再指内核组件）
FormField   一格表单 UI 兼绑定单元
FormControl  control 的公开 props（类型前缀；概念词仍是 control）
```

配置域另用 `Formless`（快照 / raw 袋）。

## Raw 两态

**只有「解析前与解析后类型不同」的键才成对**，解析后用原词、解析前加 `Raw`：

| 声明态（Raw） | 归一态 |
|---------------|--------|
| `FormFieldVModelRaw`（`string \| readonly string[]`） | `FormFieldVModel`（`(string \| undefined)[]`） |
| `FormFieldPropRaw` | `FormFieldProp` |
| `FormFieldFormlessFieldRaw`（含 `'auto'`） | `FormFieldFormlessField`（`'auto'` 已解掉） |
| `FormFieldFormlessRaw`（开索引签名） | `FormFieldFormless`（封闭形状） |

`item` 进出自 boolean，**不成对**。

## 关键类型

### `FormFields<S>`

把域表映射成 PascalCase 标签组件表：

```ts
type FormFields<S> = {
  [K in keyof S & string as UpperFirst<ToCamel<K>>]: FormFieldComponent<FormControlProps<S[K]>>
}
```

`timeRange` 与 `time-range` 落同一个 `<User.TimeRange />`（运行时 `upperFirst(toCamel(key))` 与类型映射同口径，不许分叉）。

### `FormFieldProps`

公开标签的 props，由声明**派生**，不手抄：

```ts
type FormFieldProps = ToFormlessProps<
  Omit<CreateFormFieldOptions, 'props' | 'name' | 'component'> & { component?: Component }
> & ToFormlessProps<LayoutViewProps, 'layout:'> &
  ToFormlessProps<LayoutItemProps, 'layout-item:'>
```

加内核键只改 `CreateFormFieldOptions`，标签自动跟上。两处例外就地写明：`props`（可能是快照函数，装不进 attrs）与 `name`（工厂私有）不进标签。

### `FormControlProps<Def>`

control 公开 props **剥掉 v-model 口**，避免 `<User.Name>` 上写 `modelValue` 覆盖绑定：

```ts
type FormControlProps<Def> =
  Def extends { component?: infer C }
    ? Omit<ComponentPublicProps<C>, LockedVModelKeys<...>>
    : {}
```

`ComponentPublicProps<C>` 从 Vue 构造器 / 函数组件推断 `$props`。

### `ToFormlessProps<T, Prefix>`

任意声明袋 → 其可选「`Prefix` + 键名」标签 props 的键名映射：

```ts
type ToFormlessProps<T, Prefix extends string = 'fl:'> = {
  [K in keyof T as K extends string ? `${Prefix}${K}` : never]+?: T[K]
}
```

`label` → `'fl:label'`（缺省前缀 `fl:`）。同一个映射产出 `fl:` / `layout:` / `layout-item:` 三个键空间，不各写一遍。

## 公开类型

消费者必须命名的 11 个：

```ts
FormViewProps, FormViewComponent, CreateFormViewOptions
FormFields
FormFieldProps, FormFieldComponent, FormFieldSlotProps
FormFieldCustomOptions, CreateFormFieldOptions, FormControlFormless, FormFieldFormless
```

派生类型（`FormFieldFormlessRaw`、`FormFieldVModelRaw` / `FormFieldPropRaw`、`ToFormlessProps`、`HostProps` 等）不导出——声明的成员可经索引访问取到，extras 经 augmentation 自动流进 `FormFieldFormless` / `FormFieldProps`。

layout 的 props 类型（`CreateLayoutViewOptions` / `LayoutViewProps` / `LayoutItemProps` / `LayoutItemSpan` / `LayoutItemPlace`）不再从内核转出口，需要就 `import type { ... } from '@vue-formless/layout'`。

## 完整清单

见 [API：类型](/api/types)。

## 下一步

- [设计哲学](/guide/design-philosophy)
- [API：类型](/api/types)
