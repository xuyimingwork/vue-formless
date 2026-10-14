---
title: 只读详情
---

<script setup>
import ReadonlyDetail from './demos/ReadonlyDetail.vue'
</script>

# 只读详情

详情页：整体 `disabled`，只读展示。

<ReadonlyDetail />

## 关键点

- `<FormView disabled>` 裸名 `disabled` 落到宿主 `ElForm`，整体禁用。
- 仍是同一个 `v-model`，回填只需 `form.value = detail`。

## 源码

<<< @/examples/demos/ReadonlyDetail.vue
