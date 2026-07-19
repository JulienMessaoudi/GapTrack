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

      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "frame-src 'none'",

        "connect-src 'self' https://uezjmzkjrrqzxbkcjzwu.supabase.co wss://uezjmzkjrrqzxbkcjzwu.supabase.co",

        "img-src 'self' data: blob: https://uezjmzkjrrqzxbkcjzwu.supabase.co",

        "font-src 'self' data:",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
      ],

      scriptDirective: {
        resources: [
          {
            resource: "'self'",
            kind: "element",
          },
          {
            resource: "'unsafe-inline'",
            kind: "attribute",
          },
        ],
      },

      styleDirective: {
        resources: [
          {
            resource: "'self'",
            kind: "element",
          },
          {
            resource: "'none'",
            kind: "attribute",
          },
        ],
      },
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