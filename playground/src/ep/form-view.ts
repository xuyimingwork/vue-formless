import { ElCol, ElForm, ElFormItem, ElRow } from 'element-plus'
import { createFormView, resolveFormItemProp, type ItemFl } from 'vue-formless'

/** Map Item `fl` to ElFormItem props. Host `prop` is this adapter's encoding. */
export function toEpItemProps(fl: ItemFl): Record<string, unknown> {
  return {
    label: fl.label,
    prop: resolveFormItemProp(fl.binding, fl.controlKey),
  }
}

/** Playground bind: Element Row/Col/Form/Item. Not a published adapter. */
export const FormView = createFormView({
  layout: { Row: ElRow, Col: ElCol },
  form: {
    component: ElForm,
    props: (fl) => ({ model: fl.modelValue }),
  },
  item: { component: ElFormItem, props: toEpItemProps },
})
