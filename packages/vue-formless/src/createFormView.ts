import {
  computed,
  defineComponent,
  h,
  provide,
  reactive,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue'
import { formContextKey, type FormContext, type FormGridAdapter, type FormItemAdapter } from './context'
import { createFormModelWriter } from './formModelWriter'
import {
  resolveLayout,
  type FormLayoutProp,
} from './layout'
import type { ToRules } from './identityRules'

export interface CreateFormViewOptions {
  /** Row container (e.g. ElRow). Required together with Col for hosted layout. */
  Row: Component
  /** Column cell (e.g. ElCol). Must accept a numeric `span` prop. */
  Col: Component
  /** Grid total units. @default 24 */
  total?: number
  /** Form item shell (e.g. ElFormItem). Independent of grid hosting. */
  Item?: Component
  /** Compile identity rules + policy into host Item `rules`. */
  toRules?: ToRules
}

export type { FormLayoutProp, FormLayoutOptions } from './layout'

export interface FormViewProps {
  modelValue: unknown
  readonly?: boolean
  disabled?: boolean
  /**
   * Grid hosting. Default `false` (omit = Context only, matches HTML boolean attrs).
   * - `true` / `layout`: hosted with defaults (`column: 2`, `gutter: 16`)
   * - `{ column, gutter }`: hosted with explicit density (`defaultSpan = total / column`)
   */
  layout?: FormLayoutProp
}

const formViewProps = {
  modelValue: {
    type: [Object, Array] as PropType<unknown>,
    required: true,
  },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
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
  getReadonly: () => boolean
  getDisabled: () => boolean
  getLayout?: () => FormLayoutProp
  adapter?: FormGridAdapter
  item?: FormItemAdapter
}) {
  const writer = createFormModelWriter(options.getModel, options.emitUpdate)
  const resolved = options.adapter
    ? computed(() => resolveLayout(options.getLayout?.(), options.adapter!.total))
    : undefined

  const ctx = reactive({
    get model() {
      return options.getModel()
    },
    update: writer.update,
    get readonly() {
      return options.getReadonly()
    },
    get disabled() {
      return options.getDisabled()
    },
    get column() {
      return resolved?.value.column
    },
    get gutter() {
      return resolved?.value.gutter
    },
    get defaultSpan() {
      return resolved?.value.enabled ? resolved.value.defaultSpan : undefined
    },
    get grid() {
      if (!options.adapter || !resolved) return undefined
      return {
        ...options.adapter,
        layout: resolved.value.enabled,
      }
    },
    get item() {
      return options.item
    },
  }) as FormContext

  provide(formContextKey, ctx)
  return resolved
}

/**
 * Bind external Row/Col (and optional Item) once; returns a FormView (ADR-008 / ADR-012).
 *
 * @example
 * ```ts
 * import { ElRow, ElCol, ElFormItem } from 'element-plus'
 * export const FormView = createFormView({
 *   Row: ElRow,
 *   Col: ElCol,
 *   Item: ElFormItem,
 *   toRules,
 * })
 * ```
 */
export function createFormView(options: CreateFormViewOptions): Component {
  const adapter: FormGridAdapter = {
    Row: options.Row,
    Col: options.Col,
    total: options.total ?? 24,
  }
  const item: FormItemAdapter | undefined = options.Item
    ? { Item: options.Item, toRules: options.toRules }
    : undefined

  return defineComponent({
    name: 'FormView',
    props: formViewProps,
    emits: formViewEmits,
    setup(props, { slots, emit }) {
      const resolved = provideFormViewContext({
        getModel: () => props.modelValue,
        emitUpdate: (next) => emit('update:modelValue', next),
        getReadonly: () => props.readonly,
        getDisabled: () => props.disabled,
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
      getReadonly: () => props.readonly,
      getDisabled: () => props.disabled,
      getLayout: () => props.layout as FormLayoutProp,
    })
    return (): VNodeChild => slots.default?.() ?? null
  },
})
