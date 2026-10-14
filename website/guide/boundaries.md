# 已知边界

formless 刻意收窄了能力范围。下面是「未落地 / 已否」的清单，避免你在这些方向上踩空。

## 未落地

| 项 | 状态 |
|----|------|
| LayoutView `layout:row` 窗口 + LayoutItem `layout-item:show`（筛选条收起） | 未落地 |
| `fl:grid` 栅格开关 | 未落地，开关仍写 `fl:layout` |

## 已否（设计时否决 / 后来退场）

| 项 | 说明 |
|----|------|
| `item: 'self'` / `cell: 'embed'` / `useFormCell(port)` | 组合体只写体（`formless.field: 'embed'`）；按口切片改 `fl:model` |
| `fl:span` | 宽走 `layout-item:span`（开发态 warn 后丢弃） |
| `fl:key` / `fieldKey` / `identity-rules` | 内核不下发身份名 |
| `getValues()` | 声明了但从未实现，已删 |
| LayoutItem 级多断点 span（`xs/sm/md`） | 响应式只做 LayoutView 级列密度 |
| 开放 Col `offset` / 任意透传 | 超出公约数就退出托管，手写外部栅格 |
| 自定义 merge / 自定义前缀 / `form:` 前缀 | 不开放 |
| `FormView.Layout` / `FormView.Item` | 不公开 |
| `v-model:fl` / `fl.modelValue` | 写口就是常规 `v-model` |

## 明确不支持

- **嵌套 FormView 只监听 `@update:model-value`**：二义，视为不支持（见[嵌套 FormView](/guide/nested-form-view)）。
- **页面 `<FormField>` 手写 `v-model="form.xxx"`**：绕过写回，禁止（见[命名空间 Field](/guide/named-field-tags)）。
- **同时含 `'` 与 `"` 的路径键**：引号段无转义，没有写法（见[prop 路径语法](/guide/prop-path)）。

## 版本与破坏性变更

当前 **0.2.0**，`0.x` 期间 API 仍可能调整。破坏性变更在 [CHANGELOG](https://github.com/xuyimingwork/vue-formless/blob/main/CHANGELOG.md) 中标注 `（破坏性；0.x）`。

## 下一步

- [资源](/resources) —— GitHub / CHANGELOG / 设计文档外链
