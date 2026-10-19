// Generates the original CROP logo family (SVG + PNG + ICO) into public/brand. Run: npm run brand:assets
import fs from "node:fs";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const OUT = "public/brand";
fs.mkdirSync(OUT, { recursive: true });

const P = {
  light: { navy: "#0B1F4B", blue: "#1747B5", gold: "#E3A92B", goldDeep: "#C98A12", ivory: "#FFF8E7", teal: "#14877A", text: "#0B1F4B", sub: "#1747B5" },
  dark: { navy: "#FFF8E7", blue: "#8DB4FF", gold: "#F2BE4A", goldDeep: "#E3A92B", ivory: "#0B1F4B", teal: "#4FD1BD", text: "#FFF8E7", sub: "#F2BE4A" },
  mono: { navy: "#000", blue: "#000", gold: "#000", goldDeep: "#000", ivory: "#fff", teal: "#000", text: "#000", sub: "#000" },
};

/** Emblem in a 200x200 box: rising sun with a subtle cross, an open Bible, protective hands that cup it, and a sprout. */
function emblem(c, { simple = false } = {}) {
  const rays = [];
  const n = simple ? 5 : 9;
  for (let i = 0; i < n; i++) {
    const a = (-165 + (i * 150) / (n - 1)) * (Math.PI / 180);
    const r1 = 50;
    const r2 = simple ? 66 : 62;
    rays.push(
      `<line x1="${(100 + Math.cos(a) * r1).toFixed(1)}" y1="${(92 + Math.sin(a) * r1).toFixed(1)}" x2="${(100 + Math.cos(a) * r2).toFixed(1)}" y2="${(92 + Math.sin(a) * r2).toFixed(1)}" stroke="${c.gold}" stroke-width="${simple ? 7 : 4.5}" stroke-linecap="round"/>`,
    );
  }
  const lines = simple
    ? ""
    : `<path d="M52 124 C66 120 80 121 92 126 M52 134 C66 130 80 131 92 136 M52 144 C66 140 80 141 92 146" stroke="${c.blue}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M148 124 C134 120 120 121 108 126 M148 134 C134 130 120 131 108 136 M148 144 C134 140 120 141 108 146" stroke="${c.blue}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".55"/>`;
  return `<g>
    ${rays.join("")}
    <circle cx="100" cy="92" r="40" fill="${c.gold}"/>
    <rect x="96.5" y="58" width="7" height="34" rx="2" fill="${c.ivory}"/>
    <rect x="88" y="67" width="24" height="7" rx="2" fill="${c.ivory}"/>
    <path d="M100 160 C82 150 60 148 42 154 L42 116 C60 110 82 112 100 122 Z" fill="${c.ivory}" stroke="${c.navy}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M100 160 C118 150 140 148 158 154 L158 116 C140 110 118 112 100 122 Z" fill="${c.ivory}" stroke="${c.navy}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M100 122 L100 160" stroke="${c.navy}" stroke-width="5" stroke-linecap="round"/>
    ${lines}
    <path d="M24 128 C22 160 52 184 100 186 C148 184 178 160 176 128 C170 150 140 170 100 170 C60 170 30 150 24 128 Z" fill="${c.teal}"/>
    <path d="M24 128 C26 118 32 112 38 110 C34 120 34 126 36 134 Z M176 128 C174 118 168 112 162 110 C166 120 166 126 164 134 Z" fill="${c.teal}"/>
    <path d="M100 172 L100 182" stroke="${c.goldDeep}" stroke-width="3" stroke-linecap="round"/>
    <path d="M100 176 C92 176 88 170 88 166 C94 166 100 169 100 176 Z M100 176 C108 176 112 170 112 166 C106 166 100 169 100 176 Z" fill="${c.gold}"/>
  </g>`;
}

const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"><title>${title}</title>${body}</svg>`;
const FONT = `font-family="Georgia, 'Times New Roman', serif"`;
const SANS = `font-family="'Segoe UI', Arial, Helvetica, sans-serif"`;

function horizontal(c, attribution = true) {
  return svg(
    520,
    200,
    `${emblem(c)}
  <text x="212" y="104" ${FONT} font-size="84" font-weight="700" fill="${c.text}" letter-spacing="4">CROP</text>
  <text x="214" y="132" ${SANS} font-size="15.5" font-weight="700" fill="${c.sub}" letter-spacing="1.6">CHILD RESCUE OPERATION</text>
  <text x="214" y="152" ${SANS} font-size="15.5" font-weight="700" fill="${c.sub}" letter-spacing="1.6">PROGRAMMES</text>
  ${attribution ? `<text x="214" y="176" ${SANS} font-size="12.5" fill="${c.text}" opacity=".8">A Children's Wing of Fodan Gospel Outreach</text>` : ""}`,
    "CROP - Child Rescue Operation Programmes",
  );
}
function stacked(c) {
  return svg(
    360,
    340,
    `<g transform="translate(80,0)">${emblem(c)}</g>
  <text x="180" y="256" text-anchor="middle" ${FONT} font-size="76" font-weight="700" fill="${c.text}" letter-spacing="6">CROP</text>
  <text x="180" y="284" text-anchor="middle" ${SANS} font-size="15" font-weight="700" fill="${c.sub}" letter-spacing="2">CHILD RESCUE OPERATION PROGRAMMES</text>
  <text x="180" y="308" text-anchor="middle" ${SANS} font-size="12.5" fill="${c.text}" opacity=".8">A Children's Wing of Fodan Gospel Outreach</text>`,
    "CROP stacked logo",
  );
}
const emblemOnly = (c) => svg(200, 200, emblem(c), "CROP emblem");
const compact = (c, bg) =>
  svg(
    200,
    200,
    `<rect width="200" height="200" rx="40" fill="${bg}"/><g transform="translate(24,12) scale(.76)">${emblem(c)}</g><text x="100" y="184" text-anchor="middle" ${FONT} font-size="30" font-weight="700" fill="${c.text}" letter-spacing="3">CROP</text>`,
    "CROP compact logo",
  );
const favicon = () =>
  svg(
    64,
    64,
    `<rect width="64" height="64" rx="14" fill="#0B1F4B"/><g transform="translate(5,6) scale(.27)">${emblem({ ...P.dark, navy: "#FFF8E7", ivory: "#0B1F4B", blue: "#8DB4FF", gold: "#F2BE4A", goldDeep: "#F2BE4A", teal: "#4FD1BD" }, { simple: true })}</g>`,
    "CROP favicon",
  );
const appIcon = (pad = 0) =>
  svg(
    512,
    512,
    `<rect width="512" height="512" fill="#0B1F4B"/><g transform="translate(${96 - pad},${80 - pad}) scale(${(1.6 + pad / 100).toFixed(3)})">${emblem({ ...P.dark, ivory: "#0B1F4B", navy: "#FFF8E7" })}</g>`,
    "CROP app icon",
  );

const files = {
  "crop-horizontal.svg": horizontal(P.light),
  "crop-horizontal-compact.svg": horizontal(P.light, false),
  "crop-horizontal-dark.svg": horizontal(P.dark),
  "crop-horizontal-mono.svg": horizontal(P.mono),
  "crop-stacked.svg": stacked(P.light),
  "crop-stacked-dark.svg": stacked(P.dark),
  "crop-stacked-mono.svg": stacked(P.mono),
  "crop-emblem.svg": emblemOnly(P.light),
  "crop-emblem-dark.svg": emblemOnly(P.dark),
  "crop-emblem-mono.svg": emblemOnly(P.mono),
  "crop-compact-square.svg": compact(P.light, "#FFF8E7"),
  "crop-compact-square-dark.svg": compact(P.dark, "#0B1F4B"),
  "favicon.svg": favicon(),
  "app-icon.svg": appIcon(),
};
for (const [n, s] of Object.entries(files)) fs.writeFileSync(`${OUT}/${n}`, s);

const png = (name, svgText, w, h) =>
  sharp(Buffer.from(svgText), { density: 300 })
    .resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`${OUT}/${name}`);
await png("crop-horizontal.png", files["crop-horizontal.svg"], 1040, 400);
await png("crop-stacked.png", files["crop-stacked.svg"], 720, 680);
await png("crop-emblem.png", files["crop-emblem.svg"], 800, 800);
await png("crop-emblem-dark.png", files["crop-emblem-dark.svg"], 800, 800);
await png("crop-mono.png", files["crop-emblem-mono.svg"], 800, 800);
await png("favicon-16.png", files["favicon.svg"], 16, 16);
await png("favicon-32.png", files["favicon.svg"], 32, 32);
await png("favicon-48.png", files["favicon.svg"], 48, 48);
await png("apple-touch-icon.png", files["app-icon.svg"], 180, 180);
await png("icon-192.png", files["app-icon.svg"], 192, 192);
await png("icon-512.png", files["app-icon.svg"], 512, 512);
await sharp(Buffer.from(appIcon(-30)), { density: 300 }).resize(512, 512).png().toFile(`${OUT}/maskable-512.png`);
fs.writeFileSync(`${OUT}/favicon.ico`, await pngToIco([`${OUT}/favicon-16.png`, `${OUT}/favicon-32.png`, `${OUT}/favicon-48.png`]));
console.log("brand assets written:", fs.readdirSync(OUT).length, "files");
