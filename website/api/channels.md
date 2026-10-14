# 前缀通道

formless 用前缀把一粒属性路由到某一颗宿主组件。通道名就是标签前缀去掉冒号。

## 闭集

```text
CHANNELS = ['fl', 'layout-item', 'layout', 'item']
```

每个通道有四种拼写（由通道名派生）：`item:` / `onItem:`（监听）/ `layoutItem:` / `onLayoutItem:`（连字符名的 camelCase 形）。

## 总规则

> **无前缀 = 这颗组件的主宿主；`前缀:` = 你要配置的那个 formless 侧子组件。**

| 前缀 | 目标组件 | 说明 |
|------|---------|------|
| 裸名（无前缀） | 主宿主 | FormView→ElForm / FormField→control |
| `item:` | 宿主 ElFormItem | FormField 上 |
| `layout-item:` | LayoutItem | FormField 上 |
| `layout:` | LayoutView | FormField（wrap-embed 内层）；FormView（页级） |
| `fl:` | formless 内核 | 各组件自身语义配置 |

## 各组件可吃的前缀

| 组件 | 裸名 | `layout:` | `layout-item:` | `item:` | `fl:` |
|------|------|-----------|----------------|---------|-------|
| FormView | ElForm | 页窗口 | —（透传） | —（透传） | ✓ |
| FormField | control | 仅 wrap-embed 内层 | 本格 | 宿主 Item 壳 | ✓ |

## 分发规则（`dispatch`）

- **一次分桶**：每通道一桶 + `default` 裸名残差；**不筛值、不丢键**。
- 桶内 **props 先、监听后**，同键冲突监听赢（`item:onClick` vs `@item:click` 都 → `onClick`，监听赢）。
- `default` 是**残差**，不是「无冒号键」：`onUpdate:modelValue` 这种含冒号的裸名照样留下。
- 监听前缀剥掉后按 `onXxx` 还原目标 prop：`onItem:validate` → `onValidate`，`onItem:update:modelValue` → `onUpdate:modelValue`。

## 主宿主缺席时裸名消失

裸名给主宿主；主宿主没渲染，裸名就丢掉（不报错、不转发）。想仍生效就用显式前缀。

## 语义源 vs 机械值

- `fl:*`：语义源，改它触发派生重算。
- `item:` / `layout-item:` / `layout:` / 裸名：机械值，直接落地。

## 相关

- [配置通道](/guide/channels)
- [`fl:` 内核键](/api/fl-keys)
