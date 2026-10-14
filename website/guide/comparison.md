# 与其他方案对比

formless 的定位在三条路线之间：手写样板、纯手写 Template、全量 JSON Schema 引擎。下面逐一对齐。

## 手写 Element Form 样板

最原始的写法：每个字段都要手写 `el-form-item` + `el-input` + `v-model` + label + rules。

```vue
<el-form :model="form" label-width="96px">
  <el-row :gutter="16">
    <el-col :span="12">
      <el-form-item label="姓名" prop="name" :rules="[{ required: true, message: '请输入姓名' }]">
        <el-input v-model="form.name" />
      </el-form-item>
    </el-col>
    <el-col :span="12">
      <el-form-item label="手机" prop="mobile">
        <el-input v-model="form.mobile" />
      </el-form-item>
    </el-col>
  </el-row>
</el-form>
```

问题：**样板重复且绑定与布局耦合**。领域模型（字段 ↔ 默认控件 ↔ 默认 label）没有单点复用，改一处布局牵动整个文件；`v-model` 写口散落在每个控件上，联动 / 回填要逐处接线。

formless 的写法：

```vue
<FormView v-model="form" fl:layout label-width="96px">
  <User.Name :item:rules="[{ required: true, message: '请输入姓名' }]" />
  <User.Mobile />
</FormView>
```

域表把「谁、怎么画、绑到哪」收敛到一处，模板只剩布局与流程。

## 纯手写 Template（不做任何配置）

只拆 `UserForm` + `UserFormUI` 两个组件。边界仍然模糊：流程逻辑与布局容易再次耦合，领域模型依然无法单点复用。

formless 补的正是这个中间层——**有名字的输入**（`createFormFields`），它还不是一张表单，但已经把「命名 + 默认画法 + 默认绑定 + 默认 label」收进一份可复用的声明。

## 全量 JSON Schema 引擎（Formily 式）

把字段、布局、联动、甚至卡片 / 行列的虚节点全部塞进一份 JSON，运行时驱动渲染。

| 维度 | 全量 Schema 引擎 | formless |
|------|-----------------|----------|
| 布局能力 | 用 JSON 描述布局，运行时解析 | 布局留在 Vue Template，直接手写 |
| 类型安全 | 运行时值，丢类型 | 编译期，域表键、标签 props 全类型化 |
| 调试 | 配置即代码，黑盒难排查 | AST 友好、可读、可 PR、可 `git revert` |
| 联动 / 流程 | 塞进 reaction / 依赖描述 | 留在 `setup`，普通 JS/Vue 逻辑 |
| 动态下发 | 天然支持运行时 JSON | 编译期优先，运行时 JSON 是 opt-in 子集 |

formless 默认面向**编译期 / 源码期复用**（Build-time Low-Code）：可视化配置 → 生成代码 → Git → CI/CD，生成物就是普通的域表 + SFC。只有在明确真需求（SaaS 多租户扩展字段、秒级生效问卷）时才引入运行时 JSON 子集，与静态 Fields 组合，而不是替换整套架构。

## 一句话总结

```text
配置（View-Model） + Template（排版） ≫ 完整 JSON 布局引擎
```

用配置表达「稳定的模型」，用 Template 表达「多变的布局」，用 `setup` 表达「低频的流程」。三者按变化频率拆开，载体分离。

## 下一步

- [创建域表](/guide/create-form-fields)
- [设计哲学](/guide/design-philosophy) —— 分层推演与「否掉了什么」
