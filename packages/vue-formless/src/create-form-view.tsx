import {
  computed,
  defineComponent,
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
import { useFormViewModelValue } from './use-form-view-model'
import type { ItemFl } from './field-schema'
import { omit } from './record-utils'
import { overlayProps, resolveProps, type HostProps } from './props-overlay'
import { toAttrBoolean, useFormlessProps } from './attrs'

/** `Component` is a union; JSX needs a constructable host. */
type JsxHost = new () => { $props: Record<string, unknown> }

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
  /** Host item shell. `props` are defaults (static or from the field snapshot). */
  item?: FormViewHostBind<ItemFl>
}

export type { HostProps } from './props-overlay'

/** FormView `:fl:layout` is a boolean switch. Density is factory / `:layout:*`. */
export type FormLayoutProp = boolean

export type FormFormProp = boolean | 'auto'

/** Column density when factory `layout.column` and `:layout:column` are omitted. */
const DEFAULT_COLUMN = 1

/** v-model fallthrough listeners; FormView owns them, not the host Form. */
const V_MODEL_PORT_KEYS = ['onUpdate:modelValue', 'onUpdate:model-value'] as const

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
   * Column density: factory `layout.column` plus `:layout:column` for **this** page LayoutView only.
   * wrap-embed inner LayoutView does not inherit them. Other `:layout:*` (e.g. gutter) fall through to the host Row.
   */
  'fl:layout'?: FormLayoutProp
  'layout:column'?: number
  /**
   * Wrap the factory `form`. Default `'auto'`: on at the root, off when nested.
   * Explicit `true` / `false` win.
   */
  'fl:form'?: FormFormProp
  /** Wrap the factory `item` per field (default `true` when `item.component` is bound). */
  'fl:item'?: boolean
}

export interface FormFl {
  /**
   * FormView write model (the DTO). `form.props` maps it to the host's model
   * source (e.g. `{ model: fl.modelValue }`). Function `props` receive only
   * this today; a per-field shape for host projection is deferred — add
   * members here when it lands.
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
 * Bind host layout / form / item once; returns a FormView (design.md §10).
 *
 * Host shells stay in this closure. Ad-hoc fields use `FormField`.
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
  const formProps = typeof options.form?.props === 'function' ? options.form?.props : () => options.form?.props
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
      const { props: hostAttrs, layoutProps, formlessProps } = useFormlessProps(
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
        const HostLayoutView = LayoutView as JsxHost
        const body = (
          <HostLayoutView
            {...overlayProps({ column }, layoutProps.value)}
            disabled={!toAttrBoolean(formlessProps.value.layout, false)}
            v-slots={{ default: slots.default }}
          />
        )

        if (!Form) return body
        if (!toAttrBoolean(formlessProps.value.form, !nested)) return body

        const HostForm = Form as JsxHost
        // Factory form.props(fl) sets host defaults; tag host attrs overlay (near wins).
        // The v-model value is a declared prop and its update:modelValue listener
        // is owned by useFormViewModelValue — neither lands on the host Form.
        return (
          <HostForm
            ref={hostForm}
            {...overlayProps(
              formProps({ modelValue: model.value }) as any,
              omit(hostAttrs.value, V_MODEL_PORT_KEYS),
            )}
            v-slots={{ default: () => body }}
          />
        )
      }
    },
  }) as FormViewComponent
}

export type FormViewComponent = DefineComponent<FormViewProps>
