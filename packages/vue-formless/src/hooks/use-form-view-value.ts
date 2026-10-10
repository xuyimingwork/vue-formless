import {
  computed,
  ComputedRef,
  inject,
  provide,
  ref,
  useAttrs,
} from 'vue'
import { FORM_VIEW_KEY, type FormViewContext } from '../shared/injection-keys'
import { bindPathAccess } from '../path/path-access'

// The v-model write port's key and listener names, in both spellings
// (camelCase and DOM-case).
export const PORT_NAMES = ['modelValue', 'model-value'] as const
export const PORT_EVENTS = ['onUpdate:modelValue', 'onUpdate:model-value'] as const

/**
 * Where this layer's value comes from:
 *
 * - `controlled` — attrs carry a v-model key, the value is controlled by the
 *   caller (a controlled component);
 * - `inherit` — no key but there is an ancestor FormView, the value is inherited
 *   (borrowing CSS `inherit`'s meaning);
 * - `local` — neither, the value is held by this layer itself.
 */
export type ValueSource = 'controlled' | 'inherit' | 'local'

/**
 * Recognize the v-model write port's key / listener in `attrs`, and decide this
 * layer's value source from them.
 * @param attrs      the component's attrs
 * @param hasContext whether an ancestor FormView exists
 */
export function useValueMeta(attrs:  Record<string, unknown>, hasContext: boolean): {
  key: ComputedRef<(typeof PORT_NAMES)[number] | undefined>
  event: ComputedRef<(typeof PORT_EVENTS)[number] | undefined>
  source: ComputedRef<ValueSource>
} {
  const key = computed(() => PORT_NAMES.find((name) => name in attrs))
  const event = computed(() => PORT_EVENTS.find((name) => typeof attrs[name] === 'function'))
  const source = computed<ValueSource>(() => key.value ? 'controlled' : hasContext ? 'inherit' : 'local')
  return { 
    key, 
    event, 
    source 
  }
}

/**
 * This layer's v-model read/write context: decide the value source, produce
 * `value` / `getIn` / `setIn`, and provide `FORM_VIEW_KEY` for nested FormViews
 * to inherit.
 */
export function useFormViewValue(): FormViewContext {
  const attrs = useAttrs()

  // The ancestor FormView's value context (a non-reactive object; reactivity
  // lives on its computed members).
  const context = inject(FORM_VIEW_KEY, null)

  const { source, key, event } = useValueMeta(attrs, !!context)

  // The value this layer holds itself under the `local` source.
  const local = ref()

  // The non-inherit whole-value read/write: controlled reads attrs, local reads
  // local; the write updates local and notifies the outside.
  const bound = computed({
    get: () => {
      return source.value === 'controlled' ? attrs[key.value!] : local.value
    },
    set: (v: unknown) => {
      // Controlled skips the local update; under local, internal data updates
      // before the outside is told.
      if (source.value === 'local') local.value = v
      if (event.value) (attrs[event.value] as any)(v)
    }
  })
  
  // Bind the whole-value read/write into a per-location read/write (path-access's
  // bound façade).
  const access = bindPathAccess(bound)

  const value = computed(() => {
    if (source.value === 'inherit') return context!.value.value
    return bound.value
  })
  function getIn(path: string) {
    if (source.value === 'inherit') return context!.getIn(path)
    return access.getIn(path)
  }
  function setIn(path: string, v: unknown) {
    if (source.value === 'inherit') return context!.setIn(path, v)
      return access.setIn(path, v)
  }

  // FormView only carries value-related context, so it is provided together with
  // this hook.
  provide(FORM_VIEW_KEY, {
    value, getIn, setIn
  })

  return { 
    value, getIn, setIn
  }
}
