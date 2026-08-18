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
    rules: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  },
  gender: {
    label: '性别',
    component: EpSelect,
    props: {
      options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
        { label: '其他', value: 'other' },
      ]
    },
    rules: [{ required: true, message: '请选择性别', trigger: 'change' }],
  },
  mobile: {
    label: '手机',
    component: EpInput,
    props: { placeholder: '11 位手机号' },
    rules: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
    ],
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
      <User.Name />
      <User.Gender />
      <User.Mobile />
      <User.Email />
      <User.IdCard />
      <User.Address />
      <User.Remark :span="24" />
    </FormView>
  </el-form>

  <div class="pg-actions">
    <el-button @click="onReset">重置</el-button>
    <el-button type="primary" @click="onSubmit">提交</el-button>
  </div>
  <pre class="pg-preview">{{ form }}</pre>
</template>
