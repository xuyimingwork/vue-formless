# 命名空间 Field

`<User.Name />` 就是一颗 **FormField**：`LayoutItem` + 可选宿主 `ElFormItem` + control，兼做绑定单元。

## 两种形态，同一颗组件

```vue
<FormView v-model="form">
  <User.Name />                                    <!-- 具名：域表产出 -->
  <FormField fl:prop="remark" fl:component="ElInput" /> <!-- 临场格 -->
</FormView>
```

- **具名 Field**：`createFormFields` 在模板外创建，锁定 `component`。
- **临场格 `<FormField>`**：直接在模板写，用 `fl:component` 或 slot 指定 control。

两者就是同一颗组件——绑定都落在 FormField 上。

## props / 事件 / 插槽透传 control

顶层无前缀的 attrs / 事件 / 无前缀槽给 control：

```vue
<User.Name placeholder="姓名" clearable @change="onChange">
  <template #prefix>···</template>
</User.Name>
```

`placeholder`、`clearable`、`@change`、`#prefix` 都落到 `ElInput` 上。

## 临场格

`<FormField>` 不绑定域表，`fl:prop` + `fl:component` 即声明：

```vue
<FormField fl:prop="remark" fl:component="ElInput" />
```

::: danger 不要绕过写回
页面直接 `<FormField><ElInput v-model="form.xxx" /></FormField>` 是**禁止**的——它绕过了 formless 的写回。必须 `fl:prop` + `fl:component`，或 slot 拿 `$bindings`：

```vue
<FormField fl:prop="remark" v-slot="{ $bindings }">
  <ElInput v-bind="$bindings" />
</FormField>
```
:::

## 混用

具名 Field 与临场格可在同一张表单混用：

```vue
<FormView v-model="form">
  <User.Name />
  <User.Age />
  <FormField fl:prop="extra" fl:component="ExtraInput" />
</FormView>
```

## 暴露的实例

`<FormField ref>` 暴露两层：

```ts
interface FormFieldExposed {
  itemRef: Record<string, unknown> | null  // 宿主 ElFormItem 实例；无 Item 时为 null
  // ...control 的公开实例方法（focus 等）也在顶层透出
}
```

- **顶层**是 control 的公开实例（如 `focus`），转发时 `this` 已绑定。
- **`itemRef`** 是宿主 Item 的实例，无 Item 壳时为 `null`。

```vue
<script setup>
const fieldRef = ref()
function focus() {
  fieldRef.value?.focus()          // control 的方法
  fieldRef.value?.itemRef?.resetField() // ElFormItem 的方法
}
</script>

<template>
  <User.Name ref="fieldRef" />
</template>
```

## 下一步

- [配置通道](/guide/channels) —— 前缀如何路由到 Item / LayoutItem / LayoutView
- [model 与 prop](/guide/model-and-prop)
