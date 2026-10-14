# 配置通道

formless 的组件除了宿主还包了其它组件（Item / LayoutItem / LayoutView），属性需要按前缀路由到不同目标。

## 总规则

> **无前缀 = 这颗组件的主宿主；`前缀:` = 你要配置的那个 formless 侧子组件。**

| 前缀 | 目标组件 | 说明 |
|------|---------|------|
| 裸名（无前缀） | 主宿主 | FormView→ElForm / FormField→control |
| `item:` | 宿主 ElFormItem | FormField 上，越过 control 去够 Item 壳 |
| `layout-item:` | LayoutItem | FormField 上 |
| `layout:` | LayoutView | FormField 上（wrap-embed 内层）；FormView 上（页级） |
| `fl:` | formless 内核 | 各组件自身的语义配置 |

读法：**前缀是「配置谁」，裸名是「配置主子」。**

## 一个直观例子

```vue
<User.Name
  fl:label="姓名"           <!-- fl: 内核语义 -->
  item:label-width="96px"   <!-- item: 宿主 ElFormItem -->
  layout-item:span="max"    <!-- layout-item: LayoutItem -->
/>
```

```vue
<FormView
  fl:layout                  <!-- fl: 内核开关 -->
  layout:column="3"          <!-- layout: 页级 LayoutView 密度 -->
  label-width="96px"         <!-- 裸名：宿主 ElForm -->
/>
```

## 各组件可吃的前缀

| 组件 | 裸名 | `layout:` | `layout-item:` | `item:` | `fl:` |
|------|------|-----------|----------------|---------|-------|
| FormView | ElForm | 页窗口 | —（透传） | —（透传） | ✓ |
| FormField | control | 仅 wrap-embed 内层 | 本格 | 宿主 Item 壳 | ✓ |

`FormView` 没有 LayoutItem，所以 `layout-item:*` 和 `item:*` 都不是页通道——它们留在 `default` 桶里原样透传给宿主 Form。

## 监听形态

每个通道都有监听形态，前缀由通道名**派生**（`on` + PascalCase + `:`）：

```vue
<FormField @item:validate="onValidate" @change="onChange" />
```

`@item:validate` 编译成 attr `onItem:validate`，剥前缀后还原成 `onValidate` 落到 ElFormItem；`@change`（无前缀）落到 control。

## 主宿主缺席时裸名消失

完整规则两句：**裸名给主宿主；主宿主没渲染，裸名就丢掉（不报错、不转发）。**

- FormView：`fl:form` 关（嵌套）或无宿主 Form 时，裸名不进任何元素。
- FormField：`component` 为空时 control = null，裸名一起丢。
- FormField：`fl:item=false` 或工厂没绑 Item 时，`item:*` 整包不用。

想在主宿主可能缺席时仍生效，用显式前缀（`item:` / `layout-item:` / `layout:`）。

## 语义源 vs 机械值

- **`fl:*` 是语义源**：改它触发派生重算。例：`fl:label` → 适配同时算 Item `label` 与空校验文案。
- **`item:` / `layout-item:` / `layout:` / 裸名是机械值**：直接落地，不触发重算。

二者共存是「source vs override」，不是冲突：`fl:label` 是来源，`item:label` 是直接盖宿主 Item 的 `label`。

## 速查

完整的前缀 ↔ 目标 ↔ 值域对照表见 [API：前缀通道](/api/channels)。

## 下一步

- [布局基础](/guide/layout-basics)
- [组装模式 fl:field](/guide/fl-field-assembly)
