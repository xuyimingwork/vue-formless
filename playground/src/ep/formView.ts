import { ElCol, ElFormItem, ElRow } from 'element-plus'
import { createFormView } from 'vue-formless'
import { toEpItemProps } from './toItemProps'

/** Playground bind: Element Row/Col/Item + toItemProps. Not a published adapter. */
export const FormView = createFormView({
  Row: ElRow,
  Col: ElCol,
  Item: ElFormItem,
  toItemProps: toEpItemProps,
})
