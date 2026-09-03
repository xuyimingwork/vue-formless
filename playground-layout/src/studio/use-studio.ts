import { computed, inject, provide, reactive, ref, watch, type InjectionKey, type Ref } from 'vue'
import { PRESETS, setupPreset, type PresetId } from './presets'
import { renderSnippet } from './snippet'
import { resizeTiles } from './tiles'
import type { Scene, Tile } from './types'

export function createStudio(compact: Ref<boolean>) {
  const column = ref(3)
  const gutter = ref(compact.value ? 8 : 16)
  const rowGap = ref(8)
  const disabled = ref(false)
  const showBlanks = ref(true)
  const scene = ref<Scene>('play')
  const activePreset = ref<PresetId>('flow')
  const tiles = ref<Tile[]>([])

  function applyPreset(id: PresetId) {
    const next = setupPreset(id, compact.value)
    activePreset.value = id
    scene.value = next.scene
    column.value = next.column
    gutter.value = next.gutter
    rowGap.value = next.rowGap
    disabled.value = next.disabled
    if (next.tiles) tiles.value = next.tiles
  }

  applyPreset('flow')

  watch(compact, (isCompact) => {
    if (isCompact && gutter.value === 16) gutter.value = 8
    else if (!isCompact && gutter.value === 8) gutter.value = 16
  })

  const snippet = computed(() =>
    renderSnippet({
      scene: scene.value,
      column: column.value,
      gutter: gutter.value,
      disabled: disabled.value,
      tiles: tiles.value,
    }),
  )

  function setCount(n: number) {
    tiles.value = resizeTiles(tiles.value, n)
  }

  return reactive({
    column,
    gutter,
    rowGap,
    disabled,
    showBlanks,
    scene,
    activePreset,
    tiles,
    snippet,
    peeking: ref(false),
    sourceOpen: ref(false),
    presets: PRESETS,
    applyPreset,
    setCount,
  })
}

export type Studio = ReturnType<typeof createStudio>

const StudioKey: InjectionKey<Studio> = Symbol('studio')

export function provideStudio(compact: Ref<boolean>) {
  const studio = createStudio(compact)
  provide(StudioKey, studio)
  return studio
}

export function useStudio(): Studio {
  const studio = inject(StudioKey)
  if (!studio) throw new Error('Studio was not provided')
  return studio
}
