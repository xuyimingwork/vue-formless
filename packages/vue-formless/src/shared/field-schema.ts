import type { Component } from 'vue'
import type { LayoutItemProps, LayoutViewProps } from '@vue-formless/layout'

/** Static host props, or derived from that layer's snapshot. */
export type HostProps<TFl> =
  | Record<string, unknown>
  | ((fl: TFl) => Record<string, unknown> | undefined)

// --- binding domains: declared vs normalized -------------------------------

/**
 * Field binding (design.md §7.1):
 * - `model` — v-model names on the control (identity). Default `'modelValue'`.
 * - `prop`  — location(s) from FormView root (`name`, `buyers[0].name`).
 *
 * `prop` array pairs with `model` (prefix-aligned). Extra model ports are unbound.
 */
export type FormFieldVModelRaw = string | readonly string[]
export type FormFieldPropRaw = string | readonly string[]

/**
 * The **normalized** binding arrays. A port that is not a string stays as an
 * `undefined` placeholder so the `model[i] ↔ prop[i]` alignment survives.
 */
export type FormFieldVModel = (string | undefined)[]
export type FormFieldProp = (string | undefined)[]

/** Static `formless` bag a control may declare on `ComponentCustomOptions`. */
export interface FormControlFormless {
  /** v-model ports on the control (design.md §7.1). */
  model?: FormFieldVModelRaw
  /**
   * Composite marker (design.md §8): "my inner `<FormField>`s need an inner
   * LayoutView whenever this field is boxed". Only `'embed'` is meaningful —
   * it is the control's **nature**, not a placement, so it is read at render
   * (`FormFieldCore`) and folded into `fl:field`, never merged as a preset layer.
   */
  field?: 'embed'
}

declare module 'vue' {
  interface ComponentCustomOptions {
    formless?: FormControlFormless
  }
}

// --- `field` assembly placement (design.md §8) -----------------------------

/**
 * The **written** placement — the three writable values. Omit = `'auto'`: defer
 * to the control's static `formless.field`. A leaf resolves to `'wrap'`, but
 * that value is never writable.
 */
export type FormFieldFormlessFieldRaw = 'auto' | 'embed' | 'wrap-embed'

/** The **assembled** placement. `'auto'` is resolved away, never sent. */
export type FormFieldFormlessField = 'wrap' | 'embed' | 'wrap-embed'

// --- the field declaration -------------------------------------------------

/**
 * The single module-augmentation anchor for field extras (design.md §18), and
 * the extras domain itself: `CreateFormFieldOptions` extends it, and both the
 * `FormFieldFormless` snapshot and the `fl:*` tag props take their extras
 * straight from it. Mirrors Vue's `ComponentCustomOptions`: declare `label` /
 * `validation` here, and they land on the factory input, the snapshot, and the
 * tag props. There is no separate `Omit`-derived "extras" alias — kernel keys
 * live on `CreateFormFieldOptions` only.
 */
export interface FormFieldCustomOptions {}

/**
 * One field's declaration: the input of `createFormField` / each entry of
 * `createFormFields` (design.md §11). It extends the augmentable
 * `FormFieldCustomOptions`, so a consumer's `label` / `validation` joins the
 * same shape and flows into the `FormFieldFormless` snapshot and the `fl:*` tag
 * props.
 *
 * `component` stays `unknown` on purpose: a field table can pass any control
 * and let the tag infer that control's public props.
 */
export interface CreateFormFieldOptions extends FormFieldCustomOptions {
  /**
   * The control only (no host Item). Receives v-model bindings from formless.
   * A control may also declare static `formless: { model, item, field }`.
   */
  component?: unknown
  /** Control defaults: static object, or derived from the field snapshot. */
  props?: HostProps<FormFieldFormless>
  /**
   * v-model names on the control (design.md §7.1). Default `'modelValue'`.
   * Locked with the component; tag cannot override. Prefer control `formless.model`.
   */
  model?: FormFieldVModelRaw
  /**
   * Location(s) from FormView root (design.md §7.1). Default: field key.
   * Overridable via `:fl:prop`. Empty string is illegal.
   * Nested: `buyers[0].name`, `` `buyers[${$index}].name` ``.
   */
  prop?: FormFieldPropRaw
  /**
   * Host Item shell for this field: FormView default, then this, then tag `:fl:item`.
   * Boolean only (design.md §9). Not “skip FormField”.
   */
  item?: boolean
  /**
   * Assembly placement (design.md §8). Omit = `'auto'`.
   * Schema and tag merge by nearest-wins; the control is **not** a merge layer —
   * its static `formless.field` is read at render and folded in (`auto`).
   */
  field?: FormFieldFormlessFieldRaw
  /** Debug-only component name; `createFormFields` injects the table key. */
  name?: string
}

/**
 * The **raw** formless bag of one field: its `fl` values as declared, before
 * `model` / `prop` / `field` are normalized. Same key space as the declaration
 * (kernel keys + adapter extras), plus an index signature — a schema preset or a
 * tag may carry keys the kernel never reads.
 *
 * `name` is factory-only and never enters the bag, so it is omitted here.
 *
 * This is what `FormField`'s / `FormItem`'s `fl` prop and `FormFieldCore`'s
 * `preset.fl` carry; `FormFieldCore` turns it into `FormFieldFormless`.
 */
export interface FormFieldFormlessRaw extends Omit<CreateFormFieldOptions, 'name'> {
  [extra: string]: unknown
}

/**
 * The **normalized** per-field snapshot (design.md §10.1 / §16.3): what
 * `item.props` / field `props` functions receive, and what `FormField` hands
 * down to its host `FormItem`. Not passed as a host component prop.
 *
 * Adapters declare their extras once, on `FormFieldCustomOptions` (module
 * augmentation, design.md §18); `extends FormFieldCustomOptions` pulls them in,
 * so a declared `label` is `fl.label` in the snapshot **and** `:fl:label` on the
 * tag.
 *
 * `model` / `prop` are this field's **normalized** binding arrays — index-aligned
 * (`model[i] ↔ prop[i]`), never empty and `prop` no longer than `model`. The
 * kernel sends no identity **name**: a host Item `prop` is the adapter's own
 * encoding, so an adapter that cannot encode the field simply leaves it unbound.
 *
 * **Only the keys the kernel resolves are declared here** — `model` / `prop` /
 * `field` / `item` — plus the consumer's declared extras, pulled in by
 * `extends FormFieldCustomOptions`. The raw bag's other keys (a raw `component`,
 * an unread `props`) still ride through at runtime, but they are **not** part of
 * this type: the snapshot is a closed shape, so reading an undeclared key is a
 * compile error rather than a silent `unknown`.
 */
export interface FormFieldFormless extends FormFieldCustomOptions {
  /** This field's v-model ports, index-aligned with `prop`. */
  model: FormFieldVModel
  /** This field's locations, index-aligned with `model`; `undefined` when nothing bound them. */
  prop: FormFieldProp | undefined
  /** Assembled placement (design.md §8). `'auto'` is resolved away, never sent. */
  field: FormFieldFormlessField
  /**
   * Host Item shell switch (design.md §9): the nearest FormView's page `fl:item`
   * default ← this cell's `fl:item`, near wins; a bare attr (`''`) counts as
   * `true`. Resolved in one place (`FormFieldCore`), so it is **always a boolean**
   * and every consumer — the adapter `item.props` and the control `props`
   * alike — sees the same value.
   */
  item: boolean
}

// --- tag props -------------------------------------------------------------

/**
 * Any declaration bag → its optional tag props under `Prefix` (`label` →
 * `'fl:label'` under the default prefix). Always optional (override, not
 * required).
 *
 * The prefix is the kernel channel the keys land on: `fl:` for the field
 * declaration, `layout:` / `layout-item:` for the layout package's prop bags.
 * One mapper therefore produces every prefixed tag key space instead of each
 * one being retyped.
 */
export type ToFormlessProps<T, Prefix extends string = 'fl:'> = {
  [K in keyof T as K extends string ? `${Prefix}${K}` : never]+?: T[K]
}

/**
 * Public props of `<FormField>` / `<User.Xxx />`. Kernel `fl:` / `item:` /
 * `layout:` / `layout-item:` keys on `<FormField>` / `<User.Xxx />`.
 * Schema extras are prefixed automatically.
 * `fl:model` declares the v-model ports at the identity root and selects one declared port inside it.
 * `layout:column` is formless density; other `layout:*` (e.g. gutter) stay attrs and fall through to LayoutView → Row.
 *
 * The declaration's own keys are **mapped**, not retyped: every core key has a
 * matching `fl:` tag key (design.md §6), so the tag cannot drift from
 * `CreateFormFieldOptions`. Two keys stay off the tag — `props` (it may be a
 * snapshot function, which cannot ride in an attr: it enters as the first
 * `control` layer instead, §16.3) and `name` (factory-private). `component` is
 * the one key whose *type* changes: the declaration keeps `unknown` so a field
 * table can pass any control, while the tag supplies a real `Component`
 * (ad-hoc field / factory preset, §7.4). Extras need no separate term — they
 * are part of the declaration, so the same mapper prefixes them.
 *
 * The `layout:` / `layout-item:` keys are not retyped either: they are mapped
 * from `@vue-formless/layout`'s own prop bags by the same `ToFormlessProps` —
 * `LayoutViewProps` under `'layout:'` and `LayoutItemProps` under
 * `'layout-item:'` — so density and placement have a single source and cannot
 * drift from the layout package. Nothing is `Omit`-ed: the kernel overrides
 * `layout:disabled` at the page it forwards the bag to (spread first, then
 * `disabled={!fl:layout}`), not by dropping it from the channel.
 */
export type FormFieldProps = ToFormlessProps<
  Omit<CreateFormFieldOptions, 'props' | 'name' | 'component'> & {
    component?: Component
  }
> &
  ToFormlessProps<LayoutViewProps, 'layout:'> &
  ToFormlessProps<LayoutItemProps, 'layout-item:'>

// --- control tag props -----------------------------------------------------
// `FormControlProps` derives from `CreateFormFieldOptions` / `FormFieldVModelRaw`
// above, so it lives here rather than in a module of its own (former
// `control-props.ts`).

/**
 * Public `$props` of a Vue constructor, functional component, or SFC.
 * `never` / omitted controls yield `{}` (`never extends Constructor` is true in TS).
 */
export type ComponentPublicProps<C> = [C] extends [never]
  ? {}
  : [C] extends [undefined]
    ? {}
    : C extends abstract new (...args: any) => { $props: infer P }
      ? P
      : C extends (props: infer P, ...args: any) => unknown
        ? P
        : C extends { $props: infer P }
          ? P
          : {}

/**
 * v-model ports locked on the tag (design.md §7.2 / §17). Schema `model` wins;
 * omitted `model` locks the default `'modelValue'`.
 * Widened `string[]` is not treated as port names (would Omit every string key).
 */
type SchemaModel<Def> = Def extends { model: infer M } ? M : undefined

type ModelPortNames<M> = [M] extends [undefined]
  ? 'modelValue'
  : M extends string
    ? M
    : M extends readonly [infer F extends string, ...infer R]
      ? F | ModelPortNames<R>
      : 'modelValue'

export type LockedVModelKeys<M extends FormFieldVModelRaw | undefined> =
  | ModelPortNames<M>
  | `onUpdate:${ModelPortNames<M>}`

type LockedKeysForDef<Def> = LockedVModelKeys<
  SchemaModel<Def> extends FormFieldVModelRaw | undefined ? SchemaModel<Def> : undefined
>

/** Control props that may appear on `<User.Xxx />` (v-model ports stripped). */
export type FormControlProps<Def> = Def extends { component?: infer C }
  ? [Exclude<C, undefined>] extends [never]
    ? {}
    : Omit<ComponentPublicProps<Exclude<C, undefined>>, LockedKeysForDef<Def>>
  : {}
