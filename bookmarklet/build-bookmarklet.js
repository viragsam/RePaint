const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "repaint.js"), "utf8");
const compact = src
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .join("\n");

const uri = "javascript:" + encodeURIComponent(compact);
const outPath = path.join(__dirname, "repaint.bookmarklet.txt");
fs.writeFileSync(outPath, uri);

console.log(`Wrote ${outPath} (${uri.length} chars)`);
