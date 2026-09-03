<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const { peek = false } = defineProps<{
  title: string
  peek?: boolean
}>()
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  if (!peek) document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  if (!peek) document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      class="pg-sheet"
      :class="{ 'is-peek': peek }"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <button
        v-if="!peek"
        class="pg-sheet-mask"
        type="button"
        aria-label="关闭"
        @click="emit('close')"
      />
      <div class="pg-sheet-panel">
        <div class="pg-sheet-grab" />
        <header class="pg-sheet-bar">
          <strong>{{ title }}</strong>
          <button type="button" class="pg-sheet-x" @click="emit('close')">关闭</button>
        </header>
        <div class="pg-sheet-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
