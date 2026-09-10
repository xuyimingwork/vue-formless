import {
  computed,
  defineComponent,
  inject,
  provide,
  type DefineComponent,
  type VNodeChild,
} from 'vue'
import { LayoutCell } from '@vue-formless/layout'
import {
  applyControlBinding,
  bindingForPort,
  resolveControlBinding,
  type ControlProp,
  type ResolvedControlBinding,
} from './control-model'
import { useFormContext } from './context'
import { omitShellKeys } from './fl-config'
import {
  FIELD_RUNTIME_KEY,
  FORM_CELL_PORT_KEY,
  type FieldRuntime,
} from './injection-keys'
import type { FormCellTagProps, ItemFl } from './item-adapter'
import { getIn } from './model-path'
import { overlayProps, resolveProps } from './overlay-props'
import { splitFallthrough, splitSlots, useFormlessProps } from './split-fallthrough'

/** `Component` is a union; JSX needs a constructable host. */
type JsxHost = new () => { $props: Record<string, unknown> }

export type { FieldRuntime } from './injection-keys'

export interface FormCellSlotProps {
  field: Record<string, unknown>
}

/** Kernel keys on `<FormCell>` / `useFormCell()`. Schema extras are prefixed automatically. */
export type FormCellProps = FormCellTagProps & {
  'fl:item'?: boolean
}

export type FormCellComponent = DefineComponent<FormCellProps>

function resolveAdHocBinding(tagFl: Record<string, unknown>): {
  fieldKey: string
  binding: ResolvedControlBinding
} {
  const prop = tagFl.prop
  if (prop === '') {
    throw new Error('[vue-formless] fl:prop cannot be an empty string')
  }
  const fieldKey =
    typeof prop === 'string'
      ? prop
      : Array.isArray(prop) && prop[0]
        ? String(prop[0])
        : ''
  const binding =
    prop === undefined
      ? { models: ['modelValue'] as string[], props: [] as string[] }
      : resolveControlBinding(fieldKey || 'field', {
          prop: prop as ControlProp,
        })
  return { fieldKey, binding }
}

/**
 * One cell: always LayoutCell, optional host Item (ADR-020).
 * Col follows the nearest LayoutView; `fl:item` only toggles ElFormItem.
 */
export const FormCell = defineComponent({
  name: 'FormCell',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const ctx = useFormContext()
    const runtime = inject(FIELD_RUNTIME_KEY, null)
    const port = inject(FORM_CELL_PORT_KEY, null)
    if (port != null && !runtime) {
      throw new Error('[vue-formless] useFormCell(port) must be used inside a namespaced field.')
    }

    const { props, rowProps, colProps, formlessProps } = useFormlessProps(
      attrs as Record<string, unknown>,
    )

    /** page < field (schema/widget) < cell (tag). Near wins; undefined does not write. */
    const fl = computed(() =>
      overlayProps(
        { item: ctx.item },
        runtime
          ? overlayProps(runtime.extras, { item: runtime.item })
          : undefined,
        formlessProps.value,
      ),
    )

    const wiring = computed(() => {
      if (runtime) {
        const binding =
          port != null ? bindingForPort(runtime.binding, port) : runtime.binding
        return { fieldKey: runtime.fieldKey, binding }
      }
      return resolveAdHocBinding(formlessProps.value)
    })

    const itemFl = computed((): ItemFl => {
      const { fieldKey, binding } = wiring.value
      return {
        ...omitShellKeys(fl.value),
        fieldKey,
        binding,
        getValues: () => binding.props.map((p) => getIn(ctx.model, p)),
      }
    })

    const field = computed(() =>
      applyControlBinding(ctx.model, wiring.value.binding, ctx.update),
    )

    const itemOn = computed(() => ctx.Item != null && fl.value.item === true)

    const itemProps = computed(() => {
      const { itemAttrs, itemOn: itemListeners, inputAttrs } = splitFallthrough(props.value)
      return overlayProps(
        resolveProps(ctx.itemProps, itemFl.value),
        { ...itemAttrs, ...inputAttrs },
        itemListeners,
      )
    })

    return (): VNodeChild => {
      if (Object.keys(rowProps.value).length > 0) {
        console.warn('[vue-formless] :row:* is ignored on a leaf cell')
      }
      const { itemSlots } = splitSlots(slots)
      const inner = slots.default?.({ field: field.value }) ?? null
      const HostItem = ctx.Item as JsxHost | undefined
      const body =
        itemOn.value && HostItem ? (
          <HostItem
            {...itemProps.value}
            v-slots={{
              ...itemSlots,
              default: () => inner,
            }}
          />
        ) : (
          inner
        )

      return <LayoutCell {...colProps.value}>{body}</LayoutCell>
    }
  },
}) as FormCellComponent

/**
 * No arg: page-level / wrap cell.
 * Port: slice one v-model mouth inside an embed widget.
 */
export function useFormCell(port?: string): FormCellComponent {
  useFormContext()
  if (port === undefined) return FormCell
  return defineComponent({
    name: `FormCell_${port}`,
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      const runtime = inject(FIELD_RUNTIME_KEY, null)
      if (!runtime) {
        throw new Error(
          '[vue-formless] useFormCell(port) must be used inside a namespaced field.',
        )
      }
      provide(FORM_CELL_PORT_KEY, port)
      return (): VNodeChild => (
        <FormCell
          {...(attrs as Record<string, unknown>)}
          v-slots={{ default: slots.default }}
        />
      )
    },
  }) as FormCellComponent
}
