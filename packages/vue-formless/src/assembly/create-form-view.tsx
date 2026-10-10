import {
  defineComponent,
  inject,
  markRaw,
  provide,
  ref,
  toValue,
  type Component,
  type DefineComponent,
  type VNodeChild,
  type MaybeRefOrGetter,
  computed,
} from 'vue'
import { createLayoutView, type LayoutViewProps } from '@vue-formless/layout'
import { createFormItem } from './create-form-item'
import { FORM_FIELD_KEY, FORM_VIEW_KEY, type FormFieldContext } from '../shared/injection-keys'
import { useFormViewValue } from '../hooks/use-form-view-value'
import type { FormFieldFormless, HostProps } from '../shared/form-field-types'
import { createExposeProxy, getAttrBoolean, type JsxHost } from '../shared/utils'
import { VIEW_ATTR_CHANNELS, useDispatch } from '../hooks/use-dispatch'

export interface FormViewLayoutBind {
  Row: Component
  Col: Component
  /**
   * Default LayoutView props (density etc.): a static object. Tag `:layout:*`
   * overlays them (nearest wins). `disabled` stays kernel-owned: always the
   * `fl:layout` polarity flip.
   */
  props?: Record<string, unknown>
}

/**
 * Host Item shell. `props` are defaults, static or mapped from the field
 * snapshot (`HostProps<FormFieldFormless>`); `createFormItem` does the
 * projection.
 */
export interface FormViewItemBind {
  component: Component
  props?: HostProps<FormFieldFormless>
}

/**
 * Host Form shell. `props` are **static** defaults: formless has no form-level
 * snapshot to project from — the write model reaches the host as the bare
 * `modelValue` attr (no-prefix rule). A library whose model port is named
 * differently (`ElForm` → `model`) wraps the host in its own component that
 * declares `modelValue` and forwards it (`MyForm`).
 */
export interface FormViewFormBind {
  component: Component
  props?: Record<string, unknown>
}

export interface CreateFormViewOptions {
  /** Row + Col for the hosted grid, plus optional LayoutView props (density etc.). */
  layout?: FormViewLayoutBind
  /** Host form shell. Omit or `:fl:form="false"` skips wrapping. */
  form?: FormViewFormBind
  /** Host item shell. `props` are defaults (static or from the field snapshot). */
  item?: FormViewItemBind
}

/** FormView `:fl:layout` is a boolean switch. Density is factory `layout.props` / `:layout:*`. */
export type FormViewLayoutProp = boolean

export type FormViewFormProp = boolean | 'auto'

export interface FormViewProps {
  /**
   * FormView write model (the DTO). It is **not** a declared prop: the bare key
   * stays in `attrs` and, per the no-prefix rule, also reaches the host Form — a
   * host that wants it declares `modelValue` itself (wrap ElForm in a `MyForm`).
   * The `onUpdate:modelValue` listener is read here (`useFormViewValue`) and also
   * rides through to the host Form.
   */
  modelValue?: unknown
  /**
   * Grid hosting switch. Default `false`.
   * Density: factory `layout.props` plus `:layout:*` for **this** page LayoutView
   * only. A wrap-embed inner LayoutView inherits neither. Other `:layout:*` fall
   * through to the host Row.
   */
  'fl:layout'?: FormViewLayoutProp
  'layout:column'?: LayoutViewProps['column']
  /**
   * Wrap the factory `form`. Default `'auto'`: on at the root, off when nested.
   * Explicit `true` / `false` win.
   */
  'fl:form'?: FormViewFormProp
  /** Wrap the factory `item` per field (default `true` when `item.component` is bound). */
  'fl:item'?: boolean
}

/**
 * Bind host layout / form / item once; returns a FormView.
 *
 * Host shells stay in this closure. Ad-hoc fields use `FormField`.
 *
 * @example
 * ```ts
 * export const FormView = createFormView({
 *   layout: { Row: ElRow, Col: ElCol, props: { column: 2 } },
 *   form: { component: MyForm }, // MyForm declares `modelValue` → ElForm `model`
 *   item: { component: ElFormItem, props: toEpItemProps },
 * })
 * ```
 */
export function createFormView(options: CreateFormViewOptions = {}): FormViewComponent {
  const { Row, Col } = options.layout ?? {}
  const LayoutView = createLayoutView({ Row, Col })
  const Form = options.form?.component ? markRaw(options.form.component) : undefined
  const FormItem = createFormItem(options.item)

  return defineComponent({
    name: 'FormView',
    inheritAttrs: false,
    setup(_, { slots, attrs, expose }) {
      const formRef = ref<object | null>(null)
      expose(createExposeProxy(formRef))

      // Inject once: the ancestor source is both the nested test and this
      // layer's inheritance source.
      const parent = inject(FORM_VIEW_KEY, null)
      const nested = parent != null
      /**
       * Page channels: `fl` is the kernel semantic source and `layout` the page
       * window's props. `layout-item:*` and `item:*` are not FormView channels:
       * both stay in default and fall through to the host Form.
       */
      const {
        fl: viewFormlessOptions,
        layout: viewLayoutAttrs,
        default: viewFormAttrs,
      } = useDispatch(attrs as Record<string, unknown>, VIEW_ATTR_CHANNELS)

      /**
       * Page shell switches, resolved once. `fl:layout` is a plain boolean attr.
       * `fl:form` is a three-way switch, not a Vue boolean attr, so it cannot
       * ride `getAttrBoolean`: `'auto'` (and absent) defer to nesting — the root
       * wraps, a nested FormView does not — while an explicit value wins; a bare
       * `fl:form` arrives as `''` and counts as `true`.
       */
      const layout = computed(() => getAttrBoolean(false, viewFormlessOptions.value.layout))
      const form = computed(() => {
        const value = viewFormlessOptions.value.form
        if (value === undefined || value === 'auto') return !nested
        if (value === '') return true
        return !!value
      })

      const { getIn, setIn } = useFormViewValue()

      provide(FORM_FIELD_KEY, {
        access(prop: MaybeRefOrGetter<string>) {
          return {
            value: computed(() => getIn(toValue(prop))),
            update: (v: string) => setIn(toValue(prop), v)
          }
        },
        // Shell resources given outright: the page-level `fl:item` default is
        // instead read by FormFieldCore from the `fl` bucket, so nothing wraps
        // `item` here.
        FormItem: markRaw(FormItem),
        LayoutView: markRaw(LayoutView),
        // Page `fl` bucket: FormFieldCore's only source of page defaults.
        // `layout` / `form` are the page's own switches (consumed above);
        // FormField only reads `item`, so the contract is `{ item?: boolean }`.
        fl: viewFormlessOptions,
      } as FormFieldContext)

      return (): VNodeChild => {
        const HostLayoutView = LayoutView as JsxHost
        // Factory layout.props sets LayoutView defaults; tag :layout:* overlays
        // (nearest wins). `disabled` is kernel-owned: fl:layout flips polarity.
        const body = (
          <HostLayoutView
            {...{ ...options.layout?.props, ...viewLayoutAttrs.value }}
            disabled={!layout.value}
            v-slots={{ default: slots.default }}
          />
        )

        if (!Form) return body
        if (!form.value) return body

        const HostForm = Form as JsxHost
        // Factory form.props sets host defaults; tag host attrs overlay (nearest
        // wins). The bare `modelValue` stays in the default bucket and reaches
        // the host (no-prefix rule); its listener rides along too, on purpose.
        return (
          <HostForm
            ref={formRef}
            {...{ ...options.form?.props, ...viewFormAttrs.value }}
            v-slots={{ default: () => body }}
          />
        )
      }
    },
  }) as FormViewComponent
}

export type FormViewComponent = DefineComponent<FormViewProps>
