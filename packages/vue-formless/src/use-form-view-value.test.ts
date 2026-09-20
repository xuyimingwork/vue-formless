import { describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref } from 'vue'
import { useFormViewModelValue } from './use-form-view-model'

/** A port with no binding at all (neither value nor listener). */
const emptyPort = { value: () => undefined, update: () => undefined }

describe('useFormViewModelValue', () => {
  it('resolves the owning layer value as a computed over the port', () => {
    const model = ref<unknown>({ name: 'Ada' })
    const source = useFormViewModelValue(
      { value: () => model.value, update: () => undefined },
      null,
    )

    expect(source.value.value).toEqual({ name: 'Ada' })
    expect(source.getIn('name')).toBe('Ada')

    model.value = { name: 'Zed' }
    expect(source.getIn('name')).toBe('Zed')
    expect(source.value.value).toEqual({ name: 'Zed' })
  })

  it('coalesces same-tick owner writes into one emit, cloning on the way', async () => {
    const model = ref<unknown>({ buyers: [{ name: 'Ada', gender: 'f' }] })
    const emit = vi.fn()
    const source = useFormViewModelValue(
      { value: () => model.value, update: () => emit },
      null,
    )

    source.setIn('buyers[0].name', 'Bob')
    source.setIn('buyers[0].gender', 'm')
    await nextTick()

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ buyers: [{ name: 'Bob', gender: 'm' }] })
    expect(model.value).toEqual({ buyers: [{ name: 'Ada', gender: 'f' }] })
  })

  it('emits from undefined when only the listener is present', async () => {
    const emit = vi.fn()
    const source = useFormViewModelValue(
      { value: () => undefined, update: () => emit },
      null,
    )

    source.setIn('name', 'Bob')
    await nextTick()

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
  })

  it('inherits reads from the ancestor source', () => {
    const model = ref<unknown>({ name: 'Ada' })
    const parent = useFormViewModelValue(
      { value: () => model.value, update: () => undefined },
      null,
    )
    const child = useFormViewModelValue(emptyPort, parent)

    expect(child.value.value).toEqual({ name: 'Ada' })
    expect(child.getIn('name')).toBe('Ada')

    model.value = { name: 'Zed' }
    expect(child.getIn('name')).toBe('Zed')
    expect(child.value.value).toEqual({ name: 'Zed' })
  })

  it('forwards nested writes to the root owner so one emit carries them all', async () => {
    const model = ref<unknown>({ name: 'Ada' })
    const emit = vi.fn()
    const owner = useFormViewModelValue(
      { value: () => model.value, update: () => emit },
      null,
    )
    const child = useFormViewModelValue(emptyPort, owner)
    const grandchild = useFormViewModelValue(emptyPort, child)

    child.setIn('name', 'Bob')
    grandchild.setIn('age', 3)
    await nextTick()

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob', age: 3 })
    expect(model.value).toEqual({ name: 'Ada' })
  })

  it('warns and drops writes at a root with neither port nor ancestor', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const source = useFormViewModelValue(emptyPort, null)

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('Root FormView has no v-model')
    expect(source.value.value).toBeUndefined()
    expect(source.getIn('name')).toBeUndefined()
    expect(() => source.setIn('name', 'Bob')).not.toThrow()
    warn.mockRestore()
  })

  it('stays silent when a portless layer has an ancestor', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const owner = useFormViewModelValue(emptyPort, null)
    const child = useFormViewModelValue(emptyPort, owner)

    expect(child.value.value).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1) // the owner's own warning only
    warn.mockRestore()
  })
})

describe('useFormViewModelValue / getIn', () => {
  it('reads through the source computed without an extra value argument', () => {
    const model = ref<unknown>({ a: { b: [10, 20] } })
    const source = useFormViewModelValue(
      { value: () => model.value, update: () => undefined },
      null,
    )

    expect(source.getIn('a.b[1]')).toBe(20)
    expect(source.getIn('a.missing')).toBeUndefined()
    expect(computed(() => source.getIn('a.b[0]')).value).toBe(10)
  })
})
