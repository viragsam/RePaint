# RePaint Privacy Policy

Last updated: 2026-08-16

RePaint is a browser extension that lets you preview color and font changes on the
currently active webpage, through an on-page panel, for design iteration and CSS
prototyping.

## What RePaint does

- Reads the CSS of the page you're currently viewing (stylesheets, computed styles) to
  detect color- and font-related custom properties.
- Writes CSS changes directly into that page's DOM (via inline styles and an injected
  `<style>` element) so you can preview edits live.
- Runs only when you click the toolbar icon, and only against the tab you clicked it on.

## What RePaint does not do

- It does not collect, log, store, or transmit any personal data, browsing history, page
  content, or any other information to us or to any third party.
- It has no backend, no analytics, no error reporting, and no account system.
- It does not run in the background and does not have access to any tab other than the one
  you explicitly invoke it on.

## Local storage

RePaint saves one value in the browser's `localStorage`, scoped to whatever page you're
using it on: the URL of a fonts server you optionally type into the panel, so you don't
have to retype it each time. This value never leaves your device.

## Network requests

RePaint makes no network requests on its own. The only request it can ever make is one you
explicitly trigger: clicking "Load" next to a fonts-server URL fetches a stylesheet
(`fonts.css`) from that URL, so self-hosted web-font presets can be previewed. If you never
use this feature, RePaint makes no network requests at all.

## Permissions

- `activeTab` — lets the toolbar icon inject the panel into the page you're currently
  viewing, only after you click it.
- `scripting` — lets the extension run its script in that tab in response to the click.

Neither permission grants RePaint standing access to your browsing; both are scoped to an
explicit, per-click user action.

## Changes to this policy

If this policy changes, the "Last updated" date above will be updated accordingly.

## Contact

Questions about this policy can be raised via the project's GitHub repository.
