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
答：在本地数据模式下，由于 FormView 是根节点，@update:model-value 的二义性并不明显。倾向于应该告知，作为单纯的内部事件的对外窗口。

实现逻辑：

- 如果配置了 :model-value（检测到 key），则视为受控组件
- 如果没有配置，但有上层 FormView，使用上层 FormView
- 使用本地变量


