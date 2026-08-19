<script setup lang="ts">
import { ElCol, ElFormItem, ElRow } from 'element-plus'
import { defineComponent, h, type PropType } from 'vue'

const start = defineModel<string>('start')
const end = defineModel<string>('end')

/**
 * Stand-in for `useFormItem('start' | 'end')` (ADR-013).
 * Kernel `shell: false` is not wired yet — this widget lays out two Items itself.
 */
const StartItem = stubFormItem()
const EndItem = stubFormItem()

function stubFormItem() {
  return defineComponent({
    inheritAttrs: false,
    props: {
      formless: { type: Object as PropType<{ label?: string }>, default: undefined },
    },
    setup(props, { slots }) {
      return () =>
        h(ElCol, { span: 12 }, () =>
          h(ElFormItem, { label: props.formless?.label }, slots),
        )
    },
  })
}
</script>

<template>
  <ElRow :gutter="16">
    <StartItem :formless="{ label: '开始日期' }">
      <el-date-picker
        v-model="start"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="开始日期"
        style="width: 100%"
      />
    </StartItem>
    <EndItem :formless="{ label: '结束日期' }">
      <el-date-picker
        v-model="end"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="结束日期"
        style="width: 100%"
      />
    </EndItem>
  </ElRow>
</template>
