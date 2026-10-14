# 布局基础

formless 自带一个 UI 无关的 24 栅格引擎。布局配置分三层：开关、密度、格宽。

## 开启栅格：`fl:layout`

`fl:layout` 只做 **boolean 开关**：

```vue
<FormView v-model="form" fl:layout>
  <User.Name />
  <User.Mobile />
</FormView>
```

- 不写 / `false` = 不托管栅格（LayoutView 直接透传 children，你手写 Row/Col）。
- `true` = 托管，formless 用绑定的 Row/Col 自动铺格。

::: warning fl:layout 只吃 boolean
`fl:layout` 的值域是 boolean，**不吃密度对象**。密度走 `layout.props`（工厂）或 `layout:column`（标签）。
:::

## 密度：`layout.props` / `layout:column`

项目密度写在工厂 `layout.props`（静态对象），实例覆盖写 `layout:column`：

```ts
export const FormView = createFormView({
  layout: { Row: ElRow, Col: ElCol, props: { column: 2 } },
  // ...
})
```

```vue
<FormView v-model="form" fl:layout :layout:column="3" :layout:gutter="16">
```

- `layout:column`：一行几列（窗口列数）。
- `layout:gutter`：列间距，落到宿主 Row。
- 优先级：**标签 `:layout:*` > 工厂 `layout.props` > 兜底**。

## 格宽：`layout-item:span`

每颗 Field 用 `layout-item:span` 设宽：

```vue
<User.Name layout-item:span="max" />   <!-- 独占整行 -->
<User.Email layout-item:span="16" />
<User.Address layout-item:span="8" />
```

`span` 的取值（`LayoutItemSpan`）：

| 值 | 含义 |
|----|------|
| `1` ~ `24` | 绝对格数，clamp 到 1..24 |
| `1x` ~ `Nx` | 相对 `column` 的一倍 / N 倍（`1x` = `24 / column`） |
| `max` | 独占整行（= 24） |

## 落位：`layout-item:place`

`place` 决定行内落位 / 占行模式（单轴）：

| 值 | 含义 |
|----|------|
| `auto` | 默认，顺流排 |
| `start` | 封本行、下一行起头（下一格独占落地行） |
| `end` | 本格独占落地行 |

```vue
<User.Name layout-item:place="start" />
```

个别字段「任何密度下独占落地行」就用 `place="start"`（封本行）或本格 `place="end"`。

## 空白 Col 自动补齐

模板扁平摆放，换行 / 行末补齐由布局层用**空白 Col** 消化（不调用外部 `offset` / `push` / `pull`）。格按 **DOM 序**登记，`v-if` 条件显隐后仍按实际渲染顺序重排。

## 响应式

响应式只做 **LayoutView 级列密度**（大屏更密 / 小屏更疏），不做 Item 级 `xs/sm/md` 断点：

```vue
<FormView fl:layout :layout:column="isWide ? 3 : 1" />
```

## 下一步

- [栅格引擎](/guide/grid) —— `createLayoutView` / `LayoutItem` 的内部机制
- [组装模式 fl:field](/guide/fl-field-assembly) —— wrap-embed 的内层窗口
