import {
  defineComponent,
  h,
  inject,
  markRaw,
  provide,
  type Component,
  type InjectionKey,
  type PropType,
  type VNodeChild,
} from 'vue'
import {
  DEFAULT_LAYOUT,
  resolveColPlace,
  resolveColSpan,
  takePlaceBlanks,
  type ColPlace,
  type ColSpanSpec,
} from './density'

export type { ColPlace, ColSpanSpec }

export interface CreateLayoutViewOptions {
  Row?: Component
  Col?: Component
}

export interface LayoutViewProps {
  enabled?: boolean
  column?: number
  gutter?: number
}

export interface LayoutItemProps {
  span?: ColSpanSpec
  place?: ColPlace
}

interface LayoutRuntime {
  enabled: boolean
  column: number
  gutter: number
  used: { n: number }
  Col: Component | undefined
}

const layoutItemKey: InjectionKey<Component> = Symbol('vue-formless.layoutItem')
const layoutRuntimeKey: InjectionKey<LayoutRuntime> = Symbol('vue-formless.layoutRuntime')

const Passthrough = defineComponent({
  name: 'LayoutItemPassthrough',
  inheritAttrs: false,
  setup(_, { slots }) {
    return (): VNodeChild => slots.default?.() ?? null
  },
})

/**
 * Bind host Row/Col once. Returns LayoutView.
 * LayoutItem is not exported; cells call `useLayoutItem()`.
 */
export function createLayoutView(options: CreateLayoutViewOptions = {}): Component {
  const Row = options.Row ? markRaw(options.Row) : undefined
  const Col = options.Col ? markRaw(options.Col) : undefined

  const LayoutItem = defineComponent({
    name: 'LayoutItem',
    inheritAttrs: false,
    props: {
      span: { type: [String, Number] as PropType<ColSpanSpec>, default: undefined },
      place: { type: String as PropType<ColPlace>, default: undefined },
    },
    setup(props, { slots }) {
      const runtime = inject(layoutRuntimeKey, null)
      return (): VNodeChild => {
        if (!runtime || !runtime.enabled || !runtime.Col) {
          return slots.default?.() ?? null
        }
        const n = resolveColSpan(props.span, runtime.column)
        const place = resolveColPlace(props.place)
        const blanks = takePlaceBlanks(runtime.used, n, place)
        const col = h(runtime.Col, { span: n }, () => slots.default?.() ?? null)
        runtime.used.n += n
        if (blanks.length === 0) return col
        return [...blanks.map((span) => h(runtime.Col!, { span })), col]
      }
    },
  })

  return defineComponent({
    name: 'LayoutView',
    inheritAttrs: false,
    props: {
      enabled: { type: Boolean, default: false },
      column: { type: Number, default: DEFAULT_LAYOUT.column },
      gutter: { type: Number, default: DEFAULT_LAYOUT.gutter },
    },
    setup(props, { slots }) {
      const used = { n: 0 }
      const runtime: LayoutRuntime = {
        enabled: false,
        column: DEFAULT_LAYOUT.column,
        gutter: DEFAULT_LAYOUT.gutter,
        used,
        Col,
      }
      provide(layoutRuntimeKey, runtime)
      provide(layoutItemKey, LayoutItem)

      return (): VNodeChild => {
        used.n = 0
        const enabled = props.enabled === true && Row != null && Col != null
        const column = props.column > 0 ? props.column : DEFAULT_LAYOUT.column
        runtime.enabled = enabled
        runtime.column = column
        runtime.gutter = props.gutter
        if (!enabled || !Row) return slots.default?.() ?? null
        return h(Row, { gutter: props.gutter }, () => slots.default?.() ?? null)
      }
    },
  })
}

/** Nearest LayoutView's cell component; identity when no LayoutView. */
export function useLayoutItem(): Component {
  return inject(layoutItemKey, null) ?? Passthrough
}

/** @internal Density of the nearest LayoutView. */
export function useLayoutRuntime(): LayoutRuntime | null {
  return inject(layoutRuntimeKey, null)
}
