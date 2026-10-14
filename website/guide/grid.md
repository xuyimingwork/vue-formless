# 栅格引擎

formless 内置一个 **UI 无关的 24 栅格**（`@vue-formless/layout`，打进内核 dist，不单独发布）。

## 职责边界

- **layout 包**：只管栅格——行窗口、格登记、`span` / `place` 归一化、空白格计算。不知道表单、v-model、Item。
- **formless 内核**：把参数分给宿主 Form/Item、control 与 LayoutItem；把 v-model 归集到 FormView。

::: tip 不消费外部 Row/Col
不自研 Row/Col，消费外部成熟栅格（约定 **24 格**，不另配 `total`）。你绑 `ElRow` / `ElCol`，布局引擎决定「放几个 Col、各占多少 span、前后补多少空白」。
:::

## `createLayoutView`

```ts
createLayoutView({ Row, Col, column? }) → LayoutView
```

```ts
interface LayoutViewProps {
  disabled?: boolean   // 不渲染 Row，直接透传 children
  column?: number      // 窗口列数
}
```

- `disabled`：`!Row || !Col || props.disabled` 时透传。
- `column`：`mergeColumn(工厂 column, props.column)` 取后一个非空，归一化后 clamp 到 1..24。

## `LayoutItem`

```ts
interface LayoutItemProps {
  span?: LayoutItemSpan   // '1'..'24' | '1x'..'Nx' | 'max' | number
  place?: LayoutItemPlace // 'auto' | 'start' | 'end'
}
```

### `span` 归一化（`normalizeColSpan`）

| 输入 | 结果 |
|------|------|
| `1` ~ `24`（数字 / 字符串） | 绝对格，clamp 1..24 |
| `1x` ~ `Nx` | 相对窗口列数：`clamp(n) × floor(24 / column)`，再 clamp |
| `max` | 24（独占整行） |
| 空 / 非法 | 兜底 `24 / column` |

### `place` 归一化（`normalizeColPlace`）

| 输入 | 结果 |
|------|------|
| `'start'` | 封本行、下一行起头 |
| `'end'` | 本格独占落地行 |
| 其它 / `'auto'` | 顺流排 |

## 空白 Col 补齐

布局按 **DOM 序**登记格子，用 `calculateLayout`（paper-tape：按 `place` + `span` 落地）排布，`calculateBlanks` 算前后空白格，渲染时插入 `LayoutBlanks`（`data-layout-blank`）补位。因此模板可以扁平摆放，换行 / 行末补齐由布局层消化，不调用外部 `offset` / `push` / `pull`。

## DOM 序观测

`LayoutView` 内部用 `useDomChildren` 观测真实 DOM 顺序（含 `MutationObserver`），所以 `v-if` 条件显隐后格仍按实际渲染顺序重排，不会留下空洞。

## 优先级

**Item 上的布局配置 > LayoutView 默认 > 兜底。** 域表尽量不承担布局。

## 未落地

- 筛选窗口（`layout:row` + `layout-item:show`）尚未落地。

## 下一步

- [布局基础](/guide/layout-basics) —— 使用层
- [API：createLayoutView / LayoutItem](/api/layout)
