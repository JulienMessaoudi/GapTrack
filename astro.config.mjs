// astro.config.mjs
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  site: "https://gaptrack.fr",
  output: "static",
  integrations: [react()],

  // La CSP intégrée d’Astro n’est pas activée ici.
  // GapTrack injecte son thème React au runtime via ThemeStyles et utilise
  // des styles dynamiques pour les graphiques, progressions et animations.
  // La politique de sécurité compatible est envoyée par Vercel.
  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
