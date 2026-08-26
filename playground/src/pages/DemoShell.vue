<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import { demos, parseDemoMode, type DemoId } from '../router'
import BaselineBasic from '../demos/baseline/BasicUserForm.vue'
import BaselineFilter from '../demos/baseline/FilterForm.vue'
import BaselineReadonly from '../demos/baseline/ReadonlyDetail.vue'
import BaselineMixed from '../demos/baseline/MixedLayoutForm.vue'
import BaselineRange from '../demos/baseline/RangeForm.vue'
import FormlessBasic from '../demos/formless/BasicUserForm.vue'
import FormlessFilter from '../demos/formless/FilterForm.vue'
import FormlessReadonly from '../demos/formless/ReadonlyDetail.vue'
import FormlessMixed from '../demos/formless/MixedLayoutForm.vue'
import FormlessRange from '../demos/formless/RangeForm.vue'

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
  range: BaselineRange,
}

const formlessMap: Record<DemoId, Component> = {
  basic: FormlessBasic,
  filter: FormlessFilter,
  readonly: FormlessReadonly,
  mixed: FormlessMixed,
  range: FormlessRange,
}

const notes: Record<DemoId, { baseline: string; formless: string; compare: string }> = {
  basic: {
    baseline: 'ElForm + Row/Col + FormItem，每个字段自己写 v-model。',
    formless:
      '共用 User 控件表；模板只摆控件。FormView 自带 Form；:fl:layout="{ column: 2 }"，备注 :fl:span="24"，必填 :fl:validate="\'required\'"。',
    compare: '同一套字段与校验，对照模板密度。',
  },
  filter: {
    baseline: '四格筛选，手写 Col span=6。',
    formless: '同一套 User.*，只点四个；placeholder / clearable 写在标签上。:fl:layout="{ column: 4, gutter: 12 }"。',
    compare: '同一套查询字段，对照栅格样板。',
  },
  readonly: {
    baseline: '与编辑同布局，逐项 disabled。',
    formless: '同一套 User.*；FormView disabled + column: 2。',
    compare: '同一份详情数据，对照只读写法。',
  },
  mixed: {
    baseline: '分组 + 三列 / 24+16+8 / 整行，手写 Col。',
    formless:
      '同一套 User.*；外层 FormView 包 Form；内层只写 `:fl:layout` 换密度（`fl:form` auto 关、v-model inherit）。',
    compare: '同一套分组布局，对照托管与逃逸。',
  },
  range: {
    baseline: '三列混排：行程日期 span 16 旁塞一格；开始+结束同样两列再塞一格。',
    formless:
      'Range One 一格 span 16；Range Two 控件 formless 关外层壳，内部 useFormItem 两格进同一行；备注是临场 FormView.Item（:fl:prop / :fl:span）。',
    compare: '对照两种 Range 都占两列的混排。',
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
