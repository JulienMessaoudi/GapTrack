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

      scriptDirective: {
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

      styleDirective: {
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

      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "form-action 'self'",

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