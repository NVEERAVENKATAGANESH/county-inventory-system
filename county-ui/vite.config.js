import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // IMPORTANT for GitHub Pages:
  base: "/county-inventory-system/",

  plugins: [react()],

  // For local dev only (GitHub Pages won't use this)
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/api-auth": "http://127.0.0.1:8000",
      "/admin/": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000"
      // Note: /_dev is a frontend-only React route — no proxy needed
    }
  }
});