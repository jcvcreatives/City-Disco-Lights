import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({command}) => {
  let savedRootIndexHtml: string | null = null;
  const rootIndexHtmlPath = path.resolve(__dirname, 'index.html');

  return {
    base: './',
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app.bundle.js',
          chunkFileNames: 'assets/[name].bundle.js',
          assetFileNames: 'assets/app.bundle.[ext]',
        },
      },
    },
    plugins: [
      {
        name: 'ensure-main-tsx-entry',
        enforce: 'pre',
        config(): void {
          // During production builds, temporarily ensure <script type="module" src="/src/main.tsx">
          // is present so Vite compiles /src/main.tsx into dist/assets/app.bundle.js.
          if (command === 'build' && fs.existsSync(rootIndexHtmlPath)) {
            const html = fs.readFileSync(rootIndexHtmlPath, 'utf8');
            savedRootIndexHtml = html;
            if (!/<script[^>]+src=["']\.?\/src\/main\.tsx["']/i.test(html)) {
              const patched = html.replace(
                '<div id="root"></div>',
                '<div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>'
              );
              fs.writeFileSync(rootIndexHtmlPath, patched, 'utf8');
            }
          }
        },
      },
      react(),
      tailwindcss(),
      {
        name: 'sync-github-pages-bundles',
        apply: 'build',
        closeBundle(): void {
          const buildStamp = `build_${Date.now()}`;
          if (savedRootIndexHtml !== null) {
            const restored = savedRootIndexHtml.replace(
              /window\.__NEON_NIGHTS_BUILD__\s*=\s*['"][^'"]+['"]/,
              `window.__NEON_NIGHTS_BUILD__ = '${buildStamp}'`
            );
            fs.writeFileSync(rootIndexHtmlPath, restored, 'utf8');
          }

          const distDir = path.resolve(__dirname, 'dist');
          if (fs.existsSync(distDir)) {
            const docsDir = path.resolve(__dirname, 'docs');
            fs.cpSync(distDir, docsDir, {recursive: true, force: true});
            fs.writeFileSync(path.resolve(docsDir, '.nojekyll'), '');
            fs.writeFileSync(path.resolve(distDir, '.nojekyll'), '');

            const distAssetsBundle = path.resolve(distDir, 'assets');
            const rootAssetsBundle = path.resolve(__dirname, 'assets');
            if (fs.existsSync(distAssetsBundle)) {
              fs.cpSync(distAssetsBundle, rootAssetsBundle, {recursive: true, force: true});
            }
          }
        },
      },
    ],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'lucide-react', 'motion/react'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

