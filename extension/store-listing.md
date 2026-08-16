# Chrome Web Store listing draft

Draft copy for the store submission. Not used by the extension itself — reference text to
paste into the developer dashboard fields.

## Screenshots

All at the Store's required 1280x800. Chrome allows up to 5 — these 5 cover the app itself
plus one before/after use case, suggested order below:

1. `promo/roles-1280x800.png` — Roles tab, isolated on a branded background (viragsam.eu).
2. `promo/tokens-1280x800.png` — All tokens tab, same treatment.
3. `promo/pick-1280x800.png` — Pick tab with two real picked elements shown, not an empty state.
4. `promo/google-before-1280x800.png` — google.com, unmodified.
5. `promo/google-after-1280x800.png` — google.com with RePaint applied (panel open, recolored).

`promo/bonus-github-recolor.png` is a 6th, extra shot (full-page recolor of GitHub) — over
the 5-image limit, kept as a spare in case you want to swap it in for one of the above.

## Short description (132 char limit)

```
Live-edit any page's colors and fonts through a side panel, then export the CSS. No account, no tracking, nothing sent anywhere.
```
(130 characters)

## Detailed description

```
RePaint lets you live-edit the fonts and colors of any loaded webpage, the way you'd fiddle
with values in dev tools, but through a proper side panel instead of hand-editing the DOM.

Click the toolbar icon on any page to open the panel. Pick colors and fonts, watch them
apply instantly, then copy the resulting CSS back into your project.

HOW IT WORKS

Roles — bg / text / primary / secondary / accent, broad-strokes recoloring. Each role maps
to every matching CSS custom property it can find on the page (a site can split
"background" across several tokens — RePaint moves them all together), or falls back to a
best-effort override stylesheet when no token matches.

All tokens — every color-valued CSS custom property on the page, individually editable and
filterable by name. Built for token-rich design systems that expose hundreds of variables,
where the 5-role view is too coarse.

Pick — click an element on the page, edit its text and background color directly, scoped
to just that element so edits stay predictable and local.

Export CSS — copies a ready-to-paste :root { ... } block with everything you changed.

PRIVACY

RePaint runs entirely in your browser. It reads and modifies the styling of the page you're
currently viewing — nothing is collected, logged, or sent to any server, including by us.
The only network request it can make is one you trigger yourself: loading self-hosted web
fonts from a URL you type in (defaults to a local dev server; leave it alone if you don't
use this feature).

RePaint only acts on the tab you click the toolbar icon on — it doesn't run in the
background, doesn't read other tabs, and doesn't request access to sites you haven't
explicitly invoked it on.

Free, open source, no account required.
```

## Privacy practices tab (developer dashboard)

**Single purpose description:**
```
RePaint lets users preview and export color/font changes to the currently active webpage
through an on-page panel, for design iteration and CSS prototyping.
```

**Permission justifications:**

- `activeTab` — required so clicking the toolbar icon can inject the panel into the page
  you're currently looking at. RePaint never requests access to tabs you haven't explicitly
  invoked it on.
- `scripting` — required to inject the panel's script into the active tab in response to
  your toolbar-icon click.

**Data disclosure (Chrome's "Data usage" questionnaire):**

- Does not collect or transmit: personally identifiable information, health info, financial
  info, authentication info, personal communications, location, web history, user activity,
  or website content.
- Justification if asked to elaborate: all processing (reading computed styles, writing CSS
  custom properties, building the panel UI) happens locally in the page's DOM via content
  script APIs. Nothing is persisted outside the browser's own `localStorage` (used only to
  remember the fonts-server URL you typed in) and nothing leaves the device over the
  network except the optional, user-initiated font stylesheet fetch described above.

**Privacy policy URL:**
Point this at a hosted copy of `PRIVACY.md` (see sibling file) — GitHub Pages or the repo's
raw file URL both work. Chrome requires a reachable URL here even when the answer is "we
don't collect anything."
