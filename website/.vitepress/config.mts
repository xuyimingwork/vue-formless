import { defineConfig } from 'vitepress'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { fileURLToPath } from 'node:url'

// The docs site consumes the monorepo source directly, so no library build is
// required before `vitepress dev` / `vitepress build`.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  title: 'vue-formless',
  description: 'Vue 3 表单组合式库：控件表 + FormView，布局与输入拆开。',
  lang: 'zh-CN',
  cleanUrls: true,

  // GitHub Pages 项目站部署在 /<repo>/ 子路径下；本地 dev 时保持默认根路径。
  base: process.env.PAGES_BASE || '/',

  vite: {
    plugins: [vueJsx()],
    resolve: {
      alias: {
        'vue-formless': `${repoRoot}/packages/vue-formless/src/index.ts`,
        '@vue-formless/layout': `${repoRoot}/packages/layout/src/index.ts`,
      },
    },
  },

  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '文档', link: '/guide/introduction', activeMatch: '^/guide/' },
      { text: 'API 参考', link: '/api/create-form-view', activeMatch: '^/api/' },
      { text: '示例', link: '/examples/basic-form', activeMatch: '^/examples/' },
      { text: '资源', link: '/resources' },
      { text: 'GitHub', link: 'https://github.com/xuyimingwork/vue-formless' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '简介', link: '/guide/introduction' },
            { text: '安装', link: '/guide/installation' },
            { text: '快速上手', link: '/guide/quick-start' },
            { text: '与其他方案对比', link: '/guide/comparison' },
          ],
        },
        {
          text: '基础',
          items: [
            { text: '创建域表', link: '/guide/create-form-fields' },
            { text: 'FormView 与 v-model', link: '/guide/form-view-v-model' },
            { text: '命名空间 Field', link: '/guide/named-field-tags' },
            { text: 'model 与 prop', link: '/guide/model-and-prop' },
            { text: '配置通道', link: '/guide/channels' },
            { text: '布局基础', link: '/guide/layout-basics' },
            { text: '校验', link: '/guide/validation' },
          ],
        },
        {
          text: '深入',
          items: [
            { text: '组装模式 fl:field', link: '/guide/fl-field-assembly' },
            { text: '多口控件', link: '/guide/multi-port-controls' },
            { text: '壳开关', link: '/guide/shell-switches' },
            { text: '嵌套 FormView', link: '/guide/nested-form-view' },
            { text: 'prop 路径语法', link: '/guide/prop-path' },
            { text: '数据流', link: '/guide/data-flow' },
          ],
        },
        {
          text: '布局与栅格',
          items: [{ text: '栅格引擎', link: '/guide/grid' }],
        },
        {
          text: '扩展与适配',
          items: [
            { text: '适配任意 UI 库', link: '/guide/adapt-ui-libs' },
            { text: 'module augmentation', link: '/guide/module-augmentation' },
            { text: '组合体控件', link: '/guide/compound-controls' },
            { text: '函数式 props', link: '/guide/functional-props' },
            { text: '定制路径', link: '/guide/customization' },
          ],
        },
        {
          text: 'TypeScript',
          items: [{ text: '类型系统', link: '/guide/typescript' }],
        },
        {
          text: '进阶与设计',
          items: [
            { text: '设计哲学', link: '/guide/design-philosophy' },
            { text: '已知边界', link: '/guide/boundaries' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'createFormView', link: '/api/create-form-view' },
            { text: 'createFormFields', link: '/api/create-form-fields' },
            { text: 'FormField', link: '/api/form-field' },
            { text: 'createLayoutView / LayoutItem', link: '/api/layout' },
            { text: 'fl: 内核键', link: '/api/fl-keys' },
            { text: '前缀通道', link: '/api/channels' },
            { text: '类型', link: '/api/types' },
            { text: 'prop 路径语法', link: '/api/prop-path' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: '基础表单', link: '/examples/basic-form' },
            { text: '筛选条', link: '/examples/filter-form' },
            { text: '只读详情', link: '/examples/readonly-detail' },
            { text: '混合布局', link: '/examples/mixed-layout' },
            { text: '多口日期范围', link: '/examples/date-range' },
          ],
        },
      ],
    },

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一页', next: '下一页' },
    lastUpdated: { text: '最后更新于' },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            displayDetails: '显示详情',
            resetButtonTitle: '清除查询',
            backButtonTitle: '返回',
            noResultsText: '没有结果',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },
  },
})
