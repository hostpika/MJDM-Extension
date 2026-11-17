# Store Reviewer Instructions & Verification Guide

Dear Extension Reviewer,

Thank you for reviewing **MJDM Download Manager Integration**. This document explains how the extension works, how to test its functionality, and provides steps for verification both with and without the companion desktop application.

---

## 1. Extension Purpose & Operation

MJDM Download Manager Integration is a companion extension for the MJDM (MJ Download Manager) open-source desktop application on Windows and Linux.
It performs three core tasks:
1. Detects file downloads initiated by the user (archives, software installers, documents, ISOs).
2. Sends the download URL, relevant headers, and origin-scoped session cookies to the local desktop application via the WebExtensions Native Messaging API (`com.mjdm.host`).
3. If the user invokes the Link Grabber (via context menu or `Ctrl+Shift+D`), scans links on the current page to let the user batch-download files.

---

## 2. Fail-Open Architecture (Testing Without Companion App)

You can verify the extension's behavior even without installing the desktop software:
1. Load the unpacked extension or install from store package.
2. Visit any standard public file download URL, for example:
   - `https://speed.hetzner.de/100MB.bin`
   - `https://releases.ubuntu.com/24.04/ubuntu-24.04.1-desktop-amd64.iso`
3. Click the download link.
4. **Expected Result:** Since the local desktop application is not installed on the reviewer machine, the native messaging handshake will safely return an unavailable status within 200 ms.
5. **Fail-Open Verification:** The extension immediately leaves the download intact; the browser's native download manager executes and completes the download without interruption or file loss.
6. Open the extension popup from the browser toolbar:
   - The status banner will clearly indicate: *"MJDM isn't running"* with a Retry / Start button.
   - All options and settings remain accessible and customizable.

---

## 3. Testing With Companion Native Host

To test the complete integration workflow:
1. Download the pre-built desktop binary or run `cargo build --workspace` from the open-source repository (https://github.com/mjdm/mjdm).
2. Run `mjdm --register-browsers` to install the Native Messaging manifest in the browser's registry/config path.
3. Reload the browser and open the extension popup. The status will report **Connected** with 0 active downloads.
4. Click any download link; the download will be immediately captured and displayed in the MJDM desktop interface.

---

## 4. Permissions Clarification

- **`downloads`:** Required to intercept user-initiated downloads and route them to MJDM.
- **`cookies`:** Strictly scoped to the origin of the file being downloaded so authenticated file downloads (e.g. from forums, file clouds) do not fail with HTTP 401/403. Cookies are only sent over local stdio to `127.0.0.1`.
- **`nativeMessaging`:** Required to communicate with the local `com.mjdm.host` process on the user's computer.
- **`scripting`:** Used solely to inject the on-demand Link Grabber UI overlay when requested by the user.

---

## 5. Source Code & Open Source Verification

- Full source code repository: https://github.com/mjdm/mjdm
- Build instructions: Standard WXT workflow (`pnpm install && pnpm build:chrome` or `pnpm build:firefox`).
- Zero remote code execution or obfuscation: All code is bundled cleanly using Vite with readable source maps available.

For any questions, please contact `reviewers@mjnex.com`.
