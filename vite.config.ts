import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
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
        transformIndexHtml(html: string): string {
          if (!html.includes('/src/main.tsx')) {
            return html.replace(
              '<div id="root"></div>',
              '<div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>'
            );
          }
          return html;
        },
      },
      react(),
      tailwindcss(),
      // Mirrors the compiled production bundle to /assets and /docs during GitHub Actions builds
      // without mutating tracked source files during AI Studio's internal compile_applet check.
      {
        name: 'sync-github-pages-bundles',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          // Do not mutate tracked workspace files outside dist/ during AI Studio compile_applet
          // (where DISABLE_HMR === 'true' and GITHUB_ACTIONS is not set), so AI Studio never reverts index.html.
          if (process.env.DISABLE_HMR === 'true' && process.env.GITHUB_ACTIONS !== 'true') {
            return;
          }

          const distDir = path.resolve(__dirname, 'dist');
          if (fs.existsSync(distDir)) {
            const buildId = `build_${Date.now()}`;
            const docsDir = path.resolve(__dirname, 'docs');
            fs.cpSync(distDir, docsDir, {recursive: true, force: true});
            fs.writeFileSync(path.resolve(docsDir, '.nojekyll'), '');
            fs.writeFileSync(path.resolve(distDir, '.nojekyll'), '');

            const distAssetsBundle = path.resolve(distDir, 'assets');
            const rootAssetsBundle = path.resolve(__dirname, 'assets');
            if (fs.existsSync(distAssetsBundle)) {
              fs.cpSync(distAssetsBundle, rootAssetsBundle, {recursive: true, force: true});
            }

            const rootIndexHtmlPath = path.resolve(__dirname, 'index.html');
            if (fs.existsSync(rootIndexHtmlPath)) {
              const html = fs.readFileSync(rootIndexHtmlPath, 'utf8');
              const updatedHtml = html.replace(
                /window\.__NEON_NIGHTS_BUILD__\s*=\s*'[^']*';/,
                `window.__NEON_NIGHTS_BUILD__ = '${buildId}';`
              );
              fs.writeFileSync(rootIndexHtmlPath, updatedHtml, 'utf8');
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
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
