const fs = require("fs");
const path = require("path");

const LUCIDE_VERSION = "0.460.0";
const LICENSE_NOTICE = `// Lucide v${LUCIDE_VERSION}, ISC License: Copyright (c) Cole Bemis 2013-2022 (Feather, MIT) and Lucide Contributors 2022. See THIRD_PARTY_NOTICES.md.`;
const iconsFolder = process.argv[2] || "package/icons";
const target = path.join(__dirname, "..", "site", "assets", "icons.js");
const names = `coffee wine car smartphone pill shirt sofa fuel zap plane bike cigarette beer milk apple banana
fish beef candy croissant watch gem book gamepad-2 laptop tv glass-water syringe sparkles truck ship cog
footprints refrigerator washing-machine lamp gift search x chevron-right chevron-down arrow-right share-2
download code info rss circle-help globe map chart-line chart-bar-big table-2 lightbulb check rotate-ccw
pencil copy trending-up trending-down scale flag calendar-days`.split(/\s+/);

if (!fs.existsSync(iconsFolder)) {
  console.error(`npm pack lucide-static@${LUCIDE_VERSION} && tar -xzf lucide-static-${LUCIDE_VERSION}.tgz && node tools/build_icons.js package/icons`);
  process.exit(1);
}

function svgBody(name) {
  const svg = fs.readFileSync(path.join(iconsFolder, `${name}.svg`), "utf8");
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, "").replace(/\s*\n\s*/g, "").trim();
}

const icons = Object.fromEntries(names.map((name) => [name, svgBody(name)]));
const iconTable = JSON.stringify(icons).replace(/","/g, '",\n  "');
fs.writeFileSync(target, `${LICENSE_NOTICE}
const ICONS = ${iconTable};

export function icon(name) {
  return \`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">\${ICONS[name]}</svg>\`;
}
`);
console.log(`${names.length} icons → ${target}`);
