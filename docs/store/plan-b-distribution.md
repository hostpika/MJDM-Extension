# Plan-B Distribution & Sideloading Architecture (§8.9)

## Overview

In the event of Chrome Web Store policy friction, delays, or arbitrary rejections regarding download manager companion extensions (Mitigation for Risk **R-03**), MJDM maintains a multi-channel distribution plan to guarantee uninterrupted access for all users.

---

## 1. Multi-Channel Distribution Matrix

| Channel | Platform | Type | Signing & Distribution |
|---|---|---|---|
| **Chrome Web Store** | Chromium | Primary | WebStore Listing (`mjdm-extension`) |
| **Microsoft Edge Add-ons** | Edge (Chromium) | Official | Signed via Microsoft Partner Center |
| **Firefox AMO (Listed)** | Firefox | Official | Signed and listed on addons.mozilla.org |
| **Firefox AMO (Unlisted / Self-Hosted)** | Firefox / Floorp / LibreWolf | Fallback | Cryptographically signed XPI hosted on GitHub Releases |
| **Chromium Unpacked / Sideload** | Brave, Chrome, Chromium, Vivaldi | Fallback | Packaged CRX or unpacked extension folder with fixed extension ID via manifest `key` |

---

## 2. Fixed Extension ID Architecture

To allow seamless Native Messaging host registration without depending on store-assigned IDs:

1. **Chromium Extension ID:** Derived from a deterministic 2048-bit RSA public key embedded in `extension/wxt.config.ts`:
   - Setting the `key` property guarantees that whether the extension is loaded from CWS, Edge Store, or unpacked locally, its 32-character extension ID remains strictly identical.
   - The native messaging host manifest (`com.mjdm.host.json`) references this exact extension ID in `allowed_origins`:
     ```json
     "allowed_origins": [
       "chrome-extension://knldjmfmopnflbflfhocjedcombnhgjk/"
     ]
     ```
2. **Firefox Extension ID:** Declared explicitly in `browser_specific_settings.gecko.id`:
   - Set to `mjdm@mjnex.com`.
   - The Firefox manifest references `allowed_extensions: ["mjdm@mjnex.com"]`.

---

## 3. Self-Hosted & Offline Installation Workflows

### A. Firefox (.xpi)
1. In Mozilla Developer Hub, extensions can be submitted for "Unlisted" automated signing.
2. The resulting signed `.xpi` file is published directly under GitHub Releases.
3. Users download `mjdm-latest.xpi` and drag-and-drop it into Firefox, or install it via the desktop app's Settings → Browser tab with a single click.

### B. Chromium Sideloading
1. The desktop application installer provides an option: *"Install Extension for Chrome/Brave/Edge"*.
2. For Windows:
   - Configures the registry under `HKCU\Software\Google\Chrome\Extensions\<extension_id>` pointing to the local update URL or local `.crx`.
   - Or provides a one-click instruction to load the pre-built unpacked extension from `<install_dir>/resources/extension`.
3. For Linux:
   - Provides native messaging manifest in `~/.config/google-chrome/NativeMessagingHosts/` and prompts user with instructions to enable unpacked directory in `chrome://extensions`.

---

## 4. Policy Re-Review Schedule

- **Frequency:** Quarterly audit of Chrome Web Store and Mozilla Add-on policy updates.
- **Next Scheduled Audit:** February 15, 2027.
- **Audit Checklist:**
  - Verify compliance with Google Limited Use policy.
  - Audit all third-party dependencies for supply-chain integrity.
  - Ensure zero references to copyrighted services or streaming portals.
