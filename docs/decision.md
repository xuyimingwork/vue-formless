# 

## 如何考虑 FormView 的 v-model

问：对于 FormView 的 v-model，如果用户只传递了 :model-value，用户的意图是什么？
答：让 FormView 按照提供的数据渲染，忽略 FormView 发出的更新事件。
推论：当用户提供了 model-value 之后，用户期望控制权发生变化（值从我这来）

问：对于 FormView 的 v-model，如果用户只传递了 @update:model-value，用户的意图是什么？
答：监听 FormView 的更新事件，做一些自己的操作。
推论：监听动作始终都是做监听发生了什么事情，并不涉及控制权的调整。
答二：但是这里的意图会变得奇怪，它监听的应该是 FormView 下的属性发出的变更（可以做到），但是如果有上层的话，收到的是整个 FormView 的 value，这会极易导致错误。
推论二：所以，如果是上层的 FormView 提供了 model-value，就应该由上层的 FormView 提供更新通知。

问：FormView 需要有自己的本地数据吗？
答：希望有，但这个属于有则更好。

问：那么本地数据模式下，只有 @update:model-value 应该如何处理？
答：倾向于应该告知。单纯的内部事件对外窗口。

实现逻辑：

- 如果配置了 :model-value（检测到 key），则视为受控组件
- 如果没有配置，但有上层 FormView，使用上层 FormView
- 使用本地变量


