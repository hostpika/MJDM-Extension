# Store Listing Copy & Store Assets Specification

## Store Metadata

- **Name:** MJDM Download Manager Integration
- **Short Name:** MJDM Integration
- **Category:** Productivity / Tools
- **Default Language:** English (United States)
- **Supported Languages:** English (`en`), Bengali (`bn`)
- **Website URL:** https://mjdm.dev
- **Support / Issues URL:** https://github.com/mjdm/mjdm/issues

---

## Short Description (Maximum 132 characters)

> Integrates your browser with MJDM Download Manager for fast, multi-segmented file acceleration and reliable download capture.

*(118 characters — within Chrome Web Store 132-char limit)*

---

## Detailed Description (CWS / AMO / Edge Add-ons)

```markdown
MJDM Download Manager Integration connects your browser directly to the high-performance MJDM desktop application for Windows and Linux.

Enjoy seamless, high-speed multi-threaded file downloads, smart auto-categorization, pause-and-resume capabilities, and instant link grabbing — all through a clean, privacy-respecting native bridge.

KEY FEATURES:

⚡ Automatic Download Interception
Automatically routes file downloads (archives, disc images, documents, software packages, and media) directly to MJDM for multi-connection acceleration.

🎯 One-Click Link Grabber
Need to download multiple files from a web page? Press Ctrl+Shift+D or right-click to open the built-in Link Grabber. Easily search, filter by category (Documents, Compressed, Media, Programs), and download all files in one click.

🍪 Authenticated Downloads Support
Seamlessly passes necessary session cookies and referrers to your local MJDM desktop app so downloads from password-protected websites, private forums, and portals succeed without authentication errors.

🛡️ Zero Tracking & 100% Local Privacy
All communication takes place strictly on your local computer via length-prefixed native inter-process communication. No browsing history, cookies, or download URLs are ever sent to remote cloud servers or third parties.

🎛️ Full User Control
- Instant Alt-Key Bypass: Hold Alt when clicking a link to let your browser handle the download natively.
- Domain Exclusions: Add sites to your ignore list with a single click in the popup.
- Customizable Thresholds: Configure minimum file sizes and monitored file extensions in the Options page.
- Bilingual Interface: Full native support for English and Bengali (বাংলা).

⚡ Fail-Open Reliability
If the MJDM desktop app is closed or restarting, the extension never blocks your downloads. The browser immediately completes the download natively without disruption.

REQUIREMENTS:
Requires the free and open-source MJDM desktop application installed on your Windows or Linux system.
Get MJDM for desktop: https://mjdm.dev
```

---

## Policy Compliance Check (Store Rules & Risk Mitigation R-03)

- [x] **Single-Purpose Principle:** Exclusively serves to route user downloads to the local desktop application.
- [x] **Zero Forbidden Keywords:** **Zero** mention of "YouTube", specific streaming services, video ripping, or DRM circumvention anywhere in the text or manifests.
- [x] **Accurate Representation:** Features clearly explain that it is an integration helper for an installed desktop app.
- [x] **No Bundled Third-Party Executables:** The extension is 100% pure TypeScript/HTML/CSS WebExtension; native binaries reside on the user's OS filesystem.

---

## Store Listing Assets Checklist

| Asset | Dimensions | Format | Description |
|---|---|---|---|
| Extension Icon | 16x16, 32x32, 48x48, 128x128 | PNG (transparent) | MJDM classic blue download arrow & lightning bolt glyph |
| Store Tile (Small) | 440 x 280 px | PNG / JPEG | Primary icon with gradient background & product title |
| Promotional Tile (Marquee) | 1400 x 560 px | PNG / JPEG | Brand presentation banner with feature highlights |
| Screenshot 1 | 1280 x 800 px | PNG | Active Popup showing live speed, quick URL add, and status |
| Screenshot 2 | 1280 x 800 px | PNG | Link Grabber in action filtering links on a software page |
| Screenshot 3 | 1280 x 800 px | PNG | Options page showing customizable file types & site exclusions |
| Screenshot 4 | 1280 x 800 px | PNG | Desktop application + browser integration workflow demonstration |
