import { ElCol, ElFormItem, ElRow } from 'element-plus'
import { createFormView } from 'vue-formless'
import { toEpRules } from './toEpRules'

export const FormView = createFormView({
  Row: ElRow,
  Col: ElCol,
  Item: ElFormItem,
  toRules: toEpRules,
  total: 24,
})

export { toEpRules } from './toEpRules'
export { EpInput, EpSelect, type SelectOption } from './controls'
export { defaultPlaceholder, type PlaceholderKind } from './placeholder'
