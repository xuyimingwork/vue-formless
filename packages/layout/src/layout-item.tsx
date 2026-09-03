import {
  defineComponent,
  inject,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue'
import type { ColPlace, ColSpanRaw } from './grid'
import { LAYOUT_VIEW_KEY } from './injection-keys'

/** `Component` is a union; JSX needs a constructable host. */
export type JsxHost = new () => { $props: Record<string, unknown> }

export interface LayoutItemProps {
  span?: ColSpanRaw
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
    span: { type: [String, Number] as PropType<ColSpanRaw>, default: undefined },
    place: { type: String as PropType<ColPlace>, default: undefined },
  },
  setup(props, { slots }) {
    const register = inject(LAYOUT_VIEW_KEY, null)
    if (!register) return (): VNodeChild => slots.default?.() ?? null
    const { span, blanks, itemRef, Col, disabled } = register(
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
  return inject(LAYOUT_VIEW_KEY, null)
    ? LayoutItem
    : PassThrough
}
