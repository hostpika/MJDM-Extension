# Mozilla Add-ons (AMO) Reviewer Notes

**Add-on:** MJDM — High-Performance Download Manager Integration  
**Application ID:** `mjdm@mjnex.com`  
**Version:** 1.0.0

## Reproducible Build Instructions

1. Install Node.js v20+ and pnpm v9+.
2. Clone the repository and navigate to the extension package:
   ```bash
   git clone https://github.com/mjdm-org/mjdm.git
   cd mjdm/extension
   pnpm install
   pnpm run build:firefox
   ```
3. The resulting zip file is generated at `.output/mjdmextension-1.0.0-firefox.zip`.
4. The unpacked distribution folder is `dist/firefox`.

## Architecture & Native Messaging Host

This extension pairs with the open-source MJDM desktop application:

- Communicates via `browser.runtime.connectNative("tech.mjnex.mjdm")`.
- If the companion native application is not installed or closed, the extension cleanly disconnects within 50 ms and lets Firefox handle the download normally without blocking the user.
- Zero tracking or telemetry is bundled.
- All source files are written in TypeScript and bundled with Vite/WXT without obfuscation.
