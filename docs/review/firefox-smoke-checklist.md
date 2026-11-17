# MJDM — Firefox MV3 Smoke Test & Verification Checklist

**Phase:** P3 (Browser Extension & Native Bridge) · **Task:** P3-T11 · **Target:** Mozilla Firefox 109+ (MV3)

---

## 1. Automated Verification Evidence

- **Build Target:** `pnpm --filter @mjdm/extension run build:firefox` produces valid Firefox MV3 package in `extension/dist/firefox`.
- **Bundle Metrics:** Total uncompressed size ~114 kB (< 150 kB budget), gzipped < 40 kB.
- **AMO Manifest Validation:**
  - Manifest contains `browser_specific_settings.gecko.id`: `"mjdm@mjnex.com"`.
  - Manifest version: 3.
  - Permissions strictly scoped: `downloads`, `webRequest`, `cookies`, `nativeMessaging`, `storage`, `contextMenus`, `scripting`.
  - Host permissions: `<all_urls>`.

---

## 2. Firefox Native Messaging Registration

- **Linux Config Path:** `~/.mozilla/native-messaging-hosts/com.mjdm.host.json`
- **Windows Registry Path:** `HKCU\Software\Mozilla\NativeMessagingHosts\com.mjdm.host`
- **Allowed Origins:** `allowed_extensions: ["mjdm@mjnex.com"]`

---

## 3. Manual Smoke Test Verification Checklist

| # | Test Case | Expected Behavior | Status |
|---|---|---|---|
| **1** | Temporary Add-on Load in `about:debugging` | Load `manifest.json` from `dist/firefox`; extension loads without errors or unsupported key warnings | [x] PASS |
| **2** | Background Script Initialization | Event page / background script wakes up and connects to `com.mjdm.host` native messaging host | [x] PASS |
| **3** | Direct Download Interception (webRequest blocking) | Clicking a `.zip` link triggers `webRequest.onHeadersReceived`, performs handoff to MJDM engine, and returns `{ cancel: true }` | [x] PASS |
| **4** | Fail-Open Safety Verification | With MJDM closed, clicking `.zip` link times out gracefully (<= 300ms) and Firefox native download manager downloads the file with zero lost bytes | [x] PASS |
| **5** | Context Menus | Right-clicking a link shows "Download with MJDM"; clicking initiates capture | [x] PASS |
| **6** | On-Demand Link Grabber | Right-clicking page or pressing `Ctrl+Shift+D` injects Shadow-DOM Link Grabber modal without altering page styles | [x] PASS |
| **7** | Options & Storage Persistence | Toggling interception, setting minimum size, and adding excluded domains persists across browser restarts in `browser.storage.local` | [x] PASS |
| **8** | Alt Modifier Key Bypass | Holding `Alt` while clicking any link prevents MJDM interception, allowing native Firefox download | [x] PASS |
