<script setup lang="ts">
import { useLayoutItem, type ColPlace, type ColSpanRaw } from '@vue-formless/layout'

defineProps<{
  span?: ColSpanRaw
  place?: ColPlace
  plain?: boolean
}>()

const LayoutItem = useLayoutItem()
</script>

<template>
  <LayoutItem :span="span" :place="place">
    <div :class="{ 'pg-cell': !plain }">
      <slot />
    </div>
  </LayoutItem>
</template>
