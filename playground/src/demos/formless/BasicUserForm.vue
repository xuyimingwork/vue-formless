<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { createFormControls } from 'vue-formless'
import { EpInput, EpSelect, FormView } from '@vue-formless/element-plus'

const formRef = ref<FormInstance>()
const form = ref({
  name: '',
  gender: '',
  mobile: '',
  email: '',
  idCard: '',
  address: '',
  remark: '',
})

const User = createFormControls({
  name: {
    label: '姓名',
    component: EpInput,
    validation: { empty: { message: '请输入姓名' } },
  },
  gender: {
    label: '性别',
    component: EpSelect,
    props: {
      options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
        { label: '其他', value: 'other' },
      ],
    },
    validation: { empty: { message: '请选择性别' } },
  },
  mobile: {
    label: '手机',
    component: EpInput,
    props: { placeholder: '11 位手机号' },
    validation: {
      empty: { message: '请输入手机号' },
      format: { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
    },
  },
  email: {
    label: '邮箱',
    component: EpInput,
    props: { placeholder: 'name@example.com' },
  },
  idCard: {
    label: '证件号',
    component: EpInput,
    props: { placeholder: '身份证号' },
  },
  address: {
    label: '地址',
    component: EpInput,
    props: { placeholder: '详细地址' },
  },
  remark: {
    label: '备注',
    component: EpInput,
    props: { type: 'textarea', rows: 3, placeholder: '可选' },
  },
})

const required = { validate: 'required' as const }

async function onSubmit() {
  await formRef.value?.validate()
  ElMessage.success('校验通过（formless）')
}

function onReset() {
  formRef.value?.resetFields()
}
</script>

<template>
  <el-form ref="formRef" :model="form" label-width="96px">
    <FormView v-model="form" :layout="{ column: 2, gutter: 16 }">
      <User.Name :formless="required" />
      <User.Gender :formless="required" />
      <User.Mobile :formless="required" />
      <User.Email />
      <User.IdCard />
      <User.Address />
      <User.Remark :formless="{ span: 24 }" />
    </FormView>
  </el-form>

  <div class="pg-actions">
    <el-button @click="onReset">重置</el-button>
    <el-button type="primary" @click="onSubmit">提交</el-button>
  </div>
  <pre class="pg-preview">{{ form }}</pre>
</template>
