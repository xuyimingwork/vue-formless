import { ElCol, ElRow } from 'element-plus'
import { createFormView } from 'vue-formless'
import { EpForm } from './ep-form'
import { EpItem } from './ep-item'

/** Playground bind: Element Row/Col + adapter Form/Item. Not a published adapter. */
export const FormView = createFormView({
  Row: ElRow,
  Col: ElCol,
  Form: EpForm,
  Item: EpItem,
})
