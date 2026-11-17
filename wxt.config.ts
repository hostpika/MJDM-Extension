import { defineConfig } from "wxt";
import preact from "@preact/preset-vite";
import { chromeManifest } from "./chrome/manifest";
import { firefoxManifest } from "./firefox/manifest";

// One code base builds both browsers. Browser-specific parts live in ./chrome and ./firefox
// (manifest differences, store listings, notes); build output goes to ./dist/chrome and
// ./dist/firefox. The output base dir must stay a dedicated folder: WXT empties it on
// `wxt clean` and ignores it in dev-watch, so never point it at the project root.
export default defineConfig({
  outDir: "dist",
  outDirTemplate: "{{browser}}",
  vite: () => ({
    plugins: preact(),
  }),
  manifest: ({ browser }) => ({
    name: "MJDM — High-Performance Download Manager",
    short_name: "MJDM",
    description: "Ultra-fast native download interception and manager bridge for MJDM.",
    version: "0.1.0",
    permissions: [
      "downloads",
      "webRequest",
      "cookies",
      "nativeMessaging",
      "storage",
      "contextMenus",
      "scripting",
    ],
    host_permissions: ["<all_urls>"],
    commands: {
      grab_all_links: {
        suggested_key: {
          default: "Ctrl+Shift+D",
          mac: "Command+Shift+D",
        },
        description: "Grab and download all links on current page with MJDM",
      },
    },
    ...(browser === "firefox" ? firefoxManifest : chromeManifest),
  }),
});
