import {
  defineComponent,
  getCurrentInstance,
  h,
  inject,
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
import { createFormLayout } from './form-view-layout'
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

export type FormFormProp = boolean | 'auto'

export interface FormViewProps {
  modelValue?: unknown
  /**
   * Grid hosting. Default `false`.
   * - `true`: hosted with defaults (`column: 2`, `gutter: 16`)
   * - `{ column, gutter }`: hosted with explicit density (`defaultSpan = 24 / column`)
   */
  'fl:layout'?: FormLayoutProp
  /**
   * Wrap the factory `Form`. Default `'auto'`: on at the root, off when nested.
   * Explicit `true` / `false` win.
   */
  'fl:form'?: FormFormProp
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
    default: undefined,
  },
  'fl:layout': {
    type: [Boolean, Object] as PropType<FormLayoutProp>,
    default: false,
  },
  'fl:form': {
    type: [Boolean, String] as PropType<FormFormProp>,
    default: 'auto',
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

function resolveFormOn(value: FormFormProp, nested: boolean): boolean {
  if (value === true || value === false) return value
  return !nested
}

function hasIncomingVModel(raw: Record<string, unknown> | null | undefined): boolean {
  if (raw == null) return false
  return (
    'modelValue' in raw ||
    'model-value' in raw ||
    'onUpdate:modelValue' in raw ||
    'onUpdate:model-value' in raw
  )
}

function provideFormViewContext(options: {
  getModel: () => unknown
  update: FormContext['update']
  adapter?: FormGridAdapter
  Item?: Component
  isItemEnabled?: () => boolean
}): void {
  const wrap = createControlWrap({
    Col: options.adapter?.Col,
    Item: options.Item,
    isLayoutEnabled: () => false,
    isItemEnabled: options.isItemEnabled,
    getDefaultSpan: () => undefined,
  })

  provide(
    formContextKey,
    reactive({
      get model() {
        return options.getModel()
      },
      update: options.update,
      wrap,
    }) as FormContext,
  )
}

function resolveFormViewData(
  getBoundModel: () => unknown,
  emitUpdate: (next: unknown) => void,
): { getModel: () => unknown; update: FormContext['update'] } {
  const parent = inject(formContextKey, null)
  const incoming = hasIncomingVModel(getCurrentInstance()?.vnode.props as Record<string, unknown> | null)

  if (incoming) {
    const writer = createFormModelWriter(getBoundModel, emitUpdate)
    return { getModel: getBoundModel, update: writer.update }
  }

  if (parent) {
    return {
      getModel: () => parent.model,
      update: parent.update,
    }
  }

  throw new Error('[vue-formless] FormView requires v-model unless nested inside another FormView.')
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
  const Layout = createFormLayout({ Row: adapter.Row, Col: adapter.Col, Item })

  return attachFormViewItem(
    defineComponent({
      name: 'FormView',
      inheritAttrs: false,
      props: formViewProps,
      emits: formViewEmits,
      setup(props, { slots, emit, attrs, expose }) {
        const hostForm = ref<object | null>(null)
        expose(proxyExpose(hostForm))

        const nested = inject(formContextKey, null) != null
        const { getModel, update } = resolveFormViewData(
          () => props.modelValue,
          (next) => emit('update:modelValue', next),
        )

        provideFormViewContext({
          getModel,
          update,
          adapter,
          Item,
          isItemEnabled: () => props['fl:item'] !== false,
        })

        return (): VNodeChild => {
          const children = slots.default?.() ?? null
          const layout = resolveLayout(toLayoutProp(props['fl:layout']))
          const body = layout.enabled
            ? h(
                Layout,
                {
                  column: layout.column,
                  gutter: layout.gutter,
                  item: props['fl:item'] !== false,
                },
                () => children,
              )
            : children

          const formOn = Form ? resolveFormOn(props['fl:form'] as FormFormProp, nested) : false
          if (!Form || !formOn) return body

          const fl: FormFl = {
            layout: toLayoutProp(props['fl:layout']),
            form: formOn,
            item: props['fl:item'] !== false,
          }

          return h(
            Form,
            { ref: hostForm, fl, modelValue: getModel(), ...attrs },
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
      const { getModel, update } = resolveFormViewData(
        () => props.modelValue,
        (next) => emit('update:modelValue', next),
      )
      provideFormViewContext({ getModel, update })
      return (): VNodeChild => slots.default?.() ?? null
    },
  }),
)
