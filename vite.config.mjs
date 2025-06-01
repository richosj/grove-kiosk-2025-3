import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import handlebars from 'vite-plugin-handlebars'
import ViteRestart from 'vite-plugin-restart'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isGhPages = mode === 'ghpages'
  const isLocalBuild = mode === 'localbuild'
  const projectName = 'grove-kiosk-2025-3'

  const pagesPath = path.resolve(__dirname, 'src')
  const pageFiles = fs.readdirSync(pagesPath).filter(file => file.endsWith('.html'))

  const pageMetaList = pageFiles.map(file => {
    const filePath = path.join(pagesPath, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').slice(0, 10)
    const meta = {}
    lines.forEach(line => {
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
    base: isGhPages ? `/${projectName}/` : isLocalBuild ? '' : '/',
    publicDir: '../public',
    build: {
      outDir: isGhPages ? '../dist' : isLocalBuild ? '../build' : '../dist',
      emptyOutDir: true,
      rollupOptions: {
        // HTML 엔트리
        input: {
          biosimilar: path.resolve(__dirname, 'src/biosimilar.html'),
          celltrion: path.resolve(__dirname, 'src/celltrion.html'),
          // 각자 SCSS 전용 엔트리
          celltrionStyle: path.resolve(__dirname, 'src/scss/pages/celltrion.scss'),
          biosimilarStyle: path.resolve(__dirname, 'src/scss/pages/biosimilar.scss')
        },
        output: {
          entryFileNames: 'assets/js/[name].js',
          assetFileNames: ({ name }) => {
            if (name.endsWith('.css')) return 'assets/css/[name].css'
            return 'assets/[name]'
          }
        }
      },
      minify: isLocalBuild ? false : 'esbuild'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    server: {
      watch: {
        ignored: ['!**/src/**', '!**/public/**', '!**/src/*.html']
      }
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
        restart: ['vite.config.mjs', 'src/scss/reset.scss']
      })
    ]
  }
})
