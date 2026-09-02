import {
  computed,
  defineComponent,
  inject,
  provide,
  ref,
  type Component,
  type VNodeChild,
} from 'vue'
import { DEFAULT_LAYOUT, GRID_TOTAL } from './density'
import { layoutContextKey, type JsxHost } from './layout-context'
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
  gutter?: number
}

function clampColumn(raw: unknown, fallback: number): number {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return fallback
  return Math.min(GRID_TOTAL, Math.max(1, n))
}

/**
 * Bind host Row/Col once. Returns LayoutView.
 * LayoutItem is not exported; cells call `useLayoutItem()`.
 */
export function createLayoutView(options: CreateLayoutViewOptions = {}): Component {
  const { Row, Col } = options as { Row?: JsxHost; Col?: JsxHost }
  const factoryColumn = clampColumn(options.column, DEFAULT_LAYOUT.column)

  return defineComponent({
    name: 'LayoutView',
    inheritAttrs: false,
    props: {
      disabled: { type: Boolean, default: false },
      column: { type: Number, default: undefined },
      gutter: { type: Number, default: undefined },
    },
    setup(props, { slots, attrs }) {
      const parent = inject(layoutContextKey, null)
      const disabled = computed(() => {
        if (!Row || !Col) return true
        return props.disabled
      })
      const column = computed<number>(() => {
        if (props.column !== undefined) return clampColumn(props.column, factoryColumn)
        if (parent) return parent.column
        return factoryColumn
      })
      const gutter = computed<number | undefined>(() => {
        if (props.gutter !== undefined) return props.gutter
        return parent?.gutter
      })
      const occupancy = createOccupancy(() => children.value)
      const rowRef = ref<unknown>(null)
      const children = useDomChildren(() => hostEl(rowRef.value), occupancy.version)

      provide(layoutContextKey, {
        disabled,
        get column() {
          return column.value
        },
        get gutter() {
          return gutter.value
        },
        Col,
        occupancy,
      })

      return (): VNodeChild => {
        if (disabled.value) return slots.default?.() ?? null
        const HostRow = Row as JsxHost
        return (
          <HostRow ref={rowRef} {...attrs} gutter={gutter.value}>
            {slots.default?.() ?? null}
          </HostRow>
        )
      }
    },
  })
}
