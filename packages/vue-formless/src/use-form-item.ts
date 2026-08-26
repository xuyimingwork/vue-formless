import {
  defineComponent,
  inject,
  provide,
  type Component,
  type DefineComponent,
  type InjectionKey,
  type PropType,
  type Slots,
  type VNodeChild,
} from 'vue'
import {
  applyControlBinding,
  bindingForPort,
  resolveControlBinding,
  type ControlNavPath,
  type ControlProp,
  type ResolvedControlBinding,
} from './control-model'
import { useFormContext } from './context'
import { declaredFl, omitShellKeys } from './fl-config'
import type { ItemFl } from './item-adapter'
import { getIn } from './model-path'
import { splitFallthrough, splitFlAttrs, splitSlots } from './split-fallthrough'
import type { WrapControlMeta } from './wrap-control'

/** Frame the namespaced control refreshes each render; `useFormItem` reads it. */
export interface ControlFrame {
  /** Extras + span (no `item` / `layout` / `model`). */
  fl: Record<string, unknown>
  binding: ResolvedControlBinding
  skipOuterItem: boolean
  skipOuterLayout: boolean
  itemAttrs: Record<string, unknown>
  itemOn: Record<string, unknown>
  itemSlots: WrapControlMeta['itemSlots']
}

export interface ControlRuntime {
  controlKey: string
  getFrame: () => ControlFrame
}

export const controlRuntimeKey: InjectionKey<ControlRuntime> = Symbol(
  'vue-formless.controlRuntime',
)

export function provideControlRuntime(runtime: ControlRuntime): void {
  provide(controlRuntimeKey, runtime)
}

export interface FormViewItemSlotProps {
  /** `applyControlBinding` result (`modelValue` + `onUpdate:modelValue` for a single leaf). */
  field: Record<string, unknown>
}

/** Kernel `fl:` keys on `FormView.Item` / `useFormItem()`. Adapter extras via module augmentation. */
export interface FormViewItemProps {
  'fl:path'?: string
  'fl:prop'?: string | string[]
  'fl:span'?: number
  'fl:layout'?: boolean
}

const formCellFlProps = {
  'fl:path': { type: String, default: undefined },
  'fl:prop': { type: [String, Array] as PropType<string | string[]>, default: undefined },
  'fl:span': { type: Number, default: undefined },
}

function createFormCellComponent(port?: string): FormViewItemComponent {
  return defineComponent({
    name: port ? `FormViewItem_${port}` : 'FormViewItem',
    inheritAttrs: false,
    props: formCellFlProps,
    setup(props, { slots, attrs }) {
      const ctx = useFormContext()
      const runtime = inject(controlRuntimeKey, null)
      if (port != null && !runtime) {
        throw new Error(
          '[vue-formless] useFormItem(port) must be used inside a namespaced control.',
        )
      }
      return (): VNodeChild =>
        renderFormCell(ctx, runtime, port, slots, attrs as Record<string, unknown>, props)
    },
  }) as FormViewItemComponent
}

export type FormViewItemComponent = DefineComponent<FormViewItemProps>

/** Page-level anonymous cell. Same wrap as `useFormItem()`. */
export const FormViewItem = createFormCellComponent()

/**
 * One cell: Col? → Item? → default slot.
 * No arg: this control's full binding (factory outer wrap).
 * Port: slice one v-model mouth.
 * Outer `item` / `layout` false hide the factory shell; binding stays on the frame.
 */
export function useFormItem(port?: string): FormViewItemComponent {
  useFormContext()
  if (port === undefined) return FormViewItem
  return createFormCellComponent(port)
}

function renderFormCell(
  ctx: ReturnType<typeof useFormContext>,
  runtime: ControlRuntime | null,
  port: string | undefined,
  slots: Slots,
  attrs: Record<string, unknown>,
  props: Record<string, unknown>,
): VNodeChild {
  const { fl: attrFl, rest } = splitFlAttrs(attrs)
  const tagFl = { ...attrFl, ...declaredFl(props) }
  const { itemAttrs, itemOn, inputAttrs } = splitFallthrough(rest)
  const hostItemAttrs = { ...itemAttrs, ...inputAttrs }
  const { itemSlots } = splitSlots(slots)

  const outer = port == null && runtime != null
  const resolved = resolveCellFl(ctx, runtime, port, tagFl)
  const field = applyControlBinding(ctx.model, resolved.binding, ctx.update)
  const inner = slots.default?.({ field }) ?? null

  let wrapItemAttrs = hostItemAttrs
  let wrapItemOn = itemOn
  let wrapItemSlots = itemSlots
  if (outer && runtime) {
    const frame = runtime.getFrame()
    wrapItemAttrs = { ...frame.itemAttrs, ...hostItemAttrs }
    wrapItemOn = { ...frame.itemOn, ...itemOn }
    wrapItemSlots = { ...frame.itemSlots, ...itemSlots }
  }

  const skipItem = outer && runtime ? runtime.getFrame().skipOuterItem : undefined
  const skipCol =
    tagFl.layout === false || (outer && runtime?.getFrame().skipOuterLayout === true)

  return ctx.wrap(inner, {
    span: resolved.span,
    item: skipItem ? false : undefined,
    layout: skipCol ? false : undefined,
    fl: resolved.fl,
    itemAttrs: wrapItemAttrs,
    itemOn: wrapItemOn,
    itemSlots: wrapItemSlots,
  })
}

function resolveCellFl(
  ctx: ReturnType<typeof useFormContext>,
  runtime: ControlRuntime | null,
  port: string | undefined,
  tagFl: Record<string, unknown>,
): { fl: ItemFl; binding: ResolvedControlBinding; span?: number } {
  const tagExtras = omitShellKeys(tagFl)

  if (runtime) {
    const frame = runtime.getFrame()
    const binding =
      port != null ? bindingForPort(frame.binding, port) : frame.binding
    const span =
      typeof tagFl.span === 'number'
        ? tagFl.span
        : port != null
          ? undefined
          : typeof frame.fl.span === 'number'
            ? frame.fl.span
            : undefined
    const fl: ItemFl = {
      ...frame.fl,
      ...tagExtras,
      controlKey: runtime.controlKey,
      binding,
      getValues: () => binding.props.map((p) => getIn(ctx.model, binding.path, p)),
    }
    if (span !== undefined) fl.span = span
    return { binding, span, fl }
  }

  const prop = tagFl.prop
  if (prop === '') {
    throw new Error('[vue-formless] fl:prop cannot be an empty string')
  }
  const path = tagFl.path as string | undefined
  const controlKey =
    typeof prop === 'string'
      ? prop
      : Array.isArray(prop) && prop[0]
        ? String(prop[0])
        : ''
  const binding =
    prop === undefined
      ? { models: ['modelValue'] as string[], props: [] as string[], path }
      : resolveControlBinding(controlKey || 'field', {
          prop: prop as ControlProp,
          path: path as ControlNavPath | undefined,
        })
  const span = typeof tagFl.span === 'number' ? tagFl.span : undefined
  const fl: ItemFl = {
    ...tagExtras,
    controlKey,
    binding,
    getValues: () => binding.props.map((p) => getIn(ctx.model, binding.path, p)),
  }
  if (span !== undefined) fl.span = span
  return { binding, span, fl }
}

export function attachFormViewItem<T extends Component>(
  view: T,
): T & { Item: typeof FormViewItem } {
  const attached = view as T & { Item: typeof FormViewItem }
  attached.Item = FormViewItem
  return attached
}
