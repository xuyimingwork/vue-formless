import { describe, expect, it, vi } from 'vitest'
import {
  computed,
  createSSRApp,
  defineComponent,
  h,
  inject,
  nextTick,
  provide,
  ref,
  type Component,
} from 'vue'
import { renderToString } from 'vue/server-renderer'
import { FORM_VIEW_KEY, type FormViewContext } from './injection-keys'
import { useFormViewValue } from './use-form-view-value'

/**
 * `useFormViewValue` only runs inside a component setup (`useAttrs` / `inject` /
 * `provide`) and the vitest environment is `node`, so every case mounts through
 * SSR — the same harness `create-form-view.test.ts` uses. Path coalescing and
 * cloning themselves are covered by `path-access.test.ts`; this file pins down
 * the layer policy: which source a layer owns, and who ends up emitting.
 */

type Attrs = Record<string, unknown>

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
  parentContext?: FormViewContext,
): Promise<ValueNode[]> {
  const { component, nodes } = buildValueTree(spec)

  // One wrapper owns the root attrs (the tree itself only passes child attrs)
  // and, when given, supplies the ancestor context the root layer injects.
  const Root = defineComponent({
    setup() {
      if (parentContext != null) provide(FORM_VIEW_KEY, parentContext)
      return () => h(component, spec.attrs ?? {})
    },
  })

  await renderToString(createSSRApp({ render: () => h(Root) }))
  return nodes
}

/** Mount a single layer and return the context it returned and provided. */
async function mountValue(
  attrs: Attrs = {},
  options: { parent?: FormViewContext } = {},
): Promise<ValueNode> {
  const nodes = await mountValueTree({ attrs }, options.parent)
  return nodes[0]!
}

/**
 * A stand-in ancestor context: a real writable `value` plus spies for the two
 * path entries, so a child layer's forwarding is directly observable.
 */
function fakeParent(initial: unknown) {
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

describe('owns：数据提供方判定（self / parent / self-local）', () => {
  it('attrs 带 modelValue → self：读自己的值，不向祖先转发', async () => {
    const parent = fakeParent({ name: 'parent' })
    const { ctx } = await mountValue({ modelValue: { name: 'Ada' } }, { parent: parent.ctx })

    expect(ctx.getIn('name')).toBe('Ada')
    expect(parent.getIn).not.toHaveBeenCalled()
  })

  it('attrs 带 model-value → self（连字符拼写同样成立）', async () => {
    const parent = fakeParent({ name: 'parent' })
    const { ctx } = await mountValue({ 'model-value': { name: 'Ada' } }, { parent: parent.ctx })

    expect(ctx.getIn('name')).toBe('Ada')
    expect(parent.getIn).not.toHaveBeenCalled()
  })

  it('modelValue: undefined 仍算 self（判定 key 是否存在，而非值）', async () => {
    const parent = fakeParent({ name: 'parent' })
    const { ctx } = await mountValue({ modelValue: undefined }, { parent: parent.ctx })

    // A `parent` layer would resolve 'parent' here; a self layer reads its own
    // (undefined) source.
    expect(ctx.getIn('name')).toBeUndefined()
    expect(parent.getIn).not.toHaveBeenCalled()
  })

  it('camel 与连字符同时存在时 camel 优先', async () => {
    const { ctx } = await mountValue({
      modelValue: { name: 'camel' },
      'model-value': { name: 'hyphen' },
    })

    expect(ctx.getIn('name')).toBe('camel')
  })

  it('无 key 但有祖先 → parent：读写都转发到祖先', async () => {
    const parent = fakeParent({ name: 'Ada' })
    const { ctx } = await mountValue({}, { parent: parent.ctx })

    expect(ctx.getIn('name')).toBe('Ada')
    expect(parent.getIn).toHaveBeenCalledWith('name')

    ctx.setIn('name', 'Bob')
    await nextTick()
    expect(parent.setIn).toHaveBeenCalledWith('name', 'Bob')
  })

  it('无 key 且无祖先 → self-local：写入落在内部变量', async () => {
    const { ctx } = await mountValue()

    expect(ctx.value.value).toBeUndefined()
    ctx.setIn('name', 'Bob')
    await nextTick()
    expect(ctx.value.value).toEqual({ name: 'Bob' })
  })

  it('只有监听（无 key、无祖先）也走 self-local，并对外 emit', async () => {
    const emit = vi.fn()
    const { ctx } = await mountValue({ 'onUpdate:modelValue': emit })

    ctx.setIn('name', 'Bob')
    await nextTick()

    expect(ctx.value.value).toEqual({ name: 'Bob' })
    expect(emit).toHaveBeenCalledTimes(1)
  })
})

describe('value：读整值', () => {
  it('self：镜像 attrs 里的整值', async () => {
    const { ctx } = await mountValue({ modelValue: { name: 'Ada' } })
    expect(ctx.value.value).toEqual({ name: 'Ada' })
  })

  it('self：连字符拼写同样镜像', async () => {
    const { ctx } = await mountValue({ 'model-value': { name: 'Ada' } })
    expect(ctx.value.value).toEqual({ name: 'Ada' })
  })

  it('self-local：初始为 undefined，写入后反映本地值', async () => {
    const { ctx } = await mountValue()
    expect(ctx.value.value).toBeUndefined()

    ctx.setIn('name', 'Bob')
    await nextTick()
    expect(ctx.value.value).toEqual({ name: 'Bob' })
  })

  it('parent：等于祖先解析出的整值', async () => {
    const parent = fakeParent({ name: 'Ada' })
    const { ctx } = await mountValue({}, { parent: parent.ctx })

    expect(ctx.value.value).toEqual({ name: 'Ada' })
  })

  it('parent：随祖先的值变化而更新', async () => {
    const parent = fakeParent({ name: 'Ada' })
    const { ctx } = await mountValue({}, { parent: parent.ctx })

    parent.model.value = { name: 'Zed' }

    expect(ctx.value.value).toEqual({ name: 'Zed' })
  })
})

describe('getIn：位置读', () => {
  it('self：按 path 从 attrs 整值读，缺失/非法 path 读作 undefined', async () => {
    const { ctx } = await mountValue({ modelValue: { buyers: [{ name: 'Ada' }] } })

    expect(ctx.getIn('buyers[0].name')).toBe('Ada')
    expect(ctx.getIn('buyers[0].missing')).toBeUndefined()
    expect(ctx.getIn('a..b')).toBeUndefined()
  })

  it('parent：把 path 原样转发给祖先，并取祖先结果', async () => {
    const parent = fakeParent({ name: 'Ada' })
    const { ctx } = await mountValue({}, { parent: parent.ctx })

    expect(ctx.getIn('name')).toBe('Ada')
    expect(parent.getIn).toHaveBeenCalledTimes(1)
    expect(parent.getIn).toHaveBeenCalledWith('name')
  })

  it('self-local：写入后按 path 读回本地值', async () => {
    const { ctx } = await mountValue()
    expect(ctx.getIn('name')).toBeUndefined()

    ctx.setIn('name', 'Bob')
    await nextTick()
    expect(ctx.getIn('name')).toBe('Bob')
  })
})

describe('setIn：位置写与 emit 策略', () => {
  it('self + 监听：同 tick 多次写合并为一次 emit，发出克隆后的整值', async () => {
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

  it('self + 连字符监听 onUpdate:model-value 同样生效', async () => {
    const emit = vi.fn()
    const { ctx } = await mountValue({
      modelValue: { name: 'Ada' },
      'onUpdate:model-value': emit,
    })

    ctx.setIn('name', 'Bob')
    await nextTick()

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
  })

  it('self + 无监听：写入被静默丢弃（不抛错，整值与源都不变）', async () => {
    const source = { name: 'Ada' }
    const { ctx } = await mountValue({ modelValue: source })

    expect(() => ctx.setIn('name', 'Bob')).not.toThrow()
    await nextTick()

    expect(ctx.value.value).toEqual({ name: 'Ada' })
    expect(source).toEqual({ name: 'Ada' })
  })

  it('self + 非函数监听：按无监听处理，不抛错', async () => {
    const { ctx } = await mountValue({
      modelValue: { name: 'Ada' },
      'onUpdate:modelValue': 'not-a-listener',
    })

    expect(() => ctx.setIn('name', 'Bob')).not.toThrow()
    await nextTick()

    expect(ctx.value.value).toEqual({ name: 'Ada' })
  })

  it('self：数组根写入发出克隆数组，源数组不变', async () => {
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

  it('self-local + 监听：先更新本地再 emit，一次整值', async () => {
    const emit = vi.fn()
    const { ctx } = await mountValue({ 'onUpdate:modelValue': emit })

    ctx.setIn('name', 'Bob')
    await nextTick()

    expect(ctx.value.value).toEqual({ name: 'Bob' })
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
  })

  it('self-local + 无监听：本地更新但零 emit（内部事件不外发）', async () => {
    const { ctx } = await mountValue()

    ctx.setIn('name', 'Bob')
    await nextTick()

    expect(ctx.value.value).toEqual({ name: 'Bob' })
  })

  it('self-local：跨 tick 的写分别 emit', async () => {
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

  it('parent：写入转发给祖先，本层监听不被触发', async () => {
    const parent = fakeParent({ name: 'Ada' })
    const emit = vi.fn()
    const { ctx } = await mountValue({ 'onUpdate:modelValue': emit }, { parent: parent.ctx })

    ctx.setIn('name', 'Bob')
    await nextTick()

    expect(parent.setIn).toHaveBeenCalledTimes(1)
    expect(parent.setIn).toHaveBeenCalledWith('name', 'Bob')
    expect(emit).not.toHaveBeenCalled()
  })
})

describe('事件通道检测', () => {
  it('只有 camel 监听时调用 camel', async () => {
    const camel = vi.fn()
    const { ctx } = await mountValue({
      modelValue: { name: 'Ada' },
      'onUpdate:modelValue': camel,
    })

    ctx.setIn('name', 'Bob')
    await nextTick()

    expect(camel).toHaveBeenCalledTimes(1)
    expect(camel).toHaveBeenCalledWith({ name: 'Bob' })
  })

  it('只有连字符监听时调用连字符', async () => {
    const hyphen = vi.fn()
    const { ctx } = await mountValue({
      modelValue: { name: 'Ada' },
      'onUpdate:model-value': hyphen,
    })

    ctx.setIn('name', 'Bob')
    await nextTick()

    expect(hyphen).toHaveBeenCalledTimes(1)
    expect(hyphen).toHaveBeenCalledWith({ name: 'Bob' })
  })

  it('两者都在时 camel 优先，连字符不触发', async () => {
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
})

describe('嵌套继承（provide + inject）', () => {
  it('provide 出去的上下文与返回值同源', async () => {
    const { ctx, provided } = await mountValue({ modelValue: { name: 'Ada' } })

    expect(provided).not.toBeNull()
    expect(provided!.value).toBe(ctx.value)
    expect(provided!.getIn).toBe(ctx.getIn)
    expect(provided!.setIn).toBe(ctx.setIn)
  })

  it('子层按路径读到祖先的值', async () => {
    const [root, child] = await mountValueTree({
      attrs: { modelValue: { name: 'Ada' } },
      child: { attrs: {} },
    })

    expect(root!.ctx.getIn('name')).toBe('Ada')
    expect(child!.ctx.getIn('name')).toBe('Ada')
  })

  it('子层写入终止在 owner：只在 owner emit 一次', async () => {
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

  it('owner 为 self-local 时，子层写入更新 owner 本地值并 emit', async () => {
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
