import { describe, expect, it, vi } from 'vitest'
import {
  computed,
  createSSRApp,
  defineComponent,
  h,
  inject,
  nextTick,
  provide,
  reactive,
  ref,
  type Component,
} from 'vue'
import { renderToString } from 'vue/server-renderer'
import { FORM_VIEW_KEY, type FormViewContext } from './injection-keys'
import { useFormViewValue, useValueMeta } from './use-form-view-value'

/**
 * A layer's value policy has two halves, and they are pinned differently:
 *
 * - `useValueMeta(attrs, hasContext)` — port probing and source judgement. It
 *   only builds `computed`s, so it carries no component dependency and its cases
 *   run without mounting.
 * - `useFormViewValue()` — the setup-only wiring around it (`useAttrs` /
 *   `inject` / `provide`). The vitest environment is `node`, so every case mounts
 *   through SSR — the same harness `create-form-view.test.ts` uses. Its cases are
 *   grouped by source (`controlled` / `inherit` / `local`, decision.md) rather
 *   than by API, because each of `value` / `getIn` / `setIn` resolves the same
 *   three-way branch and the policy — not the branch — is what this file pins down.
 *
 * Path coalescing and cloning themselves are covered by `path-access.test.ts`.
 */

type Attrs = Record<string, unknown>

// ---------------------------------------------------------------------------
// useValueMeta — port probing and source judgement (no mounting)
// ---------------------------------------------------------------------------

describe('useValueMeta', () => {
  describe('the key port', () => {
    it.each(['modelValue', 'model-value'] as const)(
      'should bind %s when attrs carry that spelling',
      (name) => {
        const meta = useValueMeta({ [name]: { name: 'Ada' } }, false)

        expect(meta.key.value).toBe(name)
      },
    )

    it('should count the port as bound when attrs carry modelValue: undefined', () => {
      const meta = useValueMeta({ modelValue: undefined }, false)

      expect(meta.key.value).toBe('modelValue')
    })

    it('should prefer modelValue when both spellings are present', () => {
      const meta = useValueMeta({ modelValue: 'camel', 'model-value': 'hyphen' }, false)

      expect(meta.key.value).toBe('modelValue')
    })

    it('should report no port when the key is not in attrs', () => {
      const meta = useValueMeta({}, false)

      expect(meta.key.value).toBeUndefined()
    })

    it('should drop the port when the key disappears from attrs', () => {
      const attrs = reactive<Attrs>({})
      const meta = useValueMeta(attrs, false)

      attrs.modelValue = { name: 'Ada' }
      expect(meta.key.value).toBe('modelValue')

      delete attrs.modelValue
      expect(meta.key.value).toBeUndefined()
    })
  })

  describe('the event port', () => {
    it.each(['onUpdate:modelValue', 'onUpdate:model-value'] as const)(
      'should bind %s when attrs carry it as a function',
      (name) => {
        const meta = useValueMeta({ [name]: () => {} }, false)

        expect(meta.event.value).toBe(name)
      },
    )

    it('should report no listener when the key is not in attrs', () => {
      const meta = useValueMeta({}, false)

      expect(meta.event.value).toBeUndefined()
    })

    it('should ignore the listener when it is not a function', () => {
      const meta = useValueMeta(
        { modelValue: { name: 'Ada' }, 'onUpdate:modelValue': 'not-a-listener' },
        false,
      )

      expect(meta.event.value).toBeUndefined()
    })

    it('should prefer onUpdate:modelValue when both spellings are functions', () => {
      const meta = useValueMeta(
        { 'onUpdate:modelValue': () => {}, 'onUpdate:model-value': () => {} },
        false,
      )

      expect(meta.event.value).toBe('onUpdate:modelValue')
    })

    it('should pick the listener up when it appears in attrs', () => {
      const attrs = reactive<Attrs>({})
      const meta = useValueMeta(attrs, false)

      expect(meta.event.value).toBeUndefined()

      attrs['onUpdate:modelValue'] = () => {}
      expect(meta.event.value).toBe('onUpdate:modelValue')
    })
  })

  describe('the source', () => {
    it('should stay local when neither a port nor an ancestor is present', () => {
      const meta = useValueMeta({}, false)

      expect(meta.source.value).toBe('local')
    })

    it('should inherit when only an ancestor is present', () => {
      const meta = useValueMeta({}, true)

      expect(meta.source.value).toBe('inherit')
    })

    it('should be controlled when only a port is present', () => {
      const meta = useValueMeta({ modelValue: { name: 'Ada' } }, false)

      expect(meta.source.value).toBe('controlled')
    })

    it('should stay controlled when a port and an ancestor are both present', () => {
      const meta = useValueMeta({ modelValue: { name: 'Ada' } }, true)

      expect(meta.source.value).toBe('controlled')
    })

    it('should stay local when only a listener is present', () => {
      // A listener says what happened in this layer; it never transfers control
      // (decision.md: listening is not a control change).
      const meta = useValueMeta({ 'onUpdate:modelValue': () => {} }, false)

      expect(meta.source.value).toBe('local')
    })

    it('should move to controlled when the port appears and back to local when it disappears', () => {
      const attrs = reactive<Attrs>({})
      const meta = useValueMeta(attrs, false)

      expect(meta.source.value).toBe('local')

      attrs.modelValue = { name: 'Ada' }
      expect(meta.source.value).toBe('controlled')

      delete attrs.modelValue
      expect(meta.source.value).toBe('local')
    })

    it('should fall back to inherit when the port disappears and an ancestor is present', () => {
      // `hasContext` is a snapshot taken at call time, so it keeps answering
      // after the port is gone.
      const attrs = reactive<Attrs>({})
      const meta = useValueMeta(attrs, true)

      expect(meta.source.value).toBe('inherit')

      attrs.modelValue = { name: 'Ada' }
      expect(meta.source.value).toBe('controlled')

      delete attrs.modelValue
      expect(meta.source.value).toBe('inherit')
    })
  })
})

// ---------------------------------------------------------------------------
// useFormViewValue — the setup-only wiring (SSR mount)
// ---------------------------------------------------------------------------

/** What one `useFormViewValue()` call produced, captured during render. */
interface ValueNode {
  /** The composable's return value (`value` / `getIn` / `setIn`). */
  ctx: FormViewContext
  /** What the layer provided downward, read back through `inject`. */
  provided: FormViewContext | null
}

interface ValueSpec {
  attrs?: Attrs
  /** A nested layer rendered below this one (its own `useFormViewValue`). */
  child?: ValueSpec
}

/**
 * Build a tree of real components, each calling `useFormViewValue()` with its
 * own attrs. A sibling consumer per layer reads the provided context back with
 * `inject`, so both the returned and the provided contexts are observable.
 */
function buildValueTree(spec: ValueSpec): { component: Component; nodes: ValueNode[] } {
  const nodes: ValueNode[] = []

  function build(current: ValueSpec): Component {
    const node = {} as ValueNode
    nodes.push(node)

    const Consumer = defineComponent({
      setup() {
        node.provided = inject(FORM_VIEW_KEY) ?? null
        return () => null
      },
    })
    const child = current.child ? build(current.child) : null

    return defineComponent({
      inheritAttrs: false,
      setup() {
        node.ctx = useFormViewValue()
        return () =>
          child ? [h(Consumer), h(child, current.child!.attrs ?? {})] : h(Consumer)
      },
    })
  }

  return { component: build(spec), nodes }
}

/** Render a value tree (optionally below a provided ancestor) and return its nodes. */
async function mountValueTree(
  spec: ValueSpec,
  ancestorContext?: FormViewContext,
): Promise<ValueNode[]> {
  const { component, nodes } = buildValueTree(spec)

  // One wrapper owns the root attrs (the tree itself only passes child attrs)
  // and, when given, supplies the ancestor context the root layer injects.
  const Root = defineComponent({
    setup() {
      if (ancestorContext != null) provide(FORM_VIEW_KEY, ancestorContext)
      return () => h(component, spec.attrs ?? {})
    },
  })

  await renderToString(createSSRApp({ render: () => h(Root) }))
  return nodes
}

/** Mount a single layer and return the context it returned and provided. */
async function mountValue(
  attrs: Attrs = {},
  options: { ancestor?: FormViewContext } = {},
): Promise<ValueNode> {
  const nodes = await mountValueTree({ attrs }, options.ancestor)
  return nodes[0]!
}

/**
 * A stand-in ancestor context: a real writable `value` plus spies for the two
 * path entries, so a child layer's forwarding is directly observable.
 */
function fakeAncestor(initial: unknown) {
  const model = ref<unknown>(initial)
  const getIn = vi.fn((path: string) => {
    const root = model.value
    return root && typeof root === 'object'
      ? (root as Record<string, unknown>)[path]
      : undefined
  })
  const setIn = vi.fn((_path: string, _value: unknown) => {})
  const ctx: FormViewContext = { value: computed(() => model.value), getIn, setIn }
  return { ctx, model, getIn, setIn }
}

describe('useFormViewValue', () => {
  describe('a controlled value', () => {
    it.each(['modelValue', 'model-value'] as const)(
      'should read its own value when %s is bound, without asking the ancestor',
      async (name) => {
        const ancestor = fakeAncestor({ name: 'ancestor' })
        const { ctx } = await mountValue({ [name]: { name: 'Ada' } }, { ancestor: ancestor.ctx })

        expect(ctx.value.value).toEqual({ name: 'Ada' })
        expect(ctx.getIn('name')).toBe('Ada')
        expect(ancestor.getIn).not.toHaveBeenCalled()
      },
    )

    it('should treat modelValue: undefined as its own when the key is present', async () => {
      const ancestor = fakeAncestor({ name: 'ancestor' })
      const { ctx } = await mountValue({ modelValue: undefined }, { ancestor: ancestor.ctx })

      // An inherit source would resolve 'ancestor' here; a controlled source
      // reads its own (undefined) value.
      expect(ctx.getIn('name')).toBeUndefined()
      expect(ancestor.getIn).not.toHaveBeenCalled()
    })

    it('should read a nested path when the bound value holds it', async () => {
      const { ctx } = await mountValue({ modelValue: { buyers: [{ name: 'Ada' }] } })

      expect(ctx.getIn('buyers[0].name')).toBe('Ada')
      expect(ctx.getIn('buyers[0].missing')).toBeUndefined()
    })

    it('should merge same-tick writes into one emit when a listener is bound', async () => {
      const emit = vi.fn()
      const source = { buyers: [{ name: 'Ada', gender: 'f' }] }
      const { ctx } = await mountValue({
        modelValue: source,
        'onUpdate:modelValue': emit,
      })

      ctx.setIn('buyers[0].name', 'Bob')
      ctx.setIn('buyers[0].gender', 'm')
      await nextTick()

      expect(emit).toHaveBeenCalledTimes(1)
      expect(emit.mock.calls[0]![0]).toEqual({ buyers: [{ name: 'Bob', gender: 'm' }] })
      expect(emit.mock.calls[0]![0]).not.toBe(source)
      expect(source).toEqual({ buyers: [{ name: 'Ada', gender: 'f' }] })
    })

    // Both spellings: which one wins is `useValueMeta`'s business, so here only
    // the bound one being called is pinned down.
    it.each(['onUpdate:modelValue', 'onUpdate:model-value'] as const)(
      'should call %s when it is the bound listener',
      async (listener) => {
        const emit = vi.fn()
        const { ctx } = await mountValue({ modelValue: { name: 'Ada' }, [listener]: emit })

        ctx.setIn('name', 'Bob')
        await nextTick()

        expect(emit).toHaveBeenCalledTimes(1)
        expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
      },
    )

    it('should call only modelValue when both listeners are bound', async () => {
      const camel = vi.fn()
      const hyphen = vi.fn()
      const { ctx } = await mountValue({
        modelValue: { name: 'Ada' },
        'onUpdate:modelValue': camel,
        'onUpdate:model-value': hyphen,
      })

      ctx.setIn('name', 'Bob')
      await nextTick()

      expect(camel).toHaveBeenCalledTimes(1)
      expect(hyphen).not.toHaveBeenCalled()
    })

    it('should drop the write when no listener is bound', async () => {
      const source = { name: 'Ada' }
      const { ctx } = await mountValue({ modelValue: source })

      expect(() => ctx.setIn('name', 'Bob')).not.toThrow()
      await nextTick()

      expect(ctx.value.value).toEqual({ name: 'Ada' })
      expect(source).toEqual({ name: 'Ada' })
    })

    it('should drop the write when the bound listener is not a function', async () => {
      const { ctx } = await mountValue({
        modelValue: { name: 'Ada' },
        'onUpdate:modelValue': 'not-a-listener',
      })

      expect(() => ctx.setIn('name', 'Bob')).not.toThrow()
      await nextTick()

      expect(ctx.value.value).toEqual({ name: 'Ada' })
    })

    it('should emit a cloned array when the bound value is an array', async () => {
      const emit = vi.fn()
      const source = [{ name: 'Ada' }]
      const { ctx } = await mountValue({
        modelValue: source,
        'onUpdate:modelValue': emit,
      })

      ctx.setIn('[0].name', 'Bob')
      await nextTick()

      expect(emit).toHaveBeenCalledTimes(1)
      expect(emit.mock.calls[0]![0]).toEqual([{ name: 'Bob' }])
      expect(emit.mock.calls[0]![0]).not.toBe(source)
      expect(source[0]).toEqual({ name: 'Ada' })
    })
  })

  describe('an inherited value', () => {
    it('should mirror the ancestor value when no port is bound', async () => {
      const ancestor = fakeAncestor({ name: 'Ada' })
      const { ctx } = await mountValue({}, { ancestor: ancestor.ctx })

      expect(ctx.value.value).toEqual({ name: 'Ada' })
    })

    it('should follow the ancestor value when it changes', async () => {
      const ancestor = fakeAncestor({ name: 'Ada' })
      const { ctx } = await mountValue({}, { ancestor: ancestor.ctx })

      ancestor.model.value = { name: 'Zed' }

      expect(ctx.value.value).toEqual({ name: 'Zed' })
    })

    it('should hand the path over to the ancestor when reading', async () => {
      const ancestor = fakeAncestor({ name: 'Ada' })
      const { ctx } = await mountValue({}, { ancestor: ancestor.ctx })

      expect(ctx.getIn('name')).toBe('Ada')
      expect(ancestor.getIn).toHaveBeenCalledTimes(1)
      expect(ancestor.getIn).toHaveBeenCalledWith('name')
    })

    it('should forward the write to the ancestor and leave its own listener alone', async () => {
      const ancestor = fakeAncestor({ name: 'Ada' })
      const emit = vi.fn()
      const { ctx } = await mountValue({ 'onUpdate:modelValue': emit }, { ancestor: ancestor.ctx })

      ctx.setIn('name', 'Bob')
      await nextTick()

      expect(ancestor.setIn).toHaveBeenCalledTimes(1)
      expect(ancestor.setIn).toHaveBeenCalledWith('name', 'Bob')
      expect(emit).not.toHaveBeenCalled()
    })
  })

  describe('a local value', () => {
    it('should start undefined when neither a port nor an ancestor is present', async () => {
      const { ctx } = await mountValue()

      expect(ctx.value.value).toBeUndefined()
      expect(ctx.getIn('name')).toBeUndefined()
    })

    it('should land the write in its own value when no ancestor is present', async () => {
      const { ctx } = await mountValue()

      ctx.setIn('name', 'Bob')
      await nextTick()

      expect(ctx.value.value).toEqual({ name: 'Bob' })
      expect(ctx.getIn('name')).toBe('Bob')
    })

    it('should write locally first and emit once when a listener is bound', async () => {
      const emit = vi.fn()
      const { ctx } = await mountValue({ 'onUpdate:modelValue': emit })

      ctx.setIn('name', 'Bob')
      await nextTick()

      // The local value is already updated when the listener runs: internal data
      // is written before the outside is told.
      expect(ctx.value.value).toEqual({ name: 'Bob' })
      expect(emit).toHaveBeenCalledTimes(1)
      expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
    })

    it('should keep the write local and emit nothing when no listener is bound', async () => {
      const { ctx } = await mountValue()

      ctx.setIn('name', 'Bob')
      await nextTick()

      expect(ctx.value.value).toEqual({ name: 'Bob' })
    })

    it('should emit once per tick when writes are split across ticks', async () => {
      const emit = vi.fn()
      const { ctx } = await mountValue({ 'onUpdate:modelValue': emit })

      ctx.setIn('a', 1)
      await nextTick()
      ctx.setIn('b', 2)
      await nextTick()

      expect(emit).toHaveBeenCalledTimes(2)
      expect(emit.mock.calls[0]![0]).toEqual({ a: 1 })
      expect(emit.mock.calls[1]![0]).toEqual({ a: 1, b: 2 })
    })
  })

  describe('provide and nested inheritance', () => {
    it('should provide the same context it returns', async () => {
      const { ctx, provided } = await mountValue({ modelValue: { name: 'Ada' } })

      expect(provided).not.toBeNull()
      expect(provided!.value).toBe(ctx.value)
      expect(provided!.getIn).toBe(ctx.getIn)
      expect(provided!.setIn).toBe(ctx.setIn)
    })

    it('should let a child read the ancestor value when the child binds nothing', async () => {
      const [root, child] = await mountValueTree({
        attrs: { modelValue: { name: 'Ada' } },
        child: { attrs: {} },
      })

      expect(root!.ctx.getIn('name')).toBe('Ada')
      expect(child!.ctx.getIn('name')).toBe('Ada')
    })

    it('should end a child write at the owner when the owner is controlled', async () => {
      const emit = vi.fn()
      const [, child] = await mountValueTree({
        attrs: { modelValue: { name: 'Ada' }, 'onUpdate:modelValue': emit },
        child: { attrs: {} },
      })

      child!.ctx.setIn('name', 'Bob')
      await nextTick()

      expect(emit).toHaveBeenCalledTimes(1)
      expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
    })

    it('should update the owner local value and emit when the owner is local', async () => {
      const emit = vi.fn()
      const [root, child] = await mountValueTree({
        attrs: { 'onUpdate:modelValue': emit },
        child: { attrs: {} },
      })

      child!.ctx.setIn('name', 'Bob')
      await nextTick()

      expect(root!.ctx.value.value).toEqual({ name: 'Bob' })
      expect(emit).toHaveBeenCalledTimes(1)
      expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
    })
  })
})
