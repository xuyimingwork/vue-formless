---
title: 筛选条
---

<script setup>
import FilterForm from './demos/FilterForm.vue'
</script>

# 筛选条

同一套 `User` 域表，筛选场景：密度更密（一行 4 列）、label 更窄、可空。

<FilterForm />

## 关键点

- `:layout:column="4"` 标签覆盖工厂默认密度，一行 4 列。
- 筛选里字段**不写** `fl:validate`，即 `'optional'`——空不报，有值仍校格式。
- 与[基础表单](/examples/basic-form)共用同一套 `<User.*>`，只是本场策略不同。

## 源码

<<< @/examples/demos/FilterForm.vue
