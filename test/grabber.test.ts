import { describe, it, expect } from "vitest";
import { scanPageLinks, categorizeExtension } from "../lib/grabber/scanner";

describe("Link Grabber scanner & categorizer", () => {
  it("correctly categorizes extensions", () => {
    expect(categorizeExtension("zip")).toBe("Compressed");
    expect(categorizeExtension("iso")).toBe("Compressed");
    expect(categorizeExtension("exe")).toBe("Programs");
    expect(categorizeExtension("mp4")).toBe("Video");
    expect(categorizeExtension("flac")).toBe("Audio");
    expect(categorizeExtension("pdf")).toBe("Documents");
    expect(categorizeExtension("xyz")).toBe("Other");
  });

  it("scans anchor links and media tags with deduplication", () => {
    // Construct mock DOM
    const mockDoc = {
      querySelectorAll: (selector: string) => {
        if (selector === "a[href]") {
          return [
            { href: "https://example.com/files/release.zip" },
            { href: "https://example.com/files/release.zip" }, // duplicate
            { href: "javascript:void(0)" }, // ignored non-http
            { href: "https://example.com/docs/manual.pdf" },
          ];
        }
        if (selector === "img[src], video[src], audio[src], source[src]") {
          return [
            { src: "https://example.com/assets/intro.mp4" },
            { src: "data:image/png;base64,xxxx" }, // ignored non-http
          ];
        }
        return [];
      },
    } as unknown as Document;

    const items = scanPageLinks(mockDoc);
    expect(items).toHaveLength(3);

    const urls = items.map((i) => i.url);
    expect(urls).toContain("https://example.com/files/release.zip");
    expect(urls).toContain("https://example.com/docs/manual.pdf");
    expect(urls).toContain("https://example.com/assets/intro.mp4");

    const zipItem = items.find((i) => i.filename === "release.zip");
    expect(zipItem?.category).toBe("Compressed");
    expect(zipItem?.selected).toBe(true);

    const pdfItem = items.find((i) => i.filename === "manual.pdf");
    expect(pdfItem?.category).toBe("Documents");

    const mp4Item = items.find((i) => i.filename === "intro.mp4");
    expect(mp4Item?.category).toBe("Video");
  });
});
