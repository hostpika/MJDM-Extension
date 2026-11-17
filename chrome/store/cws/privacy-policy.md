# MJDM Browser Extension Privacy Policy

**Effective Date:** November 16, 2026  
**Publisher:** MJDM Open Source Project (tech.mjnex.mjdm)  
**Homepage:** https://mjdm.app

## 1. Core Commitment

The MJDM browser extension is built with privacy-by-design principles:

- **Zero Remote Analytics:** We do not track, collect, record, or transmit your browsing activity, visited URLs, search queries, or downloaded files to any external remote server.
- **Local Operation Only:** The extension communicates exclusively with the local native messaging host (`mjdm-nmhost`) running on your local loopback machine (`127.0.0.1` / IPC channel).
- **Single-Purpose Architecture:** The sole purpose of this extension is to hand off user-initiated download requests and HTTP headers to your local MJDM desktop application.

## 2. Permissions & Data Handling

- **downloads**: Used solely to intercept browser downloads and route them to MJDM.
- **nativeMessaging**: Used solely to exchange messages with the local `mjdm-nmhost` binary over standard input/output (`stdin`/`stdout`).
- **cookies**: Used strictly at download trigger time to forward authentication cookies for the requested download URL, preventing HTTP 403 Forbidden errors on authenticated downloads. Cookies are forwarded directly to local IPC and never sent to cloud servers.
- **storage**: Used strictly to persist your local user preferences (e.g., minimum file size threshold for interception, domain bypass lists).
- **contextMenus**: Used to provide right-click "Download with MJDM" and "Download all links with MJDM" context menu actions.
- **scripting**: Used to inject the visual media download sniffer button and batch grabber overlay only when requested by the user.

## 3. Third Parties

We do not sell, rent, trade, or share any user data with third parties or advertising networks.

## 4. Contact

For privacy inquiries: `privacy@mjdm.app`.
