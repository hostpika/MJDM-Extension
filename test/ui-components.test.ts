import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "../lib/i18n";
import {
  getSettings,
  saveSettings,
  getRecentDownloads,
  addRecentDownload,
  DEFAULT_SETTINGS,
} from "../lib/storage";

describe("UI Storage & i18n modules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("translates keys accurately for English and Bangla", () => {
    expect(t("title", "en")).toBe("MJDM Download Manager");
    expect(t("title", "bn")).toBe("এমজেডিএম ডাউনলোড ম্যানেজার");

    expect(t("connected", "en")).toBe("Connected");
    expect(t("connected", "bn")).toBe("সংযুক্ত");

    expect(t("pauseAll", "en")).toBe("Pause All");
    expect(t("pauseAll", "bn")).toBe("সব স্থগিত");

    expect(t("resumeAll", "en")).toBe("Resume All");
    expect(t("resumeAll", "bn")).toBe("সব চালু");
  });

  it("retrieves default settings when storage is empty", async () => {
    const s = await getSettings();
    expect(s.enabled).toBe(true);
    expect(s.language).toBe("en");
    expect(s.fileTypes.length).toBeGreaterThan(10);
  });

  it("saves and reads updated settings from mock storage", async () => {
    const mockStorage: Record<string, any> = {};
    (globalThis as any).browser = {
      storage: {
        local: {
          get: vi.fn().mockImplementation(async (key: string) => ({ [key]: mockStorage[key] })),
          set: vi.fn().mockImplementation(async (obj: Record<string, any>) => {
            Object.assign(mockStorage, obj);
          }),
        },
      },
    };

    await saveSettings({ language: "bn", enabled: false, minSize: 1048576 });
    const s = await getSettings();

    expect(s.language).toBe("bn");
    expect(s.enabled).toBe(false);
    expect(s.minSize).toBe(1048576);
  });

  it("manages recent downloads list with FIFO pruning at 5 items", async () => {
    const mockStorage: Record<string, any> = {};
    (globalThis as any).browser = {
      storage: {
        local: {
          get: vi.fn().mockImplementation(async (key: string) => ({ [key]: mockStorage[key] })),
          set: vi.fn().mockImplementation(async (obj: Record<string, any>) => {
            Object.assign(mockStorage, obj);
          }),
        },
      },
    };

    for (let i = 1; i <= 7; i++) {
      await addRecentDownload({
        id: `item-${i}`,
        url: `https://example.com/file${i}.zip`,
        filename: `file${i}.zip`,
      });
    }

    const recent = await getRecentDownloads();
    expect(recent.length).toBe(5);
    expect(recent[0].filename).toBe("file7.zip"); // Most recent first
  });
});
