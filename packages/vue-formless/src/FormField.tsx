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
import { FORM_FIELD_KEY, FORM_VIEW_KEY } from './injection-keys'
import type { FormFieldTagProps } from './field-schema'
import { FIELD_SLOT_CHANNELS, FIELD_ATTR_CHANNELS, useDispatch } from './use-form-attrs'
import { dispatch } from '@/dispatch'

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

function normalizeProp(prop: unknown): string[] | undefined {
  const props = (Array.isArray(prop) ? prop : [prop]).filter(Boolean)
  return props.length === 0 ? undefined : props
}

export const FormField = defineComponent({
  name: 'FormField',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const viewContext = inject(FORM_VIEW_KEY, null)
    const fieldContext = inject(FORM_FIELD_KEY, null)

    // 当前 attrs
    const { 
      fl: fieldFormlessOptions, 
      layoutItem: fieldLayoutItemAttrs,
      item: fieldItemAttrs,
      layout: fieldLayoutAttrs,
      default: fieldControlAttrs,
    } = useDispatch(attrs as Record<string, unknown>, FIELD_ATTR_CHANNELS)

    // 供 control 使用的 model 永远有默认值
    const model = computed(() => {
      return normalizeModel(fieldFormlessOptions.value.model) 
      || normalizeModel((fieldFormlessOptions.value as any)?.component?.formless?.model)
      || normalizeModel('modelValue')
    })

    // prop 没有默认值
    const prop = computed(() => normalizeProp(fieldFormlessOptions.value.prop))
    const getModelBinding = (model: string, index: number) => {
      if (prop.value) {
        const binding = viewContext?.getModelBinding(prop.value[index])
        if (!binding) return
        return { [model]: binding.value, [`onUpdate:${model}`]: binding.update }
      }
      return fieldContext?.getProp(model)
    } 

    // 依据 model 拿到的 bindings
    const modelBindings = computed<any>(() => {
      return model.value!.reduce((bindings, model, index) => {
        const binding = getModelBinding(model, index)
        if (!binding) return bindings
        bindings[model] = binding
        return bindings
      }, {} as any)
    })

    provide(FORM_FIELD_KEY, {
      getProp(model?: string) {
        if (!model) return
        return modelBindings.value?.[model]
      }
    })

    const controlAttrs = computed(() => {
      const attrs = Object.values(modelBindings.value).reduce((attrs: any, binding: any) => {
        return {
          ...attrs,
          ...binding,
        }
      }, {} as any) as any
      return {
        ...fieldControlAttrs.value,
        ...attrs,
      }
    })

    const item = computed(() => {
      return fieldFormlessOptions.value.item !== false
    })

    const viewItemAttrs = computed(() => {
      if (typeof viewContext?.itemProps === 'function') return viewContext.itemProps(fieldFormlessOptions.value as any)
      return viewContext?.itemProps as any
    })

    return (): VNodeChild => {
      const { item: itemSlots, default: controlSlots } = dispatch(slots, FIELD_SLOT_CHANNELS)
      const fieldMode = normalizeField(fieldFormlessOptions.value.field)

      const Control = fieldFormlessOptions.value.component as unknown as JsxHost | undefined

      const inner: VNodeChild = Control
        ? <Control {...{
          ...controlAttrs.value, 
        }} v-slots={controlSlots} />
        : slots.default?.({ $bindings: controlAttrs.value }) ?? null

      if (fieldMode === 'embed') return inner

      const HostLayoutView = viewContext?.LayoutView as JsxHost
      const fieldBody =
        fieldMode === 'wrap-embed' && HostLayoutView
          ? <HostLayoutView {...fieldLayoutAttrs.value} v-slots={{ default: () => inner }} />
          : inner

      const HostItem = viewContext?.Item as JsxHost | undefined
      const body =
      item.value && HostItem ? (
          <HostItem
            { ...viewItemAttrs.value }
            { ...fieldItemAttrs.value }
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
