<script setup lang="ts">
import { computed } from 'vue'

const start = defineModel<string>('start')
const end = defineModel<string>('end')

const range = computed({
  get(): [string, string] | undefined {
    if (!start.value && !end.value) return undefined
    return [start.value ?? '', end.value ?? '']
  },
  set(value: [string, string] | null | undefined) {
    start.value = value?.[0] ?? ''
    end.value = value?.[1] ?? ''
  },
})
</script>

<template>
  <el-date-picker
    v-model="range"
    type="daterange"
    value-format="YYYY-MM-DD"
    start-placeholder="开始日期"
    end-placeholder="结束日期"
    style="width: 100%"
  />
</template>
