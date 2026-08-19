import {
  defineComponent,
  inject,
  provide,
  type Component,
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
import { resolveValidatePolicy, type ControlValidation, type ValidatePolicy } from './identity-rules'
import type { FormlessAttr, ItemRenderInput } from './item-adapter'
import { getIn } from './model-path'
import { splitFallthrough, splitSlots } from './split-fallthrough'
import type { WrapControlMeta } from './wrap-control'

/** Frame the namespaced control refreshes each render; `useFormItem` reads it. */
export interface ControlFrame {
  formless: FormlessAttr
  binding: ResolvedControlBinding
  label?: string
  validate: ValidatePolicy
  validation?: ControlValidation
  itemAttrs: Record<string, unknown>
  itemOn: Record<string, unknown>
  itemSlots: WrapControlMeta['itemSlots']
}

export interface ControlRuntime {
  controlKey: string
  /** Schema `item: false` — skip Item on the factory's wrap only. */
  skipOuterItem: boolean
  /** Schema `layout: false` — skip Col on the factory's wrap only. */
  skipOuterLayout: boolean
  getFrame: () => ControlFrame
}

export const controlRuntimeKey: InjectionKey<ControlRuntime> = Symbol(
  'vue-formless.controlRuntime',
)

export function provideControlRuntime(runtime: ControlRuntime): void {
  provide(controlRuntimeKey, runtime)
}

/** Cell props on `FormView.Item` / `useFormItem('start')` — not a `:formless` bag. */
export interface FormViewItemProps {
  label?: string
  span?: number
  /** Anonymous cell only. Control cells take leaf from the port / schema. */
  prop?: ControlProp
  path?: ControlNavPath
  validate?: ValidatePolicy
}

export interface FormViewItemSlotProps {
  /** `applyControlBinding` result (`modelValue` + `onUpdate:modelValue` for a single leaf). */
  field: Record<string, unknown>
}

const formViewItemProps = {
  label: { type: String, default: undefined },
  span: { type: Number, default: undefined },
  prop: { type: [String, Array] as PropType<ControlProp>, default: undefined },
  path: { type: String as PropType<ControlNavPath>, default: undefined },
  validate: { type: String as PropType<ValidatePolicy>, default: undefined },
}

function createFormCellComponent(port?: string): Component {
  return defineComponent({
    name: port ? `FormViewItem_${port}` : 'FormViewItem',
    inheritAttrs: false,
    props: formViewItemProps,
    setup(props, { slots, attrs }) {
      const ctx = useFormContext()
      const runtime = inject(controlRuntimeKey, null)
      if (port != null && !runtime) {
        throw new Error(
          '[vue-formless] useFormItem(port) must be used inside a namespaced control.',
        )
      }
      return (): VNodeChild =>
        renderFormCell(ctx, runtime, port, props, slots, attrs as Record<string, unknown>)
    },
  })
}

/** Page-level anonymous cell. Same wrap as `useFormItem()`. */
export const FormViewItem = createFormCellComponent()

/**
 * One cell: Col? → Item? → default slot.
 * No arg: this control's outer wrap (factory). Port: one v-model mouth inside a composite.
 * FormView `:item="false"` / `:layout="false"` skip that layer; does not throw.
 */
export function useFormItem(port?: string): Component {
  useFormContext()
  if (port === undefined) return FormViewItem
  return createFormCellComponent(port)
}

function renderFormCell(
  ctx: ReturnType<typeof useFormContext>,
  runtime: ControlRuntime | null,
  port: string | undefined,
  props: FormViewItemProps,
  slots: Slots,
  attrs: Record<string, unknown>,
): VNodeChild {
  const { itemAttrs, itemOn, inputAttrs } = splitFallthrough(attrs)
  const hostItemAttrs = { ...itemAttrs, ...inputAttrs }
  const { itemSlots } = splitSlots(slots)

  const outer = port == null && runtime != null
  const snapshotInput = resolveCellSnapshot(ctx, runtime, port, props)
  const field = applyControlBinding(ctx.model, snapshotInput.binding, ctx.update)
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

  return ctx.wrap(inner, {
    span: snapshotInput.span,
    item: outer && runtime?.skipOuterItem ? false : undefined,
    layout: outer && runtime?.skipOuterLayout ? false : undefined,
    snapshot: snapshotInput.snapshot,
    itemAttrs: wrapItemAttrs,
    itemOn: wrapItemOn,
    itemSlots: wrapItemSlots,
  })
}

function resolveCellSnapshot(
  ctx: ReturnType<typeof useFormContext>,
  runtime: ControlRuntime | null,
  port: string | undefined,
  props: FormViewItemProps,
): { snapshot: ItemRenderInput; binding: ResolvedControlBinding; span?: number } {
  if (runtime) {
    const frame = runtime.getFrame()
    const binding =
      port != null ? bindingForPort(frame.binding, port) : frame.binding
    const label = props.label !== undefined ? props.label : port != null ? undefined : frame.label
    const validate = resolveValidatePolicy(
      props.validate !== undefined ? props.validate : frame.validate,
    )
    const span = port != null ? props.span : (props.span ?? frame.formless.span)
    const formless: FormlessAttr = {
      ...frame.formless,
      label,
      span,
      validate,
    }
    return {
      binding,
      span,
      snapshot: {
        controlKey: runtime.controlKey,
        label,
        validation: frame.validation,
        validate,
        binding,
        getValues: () => binding.props.map((p) => getIn(ctx.model, binding.path, p)),
        formless,
      },
    }
  }

  const prop = props.prop
  const controlKey =
    typeof prop === 'string' ? prop : Array.isArray(prop) && prop[0] ? prop[0] : ''
  const binding =
    prop === undefined
      ? { models: ['modelValue'] as string[], props: [] as string[], path: props.path }
      : resolveControlBinding(controlKey || 'field', { prop, path: props.path })
  const validate = resolveValidatePolicy(props.validate)
  const formless: FormlessAttr = {
    label: props.label,
    span: props.span,
    validate,
    prop: props.prop,
    path: props.path,
  }
  return {
    binding,
    span: props.span,
    snapshot: {
      controlKey,
      label: props.label,
      validate,
      binding,
      getValues: () => binding.props.map((p) => getIn(ctx.model, binding.path, p)),
      formless,
    },
  }
}

export function attachFormViewItem<T extends Component>(
  view: T,
): T & { Item: typeof FormViewItem } {
  const attached = view as T & { Item: typeof FormViewItem }
  attached.Item = FormViewItem
  return attached
}
