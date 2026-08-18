import { ElCol, ElFormItem, ElRow } from 'element-plus'
import { createFormView } from 'vue-formless'
import { toEpItemProps } from './toEpRules'

export const FormView = createFormView({
  Row: ElRow,
  Col: ElCol,
  Item: ElFormItem,
  toItemProps: toEpItemProps,
  total: 24,
})

export { toEpRules, toEpItemProps } from './toEpRules'
export { EpInput, EpSelect, type SelectOption } from './controls'
export { defaultPlaceholder, type PlaceholderKind } from './placeholder'
