export function hostEl(source: unknown): Element | null {
  if (source == null || typeof source !== 'object') return null
  if (typeof Element !== 'undefined' && source instanceof Element) return source
  const inst = source as {
    vnode?: { el?: unknown }
    subTree?: { el?: unknown; component?: { vnode?: { el?: unknown } } }
    $el?: unknown
  }
  return (
    firstEl(inst.vnode?.el) ??
    firstEl(inst.subTree?.el) ??
    firstEl(inst.subTree?.component?.vnode?.el) ??
    firstEl(inst.$el)
  )
}

function firstEl(node: unknown): Element | null {
  if (typeof Element !== 'undefined' && node instanceof Element) return node
  if (node && (node as Node).nodeType === 8) {
    for (let n = (node as Node).nextSibling; n; n = n.nextSibling) {
      if (typeof Element !== 'undefined' && n instanceof Element) return n
    }
  }
  return null
}
