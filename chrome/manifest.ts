/**
 * Manifest fields that only exist for the Chrome build (Chromium family: Chrome, Edge, Brave).
 * Everything shared with Firefox lives in ../wxt.config.ts.
 */
export const chromeManifest = {
  // Fixed public key => stable extension ID (ghkidhbnhaongflmfkimoaaiifebpbbc), which the
  // native-messaging manifest pins in `allowed_origins`. Chrome refuses to load an extension
  // whose `key` is missing or invalid, so never put a placeholder here.
  key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAonb54192K2GEMI2Ad80U7i0qTaceLqw8L4WzoMMm42QnCwVxhbZaA+oiGkG+cTC88N4RsGb57HDHNWAOr4/u8HshxA7uXjlBgg6eBv/h/bL53t0Tq4t/2ZQHWorEXHqTHeqWrbwZ5zENS6ZdrL3r7R9Si2AAghYyDNPHnsdEvpMsif8eGFQB6UOuk1WVWvJMczqDAps6iJHNddFADshHOtyQnj2pwComkkjgpJuaX3SDabnR9MpWna8TzMD62mMh4BdwC+fi8dnGszXAmFpAol8MRHAvfXQfchHIRc/0TNhkdng/kHVCJJOeNlI0Ql0GenKq3c+CIxQDKfeXqCqpzwIDAQAB",
};
