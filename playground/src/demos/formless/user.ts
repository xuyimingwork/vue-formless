import { ElInput, ElSelect } from 'element-plus'
import { createFormControls } from 'vue-formless'

const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '其他', value: 'other' },
]

/** Shared User cluster for formless demos (ADR-009 opt-in). */
export const User = createFormControls(
  {
    name: {
      label: '姓名',
      component: ElInput,
      validation: { empty: { message: '请输入姓名' } },
    },
    gender: {
      label: '性别',
      component: ElSelect,
      props: { options: genderOptions },
      validation: { empty: { message: '请选择性别' } },
    },
    mobile: {
      label: '手机',
      component: ElInput,
      props: { placeholder: '11 位手机号' },
      validation: {
        empty: { message: '请输入手机号' },
        format: { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
      },
    },
    email: {
      label: '邮箱',
      component: ElInput,
      props: { placeholder: 'name@example.com' },
    },
    idCard: {
      label: '证件号',
      component: ElInput,
      props: { placeholder: '身份证号' },
    },
    address: {
      label: '地址',
      component: ElInput,
      props: { placeholder: '详细地址' },
    },
    remark: {
      label: '备注',
      component: ElInput,
      props: { type: 'textarea', rows: 3, placeholder: '可选' },
    },
  },
  {
    props: (fl) => ({
      placeholder: typeof fl.label === 'string' ? `请填写${fl.label}` : undefined,
    }),
  },
)
