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
import { formContextKey, type FormContext } from './context'
import { createFormModelWriter } from './form-model-writer'
import { createLayoutView, DEFAULT_LAYOUT, type FormLayoutProp } from '@vue-formless/layout'
import type { ItemFl } from './item-adapter'
import { overlayProps, resolveProps, type HostProps } from './overlay-props'
import { createControlWrap } from './wrap-control'
import { attachFormViewItem, FormViewItem } from './use-form-item'

export interface FormViewLayoutBind {
  Row: Component
  Col: Component
  column?: number
  gutter?: number
}

export interface FormViewHostBind<TFl> {
  component: Component
  props?: HostProps<TFl>
}

export interface CreateFormViewOptions {
  /** Row + Col for hosted grid, plus optional project density. */
  layout?: FormViewLayoutBind
  /** Host form shell. Omit or `:fl:form="false"` skips wrapping. */
  form?: FormViewHostBind<FormFl>
  /** Host item shell. `props` are defaults (static or from the cell snapshot). */
  item?: FormViewHostBind<ItemFl>
}

export type { FormLayoutProp, FormLayoutOptions } from '@vue-formless/layout'
export type { HostProps } from './overlay-props'

export type FormFormProp = boolean | 'auto'

/** Row gutter when factory `layout.gutter` and `:row:gutter` are omitted. */
const DEFAULT_GUTTER = 0

export interface FormViewProps {
  modelValue?: unknown
  /**
   * Grid hosting switch. Default `false`.
   * Density: factory `layout.column/gutter`, overlay `:row:column` / `:row:gutter`.
   */
  'fl:layout'?: FormLayoutProp
  'row:column'?: number
  'row:gutter'?: number
  /**
   * Wrap the factory `form`. Default `'auto'`: on at the root, off when nested.
   * Explicit `true` / `false` win.
   */
  'fl:form'?: FormFormProp
  /** Wrap the factory `item` per cell (default `true` when `item.component` is bound). */
  'fl:item'?: boolean
}

export interface FormFl {
  layout: boolean
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
    type: Boolean as PropType<FormLayoutProp>,
    default: false,
  },
  'row:column': { type: Number, default: undefined },
  'row:gutter': { type: Number, default: undefined },
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

export function isFlLayoutOn(value: unknown): boolean {
  if (value != null && typeof value === 'object') {
    throw new Error('[vue-formless] fl:layout is boolean only; use :row:column / :row:gutter')
  }
  return value === true || value === ''
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
  Item?: Component
  itemProps?: HostProps<ItemFl>
  isItemEnabled?: () => boolean
  isLayoutEnabled: () => boolean
  LayoutView: Component
}): void {
  const wrap = createControlWrap({
    Item: options.Item,
    itemProps: options.itemProps,
    isItemEnabled: options.isItemEnabled,
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
      isLayoutEnabled: options.isLayoutEnabled,
      LayoutView: markRaw(options.LayoutView),
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

function resolveLayoutBind(layout: FormViewLayoutBind | undefined): FormViewLayoutBind | undefined {
  if (layout == null) return undefined
  if (layout.Row == null || layout.Col == null) {
    throw new Error('[vue-formless] createFormView layout requires both Row and Col.')
  }
  return {
    Row: markRaw(layout.Row),
    Col: markRaw(layout.Col),
    column: layout.column,
    gutter: layout.gutter,
  }
}

/**
 * Bind host layout / form / item once; returns a FormView (ADR-008 / ADR-016).
 *
 * Host shells stay in this closure. Cells go through `useFormItem` / `FormView.Item`.
 *
 * @example
 * ```ts
 * export const FormView = createFormView({
 *   layout: { Row: ElRow, Col: ElCol, column: 2, gutter: 16 },
 *   form: { component: ElForm, props: (fl) => ({ model: fl.modelValue }) },
 *   item: { component: ElFormItem, props: toEpItemProps },
 * })
 * ```
 */
export function createFormView(options: CreateFormViewOptions = {}): FormViewComponent {
  const bind = resolveLayoutBind(options.layout)
  const Form = options.form?.component ? markRaw(options.form.component) : undefined
  const formProps = options.form?.props
  const Item = options.item?.component ? markRaw(options.item.component) : undefined
  const itemProps = options.item?.props
  const LayoutView = createLayoutView(
    bind ? { Row: bind.Row, Col: bind.Col } : {},
  )
  const factoryColumn = bind?.column ?? DEFAULT_LAYOUT.column
  const factoryGutter = bind?.gutter ?? DEFAULT_GUTTER

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
          Item,
          itemProps,
          isItemEnabled: () => props['fl:item'] !== false,
          isLayoutEnabled: () => isFlLayoutOn(props['fl:layout']),
          LayoutView,
        })

        return (): VNodeChild => {
          const children = slots.default?.() ?? null
          const enabled = isFlLayoutOn(props['fl:layout'])
          const density = {
            column: props['row:column'] ?? factoryColumn,
            gutter: props['row:gutter'] ?? factoryGutter,
          }
          const body = h(
            LayoutView,
            { disabled: !enabled, column: density.column, gutter: density.gutter },
            () => children,
          )

          const formOn = Form ? resolveFormOn(props['fl:form'] as FormFormProp, nested) : false
          if (!Form || !formOn) return body

          const fl: FormFl = {
            layout: enabled,
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

const defaultLayoutView = createLayoutView()

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
      provideFormViewContext({
        getModel,
        update,
        isLayoutEnabled: () => isFlLayoutOn(props['fl:layout']),
        LayoutView: defaultLayoutView,
      })
      return (): VNodeChild =>
        h(
          defaultLayoutView,
          {
            disabled: !isFlLayoutOn(props['fl:layout']),
            column: props['row:column'] ?? DEFAULT_LAYOUT.column,
            gutter: props['row:gutter'] ?? DEFAULT_GUTTER,
          },
          () => slots.default?.() ?? null,
        )
    },
  }),
)
