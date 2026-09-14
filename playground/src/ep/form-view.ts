import { ElCol, ElForm, ElFormItem, ElRow } from 'element-plus'
import { createFormView, type ItemFl } from 'vue-formless'

/**
 * Kernel `prop` location → ElFormItem `prop` dot notation.
 * The kernel path parser is private, so the adapter encodes its own dotted
 * dialect here (ADR-011 §6): `buyers[0].name` → `buyers.0.name`.
 * Locations it cannot encode (quoted keys, malformed paths) return undefined.
 */
function toDotPath(path: string): string | undefined {
  if (!path || path.startsWith('.') || path.endsWith('.')) return undefined
  const dotted = path.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '')
  if (/[[\]]/.test(dotted) || dotted.includes('..')) return undefined
  return dotted
}

/** One location → dotted host prop; several v-model ports in one cell → field key (ADR-011 §6). */
export function resolveFormItemProp(
  binding: ItemFl['binding'],
  fieldKey: string,
): string {
  if (binding.props.length === 1) {
    return toDotPath(binding.props[0]!) ?? fieldKey
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
