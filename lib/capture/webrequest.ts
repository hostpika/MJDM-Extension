import { shouldIntercept, type InterceptCheckCandidate } from "./rules";
import { globalOriginLimiter } from "./rateLimiter";
import { isAltKeyHeld } from "./altBypass";
import { getSettings } from "../storage";
import { nativePort } from "../native/port";
import { createCaptureMessage, type AckPayload } from "../native/protocol";

export interface FirefoxHeadersReceivedDetails {
  requestId: string;
  url: string;
  method: string;
  responseHeaders?: Array<{ name: string; value?: string }>;
  statusCode: number;
}

export async function handleFirefoxHeadersReceived(
  details: FirefoxHeadersReceivedDetails,
  browserApi: any = typeof browser !== "undefined" ? browser : undefined
): Promise<{ cancel?: boolean }> {
  // Only intercept GET requests
  if (details.method.toUpperCase() !== "GET") {
    return {};
  }

  // Check Alt-bypass
  const settings = await getSettings();
  if (settings.altBypassEnabled && isAltKeyHeld()) {
    return {};
  }

  // Extract Content-Disposition and Content-Type headers
  let contentDisposition = "";
  let contentType = "";
  let contentLength: number | undefined;

  if (details.responseHeaders) {
    for (const h of details.responseHeaders) {
      const lower = h.name.toLowerCase();
      if (lower === "content-disposition" && h.value) {
        contentDisposition = h.value;
      } else if (lower === "content-type" && h.value) {
        contentType = h.value;
      } else if (lower === "content-length" && h.value) {
        const parsed = parseInt(h.value, 10);
        if (!isNaN(parsed)) contentLength = parsed;
      }
    }
  }

  // Parse filename from Content-Disposition if present
  let filename = "";
  if (contentDisposition) {
    const fnMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    if (fnMatch && fnMatch[1]) {
      try {
        filename = decodeURIComponent(fnMatch[1]);
      } catch {
        filename = fnMatch[1];
      }
    }
  }

  const isAttachment = contentDisposition.toLowerCase().includes("attachment");
  const candidate: InterceptCheckCandidate = {
    url: details.url,
    filename: filename || undefined,
    mime: contentType || undefined,
    size: contentLength,
  };

  const check = shouldIntercept(candidate, settings);
  if (!check.intercept && !isAttachment) {
    return {}; // Fail-open: let browser load normally
  }

  // Origin rate limit
  try {
    const origin = new URL(details.url).origin;
    if (!globalOriginLimiter.allow(origin)) {
      return {}; // Rate limit exceeded (fail-open)
    }
  } catch {
    return {};
  }

  // Gather cookies
  let cookies: any[] = [];
  try {
    if (browserApi?.cookies?.getAll) {
      const rawCookies = await browserApi.cookies.getAll({ url: details.url });
      cookies = rawCookies.map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        expires: c.expirationDate,
      }));
    }
  } catch {
    // Fail-open: proceed with empty cookies
  }

  const finalFilename = filename || details.url.split("/").pop() || "download.bin";

  const captureMsg = createCaptureMessage({
    url: details.url,
    finalUrl: details.url,
    referrer: "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "MJDM-Firefox",
    cookies,
    filename: finalFilename,
    mime: contentType || undefined,
    size: contentLength,
    source: "download",
    incognito: false,
  });

  try {
    const resp = await nativePort.request(captureMsg, 300);
    if (resp.type === "ack") {
      const ack = resp.payload as AckPayload;
      if (ack.accepted) {
        // Accepted by MJDM engine: cancel the browser request so no duplicate file is created!
        return { cancel: true };
      }
    }
  } catch {
    // Timeout or unreachable: FAIL-OPEN
  }

  return {};
}
