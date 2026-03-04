import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api":      "http://127.0.0.1:8000",
      "/api-auth": "http://127.0.0.1:8000",
      "/admin/": "http://127.0.0.1:8000",
      "/health":   "http://127.0.0.1:8000",
      // Note: /_dev is a frontend-only React route — no proxy needed
      // Only backend API paths need proxying
    },
  },
});