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
