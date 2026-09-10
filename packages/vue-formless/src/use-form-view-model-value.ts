import {
  computed,
  inject,
  nextTick,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'
import { FORM_VIEW_KEY, type FormContext } from './injection-keys'
import { setIn } from './model-path'

/** A raw value, a ref, or a computed — anything `toValue` can read. */
export type MaybeRefOrComputed<T> = MaybeRefOrGetter<T>

/**
 * Resolve one FormView layer's write model (ADR-008):
 * - the layer **binds** its own v-model when a model source or an
 *   `onUpdate:modelValue` listener is present — `model` reads the bound
 *   value and `update` merges same-tick path writes immutably (arrays
 *   cloned) then emits one fresh object through the listener;
 * - a nested FormView **without** a binding inherits the ancestor's
 *   `model` / `update` — this layer still builds a local writer but never
 *   calls it, so reads and writes both land on the ancestor;
 * - otherwise (root without `v-model`) it warns; cells still render but
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
  update: FormContext['update']
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
    // Root FormView without v-model: cells still render, but `update` has no
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

export interface ModelUpdate {
  prop: string
  value: unknown
}

/**
 * Coalescing path writer over one model source: never mutates the source.
 * Same-tick updates merge into one emit on nextTick; nested props clone
 * arrays on write. Generic — no notion of FormView layers or the parent
 * chain; owning layers call it, inherited layers forward to an ancestor.
 */
export function createModelWriter(
  getModel: () => unknown,
  emit: (next: unknown) => void,
): { update: (prop: string, value: unknown) => void } {
  let pending: ModelUpdate[] | null = null

  function update(prop: string, value: unknown): void {
    if (!pending) {
      pending = []
      nextTick(() => {
        try {
          // Invariant: non-empty while a flush is scheduled; the guard just
          // keeps a (hypothetical) empty batch from emitting an unchanged model.
          if (!pending?.length) return
          let next = getModel()
          for (const item of pending) {
            next = setIn(next, item.prop, item.value)
          }
          emit(next)
        } catch (error) {
          // A failing flush (bad path, setIn on a mismatched node, ...) must
          // not wedge the writer: reset below so later updates flush again.
          console.error('[vue-formless] flush of coalesced model writes failed:', error)
        } finally {
          pending = null
        }
      })
    }
    pending.push({ prop, value })
  }

  return { update }
}
