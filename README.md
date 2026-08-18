# vue-formless

简体中文 | [English](./README.en.md)

> Vue 3 表单组合式 hooks（API 预演中，尚未正式发布）。

## 仓库结构

```text
packages/vue-formless              # 内核
packages/element-plus              # @vue-formless/element-plus
playground                         # Element Plus 基线 vs Formless 预演
docs/adr                           # 架构决策
```

## 开发

```bash
pnpm i
pnpm dev          # 启动 playground
pnpm build        # 构建库
pnpm test
pnpm typecheck
```

## Playground

对比四类典型表单的 **Element 手写基线** 与 **vue-formless 目标写法**：

- 基础新建 / 编辑
- 筛选条
- 只读详情
- 混合布局（托管 + 手写逃逸）

```bash
pnpm playground
# http://localhost:5173
```

## License

[MIT](./LICENSE)
