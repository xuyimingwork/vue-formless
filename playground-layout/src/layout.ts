import { ElCol, ElRow } from 'element-plus'
import { Comment, defineComponent, h } from 'vue'
import { createLayoutView } from '@vue-formless/layout'

const Col = defineComponent({
  name: 'PlaygroundCol',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    return () => {
      const inner = slots.default?.()
      const blank = !inner?.some((node) => node.type !== Comment)
      return h(ElCol, { ...attrs }, () =>
        blank ? h('div', { class: 'pg-blank' }) : inner,
      )
    }
  },
})

/** Playground bind: Element Row/Col. Not a published adapter. */
export const LayoutView = createLayoutView({
  Row: ElRow,
  Col,
  column: 3,
})
