import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

const ARTIFACT = process.env.VITE_ARTIFACT === "1"

// A hosted build with a localhost VITE_APP_URL ships wrong canonical links, share links and sitemap URLs.
if (process.env.VERCEL && /\/\/(localhost|127\.0\.0\.1)\b/.test(process.env.VITE_APP_URL ?? "")) {
  throw new Error(`VITE_APP_URL is ${process.env.VITE_APP_URL} on Vercel. Set it to the site address (e.g. https://befo-silk.vercel.app) in Vercel → Settings → Environment Variables.`)
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    !ARTIFACT && VitePWA({
      registerType: "autoUpdate", // new deploys take over by themselves; see src/app/pwa.ts
      injectRegister: false,
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "robots.txt"],
      manifest: {
        name: process.env.VITE_APP_NAME || "BEFO",
        short_name: process.env.VITE_APP_NAME || "BEFO",
        description: "Find hostels, PGs and messes with real seats, real menus and real prices.",
        start_url: "/",
        display: "standalone",
        background_color: "#f1f1f0",
        theme_color: "#1b1b1b",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/sitemap\.xml$/],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      ...(ARTIFACT ? { "virtual:pwa-register": path.resolve(import.meta.dirname, "./src/app/pwa-stub.ts") } : {}),
    },
  },
  // VITE_ARTIFACT=1 → one self-contained file for the preview (scripts/build-artifact.ts inlines it)
  build: ARTIFACT ? {
    outDir: "dist-artifact",
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rolldownOptions: { output: { codeSplitting: false } },
  } : {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) return "charts"
          if (id.includes("node_modules/@supabase")) return "supabase"
        },
      },
    },
  },
})
