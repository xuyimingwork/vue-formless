import {
  defineComponent,
  inject,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue'
import type { ColPlace, ColSpanSpec } from './density'
import { layoutItemKey, type JsxHost } from './layout-context'

export interface LayoutItemProps {
  span?: ColSpanSpec
  place?: ColPlace
}

const LayoutBlanks = defineComponent({
  name: 'LayoutBlanks',
  inheritAttrs: false,
  props: {
    is: { type: Object as PropType<Component | undefined>, default: undefined },
    spans: { type: Array as PropType<number[]>, required: true },
  },
  setup(props) {
    return (): VNodeChild => {
      if (props.spans.length === 0 || props.is == null) return null
      const HostCol = props.is as JsxHost
      return (
        <>
          {props.spans.map((n, i) => (
            <HostCol key={i} span={n} />
          ))}
        </>
      )
    }
  },
})

const LayoutItem = defineComponent({
  name: 'LayoutItem',
  inheritAttrs: false,
  props: {
    span: { type: [String, Number] as PropType<ColSpanSpec>, default: undefined },
    place: { type: String as PropType<ColPlace>, default: undefined },
  },
  setup(props, { slots }) {
    const attach = inject(layoutItemKey, null)
    if (!attach) return (): VNodeChild => slots.default?.() ?? null
    const { span, blanks, itemRef, Col, disabled } = attach(
      () => props.span,
      () => props.place,
    )
    return (): VNodeChild => {
      if (disabled.value) return slots.default?.() ?? null
      const HostCol = Col as JsxHost
      return (
        <>
          <LayoutBlanks is={Col} spans={blanks.value} />
          <HostCol ref={itemRef} span={span.value}>
            {slots.default?.() ?? null}
          </HostCol>
        </>
      )
    }
  },
})

const PassThrough = defineComponent({
  name: 'LayoutItemPassThrough',
  inheritAttrs: false,
  setup(_, { slots }) {
    return (): VNodeChild => slots.default?.() ?? null
  },
})

/** Nearest LayoutView's cell component; identity when no LayoutView. */
export function useLayoutItem(): Component {
  return inject(layoutItemKey, null)
    ? LayoutItem
    : PassThrough
}
