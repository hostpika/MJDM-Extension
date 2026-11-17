# Chrome / Chromium (Chrome, Edge, Brave)

Everything that belongs only to the Chrome build. The extension code itself is shared with Firefox
(`../entrypoints`, `../lib`) and is not duplicated here.

| Path | What |
|---|---|
| `manifest.ts` | Chrome-only manifest fields (the fixed public `key`, which pins the extension ID) |
| `store/cws/` | Chrome Web Store listing, permission justifications, privacy policy |
| `store/edge/` | Microsoft Edge Add-ons metadata (Edge uses this same Chromium build) |

Build output: `../dist/chrome` (a folder you can load unpacked).

```
pnpm --filter @mjdm/extension build:chrome     # -> extension/dist/chrome
pnpm --filter @mjdm/extension zip:chrome       # -> extension/dist/*-chrome.zip (store upload)
```

Load in Chrome: `chrome://extensions` -> Developer mode -> Load unpacked -> `extension/dist/chrome`.
The extension ID is fixed (`ghkidhbnhaongflmfkimoaaiifebpbbc`) so the native-messaging host
manifest can pin it in `allowed_origins`. On Windows Chrome only reads native-messaging hosts from
the registry (`HKCU\Software\Google\Chrome\NativeMessagingHosts\com.mjdm.host`).
