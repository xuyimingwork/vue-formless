<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { FormView } from '../../ep'
import { User } from './user'

const query = ref({
  name: '',
  gender: '',
  mobile: '',
  email: '',
})

function onSearch() {
  ElMessage.success('查询（formless）')
}

function onReset() {
  query.value = {
    name: '',
    gender: '',
    mobile: '',
    email: '',
  }
}
</script>

<template>
  <el-form :model="query" label-width="72px" @submit.prevent>
    <FormView v-model="query" :layout="{ column: 4, gutter: 12 }">
      <User.Name placeholder="姓名" clearable />
      <User.Gender placeholder="全部" clearable />
      <User.Mobile placeholder="手机" clearable />
      <User.Email placeholder="邮箱" clearable />
    </FormView>
  </el-form>

  <div class="pg-actions">
    <el-button @click="onReset">重置</el-button>
    <el-button type="primary" @click="onSearch">查询</el-button>
  </div>
  <pre class="pg-preview">{{ query }}</pre>
</template>
