import { ElCol, ElRow } from 'element-plus'
import { createFormView } from 'vue-formless'

export const FormView = createFormView({
  Row: ElRow,
  Col: ElCol,
  total: 24,
})

export { epField } from './epField'
export { EpInput, EpSelect, type SelectOption } from './controls'
export { defaultPlaceholder, type PlaceholderKind } from './placeholder'
