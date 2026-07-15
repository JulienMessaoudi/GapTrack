// astro.config.mjs
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  site: "https://gaptrack.fr",
  output: "static",
  integrations: [react()],

  security: {
    csp: {
      algorithm: "SHA-256",

      // Astro gère séparément script-src et ajoute automatiquement
      // les empreintes SHA-256 des scripts générés pendant le build.
      scriptDirective: {
        resources: ["'self'"],
      },

      // Astro gère également les styles intégrés et leurs empreintes.
      styleDirective: {
        resources: ["'self'"],
      },

      // Toutes les autres directives CSP peuvent rester ici.
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "frame-src 'none'",
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
