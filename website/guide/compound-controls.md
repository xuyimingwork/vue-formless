# 组合体控件

组合体 control（日期范围、区间选择等）通过 Vue 的 `ComponentCustomOptions.formless` 声明自己的**体**。

## 静态 `formless` 声明

```vue
<script setup lang="ts">
defineOptions({
  formless: {
    field: 'embed',
    model: ['start', 'end'],
  },
})

const start = defineModel<string>('start')
const end = defineModel<string>('end')
</script>
```

`FormControlFormless` 的成员：

```ts
interface FormControlFormless {
  model?: FormFieldVModelRaw   // v-model 口名
  field?: 'embed'              // 组合体标记
}
```

## `field: 'embed'` 说的是「体」，不是「位置」

- **`field: 'embed'`** 只表示「我是组合体：被成格时需要内层窗口」，是 control 的**体**。
- 它**不是**合并层：渲染时读出来，与外层 `fl:field`（位置）合成（见[组装模式 fl:field](/guide/fl-field-assembly)）。

所以 `'wrap'` / `'wrap-embed'` 写在 control 上没有意义——近的赢会让标签盖过它，而且 control 也要求不了内层窗口的密度（密度是标签的 `layout:` 通道）。

## `model` 声明多口

control 声明自己的 v-model 口名，供内核绑定：

```ts
defineOptions({ formless: { model: ['start', 'end'] } })
```

内核解析 `model` 的顺序：`标签 fl:model` > `schema.model` > `control 静态 formless.model` > `['modelValue']`。

## 组合体模板

组合体内部手写 `<FormField>` 选口，每个口独立成格：

```vue
<template>
  <FormField fl:model="start" fl:label="开始日期">
    <el-date-picker v-model="start" type="date" />
  </FormField>
  <FormField fl:model="end" fl:label="结束日期">
    <el-date-picker v-model="end" type="date" />
  </FormField>
</template>
```

内层 `<FormField fl:model="start">` 没有自有 `fl:prop`，在祖先已声明口里**选口**。

## 完整对照

本站示例的 [多口日期范围](/examples/date-range) 含 `DateRangeOne`（单格两字段）与 `DateRangeTwo`（拆格）两个实现，可直接看源码。

## 下一步

- [多口控件](/guide/multi-port-controls)
- [组装模式 fl:field](/guide/fl-field-assembly)
