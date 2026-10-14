# 多口控件

日期范围这类控件对应**两个**持久化字段，却是一颗 control。formless 用「多口 `model` + 下标对齐 `prop`」表达。

## 声明多口

```ts
import { createFormFields } from 'vue-formless'
import DateRangeOne from './DateRangeOne.vue'

export const Range = createFormFields({
  dateRangeOne: {
    label: '行程日期',
    component: DateRangeOne,
    model: ['start', 'end'],          // 两个 v-model 口
    prop: ['startTime', 'endTime'],   // 两个位置
  },
})
```

control 侧（`DateRangeOne.vue`）：

```vue
<script setup lang="ts">
defineOptions({ formless: { model: ['start', 'end'] } })
const start = defineModel<string>('start')
const end = defineModel<string>('end')
</script>

<template>
  <el-date-picker v-model="range" type="daterange" ... />
</template>
```

## 组合体：`formless.field: 'embed'`

当多口 control 想被**包成一格**、且内层还有可分格的 FormField 时，声明体为 `'embed'`：

```vue
<!-- DateRangeTwo.vue -->
<script setup lang="ts">
import { FormField } from 'vue-formless'

defineOptions({ formless: { field: 'embed', model: ['start', 'end'] } })
const start = defineModel<string>('start')
const end = defineModel<string>('end')
</script>

<template>
  <FormField fl:model="start" fl:label="开始日期">
    <el-date-picker v-model="start" type="date" />
  </FormField>
  <FormField fl:model="end" fl:label="结束日期">
    <el-date-picker v-model="end" type="date" />
  </FormField>
</template>
```

内层 `<FormField fl:model="start">` 没有自有 `fl:prop`，在祖先已声明口里**选口**（`getProp(['start'])` 只取对应下标的位置）。

## 宿主校验：拆格

多口一格时，一个宿主 `prop` 装不下两个口，适配层会**不绑** `prop`——该格不参与 `validate` / `resetFields`。

要宿主校验，把口拆成格：

```vue
<Range.DateRangeTwo :fl:field="'wrap-embed'" layout-item:span="max" />
```

`wrap-embed` 给组合体加外层格 + 内层 LayoutView，内层每个 `<FormField>` 各自一格，宿主 `prop` 就能绑单口了。

## 一个完整对照

```vue
<!-- 一格两字段：label 一处，不参与宿主校验 -->
<Range.DateRangeOne layout-item:span="16" :item:required="true" />

<!-- 拆格：每个口独立宿主校验 -->
<Range.DateRangeTwo layout-item:span="max" :layout:column="2" />
```

## 下一步

- [组装模式 fl:field](/guide/fl-field-assembly)
- [组合体控件](/guide/compound-controls) —— `formless.field: 'embed'` 的声明细节
