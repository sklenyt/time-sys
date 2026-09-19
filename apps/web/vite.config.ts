import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Depo — časomíra závodů",
        short_name: "Depo",
        description: "Offline-first časomíra sportovních závodů",
        theme_color: "#0B1220",
        background_color: "#0B1220",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Jádro N01/N03 (offline-first, viz docs/03-architecture.md) — appka
        // musí naskočit i bez sítě, ne jen cachovat asset navíc.
        globPatterns: ["**/*.{js,css,html,svg,png}"],
      },
    }),
  ],
});
