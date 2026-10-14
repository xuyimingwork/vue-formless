# 数据流

formless 的读与写两条路径都收敛在 FormField 上，唯一写入口是 FormView 的 v-model。

## 读（FormView → control）

```text
FormFieldCore（setup）
  → model = 标签 fl:model ?? schema.model ?? control 静态 formless.model ?? ['modelValue']
  → prop  = 标签/schema fl:prop ?? 祖先 FORM_FIELD_KEY.getProp(model)
  → 每个口 i：access = FORM_FIELD_KEY.access(prop[i])   // access 由最近 FormView 提供
  → bind = {
      values:  { [toCamel(口名)]: access.value.value },
      events:  { ['onUpdate:' + toCamel(口名)]: access.update },
    }
  → v-bind 到 control（或经 slot 的 $bindings）
```

## 写（control → FormView）

```text
control 触发 update:port(value)
  → onUpdate:port = access.update(prop[i])
  → setIn(prop, value)                  // 不可变写：克隆沿途层级
  → 非 owner 层（inherit）：直接转发祖先 setIn
  → owner 层：pending 累积，nextTick 合并
      → setIn(source.value, prop, value)
      → 写回 bound → onUpdate:modelValue
```

## 关键性质

| 性质 | 含义 |
|------|------|
| **不可变** | `setIn` 永不 mutate 源对象，克隆沿途每层（`[...arr]` / `{...base}`） |
| **同 tick 合并** | 多个字段同 tick 写入合并成一次 emit（否则先写的键会被后 emit 的旧快照覆盖） |
| **单一写通道** | `setIn` 是整棵子树唯一写入口，一路转发到 owner 层 |
| **嵌套继承** | 嵌套 FormView 无 v-model 时整个源从祖先继承，路径始终相对同一个根 |
| **model 源与身份解耦** | `access` 永远由最近 FormView 回答，`getProp` 永远由最近身份根 FormField 回答 |

## `$bindings`

FormField 在 default slot 输出绑定对象，命名为 `$bindings`（扁平、可一把 `v-bind`）：

```ts
$bindings = {
  start: model.startTime,
  'onUpdate:start': fn,
  end: model.endTime,
  'onUpdate:end': fn,
}
```

```vue
<FormField fl:prop="remark" v-slot="{ $bindings }">
  <ElInput v-bind="$bindings" />
</FormField>
```

`$` 前缀用于和宿主库未来可能的 slot props 撞名隔离。

## control props 的合成

control 的最终 props 由 Vue `mergeProps` 合成：

```ts
mergeProps(
  bind.events,                            // 写口监听（onUpdate:xxx）
  { ...preset.props(formless), ...裸名 control 桶 },  // 外部两层先「覆盖」成一层
  bind.values,                            // 数据键（modelValue 等）
)
```

参数顺序即融合顺序：

- **写口监听先跑、外部监听追加其后**，两个都触发（与 SFC 编译器 `v-model` + `@update:xxx` 同一实现）。
- **数据键覆盖外部**（`modelValue` 等覆盖 schema / 裸名同名键）。
- 外部两层（schema `props` ← 标签裸名）先按「覆盖」合成一层，同名监听近的赢。

## 不可变写的推论

写侧「形状匹配即合并、不匹配即覆盖」：`setIn(arr, 'length', n)` 得到 `{ length: n }`，不是 `length` 特判——因为段 kind 由**语法**定、不由**数据**定，写要在节点不存在时凭空定形，那一刻无数据可依。

## 下一步

- [FormView 与 v-model](/guide/form-view-v-model)
- [函数式 props](/guide/functional-props)
