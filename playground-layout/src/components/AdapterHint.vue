<template>
  <details class="pg-adapt">
    <summary>
      <span class="pg-adapt-kicker">适配</span>
      <span class="pg-adapt-lead">
        布局库不绑 UI 框架。把宿主的 Row / Col 交给 createLayoutView，之后才写 LayoutView / LayoutItem。本 Demo 以 Element Plus 为例，换成别的栅格同样接。
      </span>
      <span class="pg-adapt-more" />
    </summary>
    <pre><code>{{ sketch }}</code></pre>
  </details>
</template>

<script setup lang="ts">
const sketch = `import { ElRow, ElCol } from 'element-plus'
import { createLayoutView } from '@vue-formless/layout'

export const LayoutView = createLayoutView({
  Row: ElRow,
  Col: ElCol,
})`
</script>
