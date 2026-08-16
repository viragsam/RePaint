# RePaint (extension)

Minimal Chrome extension port of the bookmarklet. Same panel, same detection/override logic
(`content.js` is the bookmarklet's `repaint.js`, unchanged) — the only difference is *how*
it gets injected: a toolbar icon click instead of a bookmark click.

## Load it (unpacked, for dev)

1. Go to `chrome://extensions`.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select this `extension/` folder.
4. Click the RePaint toolbar icon on any page to open/close the panel.

## Structure

```
manifest.json   MV3 manifest, toolbar action + activeTab/scripting permissions
background.js   service worker: injects content.js into the active tab on icon click
content.js      the panel itself — identical to bookmarklet/repaint.js
icons/          16/48/128px placeholder icons (gold "R" on charcoal)
```

## Known gaps vs. the bookmarklet roadmap in the main README

- No `chrome.storage` persistence yet (per-site remembered colors/picks) — still uses the
  same `localStorage` the bookmarklet uses (just for the fonts-server URL).
- No devtools panel UI — same floating Shadow DOM panel as the bookmarklet.
- Not packaged/signed for the Chrome Web Store.

## Keeping content.js in sync

If `bookmarklet/repaint.js` changes, copy it over:

```
cp bookmarklet/repaint.js extension/content.js
```

There's no build step tying the two together yet — they're expected to drift only if you
forget this step.
