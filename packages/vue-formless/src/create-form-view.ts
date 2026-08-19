import {
  computed,
  defineComponent,
  h,
  markRaw,
  provide,
  reactive,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue'
import { formContextKey, type FormContext, type FormGridAdapter } from './context'
import { createFormModelWriter } from './form-model-writer'
import {
  resolveLayout,
  type FormLayoutProp,
} from './layout'
import type { FormItemAdapter, ToItemProps } from './item-adapter'
import { createControlWrap } from './wrap-control'

export interface CreateFormViewOptions {
  /** Row container (e.g. ElRow). Required together with Col for hosted layout. */
  Row: Component
  /** Column cell (e.g. ElCol). Must accept a numeric `span` prop (24-grid). */
  Col: Component
  /** Form item shell (e.g. ElFormItem). Independent of grid hosting. */
  Item?: Component
  /** Map Formless control + runtime formless config → host Item props. */
  toItemProps?: ToItemProps
}

export type { FormLayoutProp, FormLayoutOptions } from './layout'

export interface FormViewProps {
  modelValue: unknown
  /**
   * Grid hosting. Default `false` (omit = Context only, matches HTML boolean attrs).
   * - `true` / `layout`: hosted with defaults (`column: 2`, `gutter: 16`)
   * - `{ column, gutter }`: hosted with explicit density (`defaultSpan = 24 / column`)
   */
  layout?: FormLayoutProp
}

const formViewProps = {
  modelValue: {
    type: [Object, Array] as PropType<unknown>,
    required: true,
  },
  layout: {
    type: [Boolean, Object] as PropType<FormLayoutProp>,
    default: false,
  },
}

const formViewEmits = {
  'update:modelValue': (_value: unknown) => true,
}

function provideFormViewContext(options: {
  getModel: () => unknown
  emitUpdate: (next: unknown) => void
  getLayout?: () => FormLayoutProp
  adapter?: FormGridAdapter
  item?: FormItemAdapter
}) {
  const writer = createFormModelWriter(options.getModel, options.emitUpdate)
  const resolved = options.adapter
    ? computed(() => resolveLayout(options.getLayout?.()))
    : undefined

  const wrap = createControlWrap({
    Col: options.adapter?.Col,
    Item: options.item?.Item,
    toItemProps: options.item?.toItemProps,
    isLayoutEnabled: () => resolved?.value.enabled ?? false,
    getDefaultSpan: () => (resolved?.value.enabled ? resolved.value.defaultSpan : undefined),
  })

  const ctx = reactive({
    get model() {
      return options.getModel()
    },
    update: writer.update,
    wrap,
  }) as FormContext

  provide(formContextKey, ctx)
  return resolved
}

/**
 * Bind external Row/Col (and optional Item) once; returns a FormView (ADR-008 / ADR-012).
 *
 * Host shells stay in this closure. Controls call `ctx.wrap(body, meta)` and never `h()` Item/Col.
 *
 * @example
 * ```ts
 * import { ElRow, ElCol, ElFormItem } from 'element-plus'
 * export const FormView = createFormView({
 *   Row: ElRow,
 *   Col: ElCol,
 *   Item: ElFormItem,
 *   toItemProps,
 * })
 * ```
 */
export function createFormView(options: CreateFormViewOptions): Component {
  const adapter: FormGridAdapter = {
    Row: markRaw(options.Row),
    Col: markRaw(options.Col),
  }
  const item: FormItemAdapter | undefined =
    options.Item && options.toItemProps
      ? { Item: markRaw(options.Item), toItemProps: options.toItemProps }
      : undefined

  return defineComponent({
    name: 'FormView',
    props: formViewProps,
    emits: formViewEmits,
    setup(props, { slots, emit }) {
      const resolved = provideFormViewContext({
        getModel: () => props.modelValue,
        emitUpdate: (next) => emit('update:modelValue', next),
        getLayout: () => props.layout as FormLayoutProp,
        adapter,
        item,
      })!

      return (): VNodeChild => {
        const children = slots.default?.() ?? null
        if (!resolved.value.enabled) return children

        // Gutter: optional passthrough — Row may ignore if unsupported (ADR-008).
        return h(adapter.Row, { gutter: resolved.value.gutter }, () => children)
      }
    },
  })
}

/**
 * Context-only FormView (no Row/Col). Prefer `createFormView({ Row, Col })` for hosted grid.
 */
export const FormView = defineComponent({
  name: 'FormView',
  props: formViewProps,
  emits: formViewEmits,
  setup(props, { slots, emit }) {
    provideFormViewContext({
      getModel: () => props.modelValue,
      emitUpdate: (next) => emit('update:modelValue', next),
      getLayout: () => props.layout as FormLayoutProp,
    })
    return (): VNodeChild => slots.default?.() ?? null
  },
})
