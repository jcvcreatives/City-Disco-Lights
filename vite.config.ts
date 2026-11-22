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
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
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
          // Copy built production bundle to /docs and /dist/assets -> /assets so GitHub Pages
          // works out-of-the-box even when set to "Deploy from a branch (main / root or /docs)"!
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
