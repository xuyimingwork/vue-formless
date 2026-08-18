<script setup lang="ts">
import { ref } from 'vue'
import { createFormControls } from 'vue-formless'
import { EpInput, EpSelect, FormView } from '@vue-formless/element-plus'

const form = ref({
  name: '陈青禾',
  gender: 'female',
  mobile: '13800138000',
  email: 'qinghe@example.com',
  idCard: '110101199001011234',
  address: '上海市徐汇区示例路 88 号',
  remark: '重点客户',
})

const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '其他', value: 'other' },
]

const User = createFormControls({
  name: { label: '姓名', component: EpInput },
  gender: { label: '性别', component: EpSelect, props: { options: genderOptions } },
  mobile: { label: '手机', component: EpInput },
  email: { label: '邮箱', component: EpInput },
  idCard: { label: '证件号', component: EpInput },
  address: { label: '地址', component: EpInput },
  remark: {
    label: '备注',
    component: EpInput,
    props: { type: 'textarea', rows: 3 },
  },
})
</script>

<template>
  <el-form :model="form" label-width="96px">
    <FormView v-model="form" readonly :layout="{ column: 2, gutter: 16 }">
      <User.Name />
      <User.Gender />
      <User.Mobile />
      <User.Email />
      <User.IdCard />
      <User.Address />
      <User.Remark :formless="{ span: 24 }" />
    </FormView>
  </el-form>
  <pre class="pg-preview">{{ form }}</pre>
</template>
