<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { FormView } from '../../bridge/ep'
import { User, createEmptyUser } from '../../models/user'

const formRef = ref<FormInstance>()
const form = ref(createEmptyUser())

async function onSubmit() {
  await formRef.value?.validate()
  ElMessage.success('校验通过（formless 混合）')
}
</script>

<template>
  <el-form ref="formRef" :model="form" label-width="96px">
    <p class="pg-section-title">基本信息（托管：扁平 span）</p>
    <FormView v-model="form" :default-span="8" :gutter="16">
      <User.Name />
      <User.Gender />
      <User.Mobile />
    </FormView>

    <p class="pg-section-title">证件与联系（逃逸：手写 ElRow）</p>
    <!-- layout=false → FormView 只提供 Context，栅格自己排 -->
    <FormView v-model="form" :layout="false">
      <el-row :gutter="16">
        <el-col :span="24">
          <User.IdCard bare />
        </el-col>
        <el-col :span="16">
          <User.Email bare />
        </el-col>
        <el-col :span="8">
          <User.Address bare />
        </el-col>
      </el-row>
    </FormView>

    <p class="pg-section-title">其他</p>
    <FormView v-model="form" :default-span="24" :gutter="16">
      <User.Remark :span="24" />
    </FormView>
  </el-form>

  <div class="pg-actions">
    <el-button type="primary" @click="onSubmit">提交</el-button>
  </div>
  <pre class="pg-preview">{{ form }}</pre>
</template>
