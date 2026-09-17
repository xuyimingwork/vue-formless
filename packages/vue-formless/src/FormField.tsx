import {
  computed,
  defineComponent,
  inject,
  provide,
  type DefineComponent,
  type VNodeChild,
} from 'vue'
import { LayoutItem } from '@vue-formless/layout'
import { normalizeField as normalizeField } from './field-mode'
import { FORM_FIELD_KEY } from './injection-keys'
import type { FormFieldTagProps } from './field-schema'
import { FIELD_SLOT_CHANNELS, FIELD_ATTR_CHANNELS, useDispatch } from './use-form-attrs'
import { dispatch } from '@/dispatch'
import { modelBindings } from './control-binding'
import {
  fieldPropBinding,
  resolveDeclaredBinding,
  resolveFieldBinding,
} from './field-identity'
import { readControlFormless } from './control-config'

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

export const FormField = defineComponent({
  name: 'FormField',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    // FormField 唯一消费的上行上下文：model 源 + 身份映射 + 壳资源都在这里。
    const fieldContext = inject(FORM_FIELD_KEY, null)

    const {
      fl: fieldFormlessOptions,
      layoutItem: fieldLayoutItemAttrs,
      item: fieldItemAttrs,
      layout: fieldLayoutAttrs,
      default: fieldControlAttrs,
    } = useDispatch(attrs as Record<string, unknown>, FIELD_ATTR_CHANNELS)

    // ad-hoc 控件：补 component.formless.model（工厂壳已在 schemaToFieldAttrs 烙进 fl:model）。
    const fl = computed(() => ({
      ...fieldFormlessOptions.value,
      model:
        normalizeModel(fieldFormlessOptions.value.model)
        || normalizeModel(readControlFormless(fieldFormlessOptions.value.component).model)
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

    // 裸名给 control，v-model 绑定覆盖同名裸名（§5.2）。
    const controlAttrs = computed(() => ({
      ...fieldControlAttrs.value,
      ...bindings.value,
    }))

    return (): VNodeChild => {
      const { item: itemSlots, default: controlSlots } = dispatch(slots, FIELD_SLOT_CHANNELS)
      const fieldMode = normalizeField(fieldFormlessOptions.value.field)

      const Control = fieldFormlessOptions.value.component as unknown as JsxHost | undefined

      const inner: VNodeChild = Control
        ? <Control {...controlAttrs.value} v-slots={controlSlots} />
        : slots.default?.({ $bindings: bindings.value }) ?? null

      if (fieldMode === 'embed') return inner

      const HostLayoutView = fieldContext?.LayoutView as JsxHost
      const fieldBody =
        fieldMode === 'wrap-embed' && HostLayoutView
          ? <HostLayoutView {...fieldLayoutAttrs.value} v-slots={{ default: () => inner }} />
          : inner

      const HostItem = fieldContext?.FormItem as JsxHost | undefined
      const body =
        HostItem ? (
          <HostItem
            fl={fieldFormlessOptions.value}
            item={fieldItemAttrs.value}
            v-slots={{
              ...itemSlots,
              default: () => fieldBody,
            }}
          />
        ) : (
          fieldBody
        )

      return <LayoutItem {...fieldLayoutItemAttrs.value}>{body}</LayoutItem>
    }
  },
}) as FormFieldComponent
