<script setup lang="ts">
const props = defineProps<{
  label: string
  modelValue: number
  min: number
  max: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function bump(dir: -1 | 1) {
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, props.modelValue + dir)))
}
</script>

<template>
  <div class="pg-ctrl pg-ctrl--step">
    <span>{{ label }}</span>
    <div class="pg-step">
      <button type="button" :disabled="modelValue <= min" @click="bump(-1)">−</button>
      <strong>{{ modelValue }}</strong>
      <button type="button" :disabled="modelValue >= max" @click="bump(1)">+</button>
    </div>
  </div>
</template>
