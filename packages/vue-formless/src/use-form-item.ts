import {
  defineComponent,
  h,
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
  type ControlProp,
  type ResolvedControlBinding,
} from './control-model'
import { useFormContext } from './context'
import { useLayoutItem, type ColPlace, type ColSpanRaw } from '@vue-formless/layout'
import { declaredFl, omitShellKeys } from './fl-config'
import type { FormViewItemProps, ItemFl } from './item-adapter'
import { getIn } from './model-path'
import { splitFallthrough, splitFlAttrs, splitLayoutAttrs, splitSlots } from './split-fallthrough'
import type { WrapControlMeta } from './wrap-control'

/** Frame the namespaced control refreshes each render; `useFormItem` reads it. */
export interface ControlFrame {
  /** Extras (no `item` / `layout` / `model` / leftover `span`). */
  fl: Record<string, unknown>
  binding: ResolvedControlBinding
  wrapItem: boolean
  wrapCol: boolean
  extraRow: boolean
  colSpan?: ColSpanRaw
  colPlace?: ColPlace
  rowColumn?: number
  rowGutter?: number
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

export type { FormViewItemProps } from './item-adapter'

const formCellFlProps = {
  'fl:prop': { type: [String, Array] as PropType<string | string[]>, default: undefined },
  'col:span': { type: [String, Number] as PropType<ColSpanRaw>, default: undefined },
  'col:place': { type: String as PropType<ColPlace>, default: undefined },
}

function createFormCellComponent(port?: string): FormViewItemComponent {
  return defineComponent({
    name: port ? `FormViewItem_${port}` : 'FormViewItem',
    inheritAttrs: false,
    props: formCellFlProps,
    setup(props, { slots, attrs }) {
      const ctx = useFormContext()
      const LayoutItem = useLayoutItem()
      const runtime = inject(controlRuntimeKey, null)
      if (port != null && !runtime) {
        throw new Error(
          '[vue-formless] useFormItem(port) must be used inside a namespaced control.',
        )
      }
      return (): VNodeChild =>
        renderFormCell(
          ctx,
          LayoutItem,
          runtime,
          port,
          slots,
          attrs as Record<string, unknown>,
          props,
        )
    },
  }) as FormViewItemComponent
}

export type FormViewItemComponent = DefineComponent<FormViewItemProps>

/** Page-level anonymous cell. Same wrap as `useFormItem()`. */
export const FormViewItem = createFormCellComponent()

/**
 * One cell: LayoutItem? → Item? → (inner LayoutView?) → default slot.
 * No arg: this control's full binding (factory outer wrap).
 * Port: slice one v-model mouth.
 * Outer wrap follows the merged shell (ADR-017); binding stays on the frame.
 */
export function useFormItem(port?: string): FormViewItemComponent {
  useFormContext()
  if (port === undefined) return FormViewItem
  return createFormCellComponent(port)
}

function renderFormCell(
  ctx: ReturnType<typeof useFormContext>,
  LayoutItem: Component,
  runtime: ControlRuntime | null,
  port: string | undefined,
  slots: Slots,
  attrs: Record<string, unknown>,
  props: Record<string, unknown>,
): VNodeChild {
  const { fl: attrFl, rest: afterFl } = splitFlAttrs(attrs)
  const { row: attrRow, col: attrCol, rest } = splitLayoutAttrs(afterFl)
  const tagFl = { ...attrFl, ...declaredFl(props) }
  const { itemAttrs, itemOn, inputAttrs } = splitFallthrough(rest)
  const hostItemAttrs = { ...itemAttrs, ...inputAttrs }
  const { itemSlots } = splitSlots(slots)

  const outer = port == null && runtime != null
  const tagSpan = (props['col:span'] ?? attrCol.span) as ColSpanRaw | undefined
  const tagPlace = (props['col:place'] ?? attrCol.place) as ColPlace | undefined
  const frame = runtime?.getFrame()
  const spanSpec = tagSpan ?? (outer ? frame?.colSpan : undefined)
  const place = tagPlace ?? (outer ? frame?.colPlace : undefined)

  const resolved = resolveCellFl(ctx, runtime, port, tagFl)
  const field = applyControlBinding(ctx.model, resolved.binding, ctx.update)
  const inner = slots.default?.({ field }) ?? null

  if (!outer && (attrRow.column != null || attrRow.gutter != null)) {
    console.warn('[vue-formless] :row:* is ignored on a leaf cell')
  }

  let wrapItemAttrs = hostItemAttrs
  let wrapItemOn = itemOn
  let wrapItemSlots = itemSlots
  if (outer && frame) {
    wrapItemAttrs = { ...frame.itemAttrs, ...hostItemAttrs }
    wrapItemOn = { ...frame.itemOn, ...itemOn }
    wrapItemSlots = { ...frame.itemSlots, ...itemSlots }
  }

  let wrapItem: boolean | undefined
  let wrapCol: boolean | undefined
  let extraRow = false
  if (outer && frame) {
    wrapItem = frame.wrapItem
    wrapCol = frame.wrapCol
    extraRow = frame.extraRow
  }

  let node: VNodeChild = inner
  if (extraRow && frame) {
    const extraBody = node
    node = h(
      ctx.LayoutView,
      {
        disabled: !ctx.isLayoutEnabled(),
        column: frame.rowColumn ?? ctx.factoryColumn,
        gutter: frame.rowGutter ?? ctx.factoryGutter,
      },
      () => extraBody,
    )
  }

  node = ctx.wrap(node, {
    item: wrapItem === false ? false : wrapItem === true ? true : undefined,
    fl: resolved.fl,
    itemAttrs: wrapItemAttrs,
    itemOn: wrapItemOn,
    itemSlots: wrapItemSlots,
  })

  if (wrapCol !== false) {
    const withItem = node
    node = h(LayoutItem, { span: spanSpec, place }, () => withItem)
  }

  return node
}

function resolveCellFl(
  ctx: ReturnType<typeof useFormContext>,
  runtime: ControlRuntime | null,
  port: string | undefined,
  tagFl: Record<string, unknown>,
): { fl: ItemFl; binding: ResolvedControlBinding } {
  const tagExtras = omitShellKeys(tagFl)

  if (runtime) {
    const frame = runtime.getFrame()
    const binding =
      port != null ? bindingForPort(frame.binding, port) : frame.binding
    const fl: ItemFl = {
      ...frame.fl,
      ...tagExtras,
      controlKey: runtime.controlKey,
      binding,
      getValues: () => binding.props.map((p) => getIn(ctx.model, p)),
    }
    return { binding, fl }
  }

  const prop = tagFl.prop
  if (prop === '') {
    throw new Error('[vue-formless] fl:prop cannot be an empty string')
  }
  const controlKey =
    typeof prop === 'string'
      ? prop
      : Array.isArray(prop) && prop[0]
        ? String(prop[0])
        : ''
  const binding =
    prop === undefined
      ? { models: ['modelValue'] as string[], props: [] as string[] }
      : resolveControlBinding(controlKey || 'field', {
          prop: prop as ControlProp,
        })
  const fl: ItemFl = {
    ...tagExtras,
    controlKey,
    binding,
    getValues: () => binding.props.map((p) => getIn(ctx.model, p)),
  }
  return { binding, fl }
}

export function attachFormViewItem<T extends Component>(
  view: T,
): T & { Item: typeof FormViewItem } {
  const attached = view as T & { Item: typeof FormViewItem }
  attached.Item = FormViewItem
  return attached
}
