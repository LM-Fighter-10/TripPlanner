import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/mapbox-api": {
        target: "https://api.mapbox.com",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/mapbox-api/, ""),
      },
    },
  },
});
