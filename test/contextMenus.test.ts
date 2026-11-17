import { describe, it, expect, vi } from "vitest";
import {
  setupContextMenus,
  handleContextMenuClick,
  injectLinkGrabber,
  CONTEXT_MENU_IDS,
} from "../lib/menus/contextMenus";
import { nativePort } from "../lib/native/port";

vi.mock("../lib/native/port", () => ({
  nativePort: {
    request: vi.fn().mockResolvedValue({ type: "ack", payload: { accepted: true } }),
    send: vi.fn().mockReturnValue(true),
  },
}));

describe("Context menus & link grabber injection", () => {
  it("registers all 3 context menus on setup", () => {
    const mockBrowser = {
      contextMenus: {
        removeAll: vi.fn().mockImplementation((cb: () => void) => cb()),
        create: vi.fn(),
      },
    };

    setupContextMenus(mockBrowser);

    expect(mockBrowser.contextMenus.removeAll).toHaveBeenCalled();
    expect(mockBrowser.contextMenus.create).toHaveBeenCalledTimes(3);

    const createdIds = mockBrowser.contextMenus.create.mock.calls.map((c: any[]) => c[0].id);
    expect(createdIds).toContain(CONTEXT_MENU_IDS.DOWNLOAD_LINK);
    expect(createdIds).toContain(CONTEXT_MENU_IDS.DOWNLOAD_MEDIA);
    expect(createdIds).toContain(CONTEXT_MENU_IDS.DOWNLOAD_ALL_LINKS);
  });

  it("handles DOWNLOAD_LINK click by sending capture to native port", async () => {
    const mockBrowser = {
      cookies: { getAll: vi.fn().mockResolvedValue([]) },
    };

    const res = await handleContextMenuClick(
      {
        menuItemId: CONTEXT_MENU_IDS.DOWNLOAD_LINK,
        linkUrl: "https://example.com/archive.zip",
        pageUrl: "https://example.com/index.html",
      },
      { id: 1, title: "Example Page" },
      mockBrowser
    );

    expect(res.handled).toBe(true);
    expect(res.action).toBe("download_link");
    expect(nativePort.request).toHaveBeenCalled();
  });

  it("handles DOWNLOAD_MEDIA click for image/video/audio sources", async () => {
    const mockBrowser = {
      cookies: { getAll: vi.fn().mockResolvedValue([]) },
    };

    const res = await handleContextMenuClick(
      {
        menuItemId: CONTEXT_MENU_IDS.DOWNLOAD_MEDIA,
        srcUrl: "https://example.com/video.mp4",
        pageUrl: "https://example.com/watch",
      },
      { id: 2, title: "Watch Page" },
      mockBrowser
    );

    expect(res.handled).toBe(true);
    expect(res.action).toBe("download_media");
    expect(nativePort.request).toHaveBeenCalled();
  });

  it("handles DOWNLOAD_ALL_LINKS click by injecting grabber content script", async () => {
    const mockBrowser = {
      scripting: {
        executeScript: vi.fn().mockResolvedValue([]),
      },
    };

    const res = await handleContextMenuClick(
      {
        menuItemId: CONTEXT_MENU_IDS.DOWNLOAD_ALL_LINKS,
      },
      { id: 42 },
      mockBrowser
    );

    expect(res.handled).toBe(true);
    expect(res.action).toBe("inject_grabber");
    expect(mockBrowser.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 42 },
      files: ["content-scripts/grabber.js"],
    });
  });

  it("handles magnet:? links via context menu and tags source as context_menu", async () => {
    const mockBrowser = {
      cookies: { getAll: vi.fn().mockResolvedValue([]) },
    };

    const res = await handleContextMenuClick(
      {
        menuItemId: CONTEXT_MENU_IDS.DOWNLOAD_LINK,
        linkUrl: "magnet:?xt=urn:btih:3b245504d603a108b688d01150c95029e0cc5e4a&dn=ubuntu-24.04.iso",
        pageUrl: "https://releases.ubuntu.com/",
      },
      { id: 3, title: "Ubuntu Releases" },
      mockBrowser
    );

    expect(res.handled).toBe(true);
    expect(res.action).toBe("download_torrent");
    expect(nativePort.request).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "capture",
        payload: expect.objectContaining({
          url: "magnet:?xt=urn:btih:3b245504d603a108b688d01150c95029e0cc5e4a&dn=ubuntu-24.04.iso",
          filename: "ubuntu-24.04.iso",
          source: "context_menu",
        }),
      }),
      500
    );
  });

  it("handles .torrent URLs via context menu and tags source as context_menu", async () => {
    const mockBrowser = {
      cookies: { getAll: vi.fn().mockResolvedValue([]) },
    };

    const res = await handleContextMenuClick(
      {
        menuItemId: CONTEXT_MENU_IDS.DOWNLOAD_LINK,
        linkUrl: "https://cdimage.debian.org/debian-12.0.0-amd64-netinst.iso.torrent",
        pageUrl: "https://debian.org/",
      },
      { id: 4, title: "Debian CD" },
      mockBrowser
    );

    expect(res.handled).toBe(true);
    expect(res.action).toBe("download_torrent");
    expect(nativePort.request).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "capture",
        payload: expect.objectContaining({
          filename: "debian-12.0.0-amd64-netinst.iso.torrent",
          source: "context_menu",
        }),
      }),
      500
    );
  });

  it("strictly rejects dangerous/unsupported schemes in context menu links", async () => {
    const mockBrowser = {
      cookies: { getAll: vi.fn().mockResolvedValue([]) },
    };

    const jsRes = await handleContextMenuClick(
      {
        menuItemId: CONTEXT_MENU_IDS.DOWNLOAD_LINK,
        linkUrl: "javascript:alert(document.cookie)",
      },
      { id: 5 },
      mockBrowser
    );
    expect(jsRes.handled).toBe(false);
    expect(jsRes.action).toBe("unsupported_scheme");

    const fileRes = await handleContextMenuClick(
      {
        menuItemId: CONTEXT_MENU_IDS.DOWNLOAD_LINK,
        linkUrl: "file:///etc/passwd",
      },
      { id: 6 },
      mockBrowser
    );
    expect(fileRes.handled).toBe(false);
    expect(fileRes.action).toBe("unsupported_scheme");
  });
});
