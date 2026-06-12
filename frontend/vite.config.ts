import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg"],
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "World Cup 2026 Squads",
        short_name: "WC26",
        description: "Browse FIFA World Cup 2026 team squads and matches",
        theme_color: "#2BBBAD",
        background_color: "#f4f7fa",
        display: "standalone",
        orientation: "portrait",
        start_url: "/dashboard",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
