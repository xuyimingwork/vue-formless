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
import { FORM_VIEW_KEY, type FormContext } from './injection-keys'
import { createFormModelWriter } from './form-model-writer'
import { createLayoutView } from '@vue-formless/layout'
import type { ItemFl } from './item-adapter'
import { overlayProps, resolveProps, type HostProps } from './overlay-props'
import { takePrefixed, toOptionalNumber } from './split-fallthrough'

export interface FormViewLayoutBind {
  Row: Component
  Col: Component
  column?: number
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

export type { HostProps } from './overlay-props'

/** FormView `:fl:layout` is a boolean switch. Density is factory / `:row:*`. */
export type FormLayoutProp = boolean

/** Factory `layout.column` overlay; other Row attrs use tag `:row:*`. */
export type FormLayoutOptions = Pick<FormViewLayoutBind, 'column'>

export type FormFormProp = boolean | 'auto'

/** Column density when factory `layout.column` and `:row:column` are omitted. */
const DEFAULT_COLUMN = 1

const ROW_PREFIX = 'row:'

export interface FormViewProps {
  modelValue?: unknown
  /**
   * Grid hosting switch. Default `false`.
   * Column density: factory `layout.column` plus `:row:column` for **this** page LayoutView only.
   * wrap-embed inner LayoutView does not inherit them. Other `:row:*` (e.g. gutter) fall through to the host Row.
   */
  'fl:layout'?: FormLayoutProp
  'row:column'?: number
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
    throw new Error('[vue-formless] fl:layout is boolean only; use :row:column / :row:*')
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
  getItem?: () => boolean
  LayoutView: Component
}): void {
  provide(
    FORM_VIEW_KEY,
    reactive({
      get model() {
        return options.getModel()
      },
      update: options.update,
      Item: options.Item ? markRaw(options.Item) : undefined,
      itemProps: options.itemProps,
      get item() {
        return options.getItem?.() ?? true
      },
      LayoutView: markRaw(options.LayoutView),
    }) as FormContext,
  )
}

function resolveFormViewData(
  getBoundModel: () => unknown,
  emitUpdate: (next: unknown) => void,
): { getModel: () => unknown; update: FormContext['update'] } {
  const parent = inject(FORM_VIEW_KEY, null)
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

/** Peel `:row:*` for LayoutView; `column` is density, the rest fall through to host Row. */
function splitRowChannel(
  attrs: Record<string, unknown>,
  declaredColumn: number | undefined,
  column: number,
): {
  layoutProps: Record<string, unknown>
  restAttrs: Record<string, unknown>
} {
  const { taken: rowTaken, rest: restAttrs } = takePrefixed(attrs, ROW_PREFIX)
  const { column: rowColumnAttr, ...rowHostAttrs } = rowTaken
  return {
    layoutProps: {
      column: declaredColumn ?? toOptionalNumber(rowColumnAttr) ?? column,
      ...rowHostAttrs,
    },
    restAttrs,
  }
}

/**
 * Bind host layout / form / item once; returns a FormView (ADR-008 / ADR-016 / ADR-020).
 *
 * Host shells stay in this closure. Ad-hoc cells use `FormCell`.
 *
 * @example
 * ```ts
 * export const FormView = createFormView({
 *   layout: { Row: ElRow, Col: ElCol, column: 2 },
 *   form: { component: ElForm, props: (fl) => ({ model: fl.modelValue }) },
 *   item: { component: ElFormItem, props: toEpItemProps },
 * })
 * ```
 */
export function createFormView(options: CreateFormViewOptions = {}): FormViewComponent {
  const { Row, Col, column = DEFAULT_COLUMN } = options.layout ?? {}
  const Form = options.form?.component ? markRaw(options.form.component) : undefined
  const formProps = options.form?.props
  const Item = options.item?.component ? markRaw(options.item.component) : undefined
  const itemProps = options.item?.props
  /** Page LayoutView density only; not provided to Context / wrap-embed. */
  const LayoutView = createLayoutView({ Row, Col })

  return defineComponent({
    name: 'FormView',
    inheritAttrs: false,
    props: formViewProps,
    emits: formViewEmits,
    setup(props, { slots, emit, attrs, expose }) {
      const hostForm = ref<object | null>(null)
      expose(proxyExpose(hostForm))

      const nested = inject(FORM_VIEW_KEY, null) != null
      const { getModel, update } = resolveFormViewData(
        () => props.modelValue,
        (next) => emit('update:modelValue', next),
      )

      provideFormViewContext({
        getModel,
        update,
        Item,
        itemProps,
        getItem: () => props['fl:item'] !== false,
        LayoutView,
      })

      return (): VNodeChild => {
        const enabled = isFlLayoutOn(props['fl:layout'])
        const { layoutProps, restAttrs } = splitRowChannel(
          attrs as Record<string, unknown>,
          props['row:column'],
          column,
        )
        const body = h(
          LayoutView,
          {
            disabled: !enabled,
            ...layoutProps,
          },
          { default: slots.default },
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
            ...overlayProps(resolveProps(formProps, fl), restAttrs),
          },
          { default: () => body },
        )
      }
    },
  })
}

export type FormViewComponent = Component

const defaultLayoutView = createLayoutView()

/**
 * Context-only FormView (no Row/Col/Form/Item). Prefer `createFormView({ layout: { Row, Col } })`.
 */
export const FormView = defineComponent({
  name: 'FormView',
  inheritAttrs: false,
  props: formViewProps,
  emits: formViewEmits,
  setup(props, { slots, emit, attrs }) {
    const { getModel, update } = resolveFormViewData(
      () => props.modelValue,
      (next) => emit('update:modelValue', next),
    )
    provideFormViewContext({
      getModel,
      update,
      getItem: () => props['fl:item'] !== false,
      LayoutView: defaultLayoutView,
    })
    return (): VNodeChild => {
      const { layoutProps } = splitRowChannel(
        attrs as Record<string, unknown>,
        props['row:column'],
        DEFAULT_COLUMN,
      )
      return h(
        defaultLayoutView,
        {
          disabled: !isFlLayoutOn(props['fl:layout']),
          ...layoutProps,
        },
        { default: slots.default },
      )
    }
  },
})
