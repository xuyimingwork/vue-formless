<script setup lang="ts">
import { LayoutView } from '../layout'
import { useStudio } from '../studio/use-studio'
import Cell from './Cell.vue'

const studio = useStudio()
</script>

<template>
  <div class="pg-board">
    <p class="pg-illust-cap">这一格里面又排了一层，里面可以是另一套列数</p>
    <LayoutView :column="3" :gutter="studio.gutter">
      <Cell>A</Cell>
      <Cell>B</Cell>
      <Cell>C</Cell>
      <Cell span="max" plain>
        <div class="pg-nest">
          <LayoutView :column="2" :gutter="studio.gutter">
            <Cell>1</Cell>
            <Cell>2</Cell>
            <Cell span="max">max</Cell>
          </LayoutView>
        </div>
      </Cell>
    </LayoutView>
  </div>
</template>
