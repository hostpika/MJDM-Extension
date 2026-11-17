/**
 * Manifest fields that only exist for the Firefox build.
 * Everything shared with Chrome lives in ../wxt.config.ts.
 */
export const firefoxManifest = {
  browser_specific_settings: {
    gecko: {
      // Add-on ID; also pinned in the native-messaging manifest (`allowed_extensions`).
      id: "mjdm@mjnex.com",
      strict_min_version: "109.0",
    },
  },
};
