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
import { FORM_FIELD_KEY } from './injection-keys'
import type { FieldFactoryInput, FormFieldProps, HostProps, ItemFl } from './field-schema'
import { FIELD_SLOT_CHANNELS, FIELD_ATTR_CHANNELS, useDispatch } from './use-form-attrs'
import { dispatch } from './dispatch'
import { toCamel, upperFirst } from './utils'

/** `Component` is a union; JSX needs a constructable host. */
type JsxHost = new () => { $props: Record<string, unknown> }

export interface FormFieldSlotProps {
  $bindings: Record<string, unknown>
}

export type FormFieldComponent<P = {}> = DefineComponent<FormFieldProps & P>

function normalizeModel(model: unknown): (string | undefined)[] | undefined {
  // undefined 视为用户未配置，其余场景均视为用户已配置
  if (typeof model === 'undefined') return
  // 此处不能过滤数组中的非法值，因为 model 与 prop 按顺序匹配
  return (Array.isArray(model) ? model : [model])
    .map(item => {
      if (typeof item !== 'string') return
      return item
    })
}

function normalizeProp(prop: unknown): (string | undefined)[] | undefined {
  if (typeof prop === 'undefined') return
  return (Array.isArray(prop) ? prop : [prop])
    .map(item => {
      if (typeof item !== 'string') return 
      return item
    })
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
export const FormFieldCore = defineComponent({
  name: 'FormFieldCore',
  inheritAttrs: false,
  props: {
    preset: {
      type: Object as PropType<{
        fl: Record<string, unknown>
        props?: HostProps<ItemFl>
      }>
    },
    fl: { type: Object as PropType<Record<string, unknown>>, required: true },
    layoutItem: { type: Object as PropType<Record<string, unknown>>, required: true },
    layout: { type: Object as PropType<Record<string, unknown>>, required: true },
    item: { type: Object as PropType<Record<string, unknown>>, required: true },
    control: { type: [Object, Function] as PropType<HostProps<ItemFl>>, required: true },
  },
  setup(props, { slots }) {
    // FormField 唯一消费的上行上下文：model 源 + 身份映射 + 壳资源都在这里。
    const context = inject(FORM_FIELD_KEY, null)

    const controlFormless = computed(() => (props.fl?.component as any)?.formless)
    const propFormless = computed(() => ({
      ...props.preset?.fl,
      ...props.fl,
    }))

    // 模型名
    const model = computed(() => {
      return normalizeModel(propFormless.value?.model)
        || normalizeModel(controlFormless.value?.model)
        || ['modelValue']
    })

    // 属性名
    const prop = computed(() => {
      return normalizeProp(propFormless.value?.prop)
        || context?.getProp?.(model.value)
    })

    // 绑定属性
    const bind = computed(() => {
      return Object.assign({}, ...model.value.map((m, i) => {
        if (typeof m !== 'string' || m.trim() === '') return {}
        const p = prop.value?.[i]
        if (typeof p !== 'string' || p.trim() === '') return {}
        const access = context?.access(p)
        if (!access) return {}
        return {
          [toCamel(m)]: access.value.value,
          [`onUpdate:${toCamel(m)}`]: access.update,
        }  
      }))
    })

    // 向下继续提供上下文
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

    // FormField 的渲染方式
    const field = computed<"wrap" | "embed" | "wrap-embed">(() => {
      const inner = controlFormless.value?.field === 'embed' ? 'embed' : 'auto'
      const outer = propFormless.value?.field === 'embed' 
        ? 'embed'
        : propFormless.value?.field === 'wrap-embed'
          ? 'wrap-embed'
          : 'auto'
      // inner 是 auto，外层是 wrap embed wrap-embed 三种情况
      if (inner === 'auto') return outer === 'auto' ? 'wrap' : outer 
      // inner 是 embed，外层只有 embed 和 wrap-embed 两种情况
      return outer === 'auto' ? 'embed' : outer
    })

    const formless = computed(() => {
      return {
        ...propFormless.value,
        model: model.value,
        prop: prop.value,
        field: field.value
      }
    })

    const controlAttrs = computed(() => {
      /**
       * TODO: 
       * 1. createFromControl 里的 prop 函数转换需要在此处处理
       * 2. bind 提供的数据有更高的优先级，需要覆盖；提供的事件需要和传入事件做融合
       */
      const preset = typeof props.preset?.props === 'function' ? props.preset?.props(formless.value as any) : props.preset?.props
      return {
        ...preset,
        ...props.control,
        ...bind.value,
      }
    })

    return (): VNodeChild => {
      const { item: itemSlots, default: controlSlots } = dispatch(slots, FIELD_SLOT_CHANNELS)
      const Control = props.fl.component as unknown as JsxHost | undefined

      const pureControl: VNodeChild = Control
        ? <Control {...controlAttrs.value} v-slots={controlSlots} />
        : slots.default?.({ $bindings: bind.value }) ?? null

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

      return <LayoutItem {...props.layoutItem}>{body}</LayoutItem>
    }
  },
})

/**
 * The public Field tag: one `dispatch`, then buckets. It has no preset, so the
 * tag's `fl:component` / `fl:model` are its own declaration (design.md §7.2);
 * locking those to a schema is the factory shell's job, not this one's.
 */
export function createFormField(options: FieldFactoryInput = {}) {
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
            component: component ?? fl.value.component,
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