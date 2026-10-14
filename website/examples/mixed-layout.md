---
title: 混合布局
---

<script setup>
import MixedLayoutForm from './demos/MixedLayoutForm.vue'
</script>

# 混合布局

嵌套 FormView 分区改变局部密度：基本信息 3 列、证件联系 3 列、备注 1 列。

<MixedLayoutForm />

## 关键点

- 嵌套 `<FormView fl:layout :layout:column="3">` **未绑 v-model**，继承外层读写源，路径相对同一个根。
- 嵌套 FormView 默认 `fl:form='auto'`（嵌套关），不包内层 ElForm，避免套娃。
- 同一套 `<User.*>`，每区密度独立：`column=3` / `column=3` / `column=1`。
- `layout-item:span` 在同一行内混搭：`max`（整行）、`16` + `8`（三二开）。

## 源码

<<< @/examples/demos/MixedLayoutForm.vue
