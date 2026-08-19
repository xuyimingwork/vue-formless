<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'

const formRef = ref<FormInstance>()
const form = reactive({
  name: '',
  gender: '',
  mobile: '',
  email: '',
  startTime: '',
  endTime: '',
  fromTime: '',
  toTime: '',
  idCard: '',
  address: '',
  remark: '',
})

const tripRange = computed({
  get(): [string, string] | undefined {
    if (!form.startTime && !form.endTime) return undefined
    return [form.startTime, form.endTime]
  },
  set(value: [string, string] | null | undefined) {
    form.startTime = value?.[0] ?? ''
    form.endTime = value?.[1] ?? ''
  },
})

async function onSubmit() {
  await formRef.value?.validate()
  ElMessage.success('校验通过（基线 DateRange）')
}

function onReset() {
  formRef.value?.resetFields()
}
</script>

<template>
  <el-form ref="formRef" :model="form" label-width="96px">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-form-item label="姓名" prop="name" :rules="[{ required: true, message: '请输入姓名', trigger: 'blur' }]">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="性别" prop="gender" :rules="[{ required: true, message: '请选择性别', trigger: 'change' }]">
          <el-select v-model="form.gender" placeholder="请选择" clearable style="width: 100%">
            <el-option label="男" value="male" />
            <el-option label="女" value="female" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="手机" prop="mobile">
          <el-input v-model="form.mobile" placeholder="11 位手机号" />
        </el-form-item>
      </el-col>
      <el-col :span="16">
        <el-form-item
          label="行程日期"
          required
          :rules="[{ required: true, message: '请选择日期范围', trigger: 'change' }]"
        >
          <el-date-picker
            v-model="tripRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="name@example.com" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item
          label="开始日期"
          prop="fromTime"
          :rules="[{ required: true, message: '请选择开始日期', trigger: 'change' }]"
        >
          <el-date-picker
            v-model="form.fromTime"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="开始日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item
          label="结束日期"
          prop="toTime"
          :rules="[{ required: true, message: '请选择结束日期', trigger: 'change' }]"
        >
          <el-date-picker
            v-model="form.toTime"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="结束日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="证件号" prop="idCard">
          <el-input v-model="form.idCard" placeholder="身份证号" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" placeholder="详细地址" />
        </el-form-item>
      </el-col>
      <el-col :span="24">
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>

  <div class="pg-actions">
    <el-button @click="onReset">重置</el-button>
    <el-button type="primary" @click="onSubmit">提交</el-button>
  </div>
  <pre class="pg-preview">{{ form }}</pre>
</template>
