import { ElCol, ElForm, ElFormItem, ElRow } from 'element-plus'
import { createFormView } from 'vue-formless'
import { toEpItemProps } from './to-item-props'

/** Playground bind: Element Row/Col/Form/Item. Not a published adapter. */
export const FormView = createFormView({
  layout: { Row: ElRow, Col: ElCol },
  form: {
    component: ElForm,
    props: (fl) => ({ model: fl.modelValue }),
  },
  item: { component: ElFormItem, props: toEpItemProps },
})
