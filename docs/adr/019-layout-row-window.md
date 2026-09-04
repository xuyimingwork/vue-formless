# ADR-019：LayoutView `row` 窗口与必展示 / 自动

- **状态**：Accepted
- **日期**：2026-09-04
- **来源**：相对 [ADR-007](./007-layout-adapter-and-span-priority.md) / [ADR-008](./008-form-view-vmodel-and-grid-gcd.md) / [ADR-015](./015-formless-config-groups.md)。列表筛选条要收起成固定行数，查询 / 重置钉在最后一行末尾；展开后全部出现。

## 背景

`place="end"` 只解决查询靠右。10 个筛选项、`column=4`、收起 2 行时，可见槽是 8：7 个筛选项 + 查询。展开则 10 个筛选项 + 查询仍 `end`。

这不是「当前格多吃空白」（[ADR-018](./018-col-take-rest.md)）。收起要把多出来的筛选项 **从排版流里拿掉**。CSS `max-height` 会裁掉 DOM 末尾的查询；`v-show` 仍占槽；按「前 7 个」`v-if` 在 `column` 变化或出现 `2x` 时会错。

「7」应是预算推出来的：`row × 24 − 必展示占用`，不是页面写死的个数。

## 决策

### 1. Layout 窗口：`column` + `row`

与 `column` 对称，行窗口叫 **`row`**（不要 `rows`）。省略 `row` = 不限行，录单表单与现在一致。

```vue
<LayoutView :column="4" :row="expanded ? undefined : 2">
```

FormView 通道前缀 `row:` 指宿主布局层，属性名仍是 `row`：

| LayoutView | FormView |
|------------|----------|
| `column` | `:row:column` |
| `gutter` | `:row:gutter` |
| `row` | `:row:row` |

展开 = 去掉 `row`。页面只拥有 `expanded`，不数可见筛选项。

### 2. 格子：`show: 'auto' | 'required'`

不要 `filter(item)`（预算又回到页面）。默认 `'auto'`。查询 / 重置做成 **一格** `show="required"` 且 `place="end"`（两格都 `end` 会抢行尾）。关键词需要钉在首格时也可以 `required`。

```vue
<LayoutView :column="4" :row="expanded ? undefined : 2" v-slot="{ overflow }">
  <LayoutItem>姓名</LayoutItem>
  <!-- …自动筛选项 -->
  <LayoutItem show="required" place="end">
    重置 查询
    <button v-if="overflow" @click="expanded = !expanded">
      {{ expanded ? '收起' : '展开' }}
    </button>
  </LayoutItem>
</LayoutView>
```

FormView：`:col:show="'required'"`。展开按钮放进操作格，不再占一个 Col。

`overflow`：有自动项因 `row` 被藏。无 `row` 时无意义；展开后仍可用来画「收起」。

### 3. 先切可见集，再跑现有 blanks

有 `row` 时，在 `calculateLayout` 之前：

```text
budget   = row * 24
reserved = 所有 required 的 span 之和
rest     = budget - reserved

按 DOM 序扫 auto：还能放下则留下，否则本格及后续 auto 本趟不排
可见格 = 留下的 auto + 全部 required（相对顺序不变）
再 calculateLayout（查询仍 place="end"）
```

`column=4`、`row=2`、全 `1x`、最后一格 required：`48 - 6 = 42` → 7 个自动 + 查询。

某筛选项 `2x`：按格宽扣 `rest`，不按个数。必展示总 span 大于 `budget` 时只保证 required。

隐藏的 auto **不进排版**（不注册 / 不渲 Col）。不要 `v-show`。`v-model` 值仍在。强制藏某一项用页面 `v-if`，不提供 filter 函数。

### 4. 不做进通用 `place` / `take`

折叠是 Layout 级窗口，不是格对齐、也不是多吃空白。录单不写 `row`。落地时机：筛选 playground 真写「多项 + 查询进最后一格 + 展开」时再改内核；此前不必为它动 `calculateLayout`。

## 备选方案

1. **页面 `visible = column * 2 - 1` + `v-if`**：全 `1x`、列数写死可用；一改密度或混 `2x` 即错。不当内核方案。
2. **`filter` 回调**：灵活，但不语义化，作者仍要算预算。已否。
3. **容器裁两行**：查询在 DOM 末尾会被裁掉。已否。
4. **查询 `span="max"`**：独占一行，收起变成多一行。已否。
5. **行窗口叫 `rows`**：躲开 `:row:row` 叠词，但与 `column` 不对称。已否。通道叠词接受（`:row:` = 布局层）。
6. **用 `take="rest"` 折叠**：切不掉后面的筛选项。见 [ADR-018](./018-col-take-rest.md)。

## 不纳入

- 格级 `filter` / 优先级队列
- 查询与重置拆成两格都 `required` + `end`
- 把 `row` 做成默认（录单被裁）
- Item 级断点 span（[ADR-007](./007-layout-adapter-and-span-priority.md) 仍否）

## 改造方案

1. LayoutView props 增加可选 `row`；`createLayoutView` / FormView 声明 `:row:row`。
2. LayoutItem / `:col:show`：`'auto' | 'required'`，默认 `'auto'`。
3. 抽出 `pickVisibleCells(cells, { row, total: 24 })`：两趟（先扣 required，再灌 auto），单测 4 列 2 行、混 `2x`、required 超预算、无 `row` 全过。
4. 隐藏格不 `register`；`useDomChildren` 只看到可见 Col。
5. 默认槽 / expose `{ overflow: boolean }`。
6. FilterForm：查询收进最后一格；`row` 随展开切换；对照基线。

## 后果

- **正向**：筛选条是 `column` × `row` 窗口 + 钉住操作格；与页级密度一致；录单默认不受影响。
- **代价**：布局多一个可选轴；`:row:row` 读起来叠词；切可见集要在 blanks 之前。
- **关联**：密度落在 Layout 见 [ADR-007](./007-layout-adapter-and-span-priority.md)；`place="end"` 见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)；通道见 [ADR-015](./015-formless-config-groups.md)；格占用见 [ADR-018](./018-col-take-rest.md)。
