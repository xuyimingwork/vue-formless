import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  toValue,
  type Component,
  type MaybeRefOrGetter,
  type Ref,
  type VNodeChild,
} from 'vue'
import { mergeColumn, normalizeColPlace, normalizeColSpan, type ColPlace, type ColSpan, type ColSpanRaw } from './grid'
import { LAYOUT_VIEW_KEY } from './injection-keys'
import type { JsxHost } from './LayoutItem'
import { calculateBlanks, calculateLayout, type Cell } from './calculate-layout'
import { useDomChildren } from './use-dom-children'
import { hostEl } from './utils'

export type { ColPlace, ColSpanRaw } from './grid'
export { LayoutItem, type LayoutItemProps } from './LayoutItem'

export interface CreateLayoutViewOptions {
  Row?: Component
  Col?: Component
  column?: number
}

export interface LayoutViewProps {
  disabled?: boolean
  column?: number
}

type LayoutItemState = {
  span: ColSpan
  place: ColPlace
  el: Element | null
  mounted: boolean
}

interface LayoutItem {
  setup(
    span?: MaybeRefOrGetter<ColSpanRaw | undefined>,
    place?: MaybeRefOrGetter<ColPlace | undefined>,
  ): string
  span(id: string): ColSpan
  blank(id: string): { before: number[], after: number[] }
  place(id: string): ColPlace
  ref(id: string, raw: unknown): void
  placed(id: string): boolean
}

function useItemHub({
  column, 
  rowRef
}: {
  column: MaybeRefOrGetter<number>,
  rowRef: Ref<unknown>
}): LayoutItem {
  let seq = 0
  const rawItems = ref<Record<string, LayoutItemState>>({})
  // 当前 dom 结构
  const children = useDomChildren(
    () => hostEl(rowRef.value),
    () =>
      Object.keys(rawItems.value)
        .filter((id) => rawItems.value[id].mounted)
        .join(','),
  )
  const orderedItems = computed(() => cellsInDomOrder(rawItems.value, children.value))
  const placedItems = computed(() => calculateLayout(orderedItems.value))
  const blanks = computed(() => {
    return new Map(
      placedItems.value.map((cell) => [cell.id, calculateBlanks(cell.$start, cell.$occupied, cell.span)]),
    )
  })

  return {
    setup(span, place) {
      const id = String(++seq)
      rawItems.value[id] = {
        span: computed(() => normalizeColSpan(toValue(span), toValue(column))) as unknown as ColSpan,
        place: computed(() => normalizeColPlace(toValue(place))) as unknown as ColPlace,
        el: null,
        mounted: false,
      }
      onMounted(() => {
        const item = rawItems.value[id]
        if (item) item.mounted = true
      })
      onBeforeUnmount(() => {
        delete rawItems.value[id]
      })
      return id
    },
    span(id) {
      return rawItems.value[id]?.span ?? 0
    },
    blank(id) {
      return {
        before: blanks.value.get(id) ?? [],
        after: [],
      }
    },
    place(id) {
      return rawItems.value[id]?.place ?? 'unknown'
    },
    ref(id, raw) {
      const item = rawItems.value[id]
      if (!item) return
      const el = hostEl(raw)
      if (item.el !== el) item.el = el
    },
    placed(id) {
      return placedItems.value.findIndex((cell) => cell.id === id) > -1
    }
  }
}

type RowCell = Cell & { id: string }

function cellsInDomOrder(
  items: Record<string, LayoutItemState>,
  children: Element[],
): RowCell[] {
  const cells = new Map(
    Object.entries(items)
      .filter(([, item]) => item.el)
      .map(([id, item]) => [item.el!, { id, span: item.span, place: item.place }]),
  )
  return children
    .filter((el) => cells.has(el))
    .map((el) => cells.get(el)!)
}

/** Bind host Row/Col once. Returns LayoutView; cells are `LayoutItem`. */
export function createLayoutView(options: CreateLayoutViewOptions = {}): Component {
  const { Row, Col } = options as { Row?: JsxHost; Col?: JsxHost }

  return defineComponent({
    name: 'LayoutView',
    inheritAttrs: false,
    props: {
      disabled: { type: Boolean, default: false },
      column: { type: Number, default: undefined },
    },
    setup(props, { slots, attrs }) {
      const disabled = computed(() => !Row || !Col || props.disabled)
      const column = computed(() => mergeColumn(options.column, props.column))
      const rowRef = ref<unknown>(null)
      const itemHub = useItemHub({ column, rowRef })

      provide(LAYOUT_VIEW_KEY, (span, place) => {
        // stop propagation of LAYOUT_VIEW_KEY
        provide(LAYOUT_VIEW_KEY, null)
        const id = itemHub.setup(span, place)
        return {
          span: computed(() => itemHub.span(id)),
          blank: computed(() => itemHub.blank(id)),
          ref: (raw) => itemHub.ref(id, raw),
          place: computed(() => itemHub.place(id)),
          placed: computed(() => itemHub.placed(id)),
          Col,
          disabled,
        }
      })

      return (): VNodeChild => {
        if (disabled.value) return slots.default?.() ?? null
        const HostRow = Row as JsxHost
        return (
          <HostRow ref={rowRef} {...attrs} data-layout-row="">
            {slots.default?.() ?? null}
          </HostRow>
        )
      }
    },
  })
}
