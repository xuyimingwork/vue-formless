<script setup lang="ts">
import { LayoutItem, type ColPlace, type ColSpanRaw } from '@vue-formless/layout'

defineProps<{
  span?: ColSpanRaw
  place?: ColPlace
  plain?: boolean
}>()
</script>

<template>
  <LayoutItem :span="span" :place="place">
    <div :class="{ 'pg-cell': !plain }">
      <slot />
    </div>
  </LayoutItem>
</template>
