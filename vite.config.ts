import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ command }) => ({
  root: command === 'serve' ? 'examples' : undefined,
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RediadsRenderer',
      formats: ['es', 'umd'],
      fileName: (format) =>
        format === 'umd' ? 'rediads-renderer.umd.cjs' : 'rediads-renderer.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'rediads-renderer.[ext]',
        exports: 'named',
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
}));
