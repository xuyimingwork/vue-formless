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

const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '其他', value: 'other' },
]

const User = createFormControls({
  name: {
    label: '姓名',
    component: EpInput,
    validation: { empty: { message: '必填' } },
  },
  gender: { label: '性别', component: EpSelect, props: { options: genderOptions } },
  mobile: { label: '手机', component: EpInput },
  idCard: { label: '证件号', component: EpInput },
  email: { label: '邮箱', component: EpInput },
  address: { label: '地址', component: EpInput },
  remark: {
    label: '备注',
    component: EpInput,
    props: { type: 'textarea', rows: 3 },
  },
})

async function onSubmit() {
  await formRef.value?.validate()
  ElMessage.success('校验通过（formless 混合布局）')
}
</script>

<template>
  <el-form ref="formRef" :model="form" label-width="96px">
    <p class="pg-section-title">基本信息</p>
    <FormView v-model="form" :layout="{ column: 3, gutter: 16 }">
      <User.Name :formless="{ validate: 'required' }" />
      <User.Gender />
      <User.Mobile />
    </FormView>

    <p class="pg-section-title">证件与联系</p>
    <FormView v-model="form">
      <el-row :gutter="16">
        <el-col :span="24">
          <User.IdCard />
        </el-col>
        <el-col :span="16">
          <User.Email />
        </el-col>
        <el-col :span="8">
          <User.Address />
        </el-col>
      </el-row>
    </FormView>

    <p class="pg-section-title">其他</p>
    <FormView v-model="form" :layout="{ column: 1, gutter: 16 }">
      <User.Remark />
    </FormView>
  </el-form>

  <div class="pg-actions">
    <el-button type="primary" @click="onSubmit">提交</el-button>
  </div>
  <pre class="pg-preview">{{ form }}</pre>
</template>
