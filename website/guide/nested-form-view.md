# 嵌套 FormView

嵌套 FormView 有两类用途：局部改变密度（见[混合布局](/examples/mixed-layout)）、继承读写源（列表绑定）。

## 控制权继承

归属判定：

- 配了 `:model-value` → **受控**；
- 未配但有上层 FormView → **用上层**；
- 否则用本地变量。

嵌套 FormView **未绑** `modelValue` / `onUpdate:modelValue` 两键时，继承祖先的读 / 写源（`value` / `getIn` / `setIn`），不建本地 writer；路径始终相对同一个根。

```vue
<FormView v-model="form">
  <p class="title">基本信息</p>
  <FormView fl:layout :layout:column="3">
    <User.Name />
    <User.Gender />
    <User.Mobile />
  </FormView>
</FormView>
```

内层 FormView 没有 v-model，字段写进同一个 `form`。

## 为什么不能只监听 `@update:model-value`

嵌套场景下，`@update:model-value` 同时表示「内部发生了 update」与「需要更新 model-value」两件事，是二义的。用户只配 `@update:model-value` 本质是让渡了控制权后仍想监听内部事件，视为**不支持**。要继承就干脆不绑。

## 单一写通道

只有 **owner 层** emit；非 owner 直接转发祖先 `setIn`。否则多层各自从自己的 props 快照重建整值、互相覆盖。

## 列表绑定

列表 = 一层 FormView + 单元格 `:fl:prop`：

```vue
<FormView v-model="form">
  <div v-for="(_, $index) in form.buyers" :key="$index">
    <User.Name :fl:prop="`buyers[${$index}].name`" />
  </div>
</FormView>
```

- 根为数组时：`` :fl:prop="`[${$index}].name`" ``。
- 用 `:fl:prop` 覆盖域表默认位置，把同一颗 `<User.Name />` 绑到不同行的叶子。

## 两个作用域

formless 内两根注入键，各是一个作用域：

| 键 | 提供者 | 装什么 | 消费者 |
|----|--------|--------|--------|
| `FORM_VIEW_KEY` | FormView | 本层运行时 `value` / `getIn` / `setIn` | 嵌套 FormView |
| `FORM_FIELD_KEY` | FormView + FormField（接力） | model 源 `access` + 身份映射 `getProp?` + 壳资源 + 页 `fl` | FormField |

`access`（model 源）永远由最近的 FormView 回答，`getProp`（身份映射）永远由最近的身份根 FormField 回答。

## 下一步

- [数据流](/guide/data-flow) —— 读 / 写的完整链路
- [prop 路径语法](/guide/prop-path)
