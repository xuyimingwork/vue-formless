<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { FormView } from '../../bridge/ep'
import { User, createEmptyUser } from '../../models/user'

const formRef = ref<FormInstance>()
const form = ref(createEmptyUser())

async function onSubmit() {
  await formRef.value?.validate()
  ElMessage.success('校验通过（formless 预演）')
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
