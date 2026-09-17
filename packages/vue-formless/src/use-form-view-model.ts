import {
  computed,
  inject,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'
import { FORM_VIEW_KEY, type FormViewContext } from './injection-keys'
import { createModelWriter } from './model-writer'

/** A raw value, a ref, or a computed — anything `toValue` can read. */
export type MaybeRefOrComputed<T> = MaybeRefOrGetter<T>

/**
 * Resolve one FormView layer's write model (design.md §14.2):
 * - the layer **binds** its own v-model when a model source or an
 *   `onUpdate:modelValue` listener is present — `model` reads the bound
 *   value and `update` merges same-tick path writes immutably (arrays
 *   cloned) then emits one fresh object through the listener;
 * - a nested FormView **without** a binding inherits the ancestor's
 *   `model` / `update` — this layer still builds a local writer but never
 *   calls it, so reads and writes both land on the ancestor;
 * - otherwise (root without `v-model`) it warns; fields still render but
 *   updates are dropped.
 *
 * Inputs are `MaybeRefOrComputed` so callers pass props / fallthrough
 * attrs without wrapping by hand, e.g. `() => props.modelValue`.
 */
export function useFormViewModelValue(
  modelValue: MaybeRefOrComputed<unknown>,
  onUpdateModelValue: MaybeRefOrComputed<((next: unknown) => void) | undefined>,
): {
  /** This layer's current model (bound value, else the ancestor snapshot). */
  model: ComputedRef<unknown>
  /** Report a field write; same-tick writes coalesce into one emit. */
  update: FormViewContext['update']
} {
  const listener = computed<((next: unknown) => void) | undefined>(() => {
    const value = toValue(onUpdateModelValue)
    return typeof value === 'function' ? value : undefined
  })

  // Coalescing path writer over the live bound value: flushes on nextTick
  // by cloning from the *latest* props (arrays / nested paths via setIn).
  // Built on every layer; a nested non-owning layer simply never calls it.
  const writer = createModelWriter(
    () => toValue(modelValue),
    (next) => listener.value?.(next),
  )

  /** `true` when this layer owns the v-model port (bound value or listener). */
  const ownsVModel = computed(
    () => toValue(modelValue) !== undefined || listener.value !== undefined,
  )

  // inject() resolves against the instance current at call time, so this
  // must stay in setup scope — `model` / `update` only read it lazily.
  const parent = inject(FORM_VIEW_KEY, null)

  if (!ownsVModel.value && parent == null) {
    // Root FormView without v-model: fields still render, but `update` has no
    // writer to own the write and no ancestor to forward to, so it is dropped.
    console.warn(
      '[vue-formless] Root FormView has no v-model and no ancestor FormView; ' +
        'fields render but updates are dropped. Bind v-model or nest it inside another FormView.',
    )
  }

  const model = computed(() =>
    ownsVModel.value ? toValue(modelValue) : parent?.model,
  )

  function update(prop: string, value: unknown): void {
    if (ownsVModel.value) {
      writer.update(prop, value)
      return
    }
    // Inherited layer: forward straight to the ancestor writer so all
    // nested FormViews on the same tick coalesce at the root.
    parent?.update(prop, value)
  }

  return { model, update }
}
