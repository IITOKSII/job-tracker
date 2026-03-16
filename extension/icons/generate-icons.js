// WorkAble Clipper — generate-icons.js
// Run once with Node.js to produce PNG icons from the SVG source.
// Requires: npm install sharp (or use any SVG→PNG tool)
//
// Usage:
//   cd extension/icons
//   node generate-icons.js
//
// Alternatively, convert icon.svg manually using any image editor
// (Inkscape, Figma, SVGOMG) at sizes 16, 48, 128 px.

const fs = require("fs");
const path = require("path");

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#141a1f"/>
  <rect x="30" y="28" width="68" height="76" rx="8" fill="#1a2028" stroke="#2a3340" stroke-width="2"/>
  <line x1="42" y1="52" x2="86" y2="52" stroke="#2ec4b6" stroke-width="5" stroke-linecap="round"/>
  <line x1="42" y1="66" x2="86" y2="66" stroke="#2a3340" stroke-width="4" stroke-linecap="round"/>
  <line x1="42" y1="79" x2="70" y2="79" stroke="#2a3340" stroke-width="4" stroke-linecap="round"/>
  <circle cx="90" cy="90" r="22" fill="#141a1f"/>
  <circle cx="90" cy="90" r="20" fill="#2ec4b6"/>
  <polyline points="80,90 88,98 102,82" fill="none" stroke="#0d1117" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Write SVG source
fs.writeFileSync(path.join(__dirname, "icon.svg"), SVG);
console.log("icon.svg written.");

// Try to use sharp if available
try {
  const sharp = require("sharp");
  const svgBuf = Buffer.from(SVG);
  const sizes = [16, 48, 128];
  Promise.all(
    sizes.map(size =>
      sharp(svgBuf)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, `icon${size}.png`))
        .then(() => console.log(`icon${size}.png created`))
    )
  ).then(() => console.log("All icons generated."));
} catch (_e) {
  console.log(
    "sharp not available — convert icon.svg manually to icon16.png, icon48.png, icon128.png\n" +
    "Or run: npm install sharp && node generate-icons.js"
  );
}
