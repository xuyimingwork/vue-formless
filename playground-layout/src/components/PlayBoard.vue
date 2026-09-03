<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { LayoutView } from '../layout'
import { useCompact } from '../studio/compact'
import { tileHue } from '../studio/tiles'
import type { Tile } from '../studio/types'
import { useStudio } from '../studio/use-studio'
import Cell from './Cell.vue'
import Sheet from './Sheet.vue'
import TileCard from './TileCard.vue'
import TileFields from './TileFields.vue'

const studio = useStudio()
const compact = useCompact()
const liveTiles = computed(() => studio.tiles.filter((t) => t.on))
const deletedTiles = computed(() => studio.tiles.filter((t) => !t.on))
const editing = ref<Tile | null>(null)

watch(() => studio.sourceOpen, (open) => {
  if (open) editing.value = null
})

watch(liveTiles, (list) => {
  if (editing.value && !list.some((t) => t.id === editing.value?.id)) editing.value = null
})

watch([editing, compact], () => {
  studio.peeking = Boolean(compact.value && editing.value)
})

onUnmounted(() => {
  studio.peeking = false
})

function openEdit(t: Tile, el: HTMLElement) {
  studio.sourceOpen = false
  editing.value = t
  nextTick(() => {
    const cell = el.closest('[data-layout-cell]') ?? el
    cell.scrollIntoView({ block: 'start', behavior: 'smooth' })
  })
}

function removeEditing() {
  if (!editing.value) return
  editing.value.on = false
  editing.value = null
}
</script>

<template>
  <div
    class="pg-board"
    :class="{
      'pg-board--hide-blanks': !studio.showBlanks,
      'pg-board--off': studio.disabled,
      'is-peek': compact && editing,
    }"
    :style="{ '--pg-row-gap': `${studio.rowGap}px` }"
  >
    <p v-if="studio.disabled" class="pg-illust-cap">布局已关掉，下面只是普通内容，不再排成栅格</p>
    <p v-else-if="compact && !editing" class="pg-illust-cap">点格子可改宽度和位置</p>
    <LayoutView :column="studio.column" :gutter="studio.gutter" :disabled="studio.disabled">
      <Cell
        v-for="t in liveTiles"
        :key="t.id"
        :span="t.span"
        :place="t.place"
        :style="{ '--pg-tile': tileHue(t.label) }"
      >
        <TileCard :tile="t" :active="editing?.id === t.id" @edit="openEdit(t, $event)" />
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

  <Sheet v-if="compact && editing" peek :title="`格子 ${editing.label}`" @close="editing = null">
    <TileFields class="pg-sheet-fields" :tile="editing" />
    <button type="button" class="pg-unmount pg-unmount--block" @click="removeEditing">拿掉</button>
  </Sheet>
</template>
