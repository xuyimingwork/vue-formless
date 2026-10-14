# 函数式 props

formless 里「可以用函数形式配置 props」的位置，都承载在**唯一类型** `HostProps<T>` 上：

```ts
type HostProps<TFl> =
  | Record<string, unknown>
  | ((fl: TFl) => Record<string, unknown> | undefined)
```

同一配置位既可以写静态对象，也可以写「快照 → 宿主 props」的纯函数。函数是映射器（mapper）：无副作用、按需重算。

## 哪些位置支持函数式

| 配置位 | 类型 | 形参（快照） | 投影到 |
|--------|------|-------------|--------|
| `createFormView({ item: { props } })` | `HostProps<FormFieldFormless>` | `FormFieldFormless` | 宿主 Item |
| `createFormFields({ 字段: { props } })` | `HostProps<FormFieldFormless>` | `FormFieldFormless` | control |

**例外**：`layout.props` 与 `form.props` **只支持静态对象**——二者没有可投影的快照（写口按 no-prefix 规则以裸名 `modelValue` 落到宿主 Form）。

## 快照 `FormFieldFormless`

归一化后的每格快照：

```ts
interface FormFieldFormless extends FormFieldCustomOptions {
  model: (string | undefined)[]           // 本格 v-model 口，下标与 prop 对齐
  prop: (string | undefined)[] | undefined // 本格位置
  field: 'wrap' | 'embed' | 'wrap-embed'   // 组装位置（'auto' 已解掉）
  item: boolean                            // 宿主 Item 壳开关（恒为布尔）
}
```

- `model` / `prop` 是本格合并结果的**归一化数组**（下标即配对）。
- `item` 把「页级 `:fl:item` 默认 + 格上 `fl:item`」解成一个布尔，谁读快照都拿到同一个值。
- extras 经 `FormFieldCustomOptions` 增强进来（`label` 等）。

## `item.props` 投影

```ts
createFormView({
  item: {
    component: ElFormItem,
    props: (fl) => ({
      label: fl.label,
      prop: fl.prop?.length === 1 ? toDotPath(fl.prop[0]!) : undefined,
    }),
  },
})
```

宿主 `prop` 的编码是适配层私事；只有 `fl.item` 为真且绑了 `component` 时才渲染并求值。

## control `props` 投影

```ts
createFormFields({
  name: {
    label: '姓名',
    component: ElInput,
    props: (fl) => ({
      placeholder: typeof fl.label === 'string' ? `请填写${fl.label}` : undefined,
    }),
  },
})
```

- 求值在 `FormFieldCore` 内、**看到快照之后**（不能在工厂创建期求值）。
- 返回值 `undefined` / `null` 视为空对象；值为 `undefined` 的键原样带过。

## 求值时机与覆盖纪律

| 维度 | 规则 |
|------|------|
| 求值时机 | 都在**渲染期**按当前快照求值，非创建期一次性 |
| overlay | 一层浅合并（`{ ...默认, ...覆盖 }`，后面的层赢） |
| 语义源 vs 机械覆盖 | `fl:*` 是语义源（触发派生重算），`item:` / `layout-item:` / `layout:` / 裸名是机械值 |

## 不要混淆：`MaybeRefOrGetter`

`access(prop)` 与 `FormFieldContext.fl` 接受 `MaybeRefOrGetter`（getter / ref / 值），这是**惰性输入**，不是「函数式 props」，两者不是一个东西。

## 完整文档

更全的求值口径、覆盖顺序与最小示例，见仓库 [docs/functional-props.md](https://github.com/xuyimingwork/vue-formless/blob/main/docs/functional-props.md)。

## 下一步

- [定制路径](/guide/customization)
- [类型系统](/guide/typescript)
