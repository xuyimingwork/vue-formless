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
  <FormField
    fl:model="start"
    fl:label="开始日期"
    :item:rules="[{ required: true, message: '请选择开始日期', trigger: 'change' }]"
  >
    <el-date-picker
      v-model="start"
      type="date"
      value-format="YYYY-MM-DD"
      placeholder="开始日期"
      style="width: 100%"
    />
  </FormField>
  <FormField
    fl:model="end"
    fl:label="结束日期"
    :item:rules="[{ required: true, message: '请选择结束日期', trigger: 'change' }]"
  >
    <el-date-picker
      v-model="end"
      type="date"
      value-format="YYYY-MM-DD"
      placeholder="结束日期"
      style="width: 100%"
    />
  </FormField>
</template>
