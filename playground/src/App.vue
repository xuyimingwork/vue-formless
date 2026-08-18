<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { demos, parseDemoMode, type DemoId } from './router'

const route = useRoute()
const mode = computed(() => parseDemoMode(String(route.params.mode ?? '')))

function isActive(id: DemoId) {
  return route.params.id === id
}
</script>

<template>
  <div class="pg-shell">
    <aside class="pg-nav">
      <h1 class="pg-brand">vue-formless</h1>
      <p class="pg-brand-sub">Playground：Element Plus 基线 vs Formless 预演</p>
      <ul class="pg-nav-list">
        <li v-for="demo in demos" :key="demo.id">
          <RouterLink
            class="pg-nav-link"
            :class="{ 'is-active': isActive(demo.id) }"
            :to="`/demo/${demo.id}/${mode}`"
          >
            <strong>{{ demo.title }}</strong>
            <span>{{ demo.desc }}</span>
          </RouterLink>
        </li>
      </ul>
    </aside>
    <main class="pg-main">
      <RouterView />
    </main>
  </div>
</template>
