---
title: 多口日期范围
---

<script setup>
import RangeForm from './demos/RangeForm.vue'
</script>

# 多口日期范围

多口控件（日期范围）的两种形态 + 临场格，同一个表单里并存。

<RangeForm />

## 关键点

- `Range.DateRangeOne`：单格两字段（`model: ['start','end']` + `prop: ['startTime','endTime']`），不参与宿主校验。
- `Range.DateRangeTwo`：`wrap-embed` 拆格，内层两个 `<FormField>` 各绑一个口，可独立宿主校验。
- 最后的备注是临场 `<FormField fl:prop="'remark'" v-slot="{ $bindings }">`，手写 control 拿绑定。

## 源码

- 表单：[RangeForm.vue](https://github.com/xuyimingwork/vue-formless/blob/main/playground/src/demos/formless/RangeForm.vue)
- 单格：[DateRangeOne.vue](https://github.com/xuyimingwork/vue-formless/blob/main/playground/src/demos/formless/DateRangeOne.vue)
- 拆格：[DateRangeTwo.vue](https://github.com/xuyimingwork/vue-formless/blob/main/playground/src/demos/formless/DateRangeTwo.vue)

<<< @/examples/demos/RangeForm.vue

组合体 `DateRangeTwo` 声明 `formless: { field: 'embed', model: ['start','end'] }`，内层用 `<FormField fl:model="...">` 选口。详见[多口控件](/guide/multi-port-controls)。
