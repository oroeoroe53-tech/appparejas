import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "src/test/server-only.ts"),
    },
  },
  test: { env: { NEXT_PUBLIC_LOCALE: "en" }, environment: "node", include: ["src/**/*.test.ts"] },
});
