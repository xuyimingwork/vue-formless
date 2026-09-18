import {
  computed,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'
import type { FormViewContext } from './injection-keys'
import { bindPathAccess } from './path-access'

/**
 * This layer's v-model port (design.md §14.2): the bound value and the
 * `update:modelValue` listener, each a raw value / ref / getter so the caller
 * passes `() => props.modelValue` and `() => attrs[...]` without wrapping by
 * hand. Either member being present means this layer owns the port.
 */
export interface VModelPort {
  value: MaybeRefOrGetter<unknown>
  update: MaybeRefOrGetter<((next: unknown) => void) | undefined>
}

/**
 * Resolve one FormView layer's model source (design.md §14.2), from two explicit
 * inputs — this layer's own port and the ancestor source:
 * - the layer **binds** its own v-model when the port carries a value or an
 *   update listener: the source reads the bound value and reports writes through
 *   a same-tick coalescing `setIn`;
 * - a nested FormView **without** a port inherits `parent` wholesale — `value`,
 *   `getIn` and `setIn` all forward, so every path stays relative to the ancestor
 *   root and only the owning layer ever emits;
 * - otherwise (root without v-model) it warns; fields still render but updates
 *   are dropped.
 */
export function useFormViewModelValue(
  port: VModelPort,
  parent: FormViewContext | null,
): FormViewContext {
  // The port as one writable source: `get` resolves the bound value, `set`
  // reports a write through `update:modelValue`. Unwrapping the maybe-ref/getter
  // pair lives here only — `setIn` just reads / assigns `bound.value`.
  const bound = computed({
    get: () => toValue(port.value),
    set: (next) => {
      toValue(port.update)?.(next)
    },
  })

  // The owning layer's own path access: `getIn` / `setIn` bound to the live
  // bound value, with `setIn` coalescing same-tick writes into one emit on
  // nextTick (cloning from the *latest* source value). Only this layer calls it.
  const own = bindPathAccess(bound)

  /** `true` when this layer owns the v-model port (bound value or listener). */
  const ownsPort = computed(
    () => toValue(port.value) !== undefined || toValue(port.update) !== undefined,
  )

  if (!ownsPort.value && parent == null) {
    // Root FormView without v-model: fields still render, but `setIn` has no
    // source to own the write and no ancestor to forward to, so it is dropped.
    console.warn(
      '[vue-formless] Root FormView has no v-model and no ancestor FormView; ' +
        'fields render but updates are dropped. Bind v-model or nest it inside another FormView.',
    )
  }

  /** This layer's own value, else the ancestor snapshot. */
  const value: ComputedRef<unknown> = computed(() =>
    ownsPort.value ? bound.value : parent?.value.value,
  )

  /** Reads stay relative to the resolved source root. */
  function getIn(path: string): unknown {
    return ownsPort.value ? own.getIn(path) : parent?.getIn(path)
  }

  function setIn(path: string, next: unknown): void {
    if (ownsPort.value) {
      own.setIn(path, next)
      return
    }
    // Inherited layer: forward straight to the ancestor `setIn` so all nested
    // FormViews on the same tick coalesce at the root.
    parent?.setIn(path, next)
  }

  return { value, getIn, setIn }
}
