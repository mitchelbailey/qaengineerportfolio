/**
 * Generates the product imagery as SVG line art, one file per seeded product.
 *
 * Why generate rather than ship photographs:
 *   - The build stays hermetic. No CDN, no network at build or test time.
 *   - Visual-regression baselines are byte-stable forever.
 *   - No stock-photo licensing to explain in a public portfolio repo.
 *
 * Run with: npm run generate:images
 */

import { mkdirSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = join(here, '..', 'public', 'products');

/* The seed list is the single source of truth for which images must exist.
   Parsed rather than imported so this script needs no TypeScript pipeline. */
const seedSource = await import('node:fs').then((fs) =>
  fs.promises.readFile(join(here, '..', 'shared', 'catalog-seed.ts'), 'utf8'),
);

const products = [
  ...seedSource.matchAll(/slug:\s*'([^']+)',\s*\n\s*name:\s*'([^']+)',\s*\n\s*category:\s*'([^']+)'/g),
].map(([, slug, name, category]) => ({ slug, name, category }));

if (products.length === 0) {
  console.error('Could not parse any products from shared/catalog-seed.ts');
  process.exit(1);
}

/** Deterministic hash so every product always renders identically. */
function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PALETTES = {
  ceramics: { bg: '#EFE7DC', wash: '#E3D7C7', ink: '#5A4636', accent: '#B4553C' },
  coffee: { bg: '#E9DFD2', wash: '#DCCDBA', ink: '#4E3A2B', accent: '#9E4732' },
  glassware: { bg: '#E3EAEA', wash: '#D2DEDE', ink: '#3D4C4C', accent: '#6E7F68' },
  textiles: { bg: '#EDE6E1', wash: '#DFD4CC', ink: '#544842', accent: '#B4553C' },
  kitchen: { bg: '#E7E6DF', wash: '#D8D7CC', ink: '#474639', accent: '#6E7F68' },
};

/**
 * Line-art glyphs, drawn on a 400x400 canvas centred at (200, 200).
 *
 * One glyph per product *shape* rather than per category, so a serving bowl
 * does not render as a mug. Selection is by keyword against the slug, falling
 * back to the category default.
 */
const GLYPHS = {
  mug: `
    <path d="M120 150 h150 v120 a60 60 0 0 1 -60 60 h-30 a60 60 0 0 1 -60 -60 z" />
    <path d="M270 175 h28 a34 34 0 0 1 0 68 h-28" />
    <path d="M150 118 c0 -14 14 -14 14 -28 M195 118 c0 -14 14 -14 14 -28 M240 118 c0 -14 14 -14 14 -28" stroke-linecap="round" />
  `,
  bowl: `
    <path d="M96 196 h208 a104 104 0 0 1 -104 104 a104 104 0 0 1 -104 -104 z" />
    <path d="M126 232 a76 60 0 0 0 148 0" />
    <path d="M170 160 c0 -16 12 -16 12 -32 M230 160 c0 -16 12 -16 12 -32" stroke-linecap="round" />
  `,
  cone: `
    <path d="M112 150 h176 l-72 130 h-32 z" />
    <path d="M200 280 v46" />
    <path d="M150 326 h100" stroke-linecap="round" />
    <path d="M150 150 l50 130 l50 -130" />
  `,
  teapot: `
    <path d="M130 190 h140 a70 70 0 0 1 -70 110 a70 70 0 0 1 -70 -110 z" />
    <path d="M270 214 h34 a30 30 0 0 1 0 60 h-16" />
    <path d="M130 214 l-42 -34 l6 44" stroke-linejoin="round" />
    <path d="M164 190 a36 22 0 0 1 72 0" />
    <path d="M200 150 v18" stroke-linecap="round" />
  `,
  canister: `
    <path d="M138 172 h124 v138 a16 16 0 0 1 -16 16 h-92 a16 16 0 0 1 -16 -16 z" />
    <path d="M128 140 h144 v32 h-144 z" />
    <path d="M200 108 v32" stroke-linecap="round" />
    <path d="M164 230 h72" />
  `,
  butter: `
    <path d="M112 232 h176 v58 a12 12 0 0 1 -12 12 h-152 a12 12 0 0 1 -12 -12 z" />
    <path d="M112 232 c0 -50 40 -78 88 -78 s88 28 88 78" />
    <path d="M200 154 v-26" stroke-linecap="round" />
  `,
  bag: `
    <path d="M138 140 h124 a10 10 0 0 1 10 10 v150 a20 20 0 0 1 -20 20 h-104 a20 20 0 0 1 -20 -20 v-150 a10 10 0 0 1 10 -10 z" />
    <path d="M138 140 l18 -30 h88 l18 30" />
    <ellipse cx="200" cy="232" rx="30" ry="42" transform="rotate(-24 200 232)" />
    <path d="M200 190 c-14 28 -14 56 0 84" stroke-linecap="round" />
  `,
  grinder: `
    <path d="M152 176 h96 v134 a14 14 0 0 1 -14 14 h-68 a14 14 0 0 1 -14 -14 z" />
    <path d="M146 146 h108 v30 h-108 z" />
    <path d="M200 146 v-28" stroke-linecap="round" />
    <path d="M200 118 h44 a16 16 0 0 1 16 16" stroke-linecap="round" />
    <path d="M152 250 h96" />
  `,
  carafe: `
    <path d="M148 128 h104 l-14 172 a26 26 0 0 1 -26 24 h-24 a26 26 0 0 1 -26 -24 z" />
    <path d="M156 212 h88" />
    <path d="M252 156 h20 a26 26 0 0 1 0 52 h-24" />
  `,
  tumbler: `
    <path d="M154 142 h92 l-12 168 a14 14 0 0 1 -14 13 h-40 a14 14 0 0 1 -14 -13 z" />
    <path d="M162 238 h76" />
    <path d="M268 168 h44 l-6 88 h-32 z" opacity="0.5" />
  `,
  coupe: `
    <path d="M118 140 h164 a82 62 0 0 1 -164 0 z" />
    <path d="M200 202 v86" />
    <path d="M156 300 h88" stroke-linecap="round" />
    <path d="M200 288 c-22 0 -38 6 -44 12 M200 288 c22 0 38 6 44 12" />
  `,
  jug: `
    <path d="M140 152 h112 v146 a18 18 0 0 1 -18 18 h-76 a18 18 0 0 1 -18 -18 z" />
    <path d="M140 152 l-22 -14 v34" stroke-linejoin="round" />
    <path d="M252 186 h26 a26 26 0 0 1 0 52 h-26" />
    <path d="M166 214 h30 M166 252 h30" stroke-linecap="round" />
  `,
  cloth: `
    <path d="M112 168 c30 -22 62 -22 92 0 s62 22 92 0 v40 c-30 22 -62 22 -92 0 s-62 -22 -92 0 z" />
    <path d="M112 236 c30 -22 62 -22 92 0 s62 22 92 0 v40 c-30 22 -62 22 -92 0 s-62 -22 -92 0 z" />
    <path d="M138 300 v26 M200 306 v26 M262 300 v26" stroke-linecap="round" />
  `,
  apron: `
    <path d="M152 168 h96 c26 22 40 54 40 92 v56 a12 12 0 0 1 -12 12 h-152 a12 12 0 0 1 -12 -12 v-56 c0 -38 14 -70 40 -92 z" />
    <path d="M170 168 c0 -22 14 -34 30 -34 s30 12 30 34" />
    <path d="M112 240 l-24 26 M288 240 l24 26" stroke-linecap="round" />
    <path d="M160 254 h80 v46 h-80 z" />
  `,
  tote: `
    <path d="M124 176 h152 l14 138 a14 14 0 0 1 -14 15 h-152 a14 14 0 0 1 -14 -15 z" />
    <path d="M164 176 v-24 a36 36 0 0 1 72 0 v24" />
    <path d="M124 216 h152" opacity="0.6" />
  `,
  pan: `
    <circle cx="196" cy="222" r="82" />
    <circle cx="196" cy="222" r="58" />
    <path d="M278 222 h56 a14 14 0 0 1 14 14 v10" stroke-linecap="round" />
    <path d="M144 140 l24 34 M196 128 v40 M248 140 l-24 34" stroke-linecap="round" />
  `,
  board: `
    <path d="M112 148 h176 a16 16 0 0 1 16 16 v140 a16 16 0 0 1 -16 16 h-176 a16 16 0 0 1 -16 -16 v-140 a16 16 0 0 1 16 -16 z" />
    <path d="M144 186 v96 M180 186 v96 M216 186 v96 M252 186 v96" opacity="0.55" />
    <circle cx="288" cy="176" r="9" />
  `,
  spoons: `
    <path d="M150 300 l52 -128" stroke-linecap="round" />
    <ellipse cx="212" cy="146" rx="26" ry="38" transform="rotate(22 212 146)" />
    <path d="M250 300 l-30 -110" stroke-linecap="round" />
    <ellipse cx="214" cy="164" rx="18" ry="30" transform="rotate(-14 214 164)" opacity="0.45" />
  `,
  mill: `
    <path d="M164 172 h72 l16 138 a14 14 0 0 1 -14 16 h-76 a14 14 0 0 1 -14 -16 z" />
    <path d="M170 130 h60 v42 h-60 z" />
    <path d="M200 100 v30" stroke-linecap="round" />
    <circle cx="200" cy="96" r="10" />
    <path d="M158 250 h84" />
  `,
  saltpig: `
    <path d="M120 218 a80 80 0 0 1 160 0 v62 a20 20 0 0 1 -20 20 h-120 a20 20 0 0 1 -20 -20 z" />
    <path d="M120 218 c34 -34 78 -46 122 -30" />
    <ellipse cx="168" cy="196" rx="44" ry="30" transform="rotate(-24 168 196)" />
  `,
};

/** Slug keyword to glyph. First match wins; order matters. */
const GLYPH_BY_KEYWORD = [
  ['pour-over-carafe', 'carafe'],
  ['pour-over', 'cone'],
  ['tea-pot', 'teapot'],
  ['teapot', 'teapot'],
  ['tea-towel', 'cloth'],
  ['serving-bowl', 'bowl'],
  ['butter-dish', 'butter'],
  ['canister', 'canister'],
  ['grinder', 'grinder'],
  ['tumbler', 'tumbler'],
  ['cocktail-glass', 'coupe'],
  ['coupe', 'coupe'],
  ['double-wall', 'tumbler'],
  ['measuring-jug', 'jug'],
  ['apron', 'apron'],
  ['tote', 'tote'],
  ['throw', 'cloth'],
  ['chopping-board', 'board'],
  ['spoon', 'spoons'],
  ['pepper-mill', 'mill'],
  ['salt-pig', 'saltpig'],
  ['skillet', 'pan'],
  ['mug', 'mug'],
];

const CATEGORY_FALLBACK = {
  ceramics: 'mug',
  coffee: 'bag',
  glassware: 'carafe',
  textiles: 'cloth',
  kitchen: 'pan',
};

function glyphFor(slug, category) {
  for (const [keyword, glyph] of GLYPH_BY_KEYWORD) {
    if (slug.includes(keyword)) return GLYPHS[glyph];
  }
  return GLYPHS[CATEGORY_FALLBACK[category]];
}

function svgFor({ slug, name, category }) {
  const palette = PALETTES[category];
  const glyph = glyphFor(slug, category);
  if (!palette || !glyph) throw new Error(`No palette or glyph for "${slug}" (${category})`);

  const seed = hash(slug);
  // Small, deterministic variation so the set does not look copy-pasted.
  const washOffset = 40 + (seed % 90);
  const washRadius = 150 + ((seed >> 5) % 70);
  const rotation = -6 + ((seed >> 9) % 13);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" role="img" aria-label="${name}">
  <title>${name}</title>
  <rect width="400" height="500" fill="${palette.bg}"/>
  <circle cx="${washOffset + 120}" cy="${420}" r="${washRadius}" fill="${palette.wash}"/>
  <circle cx="${320 - (seed % 60)}" cy="${90 + (seed % 40)}" r="46" fill="${palette.accent}" opacity="0.14"/>
  <g transform="translate(0 44) rotate(${rotation} 200 200)"
     fill="none" stroke="${palette.ink}" stroke-width="7" stroke-linejoin="round" opacity="0.85">
${glyph.trim()}
  </g>
</svg>
`;
}

mkdirSync(outputDir, { recursive: true });

// Clear out images for products that no longer exist, so the directory always
// mirrors the seed catalog exactly.
if (existsSync(outputDir)) {
  const expected = new Set(products.map((product) => `${product.slug}.svg`));
  for (const file of readdirSync(outputDir)) {
    if (file.endsWith('.svg') && !expected.has(file)) {
      unlinkSync(join(outputDir, file));
      console.log(`  removed stale ${file}`);
    }
  }
}

for (const product of products) {
  writeFileSync(join(outputDir, `${product.slug}.svg`), svgFor(product), 'utf8');
}

console.log(`Generated ${products.length} product images in public/products/`);
