import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve, extname, sep } from 'node:path'
import { THEME_INIT_SCRIPT } from '../src/lib/theme'

async function main() {
  const root = process.cwd()
  const port = Number(process.env.STOREFRONT_UI_PORT || 3100)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port UI invalide')
  const bundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { ThemeProvider } from './src/components/ThemeProvider';
        import Layout from './src/app/(market)/layout';
        import Pricing from './src/components/market/storefront/screens/ScreenPricing';
        import Checkout from './src/components/market/storefront/screens/ScreenCheckout';
        import AdminShippingRates from './src/components/AdminShippingRates';
        import AdminPricingDefaults from './src/components/AdminPricingDefaults';
        const content = location.pathname === '/admin/prices'
          ? <main style={{maxWidth:1100,margin:'auto',padding:16}}>{new URLSearchParams(location.search).get('panel') === 'defaults' ? <AdminPricingDefaults /> : <AdminShippingRates />}</main>
          : <Layout>{location.pathname === '/checkout/adresse' ? <Checkout /> : location.pathname === '/tarification' ? <Pricing /> : <main />}</Layout>;
        createRoot(document.getElementById('root')).render(<React.StrictMode><ThemeProvider>{content}</ThemeProvider></React.StrictMode>);
      `,
      loader: 'tsx',
      resolveDir: root,
    },
    bundle: true,
    write: false,
    jsx: 'automatic',
    platform: 'browser',
    define: { 'process.env.NODE_ENV': '"development"', 'process.env': '{}' },
    plugins: [{
      name: 'isolated-next-adapters',
      setup(builder) {
        builder.onResolve({ filter: /^next\/(link|image|navigation)$/ }, args => ({ path: args.path, namespace: 'next-adapter' }))
        builder.onLoad({ filter: /.*/, namespace: 'next-adapter' }, args => ({
          loader: 'jsx',
          resolveDir: root,
          contents: args.path.endsWith('navigation')
            ? `const router={push:url=>location.assign(url),replace:url=>location.replace(url),back:()=>history.back(),refresh:()=>location.reload()};export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>router;export const useParams=()=>({});`
            : args.path.endsWith('image')
              ? `import React from 'react';export default function Image({priority,unoptimized,fill,loader,quality,style,...props}){return <img {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...style}:style}/>}`
              : `import React from 'react';export default function Link({prefetch,replace,scroll,...props}){return <a {...props}/>}`,
        }))
      },
    }],
  })
  const stylesheet = await postcss([tailwind({ base: root })]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
  const publicRoot = resolve(root, 'public')
  const pages = new Set(['/tarification', '/checkout/adresse', '/admin/prices', '/market/boutiques'])
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || '/', 'http://localhost').pathname
      if (pathname.startsWith('/api/')) {
        response.writeHead(501, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'API non simulee par le test UI' }))
        return
      }
      if (pathname === '/health') {
        response.writeHead(200, { 'Content-Type': 'text/plain' }).end('storefront-ui')
        return
      }
      if (pathname === '/preview.js') {
        response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(bundle.outputFiles[0].contents)
        return
      }
      if (pathname === '/preview.css') {
        response.writeHead(200, { 'Content-Type': 'text/css' }).end(stylesheet.css)
        return
      }
      const asset = resolve(publicRoot, '.' + decodeURIComponent(pathname))
      if (asset.startsWith(publicRoot + sep) && extname(asset)) {
        try {
          const bytes = await readFile(asset)
          const mime: Record<string, string> = { '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
          response.writeHead(200, { 'Content-Type': mime[extname(asset)] || 'application/octet-stream' }).end(bytes)
        } catch { response.writeHead(404).end() }
        return
      }
      if (!pages.has(pathname)) {
        response.writeHead(404).end()
        return
      }
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(`<!doctype html><html lang="fr"><head><script>${THEME_INIT_SCRIPT}</script><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>DDM+ - Recette de composants</title><link rel="stylesheet" href="/preview.css"><style>@font-face{font-family:Jakarta;src:url('/fonts/jakarta-var.woff2');font-weight:100 900}@font-face{font-family:Fraunces;src:url('/fonts/fraunces-var.woff2');font-weight:100 900}:root{--font-jakarta:Jakarta;--font-fraunces:Fraunces;--font-sans:Jakarta}body{font-family:Jakarta,sans-serif}</style></head><body><div id="root"></div><script src="/preview.js"></script></body></html>`)
    } catch (error) {
      console.error(error)
      response.writeHead(500).end()
    }
  })
  server.on('error', error => { console.error(error); process.exitCode = 1 })
  server.listen(port, '127.0.0.1', () => console.log(`Recette UI isolee : http://127.0.0.1:${port}/tarification`))
}

main().catch(error => { console.error(error); process.exitCode = 1 })