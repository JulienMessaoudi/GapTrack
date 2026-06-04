import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    // 👇 ICI (pas dans proxy)
    allowedHosts: [".trycloudflare.com"],

    // (optionnel mais souvent utile avec tunnels)
    host: true,

    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
