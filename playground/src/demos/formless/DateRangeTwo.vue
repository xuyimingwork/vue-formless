<script setup lang="ts">
import { useFormItem } from 'vue-formless'

defineOptions({
    formless: {
      item: 'self',
      model: ['start', 'end'],
    },
})

const start = defineModel<string>('start')
const end = defineModel<string>('end')

const StartItem = useFormItem('start')
const EndItem = useFormItem('end')
</script>

<template>
  <StartItem label="开始日期">
    <el-date-picker
      v-model="start"
      type="date"
      value-format="YYYY-MM-DD"
      placeholder="开始日期"
      style="width: 100%"
    />
  </StartItem>
  <EndItem label="结束日期">
    <el-date-picker
      v-model="end"
      type="date"
      value-format="YYYY-MM-DD"
      placeholder="结束日期"
      style="width: 100%"
    />
  </EndItem>
</template>
