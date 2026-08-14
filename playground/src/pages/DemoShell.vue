<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import { demos, parseDemoMode, type DemoId } from '../router'
import BaselineBasic from '../demos/baseline/BasicUserForm.vue'
import BaselineFilter from '../demos/baseline/FilterForm.vue'
import BaselineReadonly from '../demos/baseline/ReadonlyDetail.vue'
import BaselineMixed from '../demos/baseline/MixedLayoutForm.vue'
import FormlessBasic from '../demos/formless/BasicUserForm.vue'
import FormlessFilter from '../demos/formless/FilterForm.vue'
import FormlessReadonly from '../demos/formless/ReadonlyDetail.vue'
import FormlessMixed from '../demos/formless/MixedLayoutForm.vue'

const props = defineProps<{
  id: string
  mode: string
}>()

const demo = computed(() => demos.find((d) => d.id === props.id))
const mode = computed(() => parseDemoMode(props.mode))
const demoId = computed(() => props.id as DemoId)

const baselineMap: Record<DemoId, Component> = {
  basic: BaselineBasic,
  filter: BaselineFilter,
  readonly: BaselineReadonly,
  mixed: BaselineMixed,
}

const formlessMap: Record<DemoId, Component> = {
  basic: FormlessBasic,
  filter: FormlessFilter,
  readonly: FormlessReadonly,
  mixed: FormlessMixed,
}

const notes: Record<DemoId, { baseline: string; formless: string; compare: string }> = {
  basic: {
    baseline: '经典写法：ElForm + ElRow/ElCol + ElFormItem，字段 v-model 写在模板里。',
    formless:
      'FormView :layout="{ column, gutter }" 管页级密度（defaultSpan = 24/column）；不写 layout = 纯 Context。空白 Col 补齐尚未实现。',
    compare: '左侧 Element 基线，右侧 Formless 预演；各自独立一份表单状态，便于对照样板量与写法。',
  },
  filter: {
    baseline: '筛选区同样手写栅格与绑定，和编辑表单样板几乎同构。',
    formless: '同一份 User；:layout="{ column: 4, gutter: 12 }" 更密。',
    compare: '左右对照筛选条：基线手写四格 vs Formless 复用 User.*。',
  },
  readonly: {
    baseline: '详情页再抄一套，或给每个控件绑 :disabled。',
    formless: '同一套 User.*；`layout` 开默认两列 + readonly。',
    compare: '左右对照只读：基线逐项 disabled vs FormView readonly。',
  },
  mixed: {
    baseline: '分组标题、整行、offset 全靠手写 Col。',
    formless: '托管段写 :layout="{ column }"；逃逸段不写 layout，手写 ElRow + bare。',
    compare: '左右对照混合布局：手写分组 vs 托管 + 逃逸分段。',
  },
}
</script>

<template>
  <div v-if="demo">
    <div class="pg-toolbar">
      <div>
        <h2 class="pg-title">{{ demo.title }}</h2>
        <p class="pg-desc">{{ demo.desc }}</p>
      </div>
      <div class="pg-mode">
        <RouterLink
          :class="{ 'is-active': mode === 'baseline' }"
          :to="`/demo/${demoId}/baseline`"
        >
          Element 基线
        </RouterLink>
        <RouterLink
          :class="{ 'is-active': mode === 'formless' }"
          :to="`/demo/${demoId}/formless`"
        >
          Formless 预演
        </RouterLink>
        <RouterLink
          :class="{ 'is-active': mode === 'compare' }"
          :to="`/demo/${demoId}/compare`"
        >
          平铺对比
        </RouterLink>
      </div>
    </div>

    <p class="pg-note">
      {{ notes[demoId][mode] }}
    </p>

    <div v-if="mode === 'compare'" class="pg-compare">
      <section class="pg-compare-col">
        <h3 class="pg-compare-label">Element 基线</h3>
        <div class="pg-panel">
          <component :is="baselineMap[demoId]" />
        </div>
      </section>
      <section class="pg-compare-col">
        <h3 class="pg-compare-label">Formless 预演</h3>
        <div class="pg-panel">
          <component :is="formlessMap[demoId]" />
        </div>
      </section>
    </div>

    <div v-else class="pg-panel">
      <component
        :is="mode === 'baseline' ? baselineMap[demoId] : formlessMap[demoId]"
      />
    </div>
  </div>
  <p v-else>未知示例</p>
</template>
