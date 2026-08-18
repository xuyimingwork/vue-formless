<script setup lang="ts">
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { createFormControls } from 'vue-formless'
import { EpInput, EpSelect, FormView } from '@vue-formless/element-plus'

const query = reactive({
  name: '',
  gender: '',
  mobile: '',
  email: '',
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
    props: { placeholder: '姓名', clearable: true },
  },
  gender: {
    label: '性别',
    component: EpSelect,
    props: { options: genderOptions, placeholder: '全部', clearable: true },
  },
  mobile: {
    label: '手机',
    component: EpInput,
    props: { placeholder: '手机', clearable: true },
  },
  email: {
    label: '邮箱',
    component: EpInput,
    props: { placeholder: '邮箱', clearable: true },
  },
})

function onSearch() {
  ElMessage.success('查询（formless）')
}

function onReset() {
  query.name = ''
  query.gender = ''
  query.mobile = ''
  query.email = ''
}
</script>

<template>
  <el-form :model="query" label-width="72px" @submit.prevent>
    <FormView v-model="query" :layout="{ column: 4, gutter: 12 }">
      <User.Name />
      <User.Gender />
      <User.Mobile />
      <User.Email />
    </FormView>
  </el-form>

  <div class="pg-actions">
    <el-button @click="onReset">重置</el-button>
    <el-button type="primary" @click="onSearch">查询</el-button>
  </div>
  <pre class="pg-preview">{{ query }}</pre>
</template>
