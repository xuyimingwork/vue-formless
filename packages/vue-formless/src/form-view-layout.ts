import { defineComponent, h, markRaw, provide, reactive, type Component, type VNodeChild } from 'vue'
import { formContextKey, useFormContext, type FormContext } from './context'
import type { ItemFl } from './item-adapter'
import { DEFAULT_LAYOUT, GRID_TOTAL } from './layout'
import type { HostProps } from './overlay-props'
import { createControlWrap } from './wrap-control'

/**
 * Internal grid host. Not exported; FormView renders this when `fl:layout` is on.
 * `item` is this FormView layer's Item switch (not a public layout option).
 */
export function createFormLayout(options: {
  Row: Component
  Col: Component
  Item?: Component
  itemProps?: HostProps<ItemFl>
}): Component {
  const Row = markRaw(options.Row)
  const Col = markRaw(options.Col)
  const Item = options.Item ? markRaw(options.Item) : undefined

  return defineComponent({
    name: 'FormViewLayout',
    inheritAttrs: false,
    props: {
      column: { type: Number, required: true },
      gutter: { type: Number, required: true },
      item: { type: Boolean, default: true },
    },
    setup(props, { slots }) {
      const parent = useFormContext()
      const safeColumn = props.column > 0 ? props.column : DEFAULT_LAYOUT.column
      const wrap = createControlWrap({
        Col,
        Item,
        itemProps: options.itemProps,
        isLayoutEnabled: () => true,
        isItemEnabled: () => props.item !== false,
        getDefaultSpan: () => Math.max(1, Math.floor(GRID_TOTAL / safeColumn)),
      })

      provide(
        formContextKey,
        reactive({
          get model() {
            return parent.model
          },
          update: parent.update,
          wrap,
        }) as FormContext,
      )

      return (): VNodeChild => h(Row, { gutter: props.gutter }, () => slots.default?.() ?? null)
    },
  })
}
