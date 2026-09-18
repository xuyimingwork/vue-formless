import {
  computed,
  defineComponent,
  inject,
  provide,
  type DefineComponent,
  type PropType,
  type VNodeChild,
} from 'vue'
import { LayoutItem } from '@vue-formless/layout'
import { readControlFormless } from './control-config'
import { resolveFieldMode } from './field-mode'
import { FORM_FIELD_KEY } from './injection-keys'
import type { FormFieldTagProps, ItemFl } from './field-schema'
import { FIELD_SLOT_CHANNELS, FIELD_ATTR_CHANNELS, useDispatch } from './use-form-attrs'
import { dispatch } from '@/dispatch'
import { modelBindings } from './control-binding'
import {
  buildItemFl,
  fieldPropBinding,
  resolveDeclaredBinding,
  resolveFieldBinding,
} from './field-identity'
import { resolveProps, type HostProps } from './props-overlay'

/** `Component` is a union; JSX needs a constructable host. */
type JsxHost = new () => { $props: Record<string, unknown> }

export type { FormFieldTagProps } from './field-schema'

export interface FormFieldSlotProps {
  $bindings: Record<string, unknown>
}

export type FormFieldProps = FormFieldTagProps

export type FormFieldComponent<P = {}> = DefineComponent<FormFieldProps & P>

function normalizeModel(model: unknown): string[] | undefined {
  const models = (Array.isArray(model) ? model : [model]).filter(Boolean)
  return models.length === 0 ? undefined : models
}

/**
 * One Field's runtime assembly — the single implementation, addressed by channel
 * buckets (design.md §16.3). Both call sites reach it the same way: merge each
 * layer's preset **in bucket key space** (prefix already stripped, so nothing has
 * to be spelled back), then hand the buckets over.
 *
 * - `FormField` dispatches the tag's own attrs and passes the buckets straight
 *   through; the public tag declares `fl:component` / `fl:model` itself.
 * - The factory shell presets `fl` (creation-time, static) and passes `schema.props`
 *   as the `control` layer, evaluated here against the core's own `ItemFl`.
 *
 * Identity and the `provide` live here and nowhere else; the shell never provides.
 */
export interface FormFieldCoreProps {
  /** `fl` channel bucket: the merged identity/assembly layer. */
  fl: Record<string, unknown>
  /** `layout-item` channel bucket. */
  layoutItem: Record<string, unknown>
  /** `layout` channel bucket. */
  layout: Record<string, unknown>
  /** `item` channel bucket (host Item shell attrs). */
  item: Record<string, unknown>
  /** control layer: bare names, or derived from the snapshot (factory `schema.props`). */
  control: HostProps<ItemFl>
}

export const FormFieldCore = defineComponent({
  name: 'FormFieldCore',
  inheritAttrs: false,
  props: {
    fl: { type: Object as PropType<Record<string, unknown>>, required: true },
    layoutItem: { type: Object as PropType<Record<string, unknown>>, required: true },
    layout: { type: Object as PropType<Record<string, unknown>>, required: true },
    item: { type: Object as PropType<Record<string, unknown>>, required: true },
    control: { type: [Object, Function] as PropType<HostProps<ItemFl>>, required: true },
  },
  setup(props, { slots }) {
    // FormField 唯一消费的上行上下文：model 源 + 身份映射 + 壳资源都在这里。
    const fieldContext = inject(FORM_FIELD_KEY, null)

    // 控件的静态 bag 只读一次：model 当兜底口列表，field 当组合体标记（§8）。
    const controlFormless = computed(() => readControlFormless(props.fl.component))

    // ad-hoc 控件：补 component.formless.model（工厂壳已在 fl 桶烙进 model）。
    const fl = computed(() => ({
      ...props.fl,
      model:
        normalizeModel(props.fl.model)
        || normalizeModel(controlFormless.value.model)
        || ['modelValue'],
    }))

    const declared = computed(() => resolveDeclaredBinding(fl.value))

    // 统一 accessor：自有 prop 自实现，否则父级；后续（provide 与解析）都只认它。
    const getPropBinding = fieldPropBinding(() => declared.value, fieldContext)

    // FormField 无条件 provide：只叠加 getPropBinding，其余（model 源 + 壳资源）原样透传。
    provide(FORM_FIELD_KEY, {
      getModelBinding: (prop) => fieldContext?.getModelBinding(prop),
      getPropBinding,
      FormItem: fieldContext?.FormItem,
      LayoutView: fieldContext?.LayoutView,
    })

    const binding = computed(() => resolveFieldBinding(declared.value, getPropBinding))
    const bindings = computed(() =>
      modelBindings(binding.value, (prop) => fieldContext?.getModelBinding(prop)),
    )

    /** Field snapshot (design.md §10.1): what `control` / `item.props` functions see. */
    const snapshot = computed(() =>
      buildItemFl(fl.value, binding.value, () =>
        binding.value.props.map((prop) => fieldContext?.getModelBinding(prop)?.value),
      ),
    )

    // 裸名给 control，v-model 绑定覆盖同名裸名（§5.2）。
    const controlAttrs = computed(() => ({
      ...resolveProps(props.control, snapshot.value),
      ...bindings.value,
    }))

    return (): VNodeChild => {
      const { item: itemSlots, default: controlSlots } = dispatch(slots, FIELD_SLOT_CHANNELS)
      // 组装树 = 位置（schema/tag 的 fl:field）× 体（控件的 formless.field），§8。
      const tree = resolveFieldMode(
        props.fl.field,
        controlFormless.value.field === 'embed',
      )

      const Control = props.fl.component as unknown as JsxHost | undefined

      const inner: VNodeChild = Control
        ? <Control {...controlAttrs.value} v-slots={controlSlots} />
        : slots.default?.({ $bindings: bindings.value }) ?? null

      if (tree === 'embed') return inner

      const HostLayoutView = fieldContext?.LayoutView as JsxHost
      const fieldBody =
        tree === 'wrap-embed' && HostLayoutView
          ? <HostLayoutView {...props.layout} v-slots={{ default: () => inner }} />
          : inner

      const HostItem = fieldContext?.FormItem as JsxHost | undefined
      const body =
        HostItem ? (
          <HostItem
            fl={props.fl}
            item={props.item}
            v-slots={{
              ...itemSlots,
              default: () => fieldBody,
            }}
          />
        ) : (
          fieldBody
        )

      return <LayoutItem {...props.layoutItem}>{body}</LayoutItem>
    }
  },
})

/**
 * The public Field tag: one `dispatch`, then buckets. It has no preset, so the
 * tag's `fl:component` / `fl:model` are its own declaration (design.md §7.2);
 * locking those to a schema is the factory shell's job, not this one's.
 */
export const FormField = defineComponent({
  name: 'FormField',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    const { fl, layoutItem, layout, item, default: control } = useDispatch(
      attrs as Record<string, unknown>,
      FIELD_ATTR_CHANNELS,
    )

    return () => (
      <FormFieldCore
        fl={fl.value}
        layoutItem={layoutItem.value}
        layout={layout.value}
        item={item.value}
        control={control.value}
        v-slots={slots}
      />
    )
  },
}) as FormFieldComponent
