import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Store Submissions & Package Manager Manifests (P13-T04)", () => {
  const chromeStoreDir = path.resolve(__dirname, "../chrome/store");
  const firefoxStoreDir = path.resolve(__dirname, "../firefox/store");

  describe("Chrome Web Store (CWS) Manifest & Policy", () => {
    const cwsDir = path.join(chromeStoreDir, "cws");

    it("has valid listing metadata in EN and BN", () => {
      const listingPath = path.join(cwsDir, "listing.json");
      expect(fs.existsSync(listingPath)).toBe(true);

      const listing = JSON.parse(fs.readFileSync(listingPath, "utf-8"));
      expect(listing.name).toContain("MJDM");
      expect(listing.version).toBe("1.0.0");
      expect(listing.summary.en).toBeTruthy();
      expect(listing.summary.bn).toBeTruthy();
      expect(listing.description.en).toBeTruthy();
      expect(listing.description.bn).toBeTruthy();

      // Policy R-03 check: Must NOT contain site-specific video extractor claims
      const fullText = JSON.stringify(listing).toLowerCase();
      expect(fullText).not.toContain("youtube downloader");
      expect(fullText).not.toContain("rip youtube");
      expect(fullText).not.toContain("bypass drm");
    });

    it("has privacy policy with zero-telemetry declaration", () => {
      const privacyPath = path.join(cwsDir, "privacy-policy.md");
      expect(fs.existsSync(privacyPath)).toBe(true);

      const privacy = fs.readFileSync(privacyPath, "utf-8");
      expect(privacy).toContain("Zero Remote Analytics");
      expect(privacy).toContain("Local Operation Only");
      expect(privacy).toContain("Single-Purpose Architecture");
    });

    it("has explicit permission justifications without excessive permissions", () => {
      const justPath = path.join(cwsDir, "permission-justifications.json");
      expect(fs.existsSync(justPath)).toBe(true);

      const justifications = JSON.parse(fs.readFileSync(justPath, "utf-8"));
      const perms = justifications.permissions;
      expect(perms.downloads).toBeDefined();
      expect(perms.nativeMessaging).toBeDefined();
      expect(perms.cookies).toBeDefined();

      // Ensure forbidden permissions are NOT requested
      expect(perms.tabs).toBeUndefined();
      expect(perms.history).toBeUndefined();
      expect(perms.webNavigation).toBeUndefined();
    });
  });

  describe("Mozilla Add-ons (AMO) & Edge Store", () => {
    it("has AMO reviewer notes with reproducible build instructions", () => {
      const notesPath = path.join(firefoxStoreDir, "amo/reviewer-notes.md");
      expect(fs.existsSync(notesPath)).toBe(true);

      const notes = fs.readFileSync(notesPath, "utf-8");
      expect(notes).toContain("pnpm run build:firefox");
      expect(notes).toContain("browser.runtime.connectNative");
      expect(notes).toContain("mjdm@mjnex.com");
    });

    it("has AMO metadata with appropriate categories", () => {
      const metaPath = path.join(firefoxStoreDir, "amo/metadata.json");
      expect(fs.existsSync(metaPath)).toBe(true);

      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      expect(meta.name).toContain("MJDM");
      expect(meta.categories).toContain("download-management");
    });

    it("has Microsoft Edge Add-ons metadata", () => {
      const edgePath = path.join(chromeStoreDir, "edge/edge-metadata.json");
      expect(fs.existsSync(edgePath)).toBe(true);

      const edge = JSON.parse(fs.readFileSync(edgePath, "utf-8"));
      expect(edge.name).toContain("MJDM");
      expect(edge.version).toBe("1.0.0");
      expect(edge.store_presence.short_description).toBeTruthy();
    });
  });
});
