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
import type { JsxHost } from './layout-item'
import { calculateBlanks, calculateLayout, type Cell } from './calculate-layout'
import { useDomChildren } from './use-dom-children'
import { hostEl } from './utils'

export type { ColPlace, ColSpanRaw } from './grid'
export { useLayoutItem, type LayoutItemProps } from './layout-item'

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

interface LayoutItems {
  readonly value: Record<string, LayoutItemState>
  setup(
    span?: MaybeRefOrGetter<ColSpanRaw | undefined>,
    place?: MaybeRefOrGetter<ColPlace | undefined>,
  ): string
  span(id: string): number
  ref(id: string, raw: unknown): void
}

function useLayoutItems(column: MaybeRefOrGetter<number>): LayoutItems {
  const items = ref<Record<string, LayoutItemState>>({})
  let seq = 0

  return {
    get value() {
      return items.value
    },
    setup(span, place) {
      const id = String(++seq)
      const ownSpan = computed(() => normalizeColSpan(toValue(span), toValue(column)))
      const ownPlace = computed(() => normalizeColPlace(toValue(place)))
      items.value[id] = {
        span: ownSpan as unknown as ColSpan,
        place: ownPlace as unknown as ColPlace,
        el: null,
        mounted: false,
      }
      onMounted(() => {
        const item = items.value[id]
        if (item) item.mounted = true
      })
      onBeforeUnmount(() => {
        delete items.value[id]
      })
      return id
    },
    span(id) {
      return items.value[id]?.span ?? 0
    },
    ref(id, raw) {
      const item = items.value[id]
      if (!item) return
      const el = hostEl(raw)
      if (item.el !== el) item.el = el
    },
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

function useRowBlanks(items: LayoutItems, rowRef: Ref<unknown>) {
  const children = useDomChildren(
    () => hostEl(rowRef.value),
    () =>
      Object.keys(items.value)
        .filter((id) => items.value[id].mounted)
        .join(','),
  )
  return computed(() => {
    const layout = calculateLayout(cellsInDomOrder(items.value, children.value))
    return new Map(
      layout.map((cell) => [cell.id, calculateBlanks(cell.$start, cell.$occupied, cell.span)]),
    )
  })
}

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
      column: { type: Number, default: undefined },
    },
    setup(props, { slots, attrs }) {
      const disabled = computed(() => !Row || !Col || props.disabled)
      const items = useLayoutItems(() => mergeColumn(options.column, props.column))
      const rowRef = ref<unknown>(null)
      const blanks = useRowBlanks(items, rowRef)

      provide(LAYOUT_VIEW_KEY, (span, place) => {
        provide(LAYOUT_VIEW_KEY, null)
        const id = items.setup(span, place)
        return {
          span: computed(() => items.span(id)),
          blanks: computed(() => blanks.value.get(id) ?? []),
          itemRef: (raw) => items.ref(id, raw),
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
