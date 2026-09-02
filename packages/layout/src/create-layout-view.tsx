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
import { getColumn, resolveColPlace, resolveColSpan, type ColPlace, type ColSpanSpec } from './grid'
import { LAYOUT_VIEW_KEY } from './injection-keys'
import type { JsxHost } from './layout-item'
import { useDomChildren } from './use-dom-children'
import { usePlaceBlanks, type LayoutCell } from './use-place-blanks'
import { hostEl } from './utils'

export type { ColPlace, ColSpanSpec } from './grid'
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
  span: number
  place: ColPlace
  el: Element | null
  mounted: boolean
}

interface LayoutItems {
  readonly value: Record<string, LayoutItemState>
  setup(
    span?: MaybeRefOrGetter<ColSpanSpec | undefined>,
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
      const ownSpan = computed(() => resolveColSpan(toValue(span), toValue(column)))
      const ownPlace = computed(() => resolveColPlace(toValue(place)))
      items.value[id] = {
        span: ownSpan as unknown as number,
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

function getLayoutCells(
  items: Record<string, LayoutItemState>,
  children: Element[],
): LayoutCell[] {
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
  return usePlaceBlanks(() => getLayoutCells(items.value, children.value))
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
      const items = useLayoutItems(() => getColumn(props.column, options.column))
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
          <HostRow ref={rowRef} {...attrs}>
            {slots.default?.() ?? null}
          </HostRow>
        )
      }
    },
  })
}
