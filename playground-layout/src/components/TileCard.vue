<script setup lang="ts">
import { PLACE_CHIPS, SIZE_CHIPS } from '../studio/presets'
import { absOf, bumpAbs, GRID } from '../studio/tiles'
import type { Tile } from '../studio/types'
import { useStudio } from '../studio/use-studio'

const { tile } = defineProps<{ tile: Tile }>()

const studio = useStudio()
</script>

<template>
  <div class="pg-card">
    <div class="pg-card-head">
      <span class="pg-card-mark">{{ tile.label }}</span>
      <button type="button" class="pg-unmount" title="拿掉这一格，空位会重算" @click="tile.on = false">
        拿掉
      </button>
    </div>
    <div class="pg-field">
      <span class="pg-field-lab">相对宽度</span>
      <div class="pg-seg">
        <button
          v-for="chip in SIZE_CHIPS"
          :key="chip.id"
          type="button"
          class="pg-mini"
          :class="{ on: tile.span === chip.id }"
          @click="tile.span = chip.id"
        >
          {{ chip.name }}
        </button>
      </div>
    </div>
    <div class="pg-field">
      <span class="pg-field-lab">固定宽度</span>
      <div class="pg-step pg-step--sm" :class="{ on: typeof tile.span === 'number' }">
        <button
          type="button"
          :disabled="absOf(tile.span, studio.column) <= 1"
          @click="bumpAbs(tile, studio.column, -1)"
        >
          −
        </button>
        <strong>{{ absOf(tile.span, studio.column) }}</strong>
        <button
          type="button"
          :disabled="absOf(tile.span, studio.column) >= GRID"
          @click="bumpAbs(tile, studio.column, 1)"
        >
          +
        </button>
      </div>
    </div>
    <div class="pg-field">
      <span class="pg-field-lab">行内位置</span>
      <div class="pg-seg">
        <button
          v-for="p in PLACE_CHIPS"
          :key="p.id"
          type="button"
          class="pg-mini"
          :class="{ on: tile.place === p.id }"
          @click="tile.place = p.id"
        >
          {{ p.name }}
        </button>
      </div>
    </div>
  </div>
</template>
