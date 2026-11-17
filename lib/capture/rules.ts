import { ExtensionSettings } from "../storage";

export interface InterceptCheckCandidate {
  url: string;
  filename?: string;
  mime?: string;
  size?: number;
}

export function shouldIntercept(
  candidate: InterceptCheckCandidate,
  settings: ExtensionSettings
): { intercept: boolean; reason: string } {
  if (!settings.enabled) {
    return { intercept: false, reason: "Extension disabled" };
  }

  // Parse URL & validate scheme
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(candidate.url);
  } catch {
    return { intercept: false, reason: "Invalid URL" };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { intercept: false, reason: `Unsupported protocol ${parsedUrl.protocol}` };
  }

  // Check excluded sites
  const hostname = parsedUrl.hostname.toLowerCase();
  for (const site of settings.excludedSites) {
    const clean = site.trim().toLowerCase();
    if (clean && (hostname === clean || hostname.endsWith(`.${clean}`))) {
      return { intercept: false, reason: `Site ${hostname} is excluded` };
    }
  }

  // Check size if known
  if (candidate.size !== undefined && candidate.size > 0 && candidate.size < settings.minSize) {
    return { intercept: false, reason: `Size ${candidate.size} B < minSize ${settings.minSize} B` };
  }

  // Check filename extension
  const filename = candidate.filename || parsedUrl.pathname.split("/").pop() || "";
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex > 0) {
    const ext = filename.substring(dotIndex + 1).toLowerCase();
    if (settings.fileTypes.includes(ext)) {
      return { intercept: true, reason: `Matched file extension .${ext}` };
    }
  }

  // Check MIME type if available
  if (candidate.mime) {
    const lowerMime = candidate.mime.toLowerCase();
    if (
      lowerMime.includes("application/octet-stream") ||
      lowerMime.includes("application/zip") ||
      lowerMime.includes("application/x-") ||
      lowerMime.startsWith("video/") ||
      lowerMime.startsWith("audio/")
    ) {
      return { intercept: true, reason: `Matched MIME type ${candidate.mime}` };
    }
  }

  return { intercept: false, reason: "No matching file extension or MIME type" };
}
