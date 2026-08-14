<script setup lang="ts">
import { ref } from 'vue'
import { FormView } from '../../bridge/ep'
import { User, createSampleUser } from '../../models/user'

const form = ref(createSampleUser())
</script>

<template>
  <el-form :model="form" label-width="96px">
    <FormView v-model="form" readonly :default-span="12" :gutter="16">
      <User.Name />
      <User.Gender />
      <User.Mobile />
      <User.Email />
      <User.IdCard />
      <User.Address />
      <User.Remark :span="24" />
    </FormView>
  </el-form>
  <pre class="pg-preview">{{ form }}</pre>
</template>
