import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Use GitHub Pages base path only when building specifically for GH Pages
  const isGhPages = process.env.GITHUB_PAGES === "true";

  return {
    base: isGhPages ? "/county-inventory-system/" : "/",
    plugins: [react()],
    server: {
      proxy: {
        "/api": "http://127.0.0.1:8000",
        "/api-auth": "http://127.0.0.1:8000",
        "/admin/": "http://127.0.0.1:8000",
        "/health": "http://127.0.0.1:8000",
      },
    },
  };
});