# RePaint

A local, no-install tool that lets you live-edit the fonts and colors of any loaded
webpage, your own dev server, localhost, or a live site, exactly the way you'd fiddle
with values in dev tools, but through a proper side panel instead of hand-editing the DOM.
## Why?

Because i needed a tool to remake my website that works how its supposed to.

## Status

v1: a bookmarklet. No build step, no dependencies. A Chrome extension port is planned
for later, reusing the same core logic.

## Use it

```
python3 -m http.server 8787
```

then open `http://localhost:8787/` and drag the bookmarklet link to your bookmarks bar.
Click it on any page to open the panel.

Serving it matters: opening `index.html` directly as a `file://` URL will fail to fetch
`bookmarklet/repaint.js` for the drag-link. If you just want the bookmarklet text without
running a server, run `node bookmarklet/build-bookmarklet.js` and copy the contents of
the generated `bookmarklet/repaint.bookmarklet.txt` into a new bookmark's URL field
manually.

## How it works

The panel has three modes, as tabs:

- **Roles**: bg/text/primary/secondary/accent, broad-strokes recoloring. Each role maps
  to every detected CSS custom property matching that role (a site can split "background"
  across several tokens, e.g. `--bg`, `--panel`, `--panel-deep`, and all of them move
  together), or falls back to a best-effort override stylesheet (`body`, `button`, `a`,
  `[class*="card"]`, ...) when no token matches. Good for quick recolors on sites with a
  handful of tokens, like your own.
- **All tokens**: every color-valued CSS custom property found on the page (validated via
  `CSS.supports("color", ...)`), each with its own swatch, filterable by name. Built for
  token-rich design systems (GitHub's Primer exposes hundreds: `--bgColor-danger-emphasis`,
  `--fgColor-accent`, etc.) where the 5-role bucketing is too coarse to be useful.
- **Pick**: click "Pick an element", then click anything on the page. Its text and
  background color become editable, scoped to just that element (via a generated
  `data-repaint-id` attribute), not any token it happens to share with other elements, so
  edits stay predictable and local.

- Web-font presets (Inter, Fraunces, Space Grotesk, Newsreader, JetBrains Mono) are
  self-hosted, not pulled from Google Fonts at runtime, see `fonts/README.md`. System
  font presets need no server at all.
- Nothing is sent anywhere. The panel lives in a Shadow DOM so it can't leak the host
  page's styles into itself or vice versa. Reset just reloads the page.

## Structure

```
index.html               landing page with the drag-to-bookmark link
bookmarklet/repaint.js    the entire tool, panel + detection + override logic
bookmarklet/build-bookmarklet.js   optional: emits a plain-text javascript: URI
fonts/fonts.css           @font-face declarations for the self-hosted presets
fonts/README.md           where to get the actual font files
```

## Roadmap

- Chrome extension: same core logic, devtools-panel UI, per-site persistence via
  `chrome.storage`, publishable to the Chrome Web Store.
