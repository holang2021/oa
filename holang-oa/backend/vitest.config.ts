import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // 测试前把真实 DB 复制为临时副本，全部测试只跑在副本上，真实数据零风险
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
    // 串行执行，避免多文件并发写同一测试副本
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
