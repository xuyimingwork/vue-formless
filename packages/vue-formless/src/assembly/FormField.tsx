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
import type { FieldFactoryInput, FormFieldFormless, FormFieldFormlessRaw, FormFieldProps, HostProps } from '../shared/field-schema'
import { dispatch, FIELD_SLOT_CHANNELS, FIELD_ATTR_CHANNELS, useDispatch } from '../hooks/use-dispatch'
import { getAttrBoolean, toCamel, upperFirst } from '../shared/utils'

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
 *   as the `control` layer, evaluated here against the core's own `FormFieldFormless`.
 *
 * Identity and the `provide` live here and nowhere else; the shell never provides.
 */
export const FormFieldCore = defineComponent({
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

    /**
     * 绑定属性（design.md §14）：按口组装，值和写口监听分开。control 上两者的
     * 合并口径不同——数据键「后者覆盖」，写口监听要和外部监听**融合**（`controlAttrs`），
     * 所以这里就分开交付，不让两类键挤在一袋里被同一套规则处理。
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

    /** `$bindings`（design.md §7.3 / §14）：值和写口拼回一袋，供 default 插槽消费。 */
    const bindings = computed(() => ({ ...bind.value.values, ...bind.value.events }))

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

    /**
     * 宿主 Item 壳开关（design.md §9）：页级 `fl:item` 默认 ← 本格 `fl:item`，近的赢；
     * 裸 attr（`''`）算 `true`，没写跟页，页也没写则 `true`。结果恒为布尔，故
     * control 的 `props` 与 `item.props` 看到的是**同一个归一化值**。
     */
    const item = computed(() =>
      getAttrBoolean(
        true,
        toValue(context?.fl)?.item,
        propFormless.value?.item,
      ),
    )

    const formless = computed(() => {
      return {
        ...propFormless.value,
        model: model.value,
        prop: prop.value,
        field: field.value,
        item: item.value,
      }
    })

    /**
     * control 的最终 props（design.md §16.3）。两层口径：
     *
     * - **外部两层**（schema `props` ← 标签裸名）仍是「覆盖」：同名监听
     *   （`preset.props` 的 `onClick` vs 标签 `@click`）近的赢，先自行合成一层；
     * - `bind` 是 formless 自己的写口：数据键覆盖外部，写口监听（`onUpdate:xxx`）
     *   与外部监听**融合**成数组，两个都触发——`mergeProps` 对 `on*` 的语义，
     *   与 SFC 编译器 `v-model` + `@update:xxx` 用的是同一实现。
     *
     * 参数顺序即融合顺序：`events` 在最前，外部监听追加其后，于是**内部写口先跑、
     * 外部监听随后被通知**（写回本身 batch 到 nextTick，两者都拿到同一个值）；
     * `values` 在最后，数据键照旧覆盖外部。外部先合成一层还顺带保住了
     * `class` / `style` 的覆盖口径：`mergeProps` 会合并这两键，但外部层内已经
     * 覆盖完，而 `bind` 不带它们（它是中间层也无从干扰）。
     */
    const controlAttrs = computed(() => {
      const preset = typeof props.preset?.props === 'function' ? props.preset?.props(formless.value as any) : props.preset?.props
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
            // `fl.value` is the raw tag bucket (`Record<string, unknown>`); schema
            // still wins over the tag's `fl:component` (design.md §11.2).
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