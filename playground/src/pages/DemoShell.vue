<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { demos, type DemoId, type DemoMode } from '../router'
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
const mode = computed(() => (props.mode === 'formless' ? 'formless' : 'baseline') as DemoMode)
const demoId = computed(() => props.id as DemoId)

const notes: Record<DemoId, { baseline: string; formless: string }> = {
  basic: {
    baseline: '经典写法：ElForm + ElRow/ElCol + ElFormItem，字段 v-model 写在模板里。',
    formless:
      '目标写法：项目级 createFormView({ Row: ElRow, Col: ElCol })；页面 FormView v-model 接管数据；静态 User.* 从 Context 读写。空白 Col 补齐算法尚未实现。',
  },
  filter: {
    baseline: '筛选区同样手写栅格与绑定，和编辑表单样板几乎同构。',
    formless: '同一份 User 模型复用到筛选；FormView 只换一份 query 对象。',
  },
  readonly: {
    baseline: '详情页再抄一套，或给每个控件绑 :disabled。',
    formless: '同一套 User.*，FormView 设 readonly，字段从 Context 读到禁用态。',
  },
  mixed: {
    baseline: '分组标题、整行、offset 全靠手写 Col。',
    formless:
      '常规字段走扁平 span；需要奇怪排布的一段可退出托管，手写 ElRow（ADR-008 逃逸）。',
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
      </div>
    </div>

    <p class="pg-note">
      {{ notes[demoId][mode] }}
    </p>

    <div class="pg-panel">
      <BaselineBasic v-if="demoId === 'basic' && mode === 'baseline'" />
      <BaselineFilter v-else-if="demoId === 'filter' && mode === 'baseline'" />
      <BaselineReadonly v-else-if="demoId === 'readonly' && mode === 'baseline'" />
      <BaselineMixed v-else-if="demoId === 'mixed' && mode === 'baseline'" />
      <FormlessBasic v-else-if="demoId === 'basic' && mode === 'formless'" />
      <FormlessFilter v-else-if="demoId === 'filter' && mode === 'formless'" />
      <FormlessReadonly v-else-if="demoId === 'readonly' && mode === 'formless'" />
      <FormlessMixed v-else-if="demoId === 'mixed' && mode === 'formless'" />
    </div>
  </div>
  <p v-else>未知示例</p>
</template>
