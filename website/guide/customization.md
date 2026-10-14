# 定制路径

formless 的公开面很小：**5 个运行时值 + 必要类型**。定制只有三条路，都不需要够到内核。

## 公开面

```ts
// 值（仅此 5 个）
createFormView(options) → FormView
createFormFields(schema) → FormFields
FormField
createLayoutView({ Row, Col, column? }) → LayoutView   // 转出口
LayoutItem                                             // 转出口
```

其余全部内核私有。详见 [API：类型](/api/types)。

## 三条定制路径

### 1. `$bindings` slot

手写 control，一把 `v-bind` 拿绑定：

```vue
<FormField fl:prop="remark" v-slot="{ $bindings }">
  <ElInput v-bind="$bindings" type="textarea" :rows="3" />
</FormField>
```

适合完全自定义的输入渲染。

### 2. `fl:component` 临场格

模板里临时指定 control：

```vue
<FormField fl:prop="extra" fl:component="ExtraInput" />
```

### 3. module augmentation

声明 `label` / `validation` 等 extras（见[module augmentation](/guide/module-augmentation)）。

## 不开放的

- 不公开 `FormView.Layout` / `FormView.Item`。
- 不开放自定义 merge / 自定义前缀 / `form:` 前缀（当前无需从字段够到宿主 Form）。
- 内核不发「身份名」——域名表的键只当 `fl:prop` 的缺省位置，宿主 `prop` 由适配层自决。

## 跨页复用

域表默认跟页走。跨页默认复用的是**控件实现 + 绑定通道**，不是整张 `User` 表：

```ts
// user.ts —— 复用的是这套「命名 + 默认画法 + 默认绑定」
export const User = createFormFields({ name: { component: ElInput, label: '姓名' } })
```

要真正的跨页共享，把控件实现（组合体）抽成可复用的 control，而不是把整张表塞进一个全局单例。

## 下一步

- [类型系统](/guide/typescript)
- [已知边界](/guide/boundaries)
