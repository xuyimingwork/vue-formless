# 壳开关

三个「要不要渲染某层壳」的开关：`fl:item` / `fl:layout` / `fl:form`。

| 键 | 值域 | 语义 | 默认 |
|----|------|------|------|
| `fl:item` | boolean | 这一格是否渲染 ElFormItem（去 label/error 但保留格子） | 工厂绑 Item 时 `true` |
| `fl:layout` | boolean | 是否渲染 LayoutView（译成 `disabled = !fl:layout`） | `false` |
| `fl:form` | `'auto' \| boolean` | 是否渲染 ElForm | `'auto'`（根开、嵌套关） |

## `fl:item`

「这一格挂不挂宿主 Item 壳」，合并后恒为布尔。近的赢：**标签 `fl:item` > schema/control `item` > 页 `FormView :fl:item`**；裸 `fl:item`（attr 空串）算 `true`。

```vue
<!-- 页级默认关闭 Item，单格再开 -->
<FormView v-model="form" :fl:item="false">
  <User.Name />               <!-- 无 Item -->
  <User.Remark :fl:item="true" /> <!-- 有 Item -->
</FormView>
```

::: tip fl:item=false ≠ 不要 Field
`fl:item=false` 只是「有格、无 label/error」，**不是**「不要 FormField」。格子仍在，control 照常渲染与绑定。
:::

## `fl:layout`

是否启用栅格，内核翻转成 LayoutView 的 `disabled`。见[布局基础](/guide/layout-basics)。

## `fl:form`

是否渲染宿主 ElForm：

- `'auto'`：根 FormView 开、嵌套 FormView 关。
- 显式 `true` / `false` 赢（裸 `fl:form` 算 `true`）。

```vue
<!-- 根：默认 auto，包 ElForm -->
<FormView v-model="form">
  <!-- 嵌套：默认 auto，不包 ElForm -->
  <FormView fl:layout :layout:column="3" />
</FormView>
```

嵌套 FormView 常用来改变局部密度（见[混合布局](/examples/mixed-layout)），此时不包内层 ElForm，避免套娃。

## 三个开关的消费方

| 键 | 谁消费 |
|----|--------|
| `fl:item` | FormFieldCore 归一后写进快照，Item / control 两侧读到同一个值 |
| `fl:layout` | FormView 自己，翻成 LayoutView 的 `disabled`，不下行 |
| `fl:form` | FormView 自己，决定包不包宿主 Form，不下行 |

`fl:layout` / `fl:form` 是 FormView 自己的开关，**不下行**给子 Field；页级 `fl` 里只放 FormField 会读的 `item`。

## 下一步

- [嵌套 FormView](/guide/nested-form-view)
- [数据流](/guide/data-flow)
