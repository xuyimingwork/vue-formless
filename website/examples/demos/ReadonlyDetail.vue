<script setup lang="ts">
import { ref } from 'vue'
import { User } from './user'

const form = ref({
  name: '陈青禾',
  gender: 'female',
  mobile: '13800138000',
  email: 'qinghe@example.com',
  idCard: '110101199001011234',
  address: '上海市徐汇区示例路 88 号',
  remark: '重点客户',
})
</script>

<template>
  <FormView v-model="form" disabled label-width="96px" fl:layout :layout:gutter="16">
    <User.Name />
    <User.Gender />
    <User.Mobile />
    <User.Email />
    <User.IdCard />
    <User.Address />
    <User.Remark layout-item:span="max" />
  </FormView>
  <pre class="demo-preview">{{ form }}</pre>
</template>

<style scoped>
.demo-preview {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 12px;
  font-size: 12px;
  overflow: auto;
  max-height: 220px;
}
</style>
