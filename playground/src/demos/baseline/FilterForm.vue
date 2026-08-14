<script setup lang="ts">
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

const query = reactive({
  name: '',
  gender: '',
  mobile: '',
  email: '',
})

function onSearch() {
  ElMessage.success('查询（基线）')
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
    <el-row :gutter="12">
      <el-col :span="6">
        <el-form-item label="姓名">
          <el-input v-model="query.name" clearable placeholder="姓名" />
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="性别">
          <el-select v-model="query.gender" clearable placeholder="全部" style="width: 100%">
            <el-option label="男" value="male" />
            <el-option label="女" value="female" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="手机">
          <el-input v-model="query.mobile" clearable placeholder="手机" />
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="邮箱">
          <el-input v-model="query.email" clearable placeholder="邮箱" />
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>

  <div class="pg-actions">
    <el-button @click="onReset">重置</el-button>
    <el-button type="primary" @click="onSearch">查询</el-button>
  </div>
  <pre class="pg-preview">{{ query }}</pre>
</template>
