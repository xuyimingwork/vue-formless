import {
  defineComponent,
  inject,
  onBeforeUnmount,
  onMounted,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue'
import { resolveColSpan, type ColPlace, type ColSpanSpec } from './density'
import { layoutContextKey, type JsxHost } from './layout-context'
import { blanksBefore, type CellRecord } from './occupancy'

export interface LayoutItemProps {
  span?: ColSpanSpec
  place?: ColPlace
}

const Passthrough = defineComponent({
  name: 'LayoutItemPassthrough',
  inheritAttrs: false,
  setup(_, { slots }) {
    return (): VNodeChild => slots.default?.() ?? null
  },
})

const LayoutBlanks = defineComponent({
  name: 'LayoutBlanks',
  props: {
    cell: { type: Object as PropType<CellRecord>, required: true },
  },
  setup(props) {
    const ctx = inject(layoutContextKey)!
    return (): VNodeChild => {
      const HostCol = ctx.Col as JsxHost
      const blanks = blanksBefore(ctx.occupancy.entries(), props.cell, ctx.column)
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

const LayoutItem = defineComponent({
  name: 'LayoutItem',
  inheritAttrs: false,
  props: {
    span: { type: [String, Number] as PropType<ColSpanSpec>, default: undefined },
    place: { type: String as PropType<ColPlace>, default: undefined },
  },
  setup(props, { slots }) {
    const ctx = inject(layoutContextKey)!
    const id = ctx.occupancy.nextId()
    let colEl: Element | null = null
    const cell: CellRecord = {
      id,
      get span() {
        return props.span
      },
      get place() {
        return props.place
      },
    }
    ctx.occupancy.add(cell)

    function bindColEl(raw: unknown): void {
      colEl = ctx.occupancy.bindColEl(id, raw, colEl)
    }

    onMounted(() => {
      ctx.occupancy.bump()
    })

    onBeforeUnmount(() => {
      ctx.occupancy.remove(id, colEl)
    })

    return (): VNodeChild => {
      if (ctx.disabled.value) return slots.default?.() ?? null
      const HostCol = ctx.Col as JsxHost
      const n = resolveColSpan(props.span, ctx.column)
      return (
        <>
          <LayoutBlanks cell={cell} />
          <HostCol ref={bindColEl} span={n}>
            {slots.default?.() ?? null}
          </HostCol>
        </>
      )
    }
  },
})

/** Nearest LayoutView's cell component; identity when no LayoutView. */
export function useLayoutItem(): Component {
  return inject(layoutContextKey, null) ? LayoutItem : Passthrough
}
