import {
  defineComponent,
  h,
  provide,
  reactive,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue'
import { formContextKey, type FormContext, type FormGridAdapter } from './context'

export interface CreateFormViewOptions {
  /** Row container (e.g. ElRow). Required together with Col for hosted layout. */
  Row: Component
  /** Column cell (e.g. ElCol). Must accept a numeric `span` prop. */
  Col: Component
  /** Grid total units. @default 24 */
  total?: number
}

export interface FormViewProps {
  modelValue: Record<string, unknown>
  readonly?: boolean
  disabled?: boolean
  columns?: number
  gutter?: number
  defaultSpan?: number
  /**
   * When true (default), wrap default slot with Row and expose Col to fields.
   * When false, Context only — caller owns Row/Col (escape hatch).
   */
  layout?: boolean
}

/**
 * Bind external Row/Col once; returns a FormView component (ADR-008).
 *
 * @example
 * ```ts
 * import { ElRow, ElCol } from 'element-plus'
 * export const FormView = createFormView({ Row: ElRow, Col: ElCol })
 * ```
 */
export function createFormView(options: CreateFormViewOptions): Component {
  const adapter: FormGridAdapter = {
    Row: options.Row,
    Col: options.Col,
    total: options.total ?? 24,
  }

  return defineComponent({
    name: 'FormView',
    props: {
      modelValue: {
        type: Object as PropType<Record<string, unknown>>,
        required: true,
      },
      readonly: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
      columns: { type: Number, default: undefined },
      gutter: { type: Number, default: undefined },
      defaultSpan: { type: Number, default: undefined },
      layout: { type: Boolean, default: true },
    },
    emits: {
      'update:modelValue': (_value: Record<string, unknown>) => true,
    },
    setup(props, { slots }) {
      const ctx = reactive({
        get model() {
          return props.modelValue
        },
        get readonly() {
          return props.readonly
        },
        get disabled() {
          return props.disabled
        },
        get columns() {
          return props.columns
        },
        get gutter() {
          return props.gutter
        },
        get defaultSpan() {
          return props.defaultSpan
        },
        get grid() {
          return {
            ...adapter,
            layout: props.layout,
          }
        },
      }) as FormContext

      provide(formContextKey, ctx)

      return (): VNodeChild => {
        const children = slots.default?.() ?? null
        if (!props.layout) return children

        // Gutter: optional passthrough — Row may ignore if unsupported (ADR-008).
        const rowProps: Record<string, unknown> = {}
        if (props.gutter != null) rowProps.gutter = props.gutter

        return h(adapter.Row, rowProps, () => children)
      }
    },
  })
}

/**
 * Context-only FormView (no Row/Col). Prefer `createFormView({ Row, Col })` for hosted grid.
 * Kept for escape-hatch roots and tests.
 */
export const FormView = defineComponent({
  name: 'FormView',
  props: {
    modelValue: {
      type: Object as PropType<Record<string, unknown>>,
      required: true,
    },
    readonly: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    columns: { type: Number, default: undefined },
    gutter: { type: Number, default: undefined },
    defaultSpan: { type: Number, default: undefined },
    layout: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: Record<string, unknown>) => true,
  },
  setup(props, { slots }) {
    const ctx = reactive({
      get model() {
        return props.modelValue
      },
      get readonly() {
        return props.readonly
      },
      get disabled() {
        return props.disabled
      },
      get columns() {
        return props.columns
      },
      get gutter() {
        return props.gutter
      },
      get defaultSpan() {
        return props.defaultSpan
      },
    }) as FormContext

    provide(formContextKey, ctx)

    return (): VNodeChild => slots.default?.() ?? null
  },
})
