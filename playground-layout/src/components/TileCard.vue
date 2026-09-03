<script setup lang="ts">
import { useCompact } from '../studio/compact'
import type { Tile } from '../studio/types'
import TileFields from './TileFields.vue'

const { tile, active = false } = defineProps<{
  tile: Tile
  active?: boolean
}>()
const emit = defineEmits<{ edit: [el: HTMLElement] }>()
const compact = useCompact()

function onHit(e: MouseEvent) {
  emit('edit', e.currentTarget as HTMLElement)
}
</script>

<template>
  <button
    v-if="compact"
    type="button"
    class="pg-card is-hit"
    :class="{ 'is-on': active }"
    @click="onHit"
  >
    <span class="pg-card-mark">{{ tile.label }}</span>
    <span class="pg-card-tap">点按</span>
  </button>
  <div v-else class="pg-card">
    <div class="pg-card-head">
      <span class="pg-card-mark">{{ tile.label }}</span>
      <button type="button" class="pg-unmount" title="拿掉这一格，空位会重算" @click="tile.on = false">
        拿掉
      </button>
    </div>
    <TileFields :tile="tile" />
  </div>
</template>
