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
    <FormView v-model="form" :fl:form="false" :fl:layout="{ column: 3, gutter: 16 }">
      <User.Name :fl:validate="'required'" />
      <User.Gender />
      <User.Mobile />
    </FormView>

    <p class="pg-section-title">证件与联系</p>
    <FormView v-model="form" :fl:form="false">
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
    <FormView v-model="form" :fl:form="false" :fl:layout="{ column: 1, gutter: 16 }">
      <User.Remark />
    </FormView>
  </FormView>

  <div class="pg-actions">
    <el-button type="primary" @click="onSubmit">提交</el-button>
  </div>
  <pre class="pg-preview">{{ form }}</pre>
</template>
