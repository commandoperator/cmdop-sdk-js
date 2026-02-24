import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  onSuccess: async () => {
    // Copy xterm CSS to dist
    const fs = await import('fs/promises');
    const path = await import('path');

    const xtermCss = await fs.readFile(
      path.resolve('node_modules/@xterm/xterm/css/xterm.css'),
      'utf-8'
    );

    await fs.writeFile(
      path.resolve('dist/styles.css'),
      `/* xterm.js styles */\n${xtermCss}`
    );

    console.log('✓ Copied xterm.css to dist/styles.css');
  },
});
