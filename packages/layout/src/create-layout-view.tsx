import {
  computed,
  defineComponent,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  reactive,
  ref,
  watch,
  type Component,
  type ComponentInternalInstance,
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
  used: { n: number }
}

interface CellEntry {
  id: string
  span: ColSpanSpec | undefined
  place: ColPlace | undefined
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
      const runtime: LayoutRuntime = {
        disabled,
        column: DEFAULT_LAYOUT.column,
        used: { n: 0 },
      }

      let cellSeq = 0
      let observing = false
      const byId = new Map<string, CellEntry>()
      const elToId = new WeakMap<Element, string>()
      const order = ref('')

      function writeOrder(next: string): void {
        if (next === order.value) return
        order.value = next
      }

      function orderFromRegistry(): string {
        return [...byId.keys()].join(',')
      }

      function orderedEntries(): CellEntry[] {
        const key = order.value
        if (!key) return []
        const out: CellEntry[] = []
        for (const id of key.split(',')) {
          const entry = byId.get(id)
          if (entry) out.push(entry)
        }
        return out
      }

      function rowRoot(): Element | null {
        return rootElement(viewInst)
      }

      function readDomOrder(root: Element): string {
        const ids: string[] = []
        for (let i = 0; i < root.children.length; i++) {
          const id = elToId.get(root.children[i]!)
          if (id) ids.push(id)
        }
        return ids.join(',')
      }

      function syncOrderFromDom(): void {
        const root = rowRoot()
        if (!root) return
        const next = readDomOrder(root)
        if (!next && byId.size > 0) return
        writeOrder(next)
      }

      const LayoutItem = defineComponent({
        name: 'LayoutItem',
        inheritAttrs: false,
        props: {
          span: { type: [String, Number] as PropType<ColSpanSpec>, default: undefined },
          place: { type: String as PropType<ColPlace>, default: undefined },
        },
        setup(props, { slots }) {
          const id = String(++cellSeq)
          let colEl: Element | null = null
          const entry: CellEntry = reactive({
            id,
            span: props.span,
            place: props.place,
          })
          byId.set(id, entry)
          if (!observing) writeOrder(orderFromRegistry())

          function bindColEl(raw: unknown): void {
            if (colEl) elToId.delete(colEl)
            colEl = componentRoot(raw)
            if (colEl) elToId.set(colEl, id)
          }

          watch(
            () => [props.span, props.place] as const,
            ([nextSpan, nextPlace]) => {
              entry.span = nextSpan
              entry.place = nextPlace
            },
          )
          onMounted(() => {
            if (observing) syncOrderFromDom()
          })
          onBeforeUnmount(() => {
            if (colEl) elToId.delete(colEl)
            byId.delete(id)
            if (!observing) {
              writeOrder(orderFromRegistry())
              return
            }
            writeOrder(
              order.value
                .split(',')
                .filter((item) => item && item !== id)
                .join(','),
            )
          })
          const LayoutBlanks = defineComponent({
            name: 'LayoutBlanks',
            setup() {
              return (): VNodeChild => {
                if (disabled.value) return null
                const HostCol = Col as JsxHost
                const blanks = blanksBefore(orderedEntries(), entry, column.value)
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

      onMounted(() => {
        observing = true
        syncOrderFromDom()
      })
      useMutationObserver(rowRoot, syncOrderFromDom, { childList: true })

      return () => {
        runtime.column = column.value
        if (disabled.value) return slots.default?.() ?? null
        const HostRow = Row as JsxHost
        return <HostRow {...attrs}>{slots.default?.() ?? null}</HostRow>
      }
    },
  })
}

function rootElement(inst: ComponentInternalInstance): Element | null {
  const nodes = [inst.vnode.el, inst.subTree?.el, inst.subTree?.component?.vnode.el]
  for (const node of nodes) {
    if (node instanceof Element) return node
    if (node && (node as Node).nodeType === 8) {
      for (let n = (node as Node).nextSibling; n; n = n.nextSibling) {
        if (n instanceof Element) return n
      }
    }
  }
  return null
}

function componentRoot(raw: unknown): Element | null {
  if (raw == null || typeof raw !== 'object') return null
  if (raw instanceof Element) return raw
  const el = (raw as { $el?: unknown }).$el
  if (el instanceof Element) return el
  if (el && (el as Node).nodeType === 8) {
    for (let n = (el as Node).nextSibling; n; n = n.nextSibling) {
      if (n instanceof Element) return n
    }
  }
  return null
}

function blanksBefore(entries: CellEntry[], entry: CellEntry, column: number): number[] {
  const used = { n: 0 }
  for (const e of entries) {
    const n = resolveColSpan(e.span, column)
    const place = resolveColPlace(e.place)
    const blanks = takePlaceBlanks(used, n, place)
    if (e === entry) return blanks
    used.n += n
  }
  return []
}

/** Nearest LayoutView's cell component; identity when no LayoutView. */
export function useLayoutItem(): Component {
  return inject(LAYOUT_ITEM_KEY, null) ?? Passthrough
}

/** @internal Density of the nearest LayoutView. */
export function useLayoutRuntime(): LayoutRuntime | null {
  return inject(layoutRuntimeKey, null)
}
