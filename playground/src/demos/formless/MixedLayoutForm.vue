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
  ElMessage.success('校验通过（formless 混合布局）')
}
</script>

<template>
  <FormView ref="formRef" v-model="form" label-width="96px">
    <p class="pg-section-title">基本信息</p>
    <FormView fl:layout :row:column="3" :row:gutter="16">
      <User.Name />
      <User.Gender />
      <User.Mobile />
    </FormView>

    <p class="pg-section-title">证件与联系</p>
    <FormView fl:layout :row:column="3" :row:gutter="16">
      <User.IdCard col:span="max" />
      <User.Email col:span="16" />
      <User.Address col:span="8" />
    </FormView>

    <p class="pg-section-title">其他</p>
    <FormView fl:layout :row:column="1" :row:gutter="16">
      <User.Remark />
    </FormView>
  </FormView>

  <div class="pg-actions">
    <el-button type="primary" @click="onSubmit">提交</el-button>
  </div>
  <pre class="pg-preview">{{ form }}</pre>
</template>
