# Firefox

Everything that belongs only to the Firefox build. The extension code itself is shared with Chrome
(`../entrypoints`, `../lib`) and is not duplicated here.

| Path | What |
|---|---|
| `manifest.ts` | Firefox-only manifest fields (add-on ID `mjdm@mjnex.com`, minimum Firefox version) |
| `store/amo/` | addons.mozilla.org (AMO) metadata and reviewer notes |

Build output: `../dist/firefox`.

```
pnpm --filter @mjdm/extension build:firefox    # -> extension/dist/firefox  (Manifest V3)
pnpm --filter @mjdm/extension zip:firefox      # -> extension/dist/*-firefox.zip (+ sources zip for AMO review)
```

Try it in Firefox: `about:debugging` -> This Firefox -> Load Temporary Add-on -> pick
`extension/dist/firefox/manifest.json`. See `docs/review/firefox-smoke-checklist.md`.
