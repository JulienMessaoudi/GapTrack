// astro.config.mjs
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  site: "https://gaptrack.fr",
  output: "static",
  integrations: [react()],

  // Astro calcule automatiquement les empreintes SHA-256 des scripts
  // et feuilles de style intégrés à chaque page.
  security: {
    csp: {
      algorithm: "SHA-256",
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "frame-src 'none'",
        "script-src-attr 'none'",
        "style-src-attr 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://uezjmzkjrrqzxbkcjzwu.supabase.co wss://uezjmzkjrrqzxbkcjzwu.supabase.co",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
      ],
    },
  },

  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
