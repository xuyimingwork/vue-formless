<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { FormView } from '../../ep'
import { User } from './user'

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

async function onSubmit() {
  await formRef.value?.validate()
  ElMessage.success('校验通过（formless）')
}

function onReset() {
  formRef.value?.resetFields()
}
</script>

<template>
  <FormView
    ref="formRef"
    v-model="form"
    fl:layout
    :layout:gutter="16"
    label-width="96px"
  >
    <User.Name :item:rules="[{ required: true, message: '请输入姓名', trigger: 'blur' }]" />
    <User.Gender :item:rules="[{ required: true, message: '请选择性别', trigger: 'change' }]" />
    <User.Mobile
      :item:rules="[
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
      ]"
    />
    <User.Email />
    <User.IdCard />
    <User.Address />
    <User.Remark layout-item:span="max" />
  </FormView>

  <div class="pg-actions">
    <el-button @click="onReset">重置</el-button>
    <el-button type="primary" @click="onSubmit">提交</el-button>
  </div>
  <pre class="pg-preview">{{ form }}</pre>
</template>
