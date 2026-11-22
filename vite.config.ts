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
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ and mirrors the compiled production bundle
      // to /assets and /docs so GitHub Pages always receives the latest build
      // even when compile_applet cleans up dist/ after verification.
      {
        name: 'sync-github-pages-bundles',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

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

            // Stamp the latest build ID into root index.html so Git detects changes
            // and browsers/CDNs bust cache immediately after every push to GitHub.
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
