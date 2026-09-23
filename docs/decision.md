## 这个库的必要性



## 如何思考 FormView 的 v-model 功能

问：对于 FormView 的 v-model，如果用户只传递了 :model-value，用户的意图是什么？
答：让 FormView 按照提供的数据渲染，忽略 FormView 发出的更新事件。当用户提供了 model-value 之后，用户期望控制权发生变化（值从我这来）

问：对于 FormView 的 v-model，如果用户只传递了 @update:model-value，用户的意图是什么？
答：监听 FormView 的更新事件，做一些自己的操作。监听动作始终都是监听组件发生了什么事情，并不涉及数据控制权的调整。

问：FormView 嵌套场景下，如何定义子 FormView 只监听 @update:model-value 的行为？
答：子 FormView 可以拦截到它下层的 update 导致的更新，但整个的行为会变得奇怪：用户监听了子 FormView，也确实监听到了子 FormView 下东西触发的变化，但是接收到的值是整个 FormView 的值。
本质是 @update:model-value 同时表示了两个事情：一，组件内部发生了 update 事件；二，组件需要更新 model-value
所以，嵌套场景下，用户在子 FormView 上只配置了 @update:model-value，本质是在让渡了 model-value 的控制权后，仍想监听子 FormView 的内部事件。为避免歧义，这应该视为不支持的场景。

问：FormView 需要有自己的本地数据吗？（指没有上层的 FormView 情况下，若用户不传 model-value，应该如何看待）
答：从控制权角度，没有上层，同时用户不传 model-value，那么控制权位于 FormView 自身（控制权为上级控制、用户控制、自行控制）。从便利性角度，这个功能也是应该提供的。

问：在本地数据模式下，只有 @update:model-value 应该如何处理？
答：在本地数据模式下，由于 FormView 是根节点，@update:model-value 的二义性并不明显。倾向于应该告知（类似于 input 监听 change 事件，不传入 value 也是正常的），只是单纯作为内部事件的对外窗口。

实现逻辑：

归属：
  - 如果配置了 :model-value（检测到 key），则视为受控组件
  - 如果没有配置，但有上层 FormView，使用上层 FormView
  - 使用本地变量
具体操作
  - 归属到上层 FormView，则统一使用上层 FormView 提供的方法
  - 其它场景使用本层的操作

## 如何思考组件参数传递

Vue 内的参数包括 attrs 和 slots，formless 的 FormView FormField 在单个组件上叠加了多种组件。

```vue
<FormView>
  <slot />
</FormView>
```

实际上是

```vue
<HostForm>
  <LayoutView>
    <slot />
  </LayoutView>
</HostForm>
```

意味着 FormView 上的参数需要传递给 HostForm 和 LayoutView。

而对于 FormField 而言：

```vue
<FormField :fl:component="SomeControl">
  <slot />
</FormField>
```

是

```vue
<LayoutItem>
  <HostFormItem>
    <HostFormControl>
      <slot />
    </HostFormControl>
    <template name="label">
      ？？？
    </template>
  </HostFormItem>
</LayoutItem>
```

FormField 上的参数需要传给 LayoutItem、HostFormItem、HostFormControl。

由于无法限定参数形状，因此需要特定规则将单个组件上的参数转发至多个组件。

### 参数传递的通用规则
 
每个 fromless 组件都有自己的单个对应组件。FormView 对应 HostForm，FormField 对应 HostFormControl。

formless 通过参数名前缀进行分发，无前缀的直接分发给组件的对应组件。

#### props

```vue
<FormView layout:column="3" label-width="auto" />
```

传递结果：`<LayoutView column="3" />`，`<HostForm label-width="auto" />`

#### events

```vue
<FormField @item:validate="onItemValidate" @change="onChange" />
```

传递结果：`<HostFormItem @item:validate="onItemValidate" />`，`<HostFormControl @change="onChange" />`

#### slots

```vue
<FormField>
  <template #prefix>
    Control Prefix
  </template>
  <template #['item:label']>
    Item Label
  </template>
</FormField>
```

传递结果：

```vue
<HostFormItem>
  <template #label>
    Item Label
  </template>
  <HostFormControl>
    <template #prefix>
      Control Prefix
    </template>
  </HostFormControl>
</HostFormItem>
```

#### 其它配置

- formless 相关的配置通过 fl 前缀传递
- formless 前缀汇总
  - layout 用于 LayoutView
  - layout-item 用于 LayoutItem
  - item 用于 HostFormItem
  - fl 用于 formless 相关配置

## FormField 的使用

FormField 分两种：
- 一种是具名 FormField，由 createFormFields 在模板外创建组件
- 另一种是用户直接在模板内使用 FormField

创建方式：

```js
const User = createFormFields({
  name: {
    component: Input,
  }
})

// 得到 User.Name 具名 FormField 组件
```

二者在模板内使用方式几乎相同

```vue
<User.Name />
<FormField :fl:component="Input" />
```

### formless 参数

- component: FormField 包裹的 HostFormControl 组件
<!-- - props: HostFormControl 的默认参数 -->
- model: HostFormControl 提供的 v-model 名
- prop: FormField 绑定的 FormView value 属性名
- item: 是否渲染 HostFormItem 组件
- field: FormField 渲染模式

## 如何思考 FormField 的嵌套场景

### 值更新场景

- FormField 自身需要建立 prop 到 model 的关联关系
- 通过 prop 可以从 FormView 处拿到 value 的 get/set 工具
- 通过 prop 与 model 的联系可以建立 control 的绑定对象

- prop 无默认值而 model 有默认值
- 所以有 prop 就能建立联系

- 如果都是默认值的情况下，嵌套的 FormField 可以拿到上层的 get/set，如果它们的值一样？这对吗？
- 还是只有是 embed 的 FormField 才能拿到？

或者，不考虑嵌套场景？HostFormItem 无法拿到对应值？但是可以通过 item:prop 直接传递？
不行，因为内嵌的 FormField 自身没有 prop 属性，只有自己定义的 model，所以不能拿到 prop 信息，
一定要通过 model 拿到父级的 prop 关系。

也就是这里其实不是拿到 get/set 的问题，而是 prop 的继承补全问题。
但是 prop 的下发意味着更新能力的下发，这个是合理的吗？

原本 Control 通过 emit 进行数据更新，但是子 FormField 可以绕过该步骤。
但是这个好像只是一个语法糖：父级的 FormField 有对应关系意味着子级的 emit 已经声明且接上了。
那么子级内部本身也可以用 emit 来更新数据，并没有额外的能力泄漏。

### field 渲染场景

- 外层可选值是 "auto" | "embed" | "wrap-embed"
- 内层可选值是 "embed"

内层的作用是告诉外层自身的情况，而不是去反向控制外层。
而需要告知的自身情况只有当前是 embed 状态。

此处将外层的 "wrap" 值排除，因为没有必要：
- 如果内层没有声明 embed 却实际 embed 了
- 那么外层渲染要么 "embed"，要么 "wrap-embed"
- 而外层 "embed" 的渲染包含在 "auto" 里了
- 如果内层声明了 embed 却实际没有 embed
- 那么应该让内层更正，让外层的 "auto" 配置生效
- 所以并不存在外层配置 "wrap" 的场景



