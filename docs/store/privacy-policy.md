# Privacy Policy — MJDM Browser Integration Extension

**Effective Date:** November 15, 2026  
**Last Updated:** November 15, 2026  
**Applicability:** MJDM Browser Extension (Chrome Web Store, Firefox Add-ons, Microsoft Edge Add-ons)

---

## 1. Core Commitment: Local-Only, Zero Tracking

MJDM ("MJ Download Manager") is designed with a strict privacy-first architecture. 

- **We do not track, collect, store, sell, or transmit your personal browsing history, search queries, or downloaded files to any external remote servers.**
- **All extension operations are executed 100% locally on your machine.**
- The extension communicates exclusively with the locally installed desktop application (`com.mjdm.host`) via native inter-process communication on your own computer.

---

## 2. Information Handled by the Extension

When you initiate or trigger a download, the extension temporarily reads the following technical metadata:

1. **Target Download URL:** The web address of the file you are downloading.
2. **HTTP Headers & Cookies:** Session cookies and headers (such as `Referer` and `User-Agent`) associated specifically with the download URL's domain. This is required so that downloads from authenticated sites (e.g., student portals, cloud drives) succeed without error.
3. **Suggested Filename & Content-Length:** Metadata provided by the web server to name the file and determine its size.
4. **Local Configuration Preferences:** Your chosen settings (such as enabled file extensions, minimum file size threshold, excluded domains, and language selection).

---

## 3. How Information Is Used and Transferred

- **Local IPC Transfer Only:** When a download meets your configured capture criteria, this metadata is passed directly to the local MJDM desktop engine running on your computer via Chrome/Firefox Native Messaging API (`stdio`).
- **Zero Cloud Transmission:** This data is **never** sent to any cloud server, third-party API, remote analytical service, or advertising network.
- **Fail-Open Safe:** If the MJDM desktop application is not running or is closed, the extension does not block or cancel your download; your browser handles it normally.

---

## 4. User Controls and Data Retention

- **Domain Exclusions:** You can easily exclude specific websites (e.g. your bank, intranet, or personal mail) via the extension popup or Options page. The extension will completely ignore all downloads from excluded domains.
- **Temporary Bypass:** Holding the `Alt` key while clicking a download link bypasses MJDM and forces the native browser download.
- **Settings Storage:** Your configuration preferences are stored locally in your browser's `chrome.storage.local` and can be reset or cleared at any time by uninstalling the extension or clearing browser extension data.

---

## 5. Third-Party Services and Analytics

- The extension contains **no tracking libraries, no Google Analytics, no telemetry beacons, and no external advertising scripts**.
- There is zero logging of user identities or account information.

---

## 6. Contact and Inquiries

If you have questions regarding this Privacy Policy or MJDM security practices, please contact:
- **Developer / Project:** MJDM Project Team
- **Repository:** https://github.com/mjdm/mjdm
- **Email:** privacy@mjnex.com
