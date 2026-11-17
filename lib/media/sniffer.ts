import type { DetectedMedia, MediaKind } from "./types";

export class MediaRegistry {
  private streamsByTab: Map<number, DetectedMedia[]> = new Map();

  public addStream(stream: DetectedMedia): boolean {
    const list = this.streamsByTab.get(stream.tabId) || [];
    // Avoid exact duplicate URLs on the same tab
    if (list.some((s) => s.url === stream.url)) {
      return false;
    }
    list.push(stream);
    this.streamsByTab.set(stream.tabId, list);
    return true;
  }

  public getStreams(tabId: number): DetectedMedia[] {
    return this.streamsByTab.get(tabId) || [];
  }

  public clearTab(tabId: number): void {
    this.streamsByTab.delete(tabId);
  }

  public clearAll(): void {
    this.streamsByTab.clear();
  }
}

export const globalMediaRegistry = new MediaRegistry();

export interface HlsVariant {
  url: string;
  /** "1080p" when RESOLUTION is present, otherwise "2500 kbps". */
  quality: string;
  bandwidth: number;
}

/**
 * Extracts the quality variants (resolution / bandwidth) from an HLS *master* playlist.
 * Returns [] for media playlists. Highest bandwidth first, capped at 12 entries.
 */
export function parseHlsMasterVariants(text: string, baseUrl: string): HlsVariant[] {
  if (!text.includes("#EXT-X-STREAM-INF")) {
    return [];
  }
  const lines = text.split(/\r?\n/);
  const found = new Map<string, HlsVariant>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;

    const bw = /BANDWIDTH=(\d+)/.exec(line);
    const res = /RESOLUTION=(\d+)x(\d+)/.exec(line);

    let j = i + 1;
    while (j < lines.length && (lines[j].trim() === "" || lines[j].trim().startsWith("#"))) j++;
    const uri = lines[j]?.trim();
    if (!uri) continue;

    let url: string;
    try {
      url = new URL(uri, baseUrl).href;
    } catch {
      continue;
    }

    const bandwidth = bw ? parseInt(bw[1], 10) : 0;
    const quality = res
      ? `${res[2]}p`
      : bandwidth
        ? `${Math.round(bandwidth / 1000)} kbps`
        : "Variant";
    found.set(url, { url, quality, bandwidth });
  }

  return [...found.values()].sort((a, b) => b.bandwidth - a.bandwidth).slice(0, 12);
}

/** Builds a safe file name for a detected stream, with the right extension. */
export function fileNameForMedia(
  title: string,
  url: string,
  kind: MediaKind,
  quality?: string
): string {
  const safeTitle = (title || "video").replace(/[/\\?%*:|"<>]/g, "_").trim() || "video";
  let ext = "mp4"; // HLS/DASH are saved as a playable container by the desktop app
  if (kind === "direct") {
    const m = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(url.split("?")[0] + "?");
    ext = m ? m[1].toLowerCase() : "mp4";
  }
  const q = quality && !/^auto/i.test(quality) ? ` [${quality}]` : "";
  const base = `${safeTitle}${q}`;
  return base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`;
}

/**
 * Inspects a request URL and Content-Type header to classify streaming/direct media.
 */
export function classifyMedia(url: string, contentType?: string): MediaKind | null {
  const cleanUrl = url.split("?")[0].toLowerCase();
  const lowerContentType = (contentType || "").toLowerCase();

  // 1. HLS Playlist
  if (
    cleanUrl.endsWith(".m3u8") ||
    lowerContentType.includes("application/vnd.apple.mpegurl") ||
    lowerContentType.includes("application/x-mpegurl") ||
    lowerContentType.includes("audio/x-mpegurl")
  ) {
    return "hls";
  }

  // 2. DASH MPD
  if (cleanUrl.endsWith(".mpd") || lowerContentType.includes("application/dash+xml")) {
    return "dash";
  }

  // 3. Direct video or audio file
  const videoExtRegex = /\.(mp4|webm|mkv|m4v|mov|flv|avi|wmv)(\?|#|$)/i;
  const audioExtRegex = /\.(mp3|m4a|aac|ogg|opus|wav|flac)(\?|#|$)/i;

  if (videoExtRegex.test(url) || audioExtRegex.test(url)) {
    return "direct";
  }

  if (lowerContentType.startsWith("video/") || lowerContentType.startsWith("audio/")) {
    // Avoid chunk noise (ignore small ts/m4s stream segments if MIME is generic)
    if (cleanUrl.endsWith(".ts") || cleanUrl.endsWith(".m4s")) {
      return null;
    }
    return "direct";
  }

  return null;
}

function announce(browserInstance: any, tabId: number): void {
  const all = globalMediaRegistry.getStreams(tabId);
  const total = all.length;
  if (browserInstance.action?.setBadgeText) {
    browserInstance.action.setBadgeText({ text: total > 0 ? String(total) : "", tabId });
    browserInstance.action.setBadgeBackgroundColor?.({ color: "#2563eb", tabId });
  }
  if (browserInstance.tabs?.sendMessage) {
    browserInstance.tabs.sendMessage(tabId, { type: "MEDIA_DETECTED", allMedia: all }).catch(() => {
      // Ignore if content script not yet injected or listening
    });
  }
}

/** Fetches an HLS master playlist and registers one entry per quality variant. */
async function expandHlsVariants(browserInstance: any, master: DetectedMedia): Promise<void> {
  try {
    const res = await fetch(master.url, { credentials: "include" });
    if (!res.ok) return;
    const variants = parseHlsMasterVariants(await res.text(), master.url);
    if (variants.length === 0) return;

    master.quality = "Auto (best)";
    for (const v of variants) {
      globalMediaRegistry.addStream({
        id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tabId: master.tabId,
        url: v.url,
        kind: "hls",
        quality: v.quality,
        bandwidth: v.bandwidth,
        variantOf: master.id,
        discoveredAt: Date.now(),
      });
    }
    announce(browserInstance, master.tabId);
  } catch {
    // Network/CORS failure: keep the master entry without variants
  }
}

/**
 * Initializes passive observation of streaming media over webRequest without blocking.
 */
export function setupMediaSniffer(browserInstance: any): void {
  if (!browserInstance?.webRequest?.onResponseStarted) {
    return;
  }

  browserInstance.webRequest.onResponseStarted.addListener(
    (details: any) => {
      if (details.tabId < 0) {
        return;
      }

      let contentType: string | undefined;
      let contentLength: number | undefined;

      if (Array.isArray(details.responseHeaders)) {
        for (const h of details.responseHeaders) {
          const name = h.name.toLowerCase();
          if (name === "content-type") {
            contentType = h.value;
          } else if (name === "content-length") {
            const parsed = parseInt(h.value, 10);
            if (!isNaN(parsed)) {
              contentLength = parsed;
            }
          }
        }
      }

      const kind = classifyMedia(details.url, contentType);
      if (!kind) {
        return;
      }

      const mediaItem: DetectedMedia = {
        id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tabId: details.tabId,
        url: details.url,
        kind,
        contentType,
        contentLength,
        discoveredAt: Date.now(),
      };

      const added = globalMediaRegistry.addStream(mediaItem);
      if (added) {
        announce(browserInstance, details.tabId);
        if (kind === "hls") {
          void expandHlsVariants(browserInstance, mediaItem);
        }
      }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
  );

  // A new page in the same tab must not keep the previous page's streams.
  if (browserInstance.tabs?.onUpdated) {
    browserInstance.tabs.onUpdated.addListener((tabId: number, changeInfo: any) => {
      if (changeInfo.status === "loading" && changeInfo.url) {
        globalMediaRegistry.clearTab(tabId);
        browserInstance.action?.setBadgeText?.({ text: "", tabId });
      }
    });
  }

  // Clean up media registry when a tab closes
  if (browserInstance.tabs?.onRemoved) {
    browserInstance.tabs.onRemoved.addListener((tabId: number) => {
      globalMediaRegistry.clearTab(tabId);
    });
  }
}
