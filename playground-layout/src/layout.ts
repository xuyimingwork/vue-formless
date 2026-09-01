import { ElCol, ElRow } from 'element-plus'
import { createLayoutView } from '@vue-formless/layout'

/** Playground bind: Element Row/Col. Not a published adapter. */
export const LayoutView = createLayoutView({
  Row: ElRow,
  Col: ElCol,
  column: 3,
})
