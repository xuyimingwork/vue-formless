<script setup lang="ts">
import { LayoutItem, type LayoutItemPlace, type LayoutItemSpan } from '@vue-formless/layout'

defineProps<{
  span?: LayoutItemSpan
  place?: LayoutItemPlace
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
