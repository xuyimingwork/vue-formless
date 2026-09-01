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
import type { ItemFl } from './item-adapter'
import { overlayProps, resolveProps, type HostProps } from './overlay-props'
import { createControlWrap } from './wrap-control'
import { attachFormViewItem, FormViewItem } from './use-form-item'

export interface FormViewLayoutBind {
  Row: Component
  Col: Component
}

export interface FormViewHostBind<TFl> {
  component: Component
  props?: HostProps<TFl>
}

export interface CreateFormViewOptions {
  /** Row + Col for hosted grid. Omit to skip Col wrap even when `:fl:layout` is on. */
  layout?: FormViewLayoutBind
  /** Host form shell. Omit or `:fl:form="false"` skips wrapping. */
  form?: FormViewHostBind<FormFl>
  /** Host item shell. `props` are defaults (static or from the cell snapshot). */
  item?: FormViewHostBind<ItemFl>
}

export type { FormLayoutProp, FormLayoutOptions } from './layout'
export type { HostProps } from './overlay-props'

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
   * Wrap the factory `form`. Default `'auto'`: on at the root, off when nested.
   * Explicit `true` / `false` win.
   */
  'fl:form'?: FormFormProp
  /** Wrap the factory `item` per cell (default `true` when `item.component` is bound). */
  'fl:item'?: boolean
}

export interface FormFl {
  layout: FormLayoutProp
  form: boolean
  item: boolean
  /** FormView write-model; map to the host via `form.props` (e.g. `{ model: fl.modelValue }`). */
  modelValue: unknown
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
  itemProps?: HostProps<ItemFl>
  isItemEnabled?: () => boolean
}): void {
  const wrap = createControlWrap({
    Col: options.adapter?.Col,
    Item: options.Item,
    itemProps: options.itemProps,
    isLayoutEnabled: () => false,
    isItemEnabled: options.isItemEnabled,
    getDefaultSpan: () => undefined,
  })
  const isItemEnabled = options.isItemEnabled ?? (() => true)

  provide(
    formContextKey,
    reactive({
      get model() {
        return options.getModel()
      },
      update: options.update,
      wrap,
      isItemEnabled,
      isLayoutEnabled: () => false,
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

function resolveLayoutBind(layout: FormViewLayoutBind | undefined): FormGridAdapter | undefined {
  if (layout == null) return undefined
  if (layout.Row == null || layout.Col == null) {
    throw new Error('[vue-formless] createFormView layout requires both Row and Col.')
  }
  return {
    Row: markRaw(layout.Row),
    Col: markRaw(layout.Col),
  }
}

/**
 * Bind host layout / form / item once; returns a FormView (ADR-008 / ADR-016).
 *
 * Host shells stay in this closure. Cells go through `useFormItem` / `FormView.Item`, which call `wrap`.
 *
 * @example
 * ```ts
 * export const FormView = createFormView({
 *   layout: { Row: ElRow, Col: ElCol },
 *   form: { component: ElForm, props: (fl) => ({ model: fl.modelValue }) },
 *   item: { component: ElFormItem, props: toEpItemProps },
 * })
 * ```
 */
export function createFormView(options: CreateFormViewOptions = {}): FormViewComponent {
  const adapter = resolveLayoutBind(options.layout)
  const Form = options.form?.component ? markRaw(options.form.component) : undefined
  const formProps = options.form?.props
  const Item = options.item?.component ? markRaw(options.item.component) : undefined
  const itemProps = options.item?.props
  const Layout = adapter
    ? createFormLayout({ Row: adapter.Row, Col: adapter.Col, Item, itemProps })
    : undefined

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
          itemProps,
          isItemEnabled: () => props['fl:item'] !== false,
        })

        return (): VNodeChild => {
          const children = slots.default?.() ?? null
          const layout = resolveLayout(toLayoutProp(props['fl:layout']))
          const body =
            layout.enabled && Layout
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
            modelValue: getModel(),
          }

          return h(
            Form,
            {
              ref: hostForm,
              ...overlayProps(resolveProps(formProps, fl), attrs as Record<string, unknown>),
            },
            { default: () => body },
          )
        }
      },
    }),
  )
}

export type FormViewComponent = Component & { Item: typeof FormViewItem }

/**
 * Context-only FormView (no Row/Col/Form/Item). Prefer `createFormView({ layout: { Row, Col } })`.
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
