import { buildCapturePayload } from "../capture/handoff";
import { nativePort } from "../native/port";
import { createCaptureMessage, type AckPayload } from "../native/protocol";

export const CONTEXT_MENU_IDS = {
  DOWNLOAD_LINK: "mjdm-download-link",
  DOWNLOAD_MEDIA: "mjdm-download-media",
  DOWNLOAD_ALL_LINKS: "mjdm-download-all-links",
} as const;

/**
 * Registers MJDM context menu entries in browser.
 */
export function setupContextMenus(
  browserApi: any = typeof browser !== "undefined" ? browser : undefined
): void {
  if (!browserApi?.contextMenus) return;

  try {
    browserApi.contextMenus.removeAll(() => {
      // 1. Download Link
      browserApi.contextMenus.create({
        id: CONTEXT_MENU_IDS.DOWNLOAD_LINK,
        title: "Download with MJDM",
        contexts: ["link"],
      });

      // 2. Download Media (Image / Video / Audio)
      browserApi.contextMenus.create({
        id: CONTEXT_MENU_IDS.DOWNLOAD_MEDIA,
        title: "Download media with MJDM",
        contexts: ["image", "video", "audio"],
      });

      // 3. Download All Links on Page / Selection
      browserApi.contextMenus.create({
        id: CONTEXT_MENU_IDS.DOWNLOAD_ALL_LINKS,
        title: "Download all links with MJDM...",
        contexts: ["page", "selection"],
      });
    });
  } catch {
    // Fail-open: ignore menu registration errors
  }
}

/**
 * Handles context menu clicks, extracting target URL and delegating to native host or grabber.
 */
export async function handleContextMenuClick(
  info: any,
  tab?: any,
  browserApi: any = typeof browser !== "undefined" ? browser : undefined
): Promise<{ handled: boolean; action: string }> {
  if (!info || !info.menuItemId) {
    return { handled: false, action: "none" };
  }

  // 1. Download Link
  if (info.menuItemId === CONTEXT_MENU_IDS.DOWNLOAD_LINK && info.linkUrl) {
    const rawUrl = info.linkUrl.trim();

    // Strict scheme allow-list for context-menu download hand-off: http, https, and magnet only
    const lower = rawUrl.toLowerCase();
    if (
      !lower.startsWith("http://") &&
      !lower.startsWith("https://") &&
      !lower.startsWith("magnet:?")
    ) {
      return { handled: false, action: "unsupported_scheme" };
    }

    let filename = "download.bin";
    let isTorrentOrMagnet = false;

    if (lower.startsWith("magnet:?")) {
      isTorrentOrMagnet = true;
      const dnMatch = rawUrl.match(/[?&]dn=([^&]+)/i);
      if (dnMatch?.[1]) {
        try {
          filename = decodeURIComponent(dnMatch[1].replace(/\+/g, " "));
        } catch {
          filename = dnMatch[1];
        }
      } else {
        const xtMatch = rawUrl.match(/[?&]xt=urn:btih:([a-zA-Z0-9]+)/i);
        filename = xtMatch?.[1] ? `magnet_${xtMatch[1].slice(0, 8)}` : "magnet_download";
      }
    } else {
      const cleanPath = rawUrl.split(/[?#]/)[0];
      filename = cleanPath.split("/").pop() || "download.bin";
      if (filename.toLowerCase().endsWith(".torrent")) {
        isTorrentOrMagnet = true;
      }
    }

    const payload = await buildCapturePayload(
      {
        url: rawUrl,
        referrer: info.pageUrl || tab?.url,
        filename,
        source: "context_menu",
        pageTitle: tab?.title,
      },
      browserApi
    );

    const msg = createCaptureMessage(payload);
    await nativePort.request(msg, 500).catch(() => nativePort.send(msg));
    return { handled: true, action: isTorrentOrMagnet ? "download_torrent" : "download_link" };
  }

  // 2. Download Media
  if (info.menuItemId === CONTEXT_MENU_IDS.DOWNLOAD_MEDIA && info.srcUrl) {
    const filename = info.srcUrl.split(/[?#]/)[0].split("/").pop() || "media.bin";
    const payload = await buildCapturePayload(
      {
        url: info.srcUrl,
        referrer: info.pageUrl || tab?.url,
        filename,
        source: "media",
        pageTitle: tab?.title,
      },
      browserApi
    );

    const msg = createCaptureMessage(payload);
    await nativePort.request(msg, 500).catch(() => nativePort.send(msg));
    return { handled: true, action: "download_media" };
  }

  // 3. Download All Links
  if (info.menuItemId === CONTEXT_MENU_IDS.DOWNLOAD_ALL_LINKS && tab?.id) {
    await injectLinkGrabber(tab.id, browserApi);
    return { handled: true, action: "inject_grabber" };
  }

  return { handled: false, action: "unknown" };
}

/**
 * Programmatically injects the link grabber content script on-demand.
 * Enforces zero-overhead when idle (no always-on content script).
 */
export async function injectLinkGrabber(
  tabId: number,
  browserApi: any = typeof browser !== "undefined" ? browser : undefined
): Promise<boolean> {
  if (!browserApi?.scripting?.executeScript) return false;

  try {
    await browserApi.scripting.executeScript({
      target: { tabId },
      files: ["content-scripts/grabber.js"],
    });
    return true;
  } catch {
    return false;
  }
}
