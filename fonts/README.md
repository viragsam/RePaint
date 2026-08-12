# Fonts

The panel's web-font presets (Inter, Space Grotesk, Fraunces, Newsreader, JetBrains Mono)
are self-hosted, not pulled from Google Fonts at runtime, so the bookmarklet never makes
an external network request when you point it at someone else's site.

To make them work locally:

1. Download the variable `.woff2` for each family (e.g. via
   [google-webfonts-helper](https://gwfh.mranftl.com/fonts), select "variable" or the
   regular + bold weights).
2. Drop the files in this folder using these exact names:
   - `inter.woff2`
   - `space-grotesk.woff2`
   - `fraunces.woff2`
   - `newsreader.woff2`
   - `jetbrains-mono.woff2`
3. Serve the repo root over HTTP, e.g. from the repo root: `python3 -m http.server 8787`
4. In the RePaint panel, leave the fonts server URL as `http://localhost:8787` (or whatever
   port you used) and click Load.

Until files are added, the presets that need them just fail to load silently, system-font
presets work with no server at all.
