<script setup lang="ts">
import NestedBoard from './components/NestedBoard.vue'
import PlayBoard from './components/PlayBoard.vue'
import Stage from './components/Stage.vue'
import StudioHeader from './components/StudioHeader.vue'
import StudioToolbar from './components/StudioToolbar.vue'
import { provideStudio } from './studio/use-studio'

const studio = provideStudio()
</script>

<template>
  <div class="pg">
    <StudioHeader />
    <StudioToolbar />
    <Stage :snippet="studio.snippet">
      <PlayBoard v-if="studio.scene === 'play'" />
      <NestedBoard v-else />
    </Stage>
  </div>
</template>
