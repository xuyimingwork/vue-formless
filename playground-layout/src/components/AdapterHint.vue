<template>
  <details class="pg-adapt">
    <summary>
      <span class="pg-adapt-lead">可以适配 Element Plus、Ant Design Vue 等主流栅格。</span>
      <span class="pg-adapt-more" />
    </summary>
    <pre><code>{{ sketch }}</code></pre>
  </details>
</template>

<script setup lang="ts">
const sketch = `import { ElRow, ElCol } from 'element-plus'
import { createLayoutView, LayoutItem } from 'vue-formless'

export const LayoutView = createLayoutView({
  Row: ElRow,
  Col: ElCol,
})`
</script>
