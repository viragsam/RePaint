# RePaint

A local, no-install tool that lets you live-edit the fonts and colors of any loaded
webpage, your own dev server, localhost, or a live site, exactly the way you'd fiddle
with values in dev tools, but through a proper side panel instead of hand-editing the DOM.

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

- On click, it scans the page's stylesheets for CSS custom properties that look like
  color or font roles (`--bg`, `--text-color`, `--font-heading`, etc.) and lets you
  remap those directly, the precise path, for sites that already use design tokens.
- For roles it can't find a token for, it injects a single override stylesheet with
  broad, best-effort selectors (`body`, `button`, `a`, `[class*="card"]`, ...) so the
  tool still does something useful on sites with hardcoded styles. This path is
  intentionally blunt, not every element will be caught.
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
