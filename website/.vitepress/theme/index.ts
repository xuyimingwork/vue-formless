import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import ElementPlus, { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from 'element-plus'
import 'element-plus/dist/index.css'

import { FormView, FormField } from './ep'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(ElementPlus)
    // Element Plus requires id / z-index providers under SSR (VitePress
    // prerenders each page), otherwise hydration mismatches.
    app.provide(ID_INJECTION_KEY, { prefix: 1024, current: 0 })
    app.provide(ZINDEX_INJECTION_KEY, { current: 0 })
    app.component('FormView', FormView)
    app.component('FormField', FormField)
  },
} satisfies Theme
