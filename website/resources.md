# 资源

## 代码与仓库

- [GitHub 仓库](https://github.com/xuyimingwork/vue-formless)
- [Issue 追踪](https://github.com/xuyimingwork/vue-formless/issues)
- [npm：vue-formless](https://www.npmjs.com/package/vue-formless)

## 变更与版本

- [CHANGELOG](https://github.com/xuyimingwork/vue-formless/blob/main/CHANGELOG.md) —— 破坏性变更标注 `（破坏性；0.x）`

## 设计文档（canonical）

面向使用者的文档在本站；设计决策的完整推演沉淀在仓库 `docs/`：

- [docs/design.md](https://github.com/xuyimingwork/vue-formless/blob/main/docs/design.md) —— 完整设计规格（以代码与 decision.md 为准）
- [docs/adr.md](https://github.com/xuyimingwork/vue-formless/blob/main/docs/adr.md) —— 架构决策单篇汇总（22 篇 ADR 收束）
- [docs/decision.md](https://github.com/xuyimingwork/vue-formless/blob/main/docs/decision.md) —— 早期决策问答（v-model、参数传递、嵌套场景）
- [docs/functional-props.md](https://github.com/xuyimingwork/vue-formless/blob/main/docs/functional-props.md) —— 函数式 props 梳理

## Playground

- [表单对照](https://xuyimingwork.github.io/vue-formless/playground/demo/basic/baseline) —— Element 基线 vs Formless 平铺对比
- [24 格布局](https://xuyimingwork.github.io/vue-formless/layout/) —— 布局工作台

## 本地开发

```bash
pnpm i
pnpm dev            # playground（基线 vs formless 对照）
pnpm playground:layout   # 24 格布局工作台
pnpm docs:dev       # 本站文档（VitePress）
pnpm build          # 构建库
pnpm test           # 测试
pnpm typecheck      # 类型检查
```

## License

[MIT](https://github.com/xuyimingwork/vue-formless/blob/main/LICENSE)
