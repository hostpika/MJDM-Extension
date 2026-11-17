import { describe, it, expect, vi } from "vitest";
import {
  extractCookies,
  buildCapturePayload,
  sendRefreshUrl,
  MAX_COOKIE_PAYLOAD_BYTES,
} from "../lib/capture/handoff";

describe("Handoff cookie & header extraction", () => {
  it("extracts regular cookies and maps them cleanly", async () => {
    const mockBrowser = {
      cookies: {
        getAll: vi.fn().mockImplementation(async (query: { url: string; partitionKey?: any }) => {
          if (!query.partitionKey) {
            return [
              {
                name: "session_id",
                value: "abc123xyz",
                domain: "example.com",
                path: "/",
                secure: true,
                httpOnly: true,
                expirationDate: 1770000000,
              },
            ];
          }
          return [];
        }),
      },
    };

    const cookies = await extractCookies("https://example.com/file.zip", mockBrowser);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toEqual({
      name: "session_id",
      value: "abc123xyz",
      domain: "example.com",
      path: "/",
      secure: true,
      httpOnly: true,
      expires: 1770000000,
    });
  });

  it("queries partitioned cookies and deduplicates with standard cookies", async () => {
    const mockBrowser = {
      cookies: {
        getAll: vi.fn().mockImplementation(async (query: { url: string; partitionKey?: any }) => {
          if (query.partitionKey) {
            return [
              {
                name: "session_id", // Duplicate, should be deduplicated
                value: "abc123xyz",
                domain: "example.com",
                path: "/",
                secure: true,
                httpOnly: true,
              },
              {
                name: "chips_partitioned",
                value: "partitioned_val",
                domain: "example.com",
                path: "/",
                secure: true,
                httpOnly: false,
              },
            ];
          }
          return [
            {
              name: "session_id",
              value: "abc123xyz",
              domain: "example.com",
              path: "/",
              secure: true,
              httpOnly: true,
            },
          ];
        }),
      },
    };

    const cookies = await extractCookies("https://example.com/file.zip", mockBrowser);
    expect(cookies).toHaveLength(2);
    expect(cookies.map((c) => c.name)).toEqual(["session_id", "chips_partitioned"]);
  });

  it("caps cookies at 200 KB limit", async () => {
    const hugeValue = "a".repeat(50 * 1024); // 50 KB
    const mockCookies = [
      { name: "c1", value: hugeValue, domain: "example.com", path: "/" },
      { name: "c2", value: hugeValue, domain: "example.com", path: "/" },
      { name: "c3", value: hugeValue, domain: "example.com", path: "/" },
      { name: "c4", value: hugeValue, domain: "example.com", path: "/" },
      { name: "c5", value: hugeValue, domain: "example.com", path: "/" }, // Total > 250 KB
    ];

    const mockBrowser = {
      cookies: {
        getAll: vi.fn().mockResolvedValue(mockCookies),
      },
    };

    const cookies = await extractCookies("https://example.com/file.zip", mockBrowser);
    let totalBytes = 0;
    for (const c of cookies) {
      totalBytes += c.name.length + c.value.length + c.domain.length + c.path.length;
    }
    expect(totalBytes).toBeLessThanOrEqual(MAX_COOKIE_PAYLOAD_BYTES);
    expect(cookies.length).toBeLessThan(mockCookies.length);
  });

  it("builds complete capture payload with referrer and headers", async () => {
    const mockBrowser = {
      cookies: {
        getAll: vi.fn().mockResolvedValue([]),
      },
    };

    const payload = await buildCapturePayload(
      {
        url: "https://example.com/archive.iso",
        referrer: "https://example.com/downloads",
        userAgent: "Custom-UA/1.0",
        filename: "archive.iso",
        size: 1048576,
        headers: {
          "X-Custom-Auth": "secret-header",
        },
      },
      mockBrowser
    );

    expect(payload.url).toBe("https://example.com/archive.iso");
    expect(payload.referrer).toBe("https://example.com/downloads");
    expect(payload.userAgent).toBe("Custom-UA/1.0");
    expect(payload.filename).toBe("archive.iso");
    expect(payload.size).toBe(1048576);
    expect(payload.headers?.["X-Custom-Auth"]).toBe("secret-header");
  });

  it("sends refresh_url message over native port", async () => {
    const mockPort = {
      request: vi.fn().mockResolvedValue({
        v: 1,
        id: "req-1",
        type: "ack",
        payload: { accepted: true },
      }),
      send: vi.fn().mockReturnValue(true),
    };

    const result = await sendRefreshUrl(
      {
        downloadId: "dl-456",
        url: "https://example.com/new-refreshed-url.bin",
        cookies: [
          {
            name: "token",
            value: "fresh",
            domain: "example.com",
            path: "/",
            secure: true,
            httpOnly: true,
          },
        ],
      },
      mockPort as any
    );

    expect(mockPort.request).toHaveBeenCalledTimes(1);
    const sentMsg = mockPort.request.mock.calls[0][0];
    expect(sentMsg.type).toBe("refresh_url");
    expect(sentMsg.payload.downloadId).toBe("dl-456");
    expect(sentMsg.payload.url).toBe("https://example.com/new-refreshed-url.bin");
    expect(result).toEqual({
      v: 1,
      id: "req-1",
      type: "ack",
      payload: { accepted: true },
    });
  });
});
