import { describe, it, expect } from "vitest";
import { shouldIntercept } from "../lib/capture/rules";
import { DEFAULT_SETTINGS, ExtensionSettings } from "../lib/storage";

describe("Extension Interception Rules", () => {
  const baseSettings: ExtensionSettings = {
    ...DEFAULT_SETTINGS,
    minSize: 262144, // 256 KB
    excludedSites: ["mega.nz", "drive.google.com"],
  };

  it("intercepts matching file extensions for downloads", () => {
    const res = shouldIntercept(
      {
        url: "https://archive.org/download/item/archive.zip",
        filename: "archive.zip",
        size: 1048576,
      },
      baseSettings
    );
    expect(res.intercept).toBe(true);
    expect(res.reason).toContain("Matched file extension .zip");
  });

  it("respects excluded domains and subdomains", () => {
    const res1 = shouldIntercept(
      {
        url: "https://mega.nz/download/file.zip",
        filename: "file.zip",
      },
      baseSettings
    );
    expect(res1.intercept).toBe(false);
    expect(res1.reason).toContain("excluded");

    const res2 = shouldIntercept(
      {
        url: "https://sub.drive.google.com/file.rar",
        filename: "file.rar",
      },
      baseSettings
    );
    expect(res2.intercept).toBe(false);
    expect(res2.reason).toContain("excluded");
  });

  it("fails-open on files smaller than minSize if size is known", () => {
    const res = shouldIntercept(
      {
        url: "https://example.com/tiny.zip",
        filename: "tiny.zip",
        size: 1024, // 1 KB < 256 KB
      },
      baseSettings
    );
    expect(res.intercept).toBe(false);
    expect(res.reason).toContain("< minSize");
  });

  it("fails-open on unsupported schemes (blob, data, file, chrome)", () => {
    const blobRes = shouldIntercept(
      {
        url: "blob:https://example.com/39a2-94b1",
        filename: "test.zip",
      },
      baseSettings
    );
    expect(blobRes.intercept).toBe(false);
    expect(blobRes.reason).toContain("Unsupported protocol");

    const dataRes = shouldIntercept(
      {
        url: "data:application/zip;base64,AAAA",
        filename: "test.zip",
      },
      baseSettings
    );
    expect(dataRes.intercept).toBe(false);
  });

  it("fails-open when extension is disabled globally", () => {
    const disabledSettings: ExtensionSettings = {
      ...baseSettings,
      enabled: false,
    };
    const res = shouldIntercept(
      {
        url: "https://example.com/big.iso",
        filename: "big.iso",
        size: 1000000000,
      },
      disabledSettings
    );
    expect(res.intercept).toBe(false);
    expect(res.reason).toBe("Extension disabled");
  });
});
