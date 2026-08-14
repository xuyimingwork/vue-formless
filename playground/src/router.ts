import { createRouter, createWebHistory } from 'vue-router'
import DemoShell from './pages/DemoShell.vue'

export const demos = [
  {
    id: 'basic',
    title: '基础新建 / 编辑',
    desc: '两列栅格、校验、提交 — 最常见中后台表单',
  },
  {
    id: 'filter',
    title: '筛选条',
    desc: '紧凑查询区：多字段 + 查询 / 重置',
  },
  {
    id: 'readonly',
    title: '只读详情',
    desc: '同一套字段，整表 readonly',
  },
  {
    id: 'mixed',
    title: '混合布局',
    desc: '整行、分组标题、局部不对齐 — 考验托管 vs 逃逸',
  },
] as const

export type DemoId = (typeof demos)[number]['id']
export type DemoMode = 'baseline' | 'formless' | 'compare'

export function parseDemoMode(mode: string): DemoMode {
  if (mode === 'formless' || mode === 'compare') return mode
  return 'baseline'
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/demo/basic/baseline' },
    {
      path: '/demo/:id/:mode',
      name: 'demo',
      component: DemoShell,
      props: true,
    },
  ],
})
