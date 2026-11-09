import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5181, strictPort: true },
  build: {
    target: 'es2022',
    // Phaser는 따로 떼어 둔다: 게임만 고쳐 올려도 Phaser는 다시 받지 않는다
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
    chunkSizeWarningLimit: 1300,
  },
});
