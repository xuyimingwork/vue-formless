# model 与 prop

绑定有两个正交维度：**`model`**（口名）与 **`prop`**（位置）。

## 两个概念

| 字段 | 含义 | 谁回答 |
|------|------|--------|
| **`model`** | control 的 v-model 口名（默认 `'modelValue'`；多口 `['start', 'end']`） | 本格声明 / control 静态 `formless.model` |
| **`prop`** | 从 FormView 根到叶子的**位置**（`name` / `buyers[0].name`） | 自有 `fl:prop`，或祖先身份根 `getProp(model)` |

两者一体两面，配对使用：**`model[i] ↔ prop[i]` 按下标对齐**，`prop` 不长于 `model`，多出来的口不绑表。

## 默认值

```ts
const User = createFormFields({
  name: { component: ElInput },          // model 默认 'modelValue'，prop 默认 'name'
  timeRange: {
    component: DateRange,
    model: ['start', 'end'],             // 两个口
    prop: ['startTime', 'endTime'],      // 两个位置，按下标对齐
  },
})
```

解析顺序（`model`）：`标签 fl:model` > `schema.model` > `control 静态 formless.model` > `['modelValue']`。

## 下标对齐

```text
model = ['start', 'end']
prop  = ['startTime', 'endTime']
         ↓
$bindings = {
  start: form.startTime,   'onUpdate:start': fn,
  end:   form.endTime,     'onUpdate:end': fn,
}
```

## 覆盖规则

- **只有 `component` 被工厂壳锁死**：`schema.component ?? 标签.fl:component`。
- **`model` / `prop` / `item` / `field` 不被锁定**：工厂壳把它们当预设层，标签可覆盖。

```vue
<!-- 同一颗 User.Age，绑到不同位置 -->
<User.Age />
<User.Age :fl:prop="'buyers[0].age'" />
```

## 两级分轴

一次绑定解析 = 两步：

```text
model → prop                    （getProp，最近的身份根 FormField 回答）
prop → (value, update)          （access，最近的 FormView 回答）
```

组合体内层格 `<FormField fl:model="start">` 在祖先已声明口里**选口**（选择 ≠ 覆盖）——它没有自有 `fl:prop`，位置从祖先的 `getProp(model)` 按下标取。详见[多口控件](/guide/multi-port-controls)。

## 下一步

- [prop 路径语法](/guide/prop-path) —— 位置字符串怎么写
- [多口控件](/guide/multi-port-controls) —— 多口 + 宿主校验
