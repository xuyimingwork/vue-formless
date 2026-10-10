import {
  computed,
  defineComponent,
  inject,
  mergeProps,
  provide,
  toValue,
  type Component,
  type DefineComponent,
  type PropType,
  type VNodeChild,
} from 'vue'
import { LayoutItem } from '@vue-formless/layout'
import { FORM_FIELD_KEY } from '../shared/injection-keys'
import type {
  CreateFormFieldOptions,
  FormFieldFormless,
  FormFieldFormlessField,
  FormFieldFormlessRaw,
  FormFieldProps,
  HostProps,
} from '../shared/form-field-types'
import { dispatch, FIELD_SLOT_CHANNELS, FIELD_ATTR_CHANNELS, useDispatch } from '../hooks/use-dispatch'
import { getAttrBoolean, toCamel, upperFirst, type JsxHost } from '../shared/utils'

export interface FormFieldSlotProps {
  $bindings: Record<string, unknown>
}

export type FormFieldComponent<P = {}> = DefineComponent<FormFieldProps & P>

/**
 * Normalize a declared port name / location into an array (the one primitive
 * behind `normalizeModel` / `normalizeProp`). `undefined` means "not configured",
 * anything else means "configured". Non-string array entries are **kept** as
 * `undefined` placeholders — `model[i] ↔ prop[i]` is aligned by index, so
 * filtering would shift them.
 */
function normalizeModelOrProp(value: unknown): (string | undefined)[] | undefined {
  if (typeof value === 'undefined') return
  return (Array.isArray(value) ? value : [value])
    .map(item => {
      if (typeof item !== 'string') return
      return item
    })
}

/**
 * One field's runtime assembly — the single implementation, addressed by channel
 * buckets. Both call sites reach it the same way: merge each layer's preset
 * **in bucket key space** (prefix already stripped, so nothing has to be spelled
 * back), then hand the buckets over.
 *
 * - `FormField` dispatches the tag's own attrs and passes the buckets straight
 *   through; the public tag declares `fl:component` / `fl:model` itself.
 * - The factory shell presets `fl` (creation-time, static) and passes
 *   `schema.props` as the `control` layer, evaluated here against the core's own
 *   `FormFieldFormless`.
 *
 * Identity and the `provide` live here and nowhere else; the shell never provides.
 */
const FormFieldCore = defineComponent({
  name: 'FormFieldCore',
  inheritAttrs: false,
  props: {
    preset: {
      type: Object as PropType<{
        fl: FormFieldFormlessRaw
        props?: HostProps<FormFieldFormless>
      }>
    },
    fl: { type: Object as PropType<FormFieldFormlessRaw>, required: true },
    layoutItem: { type: Object as PropType<Record<string, unknown>>, required: true },
    layout: { type: Object as PropType<Record<string, unknown>>, required: true },
    item: { type: Object as PropType<Record<string, unknown>>, required: true },
    control: { type: [Object, Function] as PropType<HostProps<FormFieldFormless>>, required: true },
  },
  setup(props, { slots }) {
    // FormField's only upstream context: model source + identity mapping + shell
    // resources all live here.
    const context = inject(FORM_FIELD_KEY, null)

    const controlFormless = computed(() => (props.fl?.component as any)?.formless)
    const propFormless = computed(() => ({
      ...props.preset?.fl,
      ...props.fl,
    }))

    // Port names: tag fl:model > schema.model > control static formless.model >
    // ['modelValue'].
    const model = computed(() => {
      return normalizeModelOrProp(propFormless.value?.model)
        || normalizeModelOrProp(controlFormless.value?.model)
        || ['modelValue']
    })

    // Locations: own fl:prop first; only when absent, resolve per port from the
    // ancestor getProp(model).
    const prop = computed(() => {
      return normalizeModelOrProp(propFormless.value?.prop)
        || context?.getProp?.(model.value)
    })

    /**
     * Per-port bindings: assembled with value keys and write listeners delivered
     * separately. Their merge semantics on the control differ — data keys are
     * "last one wins", write listeners must **fuse** with external listeners
     * (`controlAttrs`) — so they are split here rather than packed into one bag
     * and run through one rule.
     */
    const bind = computed(() => {
      const values: Record<string, unknown> = {}
      const events: Record<string, unknown> = {}
      model.value.forEach((m, i) => {
        if (typeof m !== 'string' || m.trim() === '') return
        const p = prop.value?.[i]
        if (typeof p !== 'string' || p.trim() === '') return
        const access = context?.access(p)
        if (!access) return
        const port = toCamel(m)
        values[port] = access.value.value
        events[`onUpdate:${port}`] = access.update
      })
      return { values, events }
    })

    /** `$bindings`: values and write listeners joined back into one bag for the default slot. */
    const bindings = computed(() => ({ ...bind.value.values, ...bind.value.events }))

    // Provide unconditionally: getProp is rewritten per cell; the rest (access /
    // shell resources / page fl) is passed through.
    provide(FORM_FIELD_KEY, {
      ...(context as any),
      getProp(m: (string | undefined)[]) {
        return m.map(m => {
          if (typeof m !== 'string') return
          const i = model.value.indexOf(m)
          return i !== -1 ? prop.value?.[i] : undefined
        })
      }
    })

    // Assembly placement: the inner nature (control static formless.field) is
    // combined with the outer placement (fl:field).
    const field = computed<FormFieldFormlessField>(() => {
      const inner = controlFormless.value?.field === 'embed' ? 'embed' : 'auto'
      const outer = propFormless.value?.field === 'embed' 
        ? 'embed'
        : propFormless.value?.field === 'wrap-embed'
          ? 'wrap-embed'
          : 'auto'
      // Inner auto: outer takes auto / embed / wrap-embed (auto falls back to wrap).
      if (inner === 'auto') return outer === 'auto' ? 'wrap' : outer 
      // Inner embed: outer only has embed and wrap-embed (auto falls back to embed).
      return outer === 'auto' ? 'embed' : outer
    })

    /**
     * Host Item shell switch: page-level `fl:item` default ← this cell's
     * `fl:item`, nearest wins; a bare attr (`''`) counts as `true`, absent defers
     * to the page, and no page either means `true`. Always a boolean, so the
     * control's `props` and `item.props` see the **same normalized value**.
     */
    const item = computed(() =>
      getAttrBoolean(
        true,
        toValue(context?.fl)?.item,
        propFormless.value?.item,
      ),
    )

    const formless = computed<FormFieldFormless>(() => {
      return {
        ...propFormless.value,
        model: model.value,
        prop: prop.value,
        field: field.value,
        item: item.value,
      }
    })

    /**
     * The control's final props. Two layers of semantics:
     *
     * - **The outer two layers** (schema `props` ← tag bare names) still
     *   "override": a same-named listener (`preset.props`'s `onClick` vs the tag's
     *   `@click`) — nearest wins, composed into one layer first;
     * - `bind` is formless's own write port: data keys override the outside,
     *   write listeners (`onUpdate:xxx`) **fuse** with external listeners into an
     *   array, both firing — `mergeProps`'s `on*` semantics, the same
     *   implementation the SFC compiler uses for `v-model` + `@update:xxx`.
     *
     * Argument order is the fusion order: `events` first, external listeners
     * appended after, so the **internal write runs first, the external listener
     * is then notified** (the write-back itself batches to nextTick; both see the
     * same value); `values` last, data keys overriding the outside as usual.
     * Composing the outside into one layer also preserves the `class` / `style`
     * override semantics: `mergeProps` merges those two keys, but the outside
     * layer has already overridden within itself, and `bind` carries neither (it
     * is a middle layer, so it cannot interfere).
     */
    const controlAttrs = computed(() => {
      const preset = typeof props.preset?.props === 'function' ? props.preset?.props(formless.value) : props.preset?.props
      return mergeProps(
        bind.value.events,
        { ...preset, ...props.control },
        bind.value.values,
      )
    })

    return (): VNodeChild => {
      const { item: itemSlots, default: controlSlots } = dispatch(slots, FIELD_SLOT_CHANNELS)
      const Control = props.fl.component as unknown as JsxHost | undefined

      const pureControl: VNodeChild = Control
        ? <Control {...controlAttrs.value} v-slots={controlSlots} />
        : slots.default?.({ $bindings: bindings.value }) ?? null

      if (field.value === 'embed') return pureControl

      const LayoutView = context?.LayoutView as JsxHost | undefined

      const control = field.value === 'wrap-embed' && LayoutView
        ? <LayoutView {...props.layout} v-slots={{ default: () => pureControl }} />
        : pureControl
      
      const FormItem = context?.FormItem as JsxHost | undefined
      const body = FormItem ? <FormItem 
        fl={formless.value}
        item={props.item} v-slots={{ 
        ...itemSlots,
        default: () => control,
      }} /> : control

      /* v8 ignore next -- v8 emits a phantom join block for the `FormItem ? … : …` ternary here */
      return <LayoutItem {...props.layoutItem}>{body}</LayoutItem>
    }
  },
})

/**
 * The public field tag: one `dispatch`, then buckets. It has no preset, so the
 * tag's `fl:component` / `fl:model` are its own declaration; locking those to a
 * schema is the factory shell's job, not this one's.
 */
export function createFormField(options: CreateFormFieldOptions = {}) {
  const { name, component, props, ...preset } = options

  return defineComponent({
    name: name ? `FormField${upperFirst(name)}` : 'FormField',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const { fl, layoutItem, layout, item, default: control } = useDispatch(
        attrs as Record<string, unknown>,
        FIELD_ATTR_CHANNELS,
      )
  
      return () => (
        <FormFieldCore
          preset={{
            fl: preset,
            props
          }}
          fl={{
            ...fl.value,
            // `fl.value` is the raw tag bucket (`Record<string, unknown>`); schema
            // still wins over the tag's `fl:component`.
            component: (component ?? fl.value.component) as Component | undefined,
          }}
          layoutItem={layoutItem.value}
          layout={layout.value}
          item={item.value}
          control={control.value}
          v-slots={slots}
        />
      )
    },
  }) as FormFieldComponent
}

export const FormField = createFormField()
