// vite.config.mjs
import glob from 'fast-glob'
import fs from 'fs'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import handlebars from 'vite-plugin-handlebars'
import ViteRestart from 'vite-plugin-restart'


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isGhPages = mode === 'ghpages'
  const isLocalBuild = mode === 'localbuild'
  const projectName = 'grove-kiosk-2025-3'

  const pagesPath = path.resolve(__dirname, 'src/pages')

  // ✅ 이게 먼저 있어야 함
  const pageFiles = fs.readdirSync(pagesPath)
    .filter(file => file.endsWith('.html') && file !== 'link-page.html')

  // ✅ 그 다음에 이걸 써야 함
  const pageMetaList = pageFiles.map(file => {
    const filePath = path.join(pagesPath, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    const lines = content.split('\n').slice(0, 10)
    
    const meta = {}

    lines.forEach(line => {
      //const match = line.match(/@(\w+)\s+(.*)/)
      const match = line.match(/@(\w+)\s+(.+?)\s*-->/)
      if (match) {
        const [, key, value] = match
        meta[key] = value.trim()
      }
    })

    return {
      name: file,
      title: meta.pageTitle || path.basename(file, '.html'),
      note: meta.pageNote || '',
      created: meta.pageCreated || '',
      updated: meta.pageUpdated || ''
    }
  })

  return {
    root: 'src',
    base: isGhPages
    ? '/'+projectName+'/'
    : isLocalBuild
    ? ''
    : '/',
    publicDir: '../public',
    build: {
      outDir: isGhPages ? '../dist' : isLocalBuild ? '../build' : '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: Object.fromEntries(
          glob.sync('src/pages/*.html').map(file => {
            const name = path.basename(file, '.html')
            return [name, path.resolve(__dirname, file)]
          })
        ),
        output: {
          entryFileNames: 'assets/js/[name].js',
          assetFileNames: ({ name }) => {
            if (name && name.endsWith('.css')) return 'assets/css/styles.css';
            return 'assets/[name]';
          },
        }
      },
      minify: isLocalBuild ? false : 'esbuild'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      watch: {
        ignored: ['!**/src/**', '!**/public/**'],
      },
    },
    plugins: [
      handlebars({
        partialDirectory: path.resolve(__dirname, 'src/components'),
        context: {
          pages: pageMetaList,
          cssPath: env.VITE_CSS_PATH
        }
      }),
      ViteRestart({
        restart: ['vite.config.mjs', 'src/scss/reset.scss'],
      }),
    ],
  }
})
