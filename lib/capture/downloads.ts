import { shouldIntercept, type InterceptCheckCandidate } from "./rules";
import { globalOriginLimiter } from "./rateLimiter";
import { isAltKeyHeld } from "./altBypass";
import { extractCookies } from "./handoff";
import { getSettings } from "../storage";
import { nativePort } from "../native/port";
import { createCaptureMessage, type AckPayload } from "../native/protocol";

export interface ChromiumDownloadItem {
  id: number;
  url?: string;
  finalUrl?: string;
  referrer?: string;
  filename?: string;
  mime?: string;
  totalBytes?: number;
  incognito?: boolean;
  method?: string;
}

export async function handleChromiumDownloadCreated(
  item: ChromiumDownloadItem,
  browserApi: any = typeof browser !== "undefined" ? browser : undefined
): Promise<{ intercepted: boolean; reason: string }> {
  // 1. Must have a valid URL
  if (!item.url) {
    return { intercepted: false, reason: "No URL provided" };
  }

  // 2. Reject non-GET / POST downloads (POST bodies cannot be reliably replayed)
  if (item.method && item.method.toUpperCase() === "POST") {
    return { intercepted: false, reason: "POST method download (fail-open)" };
  }

  // 3. Alt-key bypass check
  const settings = await getSettings();
  if (settings.altBypassEnabled && isAltKeyHeld()) {
    return { intercepted: false, reason: "Bypassed via Alt modifier key" };
  }

  // 4. Scheme and rule evaluation
  const candidate: InterceptCheckCandidate = {
    url: item.url,
    filename: item.filename,
    mime: item.mime,
    size: item.totalBytes && item.totalBytes > 0 ? item.totalBytes : undefined,
  };

  const check = shouldIntercept(candidate, settings);
  if (!check.intercept) {
    return { intercepted: false, reason: check.reason };
  }

  // 5. Rate limit check (20 captures/min per origin)
  let origin = "unknown";
  try {
    origin = new URL(item.url).origin;
  } catch {
    return { intercepted: false, reason: "Invalid URL" };
  }

  if (!globalOriginLimiter.allow(origin)) {
    return { intercepted: false, reason: `Rate limit exceeded for origin ${origin} (fail-open)` };
  }

  // 6. Gather cookies (including partitioned CHIPS)
  const cookies = await extractCookies(item.url, browserApi);

  // 7. Filename extraction
  const finalFilename = item.filename
    ? item.filename.split(/[\\/]/).pop() || "download.bin"
    : "download.bin";

  const captureMsg = createCaptureMessage({
    url: item.url,
    finalUrl: item.finalUrl || item.url,
    referrer: item.referrer || "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "MJDM-Browser",
    cookies,
    filename: finalFilename,
    mime: item.mime,
    size: item.totalBytes && item.totalBytes > 0 ? item.totalBytes : undefined,
    source: "download",
    incognito: item.incognito || false,
  });

  // 8. Hand-off sequence: send capture to native host, await ack (<= 300ms)
  try {
    const resp = await nativePort.request(captureMsg, 300);
    if (resp.type === "ack") {
      const ack = resp.payload as AckPayload;
      if (ack.accepted) {
        // App acknowledged and accepted download: cancel and erase from browser
        if (browserApi?.downloads) {
          await browserApi.downloads.cancel(item.id);
          await browserApi.downloads.erase({ id: item.id });
        }
        return { intercepted: true, reason: "Download handed off to MJDM engine" };
      }
    }
  } catch {
    // Timeout, disconnection, or rejection: FAIL-OPEN! Browser continues download.
  }

  return { intercepted: false, reason: "Native host not accepted or timed out (fail-open)" };
}
