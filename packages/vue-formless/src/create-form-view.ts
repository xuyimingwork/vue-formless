import {
  computed,
  defineComponent,
  h,
  markRaw,
  provide,
  reactive,
  ref,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue'
import { formContextKey, type FormContext, type FormGridAdapter } from './context'
import { createFormModelWriter } from './form-model-writer'
import {
  resolveLayout,
  type FormLayoutOptions,
  type FormLayoutProp,
} from './layout'
import { createControlWrap } from './wrap-control'
import { attachFormViewItem, FormViewItem } from './use-form-item'

export interface CreateFormViewOptions {
  /** Row container (e.g. ElRow). Required together with Col for hosted layout. */
  Row: Component
  /** Column cell (e.g. ElCol). Must accept a numeric `span` prop (24-grid). */
  Col: Component
  /** Host form shell (e.g. EpForm). Optional; skip wrapping when omitted or `:fl:form="false"`. */
  Form?: Component
  /** Form item shell (e.g. EpItem). Converts `props.fl` internally. */
  Item?: Component
}

export type { FormLayoutProp, FormLayoutOptions } from './layout'

export interface FormViewProps {
  modelValue: unknown
  /**
   * Grid hosting. Default `false`.
   * - `true`: hosted with defaults (`column: 2`, `gutter: 16`)
   * - `{ column, gutter }`: hosted with explicit density (`defaultSpan = 24 / column`)
   */
  'fl:layout'?: FormLayoutProp
  /** Wrap the factory `Form` (default `true` when `Form` is bound). */
  'fl:form'?: boolean
  /** Wrap the factory `Item` per cell (default `true` when `Item` is bound). */
  'fl:item'?: boolean
}

export interface FormFl {
  layout: FormLayoutProp
  form: boolean
  item: boolean
}

function proxyExpose(host: { value: object | null }): object {
  return new Proxy(
    {},
    {
      get(_target, key) {
        const inner = host.value
        if (inner == null) return undefined
        const value = Reflect.get(inner, key, inner)
        return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(inner) : value
      },
      has(_target, key) {
        return host.value != null && key in host.value
      },
    },
  )
}

const formViewProps = {
  modelValue: {
    type: [Object, Array] as PropType<unknown>,
    required: true,
  },
  'fl:layout': {
    type: [Boolean, Object] as PropType<FormLayoutProp>,
    default: false,
  },
  'fl:form': {
    type: Boolean,
    default: true,
  },
  'fl:item': {
    type: Boolean,
    default: true,
  },
}

const formViewEmits = {
  'update:modelValue': (_value: unknown) => true,
}

function toLayoutProp(value: unknown): FormLayoutProp {
  if (value === false || value == null) return false
  if (value === true || value === '') return true
  if (typeof value === 'object') return value as FormLayoutOptions
  return true
}

function provideFormViewContext(options: {
  getModel: () => unknown
  emitUpdate: (next: unknown) => void
  getLayout?: () => FormLayoutProp
  adapter?: FormGridAdapter
  Item?: Component
  isItemEnabled?: () => boolean
}) {
  const writer = createFormModelWriter(options.getModel, options.emitUpdate)
  const resolved = options.adapter
    ? computed(() => resolveLayout(options.getLayout?.()))
    : undefined

  const wrap = createControlWrap({
    Col: options.adapter?.Col,
    Item: options.Item,
    isLayoutEnabled: () => resolved?.value.enabled ?? false,
    isItemEnabled: options.isItemEnabled,
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
 * Bind external Row/Col (and optional Form/Item) once; returns a FormView (ADR-008 / ADR-012).
 *
 * Host shells stay in this closure. Cells go through `useFormItem` / `FormView.Item`, which call `wrap`.
 *
 * @example
 * ```ts
 * export const FormView = createFormView({
 *   Row: ElRow,
 *   Col: ElCol,
 *   Form: EpForm,
 *   Item: EpItem,
 * })
 * ```
 */
export function createFormView(options: CreateFormViewOptions): FormViewComponent {
  const adapter: FormGridAdapter = {
    Row: markRaw(options.Row),
    Col: markRaw(options.Col),
  }
  const Form = options.Form ? markRaw(options.Form) : undefined
  const Item = options.Item ? markRaw(options.Item) : undefined

  return attachFormViewItem(
    defineComponent({
      name: 'FormView',
      inheritAttrs: false,
      props: formViewProps,
      emits: formViewEmits,
      setup(props, { slots, emit, attrs, expose }) {
        const hostForm = ref<object | null>(null)
        expose(proxyExpose(hostForm))

        const resolved = provideFormViewContext({
          getModel: () => props.modelValue,
          emitUpdate: (next) => emit('update:modelValue', next),
          getLayout: () => toLayoutProp(props['fl:layout']),
          adapter,
          Item,
          isItemEnabled: () => props['fl:item'] !== false,
        })!

        return (): VNodeChild => {
          const children = slots.default?.() ?? null
          const body = resolved.value.enabled
            ? h(adapter.Row, { gutter: resolved.value.gutter }, () => children)
            : children

          const formOn = props['fl:form'] !== false
          if (!Form || !formOn) return body

          const fl: FormFl = {
            layout: toLayoutProp(props['fl:layout']),
            form: formOn,
            item: props['fl:item'] !== false,
          }

          return h(
            Form,
            { ref: hostForm, fl, modelValue: props.modelValue, ...attrs },
            { default: () => body },
          )
        }
      },
    }),
  )
}

export type FormViewComponent = Component & { Item: typeof FormViewItem }

/**
 * Context-only FormView (no Row/Col/Form/Item). Prefer `createFormView({ Row, Col })`.
 */
export const FormView = attachFormViewItem(
  defineComponent({
    name: 'FormView',
    inheritAttrs: false,
    props: formViewProps,
    emits: formViewEmits,
    setup(props, { slots, emit }) {
      provideFormViewContext({
        getModel: () => props.modelValue,
        emitUpdate: (next) => emit('update:modelValue', next),
        getLayout: () => toLayoutProp(props['fl:layout']),
      })
      return (): VNodeChild => slots.default?.() ?? null
    },
  }),
)
