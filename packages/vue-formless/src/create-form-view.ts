import {
  computed,
  defineComponent,
  h,
  inject,
  markRaw,
  provide,
  reactive,
  ref,
  type Component,
  type DefineComponent,
  type PropType,
  type VNodeChild,
} from 'vue'
import { createLayoutView } from '@vue-formless/layout'
import { FORM_VIEW_KEY, type FormContext } from './injection-keys'
import { useFormViewModelValue } from './use-form-view-model-value'
import type { ItemFl } from './item-adapter'
import { overlayProps, resolveProps, type HostProps } from './overlay-props'
import { toAttrBoolean, useFormlessProps } from './split-fallthrough'

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

export interface FormViewProps {
  /**
   * FormView write model (the DTO). Declared as a real prop so the value
   * never falls through into the host Form's fallthrough bag. The
   * `onUpdate:modelValue` listener is read from `attrs` by
   * `useFormViewModelValue` and is peeled off the host Form props.
   */
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
  /**
   * FormView write model (the DTO). `form.props` maps it to the host's model
   * source (e.g. `{ model: fl.modelValue }`). Function `props` receive only
   * this today; a per-field shape for host projection (ADR-014 `fields`) is
   * deferred — add members here when it lands.
   */
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

function resolveFormOn(value: unknown, nested: boolean): boolean {
  if (value === true || value === false) return value
  if (value === 'true' || value === '') return true
  if (value === 'false') return false
  return !nested
}

/** FormView owns the v-model port; keep it off the host Form's bag. */
function stripVModelPort(attrs: Record<string, unknown>): Record<string, unknown> {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'onUpdate:modelValue' || key === 'onUpdate:model-value') continue
    rest[key] = value
  }
  return rest
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
    props: {
      modelValue: {
        type: [Object, Array] as PropType<unknown>,
        default: undefined,
      },
    },
    setup(props, { slots, attrs, expose }) {
      const hostForm = ref<object | null>(null)
      expose(proxyExpose(hostForm))

      const nested = inject(FORM_VIEW_KEY, null) != null
      const { props: hostAttrs, rowProps, formlessProps } = useFormlessProps(
        attrs as Record<string, unknown>,
      )

      /** v-model write port: fallthrough listener (camel or DOM-case tag). */
      const { model, update } = useFormViewModelValue(
        () => props.modelValue,
        () => {
          const raw = attrs['onUpdate:modelValue'] || attrs['onUpdate:model-value']
          return typeof raw === 'function' ? (raw as (next: unknown) => void) : undefined
        },
      )

      provideFormViewContext({
        getModel: () => model.value,
        update,
        Item,
        itemProps,
        getItem: () => toAttrBoolean(formlessProps.value.item, true),
        LayoutView,
      })

      return (): VNodeChild => {
        const body = h(
          LayoutView,
          {
            ...overlayProps({ column }, rowProps.value),
            disabled: !toAttrBoolean(formlessProps.value.layout, false),
          },
          { default: slots.default },
        )

        const formOn = Form ? resolveFormOn(formlessProps.value.form, nested) : false
        if (!Form || !formOn) return body

        // Function form.props(fl) gets the DTO only (ADR-016; fields deferred).
        const fl: FormFl = { modelValue: model.value }

        // Factory form.props(fl) sets host defaults; tag host attrs overlay (near wins).
        // The v-model value is a declared prop and its update:modelValue listener
        // is owned by useFormViewModelValue — neither lands on the host Form.
        return h(
          Form,
          {
            ref: hostForm,
            ...overlayProps(resolveProps(formProps, fl), stripVModelPort(hostAttrs.value)),
          },
          { default: () => body },
        )
      }
    },
  }) as FormViewComponent
}

export type FormViewComponent = DefineComponent<FormViewProps>
