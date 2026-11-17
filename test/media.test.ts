import { describe, it, expect, beforeEach, vi } from "vitest";
import { classifyMedia, MediaRegistry, setupMediaSniffer } from "../lib/media/sniffer";
import type { DetectedMedia } from "../lib/media/types";

describe("Media Sniffer & Registry (P7-T05)", () => {
  describe("classifyMedia", () => {
    it("classifies HLS streams by extension and content-type", () => {
      expect(classifyMedia("https://example.com/live/master.m3u8")).toBe("hls");
      expect(classifyMedia("https://example.com/stream.m3u8?token=xyz123")).toBe("hls");
      expect(classifyMedia("https://example.com/playlist", "application/vnd.apple.mpegurl")).toBe(
        "hls"
      );
      expect(classifyMedia("https://example.com/audio", "application/x-mpegURL")).toBe("hls");
    });

    it("classifies DASH streams by extension and content-type", () => {
      expect(classifyMedia("https://example.com/dash/manifest.mpd")).toBe("dash");
      expect(classifyMedia("https://example.com/dash.mpd?auth=1")).toBe("dash");
      expect(classifyMedia("https://example.com/video-manifest", "application/dash+xml")).toBe(
        "dash"
      );
    });

    it("classifies direct video and audio files", () => {
      expect(classifyMedia("https://example.com/trailer.mp4")).toBe("direct");
      expect(classifyMedia("https://example.com/video.webm?quality=1080")).toBe("direct");
      expect(classifyMedia("https://example.com/song.m4a")).toBe("direct");
      expect(classifyMedia("https://example.com/blob-resource", "video/mp4")).toBe("direct");
      expect(classifyMedia("https://example.com/audio-feed", "audio/aac")).toBe("direct");
    });

    it("ignores segment chunk noise to prevent flooding", () => {
      expect(classifyMedia("https://example.com/segment-0001.ts")).toBe(null);
      expect(classifyMedia("https://example.com/chunk-0002.m4s")).toBe(null);
    });

    it("ignores non-media resources", () => {
      expect(classifyMedia("https://example.com/index.html")).toBe(null);
      expect(classifyMedia("https://example.com/bundle.js")).toBe(null);
      expect(classifyMedia("https://example.com/style.css", "text/css")).toBe(null);
      expect(classifyMedia("https://example.com/api/data.json", "application/json")).toBe(null);
    });
  });

  describe("MediaRegistry", () => {
    let registry: MediaRegistry;

    beforeEach(() => {
      registry = new MediaRegistry();
    });

    it("stores and retrieves streams isolated by tab ID", () => {
      const media1: DetectedMedia = {
        id: "m1",
        tabId: 10,
        url: "https://example.com/v1.m3u8",
        kind: "hls",
        discoveredAt: Date.now(),
      };

      const media2: DetectedMedia = {
        id: "m2",
        tabId: 20,
        url: "https://example.com/v2.mpd",
        kind: "dash",
        discoveredAt: Date.now(),
      };

      expect(registry.addStream(media1)).toBe(true);
      expect(registry.addStream(media2)).toBe(true);

      expect(registry.getStreams(10)).toHaveLength(1);
      expect(registry.getStreams(10)[0].url).toBe("https://example.com/v1.m3u8");

      expect(registry.getStreams(20)).toHaveLength(1);
      expect(registry.getStreams(20)[0].url).toBe("https://example.com/v2.mpd");

      expect(registry.getStreams(999)).toHaveLength(0);
    });

    it("deduplicates identical URLs on the same tab", () => {
      const media1: DetectedMedia = {
        id: "m1",
        tabId: 10,
        url: "https://example.com/same.m3u8",
        kind: "hls",
        discoveredAt: Date.now(),
      };
      const media2: DetectedMedia = {
        id: "m2",
        tabId: 10,
        url: "https://example.com/same.m3u8",
        kind: "hls",
        discoveredAt: Date.now() + 100,
      };

      expect(registry.addStream(media1)).toBe(true);
      expect(registry.addStream(media2)).toBe(false);
      expect(registry.getStreams(10)).toHaveLength(1);
    });

    it("clears streams when tab closes", () => {
      registry.addStream({
        id: "m1",
        tabId: 15,
        url: "https://example.com/stream.m3u8",
        kind: "hls",
        discoveredAt: Date.now(),
      });

      expect(registry.getStreams(15)).toHaveLength(1);
      registry.clearTab(15);
      expect(registry.getStreams(15)).toHaveLength(0);
    });
  });

  describe("setupMediaSniffer integration", () => {
    it("registers webRequest listener and processes matching responses", () => {
      let listenerCallback: ((details: any) => void) | null = null;
      let tabRemoveCallback: ((tabId: number) => void) | null = null;

      const mockBrowser = {
        webRequest: {
          onResponseStarted: {
            addListener: vi.fn((cb) => {
              listenerCallback = cb;
            }),
          },
        },
        action: {
          setBadgeText: vi.fn(),
          setBadgeBackgroundColor: vi.fn(),
        },
        tabs: {
          sendMessage: vi.fn().mockResolvedValue(true),
          onRemoved: {
            addListener: vi.fn((cb) => {
              tabRemoveCallback = cb;
            }),
          },
        },
      };

      setupMediaSniffer(mockBrowser);

      expect(mockBrowser.webRequest.onResponseStarted.addListener).toHaveBeenCalled();
      expect(listenerCallback).not.toBeNull();

      // Trigger matching HLS event
      listenerCallback!({
        tabId: 42,
        url: "https://cdn.site.com/hls/master.m3u8",
        responseHeaders: [{ name: "content-type", value: "application/vnd.apple.mpegurl" }],
      });

      expect(mockBrowser.action.setBadgeText).toHaveBeenCalledWith({
        text: "1",
        tabId: 42,
      });

      expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          type: "MEDIA_DETECTED",
        })
      );
    });
  });
});
