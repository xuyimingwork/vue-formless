# playground

Element Plus 基线表单 vs `vue-formless` 一比一预演。项目里自己 `createFormView` 绑 layout / form / item。

```bash
# 仓库根目录
pnpm i
pnpm dev
```

打开 http://localhost:5173 ，左侧选场景，顶部切换「Element 基线 / Formless 预演 / 平铺对比」。

## 说明

- `src/demos/baseline/*`：纯 Element Plus 手写样板
- `src/demos/formless/*`：共用 `user.ts` 控件表 + playground 里绑好的 `FormView`
- `src/ep/*`：Element 适配示例（`createFormView` + `toEpItemProps`）
