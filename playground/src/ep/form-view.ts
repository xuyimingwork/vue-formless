import { ElCol, ElForm, ElFormItem, ElRow } from 'element-plus'
import { createFormView, type FormFieldFormless } from 'vue-formless'

/**
 * Kernel `prop` location → ElFormItem `prop` dot notation.
 * The kernel path parser is private, so the adapter encodes its own dotted
 * dialect here (design.md §20.9): `buyers[0].name` → `buyers.0.name`.
 * Locations it cannot encode (quoted keys, malformed paths) return undefined.
 */
function toDotPath(path: string): string | undefined {
  if (!path || path.startsWith('.') || path.endsWith('.')) return undefined
  const dotted = path.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '')
  if (/[[\]]/.test(dotted) || dotted.includes('..')) return undefined
  return dotted
}

/**
 * One location → dotted host prop (design.md §20.9).
 *
 * There is no kernel-supplied name to fall back on, so a field whose location
 * cannot be encoded — several v-model ports in one field (one host Item `prop`
 * cannot hold a pair), or a path this adapter cannot dot-encode — is left
 * **unbound**: `undefined` → ElFormItem never registers, so `Form.validate()` /
 * `resetFields()` skip it and its rules never run (v1 scope). Give such a field
 * its own Item per port (`fl:field="wrap-embed"`) if it must be host-validated.
 */
export function resolveFormItemProp(prop: FormFieldFormless['prop']): string | undefined {
  if (prop == null || prop.length !== 1) return undefined
  const [location] = prop
  return location == null ? undefined : toDotPath(location)
}

/** Map Item `fl` to ElFormItem props. Host `prop` is this adapter's encoding. */
export function toEpItemProps(fl: FormFieldFormless): Record<string, unknown> {
  return {
    label: fl.label,
    prop: resolveFormItemProp(fl.prop),
  }
}

/** Playground bind: Element Row/Col/Form/Item. Not a published adapter. */
export const FormView = createFormView({
  layout: { Row: ElRow, Col: ElCol, props: { column: 2 } },
  form: {
    component: ElForm,
    props: (fl) => ({ model: fl.modelValue }),
  },
  item: { component: ElFormItem, props: toEpItemProps },
})
