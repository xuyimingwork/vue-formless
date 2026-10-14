# FormField

`FormField` 是临场格 / slot 模式：模板里直接声明一颗 Field，或手写 control 拿 `$bindings`。

```vue
<FormField fl:prop="remark" fl:component="ElInput" />

<FormField fl:prop="remark" v-slot="{ $bindings }">
  <ElInput v-bind="$bindings" />
</FormField>
```

## Props

### `FormFieldProps`

由声明派生（见[类型系统](/guide/typescript)）：

```ts
type FormFieldProps = ToFormlessProps<
  Omit<CreateFormFieldOptions, 'props' | 'name' | 'component'> & { component?: Component }
> & ToFormlessProps<LayoutViewProps, 'layout:'> &
  ToFormlessProps<LayoutItemProps, 'layout-item:'>
```

展开即：`fl:*`（内核键 + extras）+ `layout:column` / `layout:disabled` + `layout-item:span` / `layout-item:place`，以及 control 的公开 props（v-model 口剥离）。

## Slot Props

### `FormFieldSlotProps`

```ts
interface FormFieldSlotProps {
  $bindings: Record<string, unknown>
}
```

`$bindings` 是扁平对象，多口时直接摊开：

```ts
$bindings = {
  start: model.startTime,
  'onUpdate:start': fn,
  end: model.endTime,
  'onUpdate:end': fn,
}
```

## 暴露实例

### `FormFieldExposed`

```ts
interface FormFieldExposed extends Record<string, unknown> {
  itemRef: Record<string, unknown> | null
}
```

- **顶层**：control 的公开实例（方法如 `focus`，`this` 已绑定）。
- **`itemRef`**：宿主 Item 实例；无 Item 时为 `null`。

## 临场格语义

`<FormField>` 没有域表预设，`fl:component` / `fl:model` / `fl:prop` 是它自己的声明：

```vue
<FormField fl:prop="extra" fl:component="ExtraInput" />
```

::: danger 禁止
页面直接 `<FormField><ElInput v-model="form.xxx" /></FormField>` 绕过写回，必须 `fl:prop` + `fl:component` 或 slot `{ $bindings }`。
:::

## 相关

- [命名空间 Field](/guide/named-field-tags)
- [数据流](/guide/data-flow)（`$bindings` 的产出）
