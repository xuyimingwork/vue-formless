<script setup lang="ts">
import { LayoutCell, type ColPlace, type ColSpanRaw } from '@vue-formless/layout'

defineProps<{
  span?: ColSpanRaw
  place?: ColPlace
  plain?: boolean
}>()
</script>

<template>
  <LayoutCell :span="span" :place="place">
    <div :class="{ 'pg-cell': !plain }">
      <slot />
    </div>
  </LayoutCell>
</template>
