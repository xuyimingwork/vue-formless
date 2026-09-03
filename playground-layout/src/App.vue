<script setup lang="ts">
import NestedBoard from './components/NestedBoard.vue'
import PlayBoard from './components/PlayBoard.vue'
import Stage from './components/Stage.vue'
import StudioHeader from './components/StudioHeader.vue'
import StudioToolbar from './components/StudioToolbar.vue'
import { provideCompact } from './studio/compact'
import { provideStudio } from './studio/use-studio'

const studio = provideStudio()
const compact = provideCompact()
</script>

<template>
  <div class="pg" :class="{ 'is-compact': compact, 'is-peek': studio.peeking || studio.sourceOpen }">
    <div class="pg-chrome">
      <div class="pg-chrome-inner">
        <StudioHeader />
        <StudioToolbar />
      </div>
    </div>
    <Stage :snippet="studio.snippet">
      <PlayBoard v-if="studio.scene === 'play'" />
      <NestedBoard v-else />
    </Stage>
  </div>
</template>
