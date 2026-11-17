export interface ScannedLinkItem {
  id: string;
  url: string;
  filename: string;
  ext: string;
  category: string;
  selected: boolean;
}

export function categorizeExtension(ext: string): string {
  const e = ext.toLowerCase();
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso"].includes(e)) return "Compressed";
  if (["exe", "msi", "dmg", "pkg", "deb", "rpm", "apk"].includes(e)) return "Programs";
  if (["mp4", "mkv", "avi", "mov", "webm", "flv"].includes(e)) return "Video";
  if (["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(e)) return "Audio";
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "epub", "txt"].includes(e))
    return "Documents";
  return "Other";
}

export function scanPageLinks(doc: Document = document): ScannedLinkItem[] {
  const items: ScannedLinkItem[] = [];
  const seenUrls = new Set<string>();

  // 1. Scan anchor links
  const anchors = Array.from(doc.querySelectorAll("a[href]"));
  for (const a of anchors) {
    const rawHref = (a as HTMLAnchorElement).href;
    if (!rawHref || (!rawHref.startsWith("http://") && !rawHref.startsWith("https://"))) continue;
    if (seenUrls.has(rawHref)) continue;
    seenUrls.add(rawHref);

    const cleanUrl = rawHref.split(/[?#]/)[0];
    const rawName = cleanUrl.split("/").pop() || "download.bin";
    const parts = rawName.split(".");
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "";
    const filename = rawName || "download.bin";

    items.push({
      id: Math.random().toString(36).substring(2, 9),
      url: rawHref,
      filename,
      ext,
      category: categorizeExtension(ext),
      selected: true,
    });
  }

  // 2. Scan media elements (images, videos, audios)
  const media = Array.from(doc.querySelectorAll("img[src], video[src], audio[src], source[src]"));
  for (const m of media) {
    const rawSrc = (m as HTMLImageElement).src;
    if (!rawSrc || (!rawSrc.startsWith("http://") && !rawSrc.startsWith("https://"))) continue;
    if (seenUrls.has(rawSrc)) continue;
    seenUrls.add(rawSrc);

    const cleanUrl = rawSrc.split(/[?#]/)[0];
    const rawName = cleanUrl.split("/").pop() || "media.bin";
    const parts = rawName.split(".");
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "";

    items.push({
      id: Math.random().toString(36).substring(2, 9),
      url: rawSrc,
      filename: rawName,
      ext,
      category: categorizeExtension(ext),
      selected: true,
    });
  }

  return items;
}
