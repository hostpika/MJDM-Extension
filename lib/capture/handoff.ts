import type {
  HandoffCookie,
  HandoffCapturePayload,
  RefreshUrlPayload,
  HandoffMessage,
} from "@mjdm/shared-types";
import { createRefreshUrlMessage } from "../native/protocol";
import { nativePort, type NativePortManager } from "../native/port";

export const MAX_COOKIE_PAYLOAD_BYTES = 200 * 1024; // 200 KB limit per §8.8 / P3-T04

export interface ExtractCookiesOptions {
  url: string;
  partitionKey?: Record<string, unknown>;
}

/**
 * Extracts cookies for a given URL, supporting partitioned cookies (CHIPS) where available.
 * Deduplicates and enforces the 200 KB budget limit.
 */
export async function extractCookies(
  url: string,
  browserApi: any = typeof browser !== "undefined"
    ? browser
    : (globalThis as { chrome?: unknown }).chrome
): Promise<HandoffCookie[]> {
  if (
    !browserApi?.cookies?.getAll ||
    (!url.startsWith("http://") && !url.startsWith("https://"))
  ) {
    return [];
  }

  const cookieMap = new Map<string, HandoffCookie>();

  // Helper to map and store raw cookie
  const addCookie = (c: any) => {
    if (!c || !c.name) return;
    const key = `${c.domain || ""}:${c.path || "/"}:${c.name}`;
    cookieMap.set(key, {
      name: c.name,
      value: c.value || "",
      domain: c.domain || "",
      path: c.path || "/",
      secure: Boolean(c.secure),
      httpOnly: Boolean(c.httpOnly),
      expires: typeof c.expirationDate === "number" ? c.expirationDate : undefined,
    });
  };

  // 1. Standard cookie retrieval
  try {
    const regularCookies = await browserApi.cookies.getAll({ url });
    if (Array.isArray(regularCookies)) {
      regularCookies.forEach(addCookie);
    }
  } catch {
    // Fail-open: continue
  }

  // 2. Partitioned cookies retrieval (CHIPS) where supported
  try {
    const partitionedCookies = await browserApi.cookies.getAll({
      url,
      partitionKey: {},
    });
    if (Array.isArray(partitionedCookies)) {
      partitionedCookies.forEach(addCookie);
    }
  } catch {
    // Partitioned cookies query not supported or throws on some browsers/contexts — ignore
  }

  // 3. Convert to array and enforce 200 KB size budget
  const result: HandoffCookie[] = [];
  let currentBytes = 0;

  for (const cookie of cookieMap.values()) {
    const cookieSize =
      cookie.name.length + cookie.value.length + cookie.domain.length + cookie.path.length;
    if (currentBytes + cookieSize > MAX_COOKIE_PAYLOAD_BYTES) {
      break; // Stop adding cookies once budget is reached
    }
    currentBytes += cookieSize;
    result.push(cookie);
  }

  return result;
}

export interface BuildPayloadOptions {
  url: string;
  finalUrl?: string;
  referrer?: string;
  userAgent?: string;
  filename: string;
  mime?: string;
  size?: number;
  source?: "download" | "context_menu" | "media" | "grabber" | "manual";
  incognito?: boolean;
  pageTitle?: string;
  headers?: Record<string, string>;
}

/**
 * Builds complete validated HandoffCapturePayload with cookies, referrer, and user-agent.
 */
export async function buildCapturePayload(
  options: BuildPayloadOptions,
  browserApi?: any
): Promise<HandoffCapturePayload> {
  const cookies = await extractCookies(options.url, browserApi);
  const userAgent =
    options.userAgent ||
    (typeof navigator !== "undefined" ? navigator.userAgent : "Mozilla/5.0 MJDM");

  return {
    url: options.url,
    finalUrl: options.finalUrl || options.url,
    referrer: options.referrer || undefined,
    userAgent,
    cookies,
    filename: options.filename,
    mime: options.mime,
    size: options.size,
    source: options.source || "download",
    incognito: options.incognito || false,
    pageTitle: options.pageTitle,
    headers: options.headers,
  };
}

/**
 * Sends a refresh_url message to native port for expired links.
 */
export async function sendRefreshUrl(
  payload: RefreshUrlPayload,
  port: NativePortManager = nativePort
): Promise<HandoffMessage | boolean> {
  const msg = createRefreshUrlMessage(payload);
  try {
    return await port.request(msg, 500);
  } catch {
    return port.send(msg);
  }
}
