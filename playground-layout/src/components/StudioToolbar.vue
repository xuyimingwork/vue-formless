<script setup lang="ts">
import { GRID } from '../studio/tiles'
import { useStudio } from '../studio/use-studio'
import Stepper from './Stepper.vue'

const studio = useStudio()
</script>

<template>
  <div class="pg-toolbar">
    <div class="pg-ctrl pg-ctrl--presets" role="tablist">
      <span>快捷案例</span>
      <div class="pg-presets">
        <button
          v-for="p in studio.presets"
          :key="p.id"
          type="button"
          class="pg-chip"
          :class="{ on: studio.activePreset === p.id }"
          :title="p.hint"
          @click="studio.applyPreset(p.id)"
        >
          {{ p.name }}
        </button>
      </div>
    </div>
    <div v-if="studio.scene === 'play'" class="pg-toolbar-steps">
      <Stepper v-model="studio.column" label="列数" :min="1" :max="8" />
      <Stepper
        :model-value="studio.tiles.length"
        label="格子"
        :min="0"
        :max="GRID"
        @update:model-value="studio.setCount"
      />
      <Stepper v-model="studio.gutter" label="间距" :min="0" :max="GRID" />
      <Stepper v-model="studio.rowGap" label="行距" :min="0" :max="GRID" />
      <button
        type="button"
        class="pg-switch"
        :class="{ on: studio.disabled }"
        title="关掉之后不再排成栅格"
        @click="studio.disabled = !studio.disabled"
      >
        关掉布局
      </button>
      <button
        type="button"
        class="pg-switch"
        :class="{ on: studio.showBlanks }"
        title="黄块是自动补上的空位"
        @click="studio.showBlanks = !studio.showBlanks"
      >
        显示占位
      </button>
    </div>
  </div>
</template>
