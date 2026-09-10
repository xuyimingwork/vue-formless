import { ElCol, ElForm, ElFormItem, ElRow } from 'element-plus'
import {
  createFormView,
  parsePath,
  type ItemFl,
  type ResolvedControlBinding,
} from 'vue-formless'

/**
 * Element-style encoding of a kernel model location into a host Item `prop`.
 * The kernel only deals in `[index]` bracket syntax (`buyers[0].name`); the
 * dotted form (`buyers.0.name`) is ElFormItem's own dialect (ADR-011 §6), so
 * it lives with the adapter, not in vue-formless core.
 */

/** Convert one kernel location to ElFormItem `prop` dot notation. */
function toDotPath(path: string): string {
  return parsePath(path)
    .map((seg) => (seg.type === 'key' ? seg.key : String(seg.index)))
    .join('.')
}

/** One location → dotted host prop; several v-model ports in one cell → field key (ADR-011 §6). */
export function resolveFormItemProp(
  binding: ResolvedControlBinding,
  fieldKey: string,
): string {
  if (binding.props.length === 1) {
    return toDotPath(binding.props[0]!)
  }
  return fieldKey
}

/** Map Item `fl` to ElFormItem props. Host `prop` is this adapter's encoding. */
export function toEpItemProps(fl: ItemFl): Record<string, unknown> {
  return {
    label: fl.label,
    prop: resolveFormItemProp(fl.binding, fl.fieldKey),
  }
}

/** Playground bind: Element Row/Col/Form/Item. Not a published adapter. */
export const FormView = createFormView({
  layout: { Row: ElRow, Col: ElCol, column: 2 },
  form: {
    component: ElForm,
    props: (fl) => ({ model: fl.modelValue }),
  },
  item: { component: ElFormItem, props: toEpItemProps },
})
