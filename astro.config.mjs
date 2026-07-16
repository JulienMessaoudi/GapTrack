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

      /*
       * Autorise les fichiers JavaScript de GapTrack.
       * Astro ajoutera automatiquement les hashes nécessaires
       * pour ses scripts inline d'hydratation.
       */
      scriptDirective: {
        resources: ["'self'"],
      },

      /*
       * On conserve temporairement unsafe-inline uniquement
       * pour les styles React dynamiques.
       */
      styleDirective: {
        resources: ["'self'", "'unsafe-inline'"],
      },

      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "form-action 'self'",

        /*
         * Interdit les attributs onclick, onerror, etc.
         */
        "script-src-attr 'none'",

        "img-src 'self' data: blob:",
        "font-src 'self' data:",

        "connect-src 'self' https://uezjmzkjrrqzxbkcjzwu.supabase.co wss://uezjmzkjrrqzxbkcjzwu.supabase.co",

        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "upgrade-insecure-requests",
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