# 组装模式 `fl:field`

「是否渲染 ElFormItem」与「FormField 自身组装成什么树」是**两根正交轴**：`fl:item` 管前者，`fl:field` 管后者。

## 两根轴

组装树由两根轴合成，而不是一个枚举：

- **位置**（placement）——`fl:field`，可写 `'auto' | 'embed' | 'wrap-embed'`。
- **体**（nature）——control 静态 `formless.field: 'embed'`，只表示「我是组合体：被成格时需要内层窗口」。

## 合成表

| `fl:field`（位置） | 叶子 control（体 = 无） | 组合体 control（体 = `'embed'`） |
|--------------------|------------------------|-----------------------------------|
| `'auto'`（省略） | `'wrap'` | `'embed'` |
| `'embed'` | `'embed'` | `'embed'` |
| `'wrap-embed'` | `'wrap-embed'` | `'wrap-embed'` |

三种树的形状：

```text
wrap:                        embed:                 wrap-embed:
  FormField                    control（直接渲，          FormField（外层格）
    LayoutItem                  登记进页 LayoutView）      LayoutItem
      ElFormItem?                                          ElFormItem?（分组 label）
        control                                              LayoutView（内层窗口）
                                                              FormField → control
                                                              FormField → control
```

## 语义

- 省略 = `'auto'`：跟随 control 的体。非法值也落回 `'auto'`。
- **同轴近的赢**（标签 > schema）。`'auto'` 是「本格没意见」，不等于 `'wrap'`。
- **异轴是合成**（位置 × 体）：组合体默认 `'embed'`；要把它包成一格并拿到内层窗口，写 `'wrap-embed'`。

## 组合体声明

control 通过 `formless.field: 'embed'` 声明自己是组合体（见[组合体控件](/guide/compound-controls)）：

```ts
defineOptions({
  formless: { field: 'embed', model: ['start', 'end'] },
})
```

`'embed'` 只说明**体**，不是位置。它**不是**一个合并层——渲染时读出来，与位置结合，决定渲哪棵树。

## `wrap-embed` 的逃生口

- control 漏报（或无法声明）组合体时，页面 / schema 直接写 `wrap-embed` 强制内层窗口。
- 叶子 control 上写 `wrap-embed` 没有意义（内层窗口里没有可分格的 FormField）。

```vue
<Range.DateRangeTwo :fl:field="'wrap-embed'" layout-item:span="max" />
```

## 内层窗口的密度

`:layout:column` / `:layout:gutter` 只对 `'wrap-embed'` 的内层 LayoutView 有效；打在 `'wrap'` 叶子上忽略。

内层 LayoutView **不**继承页 `fl:layout` / `:layout:column` / 工厂 `layout.props`——省略则用 LayoutView 自身缺省。

## 配错的后果

内核 `switch (tree)`，配错就按错的树渲（套娃、裂格、少壳），**不补救**。所以在语义上理解两根轴，比记住枚举值更重要。

## 下一步

- [多口控件](/guide/multi-port-controls) —— 组合体的典型场景
- [壳开关](/guide/shell-switches) —— `fl:item` / `fl:layout` / `fl:form`
