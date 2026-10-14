# createLayoutView / LayoutItem

formless 的内置 24 栅格，从 `@vue-formless/layout` 转出口（打进内核 dist，不单独发布）。UI 无关。

```ts
import { createLayoutView, LayoutItem } from 'vue-formless'
// 或 layout 包类型：
import type { LayoutItemProps, LayoutViewProps } from '@vue-formless/layout'
```

## `createLayoutView`

```ts
function createLayoutView(options: CreateLayoutViewOptions = {}): Component
```

### `CreateLayoutViewOptions`

```ts
interface CreateLayoutViewOptions {
  Row?: Component
  Col?: Component
  column?: number
}
```

### `LayoutViewProps`

```ts
interface LayoutViewProps {
  disabled?: boolean   // 不渲染 Row，直接透传 children
  column?: number      // 窗口列数
}
```

- `disabled` 由内核固定为 `!fl:layout`。
- `column`：`mergeColumn(工厂 column, props.column)` 取后一个非空，clamp 1..24。

## `LayoutItem`

```ts
interface LayoutItemProps {
  span?: LayoutItemSpan
  place?: LayoutItemPlace
}
```

### `LayoutItemSpan`

```ts
type ColSpan = IntRange<1, 24>              // 1..24
type LayoutItemSpan = ColSpan | `${ColSpan}` | `${ColSpan}x` | 'max'
```

| 值 | 归一化结果 |
|----|-----------|
| `1` ~ `24` | 绝对格，clamp 1..24 |
| `1x` ~ `Nx` | `clamp(n) × floor(24 / column)`，再 clamp |
| `max` | 24 |
| 空 / 非法 | 兜底 `24 / column` |

### `LayoutItemPlace`

```ts
type LayoutItemPlace = 'auto' | 'start' | 'end'
```

| 值 | 含义 |
|----|------|
| `auto` | 顺流排 |
| `start` | 封本行、下一行起头 |
| `end` | 本格独占落地行 |

## 相关

- [栅格引擎](/guide/grid)
- [布局基础](/guide/layout-basics)
