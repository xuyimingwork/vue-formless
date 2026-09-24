import {
  defineComponent,
  inject,
  markRaw,
  provide,
  ref,
  toValue,
  type Component,
  type DefineComponent,
  type PropType,
  type VNodeChild,
  type MaybeRefOrGetter,
  computed,
} from 'vue'
import { createLayoutView } from '@vue-formless/layout'
import { createFormItem } from './create-form-item'
import { FORM_FIELD_KEY, FORM_VIEW_KEY, type FormFieldContext } from './injection-keys'
import { useFormViewValue } from './use-form-view-value'
import type { HostProps, ItemFl } from './field-schema'
import { mergeAttrs, resolveProps } from './props-overlay'
import { omit, getAttrBoolean } from './utils'
import { VIEW_ATTR_CHANNELS, useDispatch } from './use-form-attrs'

/** `Component` is a union; JSX needs a constructable host. */
type JsxHost = new () => { $props: Record<string, unknown> }

/** `layout.props` snapshot (design.md §10.1): grid enabled, before the `disabled` flip. */
export type LayoutFl = {
  /** Tag `:fl:layout` for **this** page LayoutView. Density lives in `layout.props`. */
  layout: boolean
}

export interface FormViewLayoutBind {
  Row: Component
  Col: Component
  /**
   * Default LayoutView props (density etc.): static object, or derived from the
   * `{ layout }` snapshot. Tag `:layout:*` overlays them (near wins).
   * `disabled` stays kernel-owned: always the `fl:layout` polarity flip.
   */
  props?: HostProps<LayoutFl>
}

export interface FormViewHostBind<TFl> {
  component: Component
  props?: HostProps<TFl>
}

export interface CreateFormViewOptions {
  /** Row + Col for the hosted grid, plus optional LayoutView props (density etc.). */
  layout?: FormViewLayoutBind
  /** Host form shell. Omit or `:fl:form="false"` skips wrapping. */
  form?: FormViewHostBind<FormFl>
  /** Host item shell. `props` are defaults (static or from the field snapshot). */
  item?: FormViewHostBind<ItemFl>
}

/** FormView `:fl:layout` is a boolean switch. Density is factory `layout.props` / `:layout:*`. */
export type FormLayoutProp = boolean

export type FormFormProp = boolean | 'auto'

/** v-model fallthrough listeners; FormView owns them, not the host Form. */
const V_MODEL_PORT_KEYS = ['onUpdate:modelValue', 'onUpdate:model-value'] as const

export interface FormViewProps {
  /**
   * FormView write model (the DTO). Declared as a real prop so the value
   * never falls through into the host Form's fallthrough bag. The
   * `onUpdate:modelValue` listener is read from `attrs` by
   * `useFormViewModelValue` and is stripped off the host Form props.
   */
  modelValue?: unknown
  /**
   * Grid hosting switch. Default `false`.
   * Density: factory `layout.props` plus `:layout:*` for **this** page LayoutView only.
   * wrap-embed inner LayoutView inherits neither. Other `:layout:*` fall through to the host Row.
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

/**
 * Bind host layout / form / item once; returns a FormView (design.md §10).
 *
 * Host shells stay in this closure. Ad-hoc fields use `FormField`.
 *
 * @example
 * ```ts
 * export const FormView = createFormView({
 *   layout: { Row: ElRow, Col: ElCol, props: { column: 2 } },
 *   form: { component: ElForm, props: (fl) => ({ model: fl.modelValue }) },
 *   item: { component: ElFormItem, props: toEpItemProps },
 * })
 * ```
 */
export function createFormView(options: CreateFormViewOptions = {}): FormViewComponent {
  const { Row, Col } = options.layout ?? {}
  // 布局组件
  const LayoutView = createLayoutView({ Row, Col })
  // 表单组件
  const Form = options.form?.component ? markRaw(options.form.component) : undefined
  // 表单项组件
  const FormItem: any = createFormItem(options.item)

  const layoutPropsSpec = options.layout?.props
  
  const formProps = typeof options.form?.props === 'function' ? options.form?.props : () => options.form?.props  

  return defineComponent({
    name: 'FormView',
    inheritAttrs: false,
    setup(_, { slots, attrs, expose }) {
      const formRef = ref<object | null>(null)
      expose(proxyExpose(formRef))

      // Inject once: the ancestor source is both the nested test and this layer's
      // inheritance source.
      const parent = inject(FORM_VIEW_KEY, null)
      const nested = parent != null
      /**
       * Page channels (design.md §5.3): `fl` is the kernel semantic source and
       * `layout` the page window's props. `layout-item:*` and `item:*` are not
       * FormView channels: both stay in default and fall through to the host Form.
       */
      const {
        fl: viewFormlessOptions,
        layout: viewLayoutAttrs,
        default: viewFormAttrs,
      } = useDispatch(attrs as Record<string, unknown>, VIEW_ATTR_CHANNELS)

      // 处理 FormView 的值
      const { value, getIn, setIn } = useFormViewValue()
      
      provide(FORM_FIELD_KEY, {
        access(prop: MaybeRefOrGetter<string>) {
          return {
            value: computed(() => getIn(toValue(prop))),
            update: (v: string) => setIn(toValue(prop), v)
          }
        },
        FormItem: (props, { slots }) => (<FormItem {...{
          ...props,
          fl: {
            ...props.fl,
            item: getAttrBoolean(true, viewFormlessOptions.value.item, props.fl?.item)
          }
          
        }} v-slots={slots} />),
        LayoutView: markRaw(LayoutView),
      } as FormFieldContext)

      return (): VNodeChild => {
        const HostLayoutView = LayoutView as JsxHost
        const layout = getAttrBoolean(false, viewFormlessOptions.value.layout)
        // Factory layout.props(fl) sets LayoutView defaults; tag :layout:* overlays (near wins).
        // `disabled` is kernel-owned: fl:layout flips polarity (design.md §10.1).
        const body = (
          <HostLayoutView
            {...mergeAttrs(resolveProps(layoutPropsSpec, { layout: !!layout }), viewLayoutAttrs.value)}
            disabled={!layout}
            v-slots={{ default: slots.default }}
          />
        )

        if (!Form) return body
        if (!getAttrBoolean(!nested, viewFormlessOptions.value.form)) return body

        const HostForm = Form as JsxHost
        // Factory form.props(fl) sets host defaults; tag host attrs overlay (near wins).
        // The v-model value is a declared prop and its update:modelValue listener
        // is owned by useFormViewModelValue — neither lands on the host Form.
        return (
          <HostForm
            ref={formRef}
            {...mergeAttrs(
              formProps({ modelValue: toValue(value) }) as any,
              omit(viewFormAttrs.value, V_MODEL_PORT_KEYS),
            )}
            v-slots={{ default: () => body }}
          />
        )
      }
    },
  }) as FormViewComponent
}

export type FormViewComponent = DefineComponent<FormViewProps>
