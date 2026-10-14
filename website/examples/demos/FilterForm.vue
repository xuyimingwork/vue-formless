<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
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
  <FormView
    v-model="query"
    label-width="72px"
    fl:layout
    :layout:column="4"
    :layout:gutter="12"
    @submit.prevent
  >
    <User.Name placeholder="姓名" clearable />
    <User.Gender placeholder="全部" clearable />
    <User.Mobile placeholder="手机" clearable />
    <User.Email placeholder="邮箱" clearable />
  </FormView>

  <div class="demo-actions">
    <el-button @click="onReset">重置</el-button>
    <el-button type="primary" @click="onSearch">查询</el-button>
  </div>
  <pre class="demo-preview">{{ query }}</pre>
</template>

<style scoped>
.demo-actions {
  margin: 16px 0 8px;
}
.demo-preview {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 12px;
  font-size: 12px;
  overflow: auto;
  max-height: 220px;
}
</style>
