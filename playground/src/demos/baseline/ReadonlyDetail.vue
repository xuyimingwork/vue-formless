<script setup lang="ts">
import { reactive } from 'vue'
import { createSampleUser } from '../../models/user'

const form = reactive(createSampleUser())
</script>

<template>
  <el-form :model="form" label-width="96px">
    <el-row :gutter="16">
      <el-col :span="12">
        <el-form-item label="姓名">
          <el-input :model-value="form.name" disabled />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="性别">
          <el-select :model-value="form.gender" disabled style="width: 100%">
            <el-option label="男" value="male" />
            <el-option label="女" value="female" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="手机">
          <el-input :model-value="form.mobile" disabled />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="邮箱">
          <el-input :model-value="form.email" disabled />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="证件号">
          <el-input :model-value="form.idCard" disabled />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="地址">
          <el-input :model-value="form.address" disabled />
        </el-form-item>
      </el-col>
      <el-col :span="24">
        <el-form-item label="备注">
          <el-input :model-value="form.remark" type="textarea" :rows="3" disabled />
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
  <pre class="pg-preview">{{ form }}</pre>
</template>
