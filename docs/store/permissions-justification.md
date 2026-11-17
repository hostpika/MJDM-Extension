# MJDM Browser Extension — Permissions Justification

This document provides technical justifications for every permission requested by the **MJDM Download Manager Integration** browser extension (Chrome Web Store, Firefox Add-ons / AMO, Edge Add-ons).

---

## Minimal Surface Principle

The MJDM extension strictly complies with the Principle of Least Privilege:
- **Zero broad browsing history access:** Does **NOT** request `history` or `tabs` (URL/title tracking across tabs).
- **Zero permanent content scripts:** Content scripts are strictly injected on-demand via `chrome.scripting` when user explicitly invokes Link Grabber.
- **Zero cloud transmission:** All intercepted URLs, headers, and cookies are sent exclusively to `127.0.0.1` / local Native Messaging host (`com.mjdm.host`). Zero external analytics or telemetry servers.

---

## Manifest Permissions Breakdown

### 1. `downloads`
- **Purpose:** Used to detect file downloads initiated in the browser and suppress/cancel the browser's default single-connection download in favor of routing to MJDM's multi-segmented accelerated engine.
- **Chrome API:** `chrome.downloads.onCreated` and `chrome.downloads.cancel(downloadId)`.
- **Reviewer Note:** If MJDM desktop is offline or unresponsive within 300 ms, the extension immediately fails open and does **not** cancel the browser download, preventing any lost downloads.

### 2. `webRequest`
- **Purpose:**
  - **Firefox:** Used with blocking capability (`webRequestBlocking`) to inspect `Content-Disposition: attachment` or downloadable MIME types before the network payload starts downloading, redirecting the request to MJDM.
  - **Chromium:** Used passively (without blocking) to detect media streams (e.g. `.m3u8`, `.mpd`) and large downloadable resources.

### 3. `cookies`
- **Purpose:** Securely extracts session and authentication cookies (including CHIPS / partitioned cookies) strictly scoped to the domain of the file being downloaded.
- **Justification:** Many download portals, forums, and cloud drives require valid session cookies to download files. Without passing these cookies to the local download engine, downloads fail with `401 Unauthorized` or `403 Forbidden`.
- **Budget / Protection:** Cookies are strictly limited to the download origin domain, bounded by a 200 KB maximum payload budget, and passed only over localhost IPC to the local application.

### 4. `nativeMessaging`
- **Purpose:** Establishes standard length-prefixed stdio communication with the local native messaging host (`com.mjdm.host`), which bridges requests to the MJDM desktop core.
- **Justification:** Required by WebExtensions standard to transfer file capture requests, URL refreshes, and status queries between browser extension and desktop binary.

### 5. `storage`
- **Purpose:** Stores user preferences (file extension intercept list, minimum file size threshold in KB, domain exclusion list, bilingual language choice `en`/`bn`, Alt-key bypass switch) in `chrome.storage.local`, and ephemeral detected links in `chrome.storage.session`.
- **Justification:** Settings must persist across browser restarts without relying on third-party servers.

### 6. `contextMenus`
- **Purpose:** Adds right-click context menu items:
  - "Download with MJDM" (on hyperlinks)
  - "Download media with MJDM" (on audio/video/image elements)
  - "Download all links with MJDM..." (on page background)
- **Justification:** Standard IDM-class workflow allowing users to explicitly dispatch arbitrary links or media files to the download manager.

### 7. `scripting`
- **Purpose:** Injects the isolated Shadow-DOM Link Grabber dialog into the active tab when the user clicks "Download all links with MJDM..." or presses `Ctrl+Shift+D` (`Command+Shift+D` on macOS).
- **Justification:** Used instead of declaring universal content scripts on all pages, drastically reducing memory usage, idle CPU consumption, and page-load latency.

### 8. Host Permissions (`<all_urls>`)
- **Purpose:** Allows download interception and origin-matched cookie retrieval across arbitrary user-specified websites.
- **Justification:** A general-purpose download manager cannot predict ahead of time which domains a user downloads software, archives, Linux ISOs, or documents from.
- **Safeguards:** Users can add domain exclusion rules at any time in Options/Popup to completely disable interception on sensitive domains (e.g. banking, internal intranets).

---

## Omitted Permissions (Explicit Non-Use)

| Permission | Status | Reason Omitted |
|---|---|---|
| `tabs` | ❌ Omitted | Not needed; we do not track tab history or titles. |
| `history` | ❌ Omitted | Browsing history is never inspected or accessed. |
| `webNavigation` | ❌ Omitted | Navigation lifecycle tracking is unnecessary. |
| `declarativeNetRequest` | ❌ Omitted | Does not provide the dynamic cookie/header extraction required for IDM-class handoff. |
| `management` | ❌ Omitted | No interaction with other extensions. |
