import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],
    // Локал PostgreSQL асаахад хугацаа шаардана
    testTimeout: 180_000,
    hookTimeout: 240_000,
    // Нэг зэрэг нэг файл — ижил ӨС-ийг хуваалцахгүйн тулд
    fileParallelism: false,
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
