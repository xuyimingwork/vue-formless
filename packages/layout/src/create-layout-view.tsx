import {
  computed,
  defineComponent,
  inject,
  markRaw,
  provide,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type VNodeChild,
} from 'vue'
import {
  DEFAULT_LAYOUT,
  GRID_TOTAL,
  resolveColPlace,
  resolveColSpan,
  takePlaceBlanks,
  type ColPlace,
  type ColSpanSpec,
} from './density'

export type { ColPlace, ColSpanSpec }

/** `Component` is a union; JSX needs a constructable host. */
type JsxHost = new () => { $props: Record<string, unknown> }

export interface CreateLayoutViewOptions {
  Row?: Component
  Col?: Component
  column?: number
}

export interface LayoutViewProps {
  disabled?: boolean
  column?: number
}

export interface LayoutItemProps {
  span?: ColSpanSpec
  place?: ColPlace
}

interface LayoutRuntime {
  disabled: ComputedRef<boolean>
  column: number
  used: { n: number }
}

const LAYOUT_ITEM_KEY: InjectionKey<Component> = Symbol('vue-formless.layoutItem')
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
  const { Row, Col } = options as { Row?: JsxHost; Col?: JsxHost }

  return defineComponent({
    name: 'LayoutView',
    inheritAttrs: false,
    props: {
      disabled: { type: Boolean, default: false },
      column: { type: Number, default: options.column },
    },
    setup(props, { slots, attrs }) {
      const disabled = computed(() => {
        if (!Row || !Col) return true
        return props.disabled
      })
      const column = computed<number>(() => {
        const n = Math.floor(Number(props.column))
        if (!Number.isFinite(n)) return DEFAULT_LAYOUT.column
        return Math.min(GRID_TOTAL, Math.max(1, n))
      })
      const base = computed<number>(() => Math.floor(GRID_TOTAL / column.value))
      const runtime: LayoutRuntime = {
        disabled,
        column: DEFAULT_LAYOUT.column,
        used: { n: 0 },
      }
      const LayoutItem = defineComponent({
        name: 'LayoutItem',
        inheritAttrs: false,
        props: {
          span: { type: [String, Number] as PropType<ColSpanSpec>, default: undefined },
          place: { type: String as PropType<ColPlace>, default: undefined },
        },
        setup(props, { slots }) {
          const span = computed<number>(() => {

            return 0
          })
          return (): VNodeChild => {
            if (disabled.value) return slots.default?.() ?? null

            const HostCol = Col as JsxHost
            const n = resolveColSpan(props.span, runtime.column)
            const place = resolveColPlace(props.place)
            const blanks = takePlaceBlanks(runtime.used, n, place)
            const col = <HostCol span={n}>{slots.default?.() ?? null}</HostCol>
            runtime.used.n += n
            if (blanks.length === 0) return col
            return (
              <>
                {blanks.map((span, i) => (
                  <HostCol key={i} span={span} />
                ))}
                {col}
              </>
            )
          }
        },
      })
      provide(LAYOUT_ITEM_KEY, LayoutItem)
      provide(layoutRuntimeKey, runtime)

      return () => {
        runtime.used.n = 0
        runtime.column = column.value
        if (disabled.value) return slots.default?.() ?? null
        const HostRow = Row as JsxHost
        return <HostRow {...attrs}>{slots.default?.() ?? null}</HostRow>
      }
    },
  })
}

/** Nearest LayoutView's cell component; identity when no LayoutView. */
export function useLayoutItem(): Component {
  return inject(LAYOUT_ITEM_KEY, null) ?? Passthrough
}

/** @internal Density of the nearest LayoutView. */
export function useLayoutRuntime(): LayoutRuntime | null {
  return inject(layoutRuntimeKey, null)
}
