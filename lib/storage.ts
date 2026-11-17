import { type StatusPayload } from "./native/protocol";

export interface ExtensionSettings {
  enabled: boolean;
  minSize: number; // in bytes, default 256KB
  excludedSites: string[];
  fileTypes: string[];
  altBypassEnabled: boolean;
  language: "en" | "bn";
}

export const DEFAULT_FILE_TYPES: string[] = [
  "7z",
  "apk",
  "avi",
  "bin",
  "bz2",
  "dmg",
  "doc",
  "docx",
  "exe",
  "flac",
  "flv",
  "gz",
  "iso",
  "jar",
  "m4a",
  "mkv",
  "mp3",
  "mp4",
  "mov",
  "msi",
  "pdf",
  "pkg",
  "ppt",
  "pptx",
  "rar",
  "rpm",
  "tar",
  "tgz",
  "torrent",
  "wav",
  "webm",
  "wma",
  "wmv",
  "xls",
  "xlsx",
  "xz",
  "zip",
];

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  minSize: 262144, // 256 KB
  excludedSites: [],
  fileTypes: DEFAULT_FILE_TYPES,
  altBypassEnabled: false,
  language: "en",
};

const SETTINGS_KEY = "mjdm_settings";

export async function getSettings(): Promise<ExtensionSettings> {
  try {
    if (typeof browser !== "undefined" && browser.storage?.local) {
      const res = await browser.storage.local.get(SETTINGS_KEY);
      const stored = res[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;
      return { ...DEFAULT_SETTINGS, ...stored };
    }
  } catch {
    // Fallback if storage fails
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  if (typeof browser !== "undefined" && browser.storage?.local) {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await browser.storage.local.set({ [SETTINGS_KEY]: updated });
  }
}

export interface RecentDownloadItem {
  id: string;
  url: string;
  filename: string;
  timestamp: number;
}

const RECENT_KEY = "mjdm_recent_downloads";

export async function getRecentDownloads(): Promise<RecentDownloadItem[]> {
  try {
    if (typeof browser !== "undefined" && browser.storage?.local) {
      const res = await browser.storage.local.get(RECENT_KEY);
      const list = res[RECENT_KEY] as RecentDownloadItem[] | undefined;
      return Array.isArray(list) ? list : [];
    }
  } catch {
    // Fallback
  }
  return [];
}

export async function addRecentDownload(
  item: Omit<RecentDownloadItem, "timestamp">
): Promise<void> {
  try {
    const current = await getRecentDownloads();
    const entry: RecentDownloadItem = { ...item, timestamp: Date.now() };
    const filtered = current.filter((x) => x.url !== item.url);
    const updated = [entry, ...filtered].slice(0, 5); // Keep top 5
    if (typeof browser !== "undefined" && browser.storage?.local) {
      await browser.storage.local.set({ [RECENT_KEY]: updated });
    }
  } catch {
    // Ignore
  }
}

export interface ExtensionSessionState {
  connected: boolean;
  lastStatus: StatusPayload | null;
  lastError: string | null;
}

export const initialSessionState: ExtensionSessionState = {
  connected: false,
  lastStatus: null,
  lastError: null,
};
