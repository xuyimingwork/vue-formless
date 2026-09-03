import { cpSync, copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const site = join(root, 'site')

function slash(path) {
  if (!path || path === '/') return '/'
  return path.endsWith('/') ? path : `${path}/`
}

const pagesBase = slash(process.env.PAGES_BASE || '/')
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
build('playground', pagesBase)
build('playground-layout', layoutBase)

mkdirSync(join(site, 'layout'), { recursive: true })
cpSync(join(root, 'playground/dist'), site, { recursive: true })
cpSync(join(root, 'playground-layout/dist'), join(site, 'layout'), { recursive: true })
copyFileSync(join(site, 'index.html'), join(site, '404.html'))
writeFileSync(join(site, '.nojekyll'), '')
