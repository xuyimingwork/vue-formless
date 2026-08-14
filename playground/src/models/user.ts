import { createFormFields } from 'vue-formless'
import { EpGenderSelect, EpInput } from '../bridge/ep'

export type UserModel = {
  name: string
  gender: '' | 'male' | 'female' | 'other'
  mobile: string
  email: string
  idCard: string
  address: string
  remark: string
}

export function createEmptyUser(): UserModel {
  return {
    name: '',
    gender: '',
    mobile: '',
    email: '',
    idCard: '',
    address: '',
    remark: '',
  }
}

export function createSampleUser(): UserModel {
  return {
    name: '陈青禾',
    gender: 'female',
    mobile: '13800138000',
    email: 'qinghe@example.com',
    idCard: '110101199001011234',
    address: '上海市徐汇区示例路 88 号',
    remark: '重点客户',
  }
}

/**
 * Static View-Model: camelCase keys → `<User.Name />` etc.
 * Defaults only; render-time props can override component / label / rules.
 */
export const User = createFormFields({
  name: {
    label: '姓名',
    component: EpInput,
    props: { placeholder: '请输入姓名' },
    rules: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  },
  gender: {
    label: '性别',
    component: EpGenderSelect,
    rules: [{ required: true, message: '请选择性别', trigger: 'change' }],
  },
  mobile: {
    label: '手机',
    component: EpInput,
    props: { placeholder: '11 位手机号' },
    rules: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
    ],
  },
  email: {
    label: '邮箱',
    component: EpInput,
    props: { placeholder: 'name@example.com' },
  },
  idCard: {
    label: '证件号',
    component: EpInput,
    props: { placeholder: '身份证号' },
  },
  address: {
    label: '地址',
    component: EpInput,
    props: { placeholder: '详细地址' },
  },
  remark: {
    label: '备注',
    component: EpInput,
    props: { type: 'textarea', rows: 3, placeholder: '可选' },
  },
})
