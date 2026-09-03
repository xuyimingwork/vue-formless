<script setup lang="ts">
import { useCompact } from '../studio/compact'
import { useStudio } from '../studio/use-studio'
import AdapterHint from './AdapterHint.vue'
import Sheet from './Sheet.vue'

defineProps<{ snippet: string }>()

const compact = useCompact()
const studio = useStudio()
</script>

<template>
  <div class="pg-stage">
    <div class="pg-preview">
      <slot />
    </div>

    <section v-if="!compact" class="pg-code">
      <p class="pg-code-head">达成当前效果的写法 · 默认 span 1x / place auto 已省略</p>
      <pre><code>{{ snippet }}</code></pre>
      <AdapterHint />
    </section>
  </div>

  <button
    v-if="compact"
    type="button"
    class="pg-fab"
    aria-label="查看源码"
    @click="studio.sourceOpen = true"
  >
    源码
  </button>

  <Sheet v-if="compact && studio.sourceOpen" peek title="源码" @close="studio.sourceOpen = false">
    <div class="pg-code pg-code--sheet">
      <p class="pg-code-head">达成当前效果的写法 · 默认 span 1x / place auto 已省略</p>
      <pre><code>{{ snippet }}</code></pre>
      <AdapterHint />
    </div>
  </Sheet>
</template>
