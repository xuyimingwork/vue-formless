import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  type Component,
  type VNodeChild,
} from 'vue'
import { getColumn } from './density'
import { layoutItemKey, type JsxHost } from './layout-context'
import { useLayoutItem } from './layout-item'
import { createOccupancy, hostEl } from './occupancy'
import { useDomChildren } from './use-dom-children'

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
      const occupancy = createOccupancy(
        () => children.value,
        () => getColumn(props.column, options.column),
      )
      const rowRef = ref<unknown>(null)
      const children = useDomChildren(() => hostEl(rowRef.value), occupancy.version)

      provide(layoutItemKey, (span, place) => {
        provide(layoutItemKey, null)
        const id = occupancy.register(span, place)
        onMounted(() => {
          occupancy.bump()
        })
        onBeforeUnmount(() => {
          occupancy.dispose(id)
        })
        return {
          span: computed(() => occupancy.ownSpan(id)),
          blanks: computed(() => occupancy.blanks(id)),
          itemRef(raw: unknown) {
            occupancy.bindColEl(id, raw)
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
