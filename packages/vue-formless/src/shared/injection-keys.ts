import type { Component, ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'
import type { FormItemComponent } from '../assembly/create-form-item'

/**
 * `FORM_VIEW_KEY`: only for nested FormViews to inherit (read/write source +
 * the nested test).
 *
 * The three members share one source — all bound to this layer's or an
 * ancestor's v-model: `value` reads the whole value, `getIn` / `setIn` read and
 * write relative to that same root by location, so callers never pass the value
 * again.
 *
 * There is a single write channel: `setIn` forwards all the way to the owner
 * layer's writer, which merges same-tick and emits. A non-owner layer never
 * emits itself — otherwise each layer would rebuild the whole value from its own
 * props snapshot and overwrite one another. `value` is just the parent snapshot,
 * do not mutate it.
 */
export interface FormViewContext {
  /** The source whole value (parent snapshot, do not mutate). Consumer: nested FormView. */
  readonly value: ComputedRef<unknown>
  /** Read at a location relative to the source. */
  getIn(path: string): unknown
  /** Write at a location relative to the source. Ends at the owner layer; emit happens only there. */
  setIn(path: string, value: unknown): void
}

/**
 * FormField's only upstream context, provided jointly by FormView and the
 * FormField identity root:
 * - `access` (model source) + `FormItem` / `LayoutView` (shell resources) come
 *   from FormView;
 * - `getProp` (port → location mapping) comes from the FormField identity root;
 *   its absence is the "truncation".
 */
export interface FormFieldContext {
  /**
   * Port names → their locations (identity mapping, provided by this cell's
   * FormField; absent on an ancestor = does not exist).
   * @param model the ports this field binds, e.g. `['modelValue']`
   */
  getProp?(model: (string | undefined)[]): (string | undefined)[]
  /**
   * Model source: read a value and write it back by location (provided by
   * FormView, passed through unchanged by FormField).
   * @param prop location relative to the FormView root
   */
  access(prop?: MaybeRefOrGetter<string>): { value: ComputedRef, update: (v: unknown) => void }
  /** The assembled host Item (provided by FormView, passed through by the FormField identity root). */
  FormItem?: FormItemComponent
  /** The factory-bound LayoutView (wrap-embed inner window; provided by FormView, passed through). */
  LayoutView?: Component
  /**
   * The nearest FormView's **page-level `fl`** (lazy), holding **only what
   * FormField reads**. Today that is one key, `item`: `fl:layout` / `fl:form` are
   * FormView's own switches, consumed by it and not sent down, so the rest of the
   * page bucket means nothing to FormField.
   *
   * The page `fl:item` ↔ this cell's `fl.item` merge therefore lives in exactly
   * one place, FormFieldCore; the cell's `item` is the normalized boolean.
   *
   * It is not this cell's materialized value: it passes through with `access` /
   * the shell resources, and only FormView answers it — the identity root leaves
   * it alone when rewriting `getProp`, so the inner cells of a composite see the
   * same page default.
   *
   * The value is in **raw attrs form** (a bare `fl:item` is `''`); FormFieldCore
   * hands it to `getAttrBoolean` together with the cell value. The type is
   * written as `boolean` per the existing contract (like
   * `FormViewProps['fl:item']` / `CreateFormFieldOptions.item` /
   * `FormFieldProps['fl:item']`); the all-optional shape also keeps providers
   * from needing to narrow.
   */
  fl?: MaybeRefOrGetter<{ item?: boolean }>
}

export const FORM_VIEW_KEY: InjectionKey<FormViewContext | null> = Symbol(
  'vue-formless:form-view',
)

export const FORM_FIELD_KEY: InjectionKey<FormFieldContext | null> = Symbol(
  'vue-formless:form-field',
)
