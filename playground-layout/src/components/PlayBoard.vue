<script setup lang="ts">
import { computed } from 'vue'
import { LayoutView } from '../layout'
import { tileHue } from '../studio/tiles'
import { useStudio } from '../studio/use-studio'
import Cell from './Cell.vue'
import TileCard from './TileCard.vue'

const studio = useStudio()
const liveTiles = computed(() => studio.tiles.filter((t) => t.on))
const deletedTiles = computed(() => studio.tiles.filter((t) => !t.on))
</script>

<template>
  <div
    class="pg-board"
    :class="{ 'pg-board--hide-blanks': !studio.showBlanks, 'pg-board--off': studio.disabled }"
    :style="{ '--pg-row-gap': `${studio.rowGap}px` }"
  >
    <p v-if="studio.disabled" class="pg-illust-cap">布局已关掉，下面只是普通内容，不再排成栅格</p>
    <LayoutView :column="studio.column" :gutter="studio.gutter" :disabled="studio.disabled">
      <Cell
        v-for="t in liveTiles"
        :key="t.id"
        :span="t.span"
        :place="t.place"
        :style="{ '--pg-tile': tileHue(t.label) }"
      >
        <TileCard :tile="t" />
      </Cell>
    </LayoutView>

    <div v-if="deletedTiles.length" class="pg-deleted">
      <span class="pg-deleted-cap">已拿掉</span>
      <button
        v-for="t in deletedTiles"
        :key="t.id"
        type="button"
        class="pg-deleted-chip"
        :style="{ '--pg-tile': tileHue(t.label) }"
        @click="t.on = true"
      >
        <i class="pg-deleted-dot" />
        {{ t.label }}
        <em>放回</em>
      </button>
    </div>
  </div>
</template>
