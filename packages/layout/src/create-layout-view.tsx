import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  toValue,
  type Component,
  type VNodeChild,
} from 'vue'
import { getColumn, resolveColPlace, resolveColSpan, type ColPlace } from './density'
import { hostEl } from './host-el'
import { layoutItemKey, type JsxHost } from './layout-context'
import { useLayoutItem } from './layout-item'
import { useDomChildren } from './use-dom-children'
import { usePlaceBlanks } from './use-place-blanks'

export type { ColPlace, ColSpanSpec } from './density'
export type { LayoutItemProps } from './layout-item'
export { useLayoutItem }

export interface CreateLayoutViewOptions {
  Row?: Component
  Col?: Component
  column?: number
}

export interface LayoutViewProps {
  disabled?: boolean
  column?: number
}

const emptyBlanks: number[] = []

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
      const disabled = computed(() => {
        if (!Row || !Col) return true
        return props.disabled
      })
      // Nested ComputedRefs unwrap when read off this deep ref.
      const items = ref<
        Record<
          string,
          {
            span: number
            place: ColPlace
            el: Element | null
            mounted: boolean
          }
        >
      >({})
      let seq = 0

      const rowRef = ref<unknown>(null)
      const children = useDomChildren(
        () => hostEl(rowRef.value),
        () =>
          Object.keys(items.value)
            .filter((id) => items.value[id].mounted)
            .join(','),
      )

      const orderedCells = computed(() => {
        const bag = items.value
        const all = Object.keys(bag)
        const fromDom = children.value.flatMap((child) => {
          const id = all.find((key) => bag[key].el === child)
          return id ? [{ id, span: bag[id].span, place: bag[id].place }] : []
        })
        if (fromDom.length === all.length) return fromDom
        return all.map((id) => ({ id, span: bag[id].span, place: bag[id].place }))
      })

      const blanksById = usePlaceBlanks(orderedCells)

      provide(layoutItemKey, (span, place) => {
        provide(layoutItemKey, null)
        const id = String(++seq)
        const ownSpan = computed(() =>
          resolveColSpan(toValue(span), getColumn(props.column, options.column)),
        )
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
        return {
          span: computed(() => items.value[id]?.span ?? ownSpan.value),
          blanks: computed(() => blanksById.value.get(id) ?? emptyBlanks),
          itemRef(raw: unknown) {
            const item = items.value[id]
            if (!item) return
            const el = hostEl(raw)
            if (item.el !== el) item.el = el
          },
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
