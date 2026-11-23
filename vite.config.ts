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
        config(): void {
          // Runs BEFORE Vite's internal vite:build-html plugin reads index.html from disk.
          // Check specifically for an actual <script ... src="/src/main.tsx"> HTML tag
          // (not comments or inline JS strings that mention ./src/main.tsx).
          if (process.env.GITHUB_ACTIONS === 'true') {
            const rootIndexHtmlPath = path.resolve(__dirname, 'index.html');
            if (fs.existsSync(rootIndexHtmlPath)) {
              const html = fs.readFileSync(rootIndexHtmlPath, 'utf8');
              if (!/<script[^>]+src=["']\.?\/src\/main\.tsx["']/i.test(html)) {
                const patched = html.replace(
                  '<div id="root"></div>',
                  '<div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>'
                );
                fs.writeFileSync(rootIndexHtmlPath, patched, 'utf8');
              }
            }
          }
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
          if (process.env.DISABLE_HMR === 'true' && process.env.GITHUB_ACTIONS !== 'true') {
            return;
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
