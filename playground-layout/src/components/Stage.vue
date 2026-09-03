<script setup lang="ts">
import { ref } from 'vue'
import AdapterHint from './AdapterHint.vue'

defineProps<{ snippet: string }>()

const pane = ref<'preview' | 'source'>('preview')
</script>

<template>
  <div class="pg-stage" :class="{ 'is-source': pane === 'source' }">
    <div class="pg-tabs" role="tablist">
      <button type="button" :class="{ on: pane === 'preview' }" @click="pane = 'preview'">
        预览
      </button>
      <button type="button" :class="{ on: pane === 'source' }" @click="pane = 'source'">
        源码
      </button>
    </div>

    <div class="pg-preview">
      <slot />
    </div>

    <section class="pg-code">
      <AdapterHint />
      <p class="pg-code-head">达成当前效果的写法 · 默认 span 1x / place auto 已省略</p>
      <pre><code>{{ snippet }}</code></pre>
    </section>
  </div>
</template>
