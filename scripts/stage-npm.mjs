import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkgDir = join(root, 'packages/vue-formless')
const dist = join(pkgDir, 'dist')
const out = join(root, '.release')

if (!existsSync(join(dist, 'index.js'))) {
  throw new Error('packages/vue-formless/dist missing; run pnpm build first')
}

rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'docs'), { recursive: true })
cpSync(dist, join(out, 'dist'), { recursive: true })
cpSync(join(root, 'README.md'), join(out, 'README.md'))
cpSync(join(root, 'README.en.md'), join(out, 'README.en.md'))
cpSync(join(root, 'LICENSE'), join(out, 'LICENSE'))
cpSync(join(root, 'docs/mixed-layout-code.png'), join(out, 'docs/mixed-layout-code.png'))
cpSync(join(root, 'docs/mixed-layout-preview.png'), join(out, 'docs/mixed-layout-preview.png'))

const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
delete pkg.scripts
delete pkg.devDependencies
pkg.files = ['dist', 'docs', 'README.md', 'README.en.md', 'LICENSE']
if (pkg.repository && typeof pkg.repository === 'object') {
  delete pkg.repository.directory
}
writeFileSync(join(out, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
