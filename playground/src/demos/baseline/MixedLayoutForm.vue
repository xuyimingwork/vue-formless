<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'

const formRef = ref<FormInstance>()
const form = reactive({
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
  ElMessage.success('校验通过（基线混合布局）')
}
</script>

<template>
  <el-form ref="formRef" :model="form" label-width="96px">
    <p class="pg-section-title">基本信息</p>
    <el-row :gutter="16">
      <el-col :span="8">
        <el-form-item label="姓名" prop="name" :rules="[{ required: true, message: '必填' }]">
          <el-input v-model="form.name" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="性别" prop="gender">
          <el-select v-model="form.gender" clearable style="width: 100%">
            <el-option label="男" value="male" />
            <el-option label="女" value="female" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="手机" prop="mobile">
          <el-input v-model="form.mobile" />
        </el-form-item>
      </el-col>
    </el-row>

    <p class="pg-section-title">证件与联系</p>
    <el-row :gutter="16">
      <el-col :span="24">
        <el-form-item label="证件号" prop="idCard">
          <el-input v-model="form.idCard" />
        </el-form-item>
      </el-col>
      <el-col :span="16" :offset="0">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" />
        </el-form-item>
      </el-col>
    </el-row>

    <p class="pg-section-title">其他</p>
    <el-row :gutter="16">
      <el-col :span="24">
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>

  <div class="pg-actions">
    <el-button type="primary" @click="onSubmit">提交</el-button>
  </div>
  <pre class="pg-preview">{{ form }}</pre>
</template>
