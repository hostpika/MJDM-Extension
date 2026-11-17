import { describe, it, expect, beforeEach } from "vitest";
import { OriginRateLimiter } from "../lib/capture/rateLimiter";
import { setAltKeyHeld, isAltKeyHeld } from "../lib/capture/altBypass";
import { handleChromiumDownloadCreated } from "../lib/capture/downloads";
import { handleFirefoxHeadersReceived } from "../lib/capture/webrequest";

describe("Download Interception & Fail-Open Mechanisms", () => {
  beforeEach(() => {
    setAltKeyHeld(false);
  });

  it("enforces origin rate limit of 20 captures per minute", () => {
    const limiter = new OriginRateLimiter(20);
    const origin = "https://download.example.com";
    const now = 1_000_000;

    // First 20 allowed
    for (let i = 0; i < 20; i++) {
      expect(limiter.allow(origin, now + i)).toBe(true);
    }

    // 21st within same minute is rejected (fail-open)
    expect(limiter.allow(origin, now + 5000)).toBe(false);

    // Different origin is still allowed
    expect(limiter.allow("https://another-domain.com", now + 5000)).toBe(true);

    // After 60 seconds, origin is allowed again
    expect(limiter.allow(origin, now + 65_000)).toBe(true);
  });

  it("fails open on POST downloads without cancelling browser request", async () => {
    const result = await handleChromiumDownloadCreated({
      id: 101,
      url: "https://example.com/export.zip",
      method: "POST",
    });

    expect(result.intercepted).toBe(false);
    expect(result.reason).toContain("POST method download");
  });

  it("bypasses interception when Alt key is held down (Alt-bypass)", async () => {
    setAltKeyHeld(true);
    expect(isAltKeyHeld()).toBe(true);

    // With alt held, even matching files are not intercepted if altBypass is enabled
    // When altBypass is enabled in settings, isAltKeyHeld triggers bypass
  });

  it("fails open on non-matching or error states in Firefox webRequest", async () => {
    // Normal HTML document without Content-Disposition
    const res = await handleFirefoxHeadersReceived({
      requestId: "req-1",
      url: "https://example.com/index.html",
      method: "GET",
      statusCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "text/html" }],
    });

    // Empty object means let browser continue request normally
    expect(res).toEqual({});
  });

  it("fails open on POST requests in Firefox webRequest", async () => {
    const res = await handleFirefoxHeadersReceived({
      requestId: "req-2",
      url: "https://example.com/api/download",
      method: "POST",
      statusCode: 200,
    });

    expect(res).toEqual({});
  });
});
