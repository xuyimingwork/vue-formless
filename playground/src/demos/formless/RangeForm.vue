<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { FormView } from '../../ep'
import { Range } from './range'
import { User } from './user'

const formRef = ref<FormInstance>()
const form = ref({
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

async function onSubmit() {
  await formRef.value?.validate()
  ElMessage.success('校验通过（formless DateRange）')
}

function onReset() {
  formRef.value?.resetFields()
}
</script>

<template>
  <FormView
    ref="formRef"
    v-model="form"
    label-width="96px"
    fl:layout
    :row:column="3"
    :row:gutter="16"
  >
    <User.Name />
    <User.Gender />
    <User.Mobile />
    <Range.DateRangeOne col:span="16" />
    <User.Email />
    <Range.DateRangeTwo />
    <User.IdCard />
    <User.Address />
    <FormView.Item :fl:prop="'remark'" label="备注" col:span="max" v-slot="{ field }">
      <el-input v-bind="field" type="textarea" :rows="3" placeholder="可选" />
    </FormView.Item>
  </FormView>

  <div class="pg-actions">
    <el-button @click="onReset">重置</el-button>
    <el-button type="primary" @click="onSubmit">提交</el-button>
  </div>
  <pre class="pg-preview">{{ form }}</pre>
</template>
