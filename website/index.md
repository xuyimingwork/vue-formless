---
layout: home

hero:
  name: vue-formless
  text: Vue 3 表单组合式库
  tagline: 控件表 + FormView，把「布局」与「输入」拆开。与 UI 库解耦，不做一个全量 JSON 布局引擎。
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/quick-start
    - theme: alt
      text: 为什么是 formless
      link: /guide/introduction
    - theme: alt
      text: 在线示例
      link: /examples/basic-form

features:
  - icon: 🧩
    title: 与 UI 库解耦
    details: 不提供表单控件，只做粘合层。Element Plus、Ant Design Vue、Naive UI 任意输入组件 + 任意 Form/FormItem/Row/Col 都能组装成可写表单。
  - icon: 📋
    title: 页级域表
    details: createFormFields 一次声明语义输入簇，产出 <code>&lt;User.Name /&gt;</code> 命名空间 Field。模型、布局、流程三层关注点按变化频率拆开。
  - icon: 🎛️
    title: 配置通道
    details: 无前缀 = 主宿主，<code>fl:</code> / <code>item:</code> / <code>layout-item:</code> / <code>layout:</code> 前缀把一粒属性精确路由到某一颗宿主组件。
  - icon: 🔗
    title: 单一写口
    details: FormView 用 Vue 常规 v-model 接入可写状态。不可变写、同 tick 合并、单一写通道，只有 owner 层 emit。
  - icon: 🗺️
    title: 点分路径绑定
    details: <code>prop</code> 用 JS 成员链子集表达从根到叶子的位置，<code>buyers[0].name</code> 直接绑到嵌套列表，多口控件按下标对齐。
  - icon: 🧱
    title: 24 栅格内置
    details: 自带 UI 无关的栅格引擎，<code>span</code>（1x / max / 绝对格）与 <code>place</code>（auto / start / end），空白 Col 按 DOM 序自动补齐。

---

<div class="vp-doc" style="max-width: 720px; margin: 0 auto;">

## 一个组件承载了变化频率不同的多种关注点

中后台表单难维护的本质，是把变化频率不同的东西揉进了同一套样板标签。formless 按变化频率拆三层、载体分离：

| 关注点 | 变化频率 | 载体 |
|--------|----------|------|
| 模型（View-Model） | 中 | 页级域表 `createFormFields(...)` |
| 布局（Layout） | 高 | Vue Template |
| 流程（Flow） | 低 | 页面 `setup`（拉详情、回填、联动、提交、DTO 适配） |

```text
配置（View-Model） + Template（排版） ≫ 完整 JSON 布局引擎
```

## 代码速览

```ts
import { ElCol, ElForm, ElFormItem, ElInput, ElRow } from 'element-plus'
import { createFormFields, createFormView } from 'vue-formless'

export const FormView = createFormView({
  layout: { Row: ElRow, Col: ElCol, props: { column: 2 } },
  form: { component: MyForm },
  item: { component: ElFormItem, props: (fl) => ({ label: fl.label }) },
})

export const User = createFormFields({
  name: { label: '姓名', component: ElInput },
})
```

```vue
<FormView v-model="form" fl:layout label-width="96px">
  <User.Name :item:rules="[{ required: true, message: '请输入姓名' }]" />
</FormView>
```

</div>
