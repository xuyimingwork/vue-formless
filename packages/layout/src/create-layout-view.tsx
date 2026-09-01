import {
  computed,
  defineComponent,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  onMounted,
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
  resolveColSpan,
  type ColPlace,
  type ColSpanSpec,
} from './density'
import { blanksBefore, createOccupancy, hostEl } from './occupancy'
import { useMutationObserver } from './use-mutation-observer'

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
      const viewInst = getCurrentInstance()!
      const disabled = computed(() => {
        if (!Row || !Col) return true
        return props.disabled
      })
      const column = computed<number>(() => {
        const n = Math.floor(Number(props.column))
        if (!Number.isFinite(n)) return DEFAULT_LAYOUT.column
        return Math.min(GRID_TOTAL, Math.max(1, n))
      })
      const occupancy = createOccupancy(() => hostEl(viewInst))
      const runtime: LayoutRuntime = {
        disabled,
        get column() {
          return column.value
        },
      }

      const LayoutItem = defineComponent({
        name: 'LayoutItem',
        inheritAttrs: false,
        props: {
          span: { type: [String, Number] as PropType<ColSpanSpec>, default: undefined },
          place: { type: String as PropType<ColPlace>, default: undefined },
        },
        setup(props, { slots }) {
          const id = occupancy.nextId()
          let colEl: Element | null = null
          const cell = {
            id,
            get span() {
              return props.span
            },
            get place() {
              return props.place
            },
          }
          occupancy.add(cell)

          function bindColEl(raw: unknown): void {
            colEl = occupancy.bindEl(id, raw, colEl)
          }

          onMounted(() => {
            if (occupancy.isLive()) occupancy.pull()
          })
          onBeforeUnmount(() => occupancy.remove(id, colEl))

          const LayoutBlanks = defineComponent({
            name: 'LayoutBlanks',
            setup() {
              return (): VNodeChild => {
                const HostCol = Col as JsxHost
                const blanks = blanksBefore(occupancy.entries(), cell, column.value)
                if (blanks.length === 0) return null
                return (
                  <>
                    {blanks.map((span, i) => (
                      <HostCol key={i} span={span} />
                    ))}
                  </>
                )
              }
            },
          })

          return (): VNodeChild => {
            if (disabled.value) return slots.default?.() ?? null
            const HostCol = Col as JsxHost
            const n = resolveColSpan(props.span, column.value)
            return (
              <>
                <LayoutBlanks />
                <HostCol ref={bindColEl} span={n}>
                  {slots.default?.() ?? null}
                </HostCol>
              </>
            )
          }
        },
      })
      provide(LAYOUT_ITEM_KEY, LayoutItem)
      provide(layoutRuntimeKey, runtime)

      onMounted(() => occupancy.goLive())
      useMutationObserver(() => hostEl(viewInst), occupancy.pull, { childList: true })

      return () => {
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
