import { defineConfig } from "vitest/config";

export default defineConfig({
  // Use esbuild's automatic JSX runtime — no @vitejs/plugin-react needed for tests
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
  },
});
