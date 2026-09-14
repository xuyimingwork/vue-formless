<script setup lang="ts">
import { FormField } from 'vue-formless'

defineOptions({
  formless: {
    field: 'embed',
    model: ['start', 'end'],
  },
})

const start = defineModel<string>('start')
const end = defineModel<string>('end')
</script>

<template>
  <FormField fl:model="start" label="开始日期">
    <el-date-picker
      v-model="start"
      type="date"
      value-format="YYYY-MM-DD"
      placeholder="开始日期"
      style="width: 100%"
    />
  </FormField>
  <FormField fl:model="end" label="结束日期">
    <el-date-picker
      v-model="end"
      type="date"
      value-format="YYYY-MM-DD"
      placeholder="结束日期"
      style="width: 100%"
    />
  </FormField>
</template>
