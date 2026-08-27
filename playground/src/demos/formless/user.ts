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
    },
    gender: {
      label: '性别',
      component: ElSelect,
      props: { options: genderOptions },
    },
    mobile: {
      label: '手机',
      component: ElInput,
      props: { placeholder: '11 位手机号' },
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
      placeholder: fl.label ? `请填写${fl.label}` : undefined,
    }),
  },
)
