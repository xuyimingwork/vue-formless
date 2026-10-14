import { cpSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// GitHub Pages 产物组装：
//   <base>/                   文档站（VitePress）
//   <base>/playground/        playground（Element 基线 vs Formless 对照，history 路由）
//   <base>/layout/            24 格布局工作台（单页应用）
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const site = join(root, 'site')

function slash(path) {
  if (!path || path === '/') return '/'
  return path.endsWith('/') ? path : `${path}/`
}

const pagesBase = slash(process.env.PAGES_BASE || '/')
const playgroundBase = `${pagesBase}playground/`
const layoutBase = `${pagesBase}layout/`

function build(filter, base) {
  const r = spawnSync('pnpm', ['--filter', filter, 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PAGES_BASE: base },
  })
  if (r.status) process.exit(r.status ?? 1)
}

rmSync(site, { recursive: true, force: true })

build('vue-formless-website', pagesBase)
build('playground', playgroundBase)
build('playground-layout', layoutBase)

// 文档站占根路径
cpSync(join(root, 'website/.vitepress/dist'), site, { recursive: true })
// playground 挂到子路径
cpSync(join(root, 'playground/dist'), join(site, 'playground'), { recursive: true })
// 布局工作台挂到子路径
cpSync(join(root, 'playground-layout/dist'), join(site, 'layout'), { recursive: true })

// GitHub Pages 只会使用站点根目录的 404.html。VitePress 自带一个，但 playground
// 用的是 history 路由：直接打开 /playground/demo/basic/baseline 这类深链时，
// 静态服务器找不到文件，会交给根 404.html。所以把文档站 404 换个名字，根 404.html
// 改成一个「派发页」——playground 子路径下的请求渲染 playground SPA，其余渲染文档站 404，
// 这样深链刷新和文档 404 都能正确工作。
//
// 注意：这里必须用同步 XHR + document.write（而不是先整页替换），因为 document.write
// 只有在「解析期」写入时浏览器才会执行被写入的 <script type="module">。页面本身不写
// <title>，避免它排在真实标题之前把标题顶掉。
renameSync(join(site, '404.html'), join(site, '404-docs.html'))

writeFileSync(
  join(site, '404.html'),
  `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <script>
      ;(function () {
        var playgroundBase = '__PLAYGROUND_BASE__'
        var docsNotFound = '__DOCS_404__'
        // playground 的 history 深链由 SPA 接管；其余走文档站 404。
        var target =
          location.pathname.indexOf(playgroundBase) === 0
            ? playgroundBase + 'index.html'
            : docsNotFound
        var xhr = new XMLHttpRequest()
        xhr.open('GET', target, false)
        xhr.send()
        document.open()
        document.write(xhr.responseText)
        document.close()
      })()
    </script>
  </body>
</html>
`
    .replace('__PLAYGROUND_BASE__', playgroundBase)
    .replace('__DOCS_404__', `${pagesBase}404-docs.html`),
)

writeFileSync(join(site, '.nojekyll'), '')
