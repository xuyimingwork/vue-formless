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
import { formContextKey, type FormContext, type FormGridAdapter } from './context'
import {
  resolveLayout,
  type FormLayoutProp,
} from './layout'

export interface CreateFormViewOptions {
  /** Row container (e.g. ElRow). Required together with Col for hosted layout. */
  Row: Component
  /** Column cell (e.g. ElCol). Must accept a numeric `span` prop. */
  Col: Component
  /** Grid total units. @default 24 */
  total?: number
}

export type { FormLayoutProp, FormLayoutOptions } from './layout'

export interface FormViewProps {
  modelValue: Record<string, unknown>
  readonly?: boolean
  disabled?: boolean
  /**
   * Grid hosting. Default `false` (omit = Context only, matches HTML boolean attrs).
   * - `true` / `layout`: hosted with defaults (`column: 2`, `gutter: 16`)
   * - `{ column, gutter }`: hosted with explicit density (`defaultSpan = total / column`)
   */
  layout?: FormLayoutProp
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
      layout: {
        type: [Boolean, Object] as PropType<FormLayoutProp>,
        default: false,
      },
    },
    emits: {
      'update:modelValue': (_value: Record<string, unknown>) => true,
    },
    setup(props, { slots }) {
      const resolved = computed(() => resolveLayout(props.layout, adapter.total))

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
        get column() {
          return resolved.value.column
        },
        get gutter() {
          return resolved.value.gutter
        },
        get defaultSpan() {
          return resolved.value.enabled ? resolved.value.defaultSpan : undefined
        },
        get grid() {
          return {
            ...adapter,
            layout: resolved.value.enabled,
          }
        },
      }) as FormContext

      provide(formContextKey, ctx)

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
  props: {
    modelValue: {
      type: Object as PropType<Record<string, unknown>>,
      required: true,
    },
    readonly: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    layout: {
      type: [Boolean, Object] as PropType<FormLayoutProp>,
      default: false,
    },
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
    }) as FormContext

    provide(formContextKey, ctx)

    return (): VNodeChild => slots.default?.() ?? null
  },
})
