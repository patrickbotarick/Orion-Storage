import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@orion/domain": `${root}packages/domain/src/index.ts`,
      "@orion/shared": `${root}packages/shared/src/index.ts`,
      "@": `${root}src`,
    },
  },
  test: {
    environment: "node",
    include: [
      "packages/**/*.test.ts",
      "src/persistence/**/*.test.ts",
      "src/application/**/*.test.ts",
      "src/components/ui/**/*.test.tsx",
    ],
  },
});
