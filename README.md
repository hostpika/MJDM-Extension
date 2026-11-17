<div align="center">

# MJDM Extension

**Send downloads and videos from Chrome and Firefox to the MJDM desktop app** — one click, with the right cookies and referrer.

[![CI](https://github.com/hostpika/MJDM-Extension/actions/workflows/ci.yml/badge.svg)](https://github.com/hostpika/MJDM-Extension/actions/workflows/ci.yml)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome)
![Chrome](https://img.shields.io/badge/Chrome%20%2F%20Edge%20%2F%20Brave-supported-4285F4?logo=googlechrome)
![Firefox](https://img.shields.io/badge/Firefox-109%2B-FF7139?logo=firefoxbrowser)
![WXT](https://img.shields.io/badge/built%20with-WXT-67D55E)
![Tests](https://img.shields.io/badge/tests-63%20passing-brightgreen)
![License](https://img.shields.io/badge/license-Proprietary-red)

</div>

---

## Contents

- [What it does](#what-it-does)
- [The MJDM repositories](#the-mjdm-repositories)
- [Features in detail](#features-in-detail)
- [How it talks to the desktop app](#how-it-talks-to-the-desktop-app)
- [Install and develop](#install-and-develop)
- [Registering the native host](#registering-the-native-host)
- [Project layout (Chrome and Firefox)](#project-layout-chrome-and-firefox)
- [Permissions and privacy](#permissions-and-privacy)
- [Testing](#testing)
- [Publishing](#publishing)
- [Known gaps](#known-gaps)
- [বাংলায় সারসংক্ষেপ](#বাংলায়-সারসংক্ষেপ)

---

## What it does

When you start a download in the browser, the extension cancels the browser's own download and
hands the URL, file name, **referrer, cookies and user agent** to the
[MJDM desktop app](https://github.com/hostpika/MJDM-APPLICATION), which downloads it with many
connections. On pages with a video it adds a **"Download video"** button on top of the player with
a quality menu.

If the desktop app is not running or not reachable, the extension **fails open**: the browser
simply downloads the file itself, so you never lose a download.

## The MJDM repositories

| Repository | What it is | Where it runs |
|---|---|---|
| [**MJDM**](https://github.com/hostpika/MJDM) | Website, docs, customer portal, project plan | `mjdm.us` |
| [**MJDM-APPLICATION**](https://github.com/hostpika/MJDM-APPLICATION) | Windows/Linux desktop app, Rust core, native host | Your PC |
| [**MJDM-Extension**](https://github.com/hostpika/MJDM-Extension) | **This repo** — Chrome and Firefox extension | Your browser |
| [**MJDM-API**](https://github.com/hostpika/MJDM-API) | Cloud API | `api.mjdm.us` |
| [**MJDM-ADMIN**](https://github.com/hostpika/MJDM-ADMIN) | Admin panel | `admin.mjdm.us` |

## Features in detail

### Download interception
- **Chromium (Chrome, Edge, Brave):** listens to `downloads.onCreated`, cancels the browser download and hands it off.
- **Firefox:** inspects response headers (`Content-Disposition`, `Content-Type`) with `webRequest` to catch downloads early.
- **Rules** (Options page): enable/disable, minimum file size to intercept (default 256 KB), the list of captured
  file extensions, and a list of **excluded domains**.
- **Alt-key bypass:** hold **Alt** while clicking to let the browser download the file itself.
- Only `http://` and `https://` URLs are handed off; a rate limiter protects against bursts.

### Video downloader
- A **sniffer** watches network responses for video: direct files (`.mp4`, `.webm`, …) and HLS playlists.
- For an HLS *master* playlist it reads the **quality variants** and lists them (`1080p`, `720p`, or
  bitrate when the stream has no resolution), plus an **Auto (best)** entry.
- The **"Download video" button** appears on the video when you hover it (and for a few seconds
  after playback starts), positioned over its top-right corner. The menu shows each quality with a
  format badge and, for direct files, the size.
- The result is shown on the button itself: *Sent to MJDM*, *Start the MJDM app*, *MJDM not installed*, or *Download failed*.
- Streams are cleared when you navigate to a new page in the tab. DASH streams are listed but marked
  "soon" (the app cannot download DASH yet). DRM-protected streams are refused by the app.

### Link grabber
Press **Ctrl+Shift+D** (Command+Shift+D on macOS) to collect all links on the page and send a selection to MJDM.

### Context menu
Right-click a link, image or media element → **Download with MJDM**, or **Download all links with MJDM**.

### Popup
Shows whether the desktop app is connected, lets you paste a URL to download, and toggle interception.

### Languages
English and বাংলা.

## How it talks to the desktop app

```
Extension (background service worker)
   │  browser.runtime.connectNative("com.mjdm.host")
   ▼
mjdm-nmhost  ── stdin/stdout, 4-byte native-endian length + JSON ──  (MJDM-APPLICATION)
   │  JSON-RPC over 127.0.0.1:45300 with a per-user token
   ▼
MJDM desktop app  → starts the download and answers { accepted, downloadId } or an error
```

- Messages are versioned (`v: 1`) with types such as `capture`, `refresh_url`, `ack` and `error`; the
  schema lives in `packages/shared-types` (Zod).
- The host validates every payload (URL scheme, file name, cookie size budget of 200 KB).
- The extension waits for the app's **real answer**, so the button can tell you whether the download was truly accepted.
- If the app is not running, the host tries to launch it; if that fails, the extension fails open.

## Install and develop

Requirements: Node.js 22 and pnpm 12.16.1.

```bash
pnpm install                  # also runs `wxt prepare`
pnpm dev                      # Chrome with hot reload
pnpm dev:firefox              # Firefox with hot reload

pnpm build:chrome             # → dist/chrome
pnpm build:firefox            # → dist/firefox   (Manifest V3)
pnpm build:all
pnpm zip:all                  # store upload packages in dist/
```

**Load it by hand**

- Chrome / Edge / Brave: `chrome://extensions` → *Developer mode* → *Load unpacked* → `dist/chrome`.
- Firefox: `about:debugging` → *This Firefox* → *Load Temporary Add-on* → `dist/firefox/manifest.json`.

The Chrome build contains a fixed public `key`, so the extension ID is always
**`ghkidhbnhaongflmfkimoaaiifebpbbc`**. The native host pins this exact ID.

## Registering the native host

The extension needs the `mjdm-nmhost` program from
[MJDM-APPLICATION](https://github.com/hostpika/MJDM-APPLICATION) to be registered with the browser.
The desktop installer does this for you. By hand on **Windows** (Chrome reads hosts only from the registry):

```bat
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.mjdm.host" /ve /t REG_SZ /d "C:\path\to\com.mjdm.host.json" /f
```

```json
{
  "name": "com.mjdm.host",
  "description": "MJDM Native Messaging Host",
  "path": "C:\\path\\to\\mjdm-nmhost.exe",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://ghkidhbnhaongflmfkimoaaiifebpbbc/"]
}
```

Chrome does **not** accept wildcard origins; always list the exact ID. On Linux the `.deb`/`.rpm`
package installs the manifests system-wide; for Flatpak browsers see the troubleshooting guide in the MJDM repo.

## Project layout (Chrome and Firefox)

One code base builds both browsers. Browser-specific files live in their own folders.

```
chrome/
  manifest.ts            Chrome-only manifest fields (fixed `key`)
  store/cws/             Chrome Web Store listing, permission justifications, privacy policy
  store/edge/            Microsoft Edge Add-ons metadata (Edge uses the Chrome build)
firefox/
  manifest.ts            Firefox-only fields (add-on id mjdm@mjnex.com, min Firefox 109)
  store/amo/             addons.mozilla.org metadata and reviewer notes
entrypoints/             background, popup, options, content scripts (shared by both)
  background.ts            interception, native port, message routing
  mediaOverlay.content.ts  the "Download video" button and quality menu
  grabber.content.ts       link grabber
  altBypass.content.ts     Alt-key detection
lib/
  capture/                 interception rules, handoff payloads, rate limiter, Firefox webRequest
  media/                   stream sniffer, HLS variant parsing, file naming
  native/                  native-messaging port, reconnect with back-off, protocol
  menus/                   context menus
  grabber/                 page link scanner
packages/shared-types/   Message and payload schemas (Zod), shared with the desktop's remote UI
test/                    Vitest suites
docs/                    Store listing copy, reviewer guide, Firefox smoke checklist
dist/                    Build output (git-ignored): dist/chrome, dist/firefox
wxt.config.ts            Shared manifest + build config (imports chrome/ and firefox/)
```

> The build output lives in `dist/`, not inside `chrome/` or `firefox/`, because WXT empties its
> output base folder on `wxt clean`; pointing it at a source folder would delete source.

## Permissions and privacy

| Permission | Why |
|---|---|
| `downloads` | Detect a download, cancel the browser's copy and hand it to MJDM |
| `nativeMessaging` | Talk to the local `mjdm-nmhost` program only |
| `cookies` | Pass the session cookies for that one file so private/gated downloads do not fail with 401/403 |
| `webRequest` | See response headers / media requests |
| `storage` | Keep your settings (bypass list, toggles, minimum size) |
| `contextMenus` | The right-click entries |
| `scripting` | Inject the link grabber and the video button |
| `<all_urls>` (host access) | Needed to read cookies and detect downloads/videos on any site |

**Privacy:** nothing is sent to MJDM servers. Cookies and URLs go only to the local desktop app over
native messaging on your own machine. The privacy policy used for the store listing is in
`chrome/store/cws/privacy-policy.md`.

## Testing

```bash
pnpm typecheck
pnpm test          # 63 tests (5 end-to-end tests are skipped unless the native host is available)
```

The suites cover interception rules, the Alt bypass, handoff payloads and the cookie budget,
reconnection back-off, context menus, the link grabber, the media sniffer and HLS variant parsing,
UI components, store-listing metadata, and a performance budget on the built bundle.

**End-to-end tests with the real native host** need the binary from MJDM-APPLICATION:

```bash
# in MJDM-APPLICATION
cargo build -p mjdm-nmhost

# here
MJDM_NMHOST_BIN=/path/to/MJDM-APPLICATION/target/debug/mjdm-nmhost pnpm test
```

If the repositories are checked out side by side (`../MJDM-APPLICATION`) the default path is found automatically.

## Publishing

- Store listing text and assets: `chrome/store/cws`, `chrome/store/edge`, `firefox/store/amo`.
- `pnpm zip:all` creates the upload packages (and a sources archive for Firefox review).
- Review notes for Mozilla: `firefox/store/amo/reviewer-notes.md`; manual check list: `docs/review/firefox-smoke-checklist.md`.
- After publishing in the Chrome Web Store, keep the same extension ID (the fixed `key`) so the
  native-host `allowed_origins` stays valid.

## Known gaps

1. The video button and the handoff require the desktop app **and a registered native host**; without them the button reports "MJDM not installed".
2. **DASH** streams are detected but cannot be downloaded yet; live HLS streams are refused.
3. HLS quality labels use the stream's `RESOLUTION`; streams without it show bitrate only.
4. The button only attaches to `<video>` elements; some players that draw into other elements are not detected.
5. Firefox support is built as Manifest V3 and covered by unit tests; a manual smoke test in Firefox is still listed in the checklist.
6. `shared-types` is also present in MJDM-APPLICATION (used by its remote UI); keep both copies in sync until the package is published.

---

## বাংলায় সারসংক্ষেপ

**MJDM Extension** Chrome ও Firefox থেকে download আর ভিডিও সরাসরি MJDM desktop app-এ পাঠায়, browser-এর cookie ও referrer সহ, যাতে লগইন-করা ফাইলও নামে।

- Download শুরু হলে browser-এর নিজের download থামিয়ে app-এ দেয়; app বন্ধ থাকলে browser নিজেই নামায় (ক্ষতি নেই)।
- ভিডিওর উপরে **"Download video"** বাটন, quality বেছে নেওয়ার মেনু সহ (HLS-এর প্রতিটা মান, সরাসরি MP4)।
- `Ctrl+Shift+D` চাপলে পেজের সব লিংক বেছে নামানো যায়। `Alt` চেপে ক্লিক করলে browser নিজে নামায়।
- **কোড একটাই**, আর `chrome/` ও `firefox/` ফোল্ডারে শুধু প্রতিটা browser-এর নিজস্ব জিনিস (manifest, store listing)।
- কিছু আপনার server-এ যায় না; সব আপনার নিজের PC-র মধ্যেই থাকে।
- কাজ করতে desktop app **ও** native host register করা লাগবে।

Proprietary — © MJNEX Technology. সর্বস্বত্ব সংরক্ষিত।
