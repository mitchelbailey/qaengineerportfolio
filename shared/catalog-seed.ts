export const PRODUCT_CATEGORIES = ['coffee', 'ceramics', 'glassware', 'textiles', 'kitchen'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  coffee: 'Coffee',
  ceramics: 'Ceramics',
  glassware: 'Glassware',
  textiles: 'Textiles',
  kitchen: 'Kitchen',
};

export interface SeedProduct {
  slug: string;
  name: string;
  category: ProductCategory;
  priceCents: number;
  stock: number;
  featured: boolean;
  rating: number;
  reviewCount: number;
  material: string;
  dimensions: string;
  summary: string;
  description: string;
}

/**
 * The catalog every session starts from.
 *
 * Stock levels are chosen deliberately, not randomly: the suite needs a stable
 * out-of-stock product, a stable low-stock product (to assert the "only N left"
 * warning and the quantity ceiling), and a stable single-unit product for the
 * "add the last one" boundary. Random seed data would make those tests flaky.
 *
 * `LOW_STOCK_THRESHOLD` is the line at which the UI warns.
 */
export const LOW_STOCK_THRESHOLD = 5;

export const SEED_PRODUCTS: readonly SeedProduct[] = [
  {
    slug: 'brunswick-stoneware-mug',
    name: 'Brunswick Stoneware Mug',
    category: 'ceramics',
    priceCents: 4_200,
    stock: 42,
    featured: true,
    rating: 4.8,
    reviewCount: 137,
    material: 'Wheel-thrown stoneware, matte glaze',
    dimensions: '9 × 8 cm · 300 ml',
    summary: 'A heavy-bottomed everyday mug with a handle that fits a whole hand.',
    description:
      'Thrown in small batches in Brunswick, then fired twice for a glaze that will not craze. The base is left unglazed so it grips the bench, and the walls are thick enough to keep a flat white warm through a slow morning. Dishwasher and microwave safe, though it will outlive both.',
  },
  {
    slug: 'fitzroy-pour-over-carafe',
    name: 'Fitzroy Pour-Over Carafe',
    category: 'glassware',
    priceCents: 8_900,
    stock: 18,
    featured: true,
    rating: 4.6,
    reviewCount: 84,
    material: 'Borosilicate glass, cork collar',
    dimensions: '19 cm tall · 600 ml',
    summary: 'Heat-shocked-glass carafe with volume markings that survive the dishwasher.',
    description:
      'Borosilicate throughout, so it takes boiling water straight from the kettle without a wince. The cork collar stays cool enough to pour one-handed, and the etched markings at 300 and 600 ml are sandblasted rather than printed.',
  },
  {
    slug: 'single-origin-ethiopia-guji',
    name: 'Single Origin — Ethiopia Guji',
    category: 'coffee',
    priceCents: 2_400,
    stock: 60,
    featured: true,
    rating: 4.9,
    reviewCount: 312,
    material: '250 g whole bean',
    dimensions: 'Roasted weekly',
    summary: 'Washed Guji: peach, bergamot and a long, clean finish.',
    description:
      'Sourced through a single washing station in the Guji zone and roasted light enough to keep the florals intact. Best as filter, though it will hold up as an espresso if you pull it long. Rest for five days after the roast date printed on the base.',
  },
  {
    slug: 'collingwood-linen-tea-towel',
    name: 'Collingwood Linen Tea Towel',
    category: 'textiles',
    priceCents: 3_400,
    stock: 4,
    featured: false,
    rating: 4.4,
    reviewCount: 51,
    material: '100% European flax linen',
    dimensions: '50 × 70 cm',
    summary: 'Stonewashed linen that actually dries a glass instead of smearing it.',
    description:
      'Woven from European flax and stonewashed twice so it arrives soft rather than requiring six months of breaking in. Linen holds roughly a fifth of its weight in water and gives it back to the air quickly, which is why it beats cotton at this job.',
  },
  {
    slug: 'abbotsford-cast-iron-skillet',
    name: 'Abbotsford Cast Iron Skillet',
    category: 'kitchen',
    priceCents: 12_900,
    stock: 12,
    featured: true,
    rating: 4.7,
    reviewCount: 96,
    material: 'Sand-cast iron, pre-seasoned',
    dimensions: '26 cm · 2.4 kg',
    summary: 'Pre-seasoned, machine-polished cooking surface. No enamel to chip.',
    description:
      'Sand-cast then machine-polished, so the cooking surface starts smooth instead of pebbled. Pre-seasoned with flaxseed oil over three passes. Oven safe to any temperature your oven can reach, and the helper handle means you can actually lift it out.',
  },
  {
    slug: 'northcote-espresso-blend',
    name: 'Northcote Espresso Blend',
    category: 'coffee',
    priceCents: 2_100,
    stock: 75,
    featured: false,
    rating: 4.5,
    reviewCount: 203,
    material: '250 g whole bean',
    dimensions: 'Roasted weekly',
    summary: 'Brazil and Colombia: dark chocolate, hazelnut, forgiving under pressure.',
    description:
      'Built to be forgiving. A 70/30 Brazil-Colombia blend roasted to the edge of second crack, which gives you a wide window where the shot still tastes good even if the grind drifts. Holds its own under milk.',
  },
  {
    slug: 'carlton-ceramic-pour-over',
    name: 'Carlton Ceramic Pour-Over Cone',
    category: 'ceramics',
    priceCents: 5_600,
    stock: 0,
    featured: false,
    rating: 4.3,
    reviewCount: 44,
    material: 'Glazed porcelain',
    dimensions: '12 × 10 cm · 1–2 cups',
    summary: 'Single spiral rib, 60° cone. Takes standard #02 papers.',
    description:
      'Porcelain holds heat far better than plastic, which matters more than most people expect during a three-minute brew. A single tall spiral rib keeps the paper off the wall so the bed drains evenly. Fits any carafe with a 9 cm mouth.',
  },
  {
    slug: 'yarra-oak-chopping-board',
    name: 'Yarra Oak Chopping Board',
    category: 'kitchen',
    priceCents: 9_800,
    stock: 22,
    featured: false,
    rating: 4.6,
    reviewCount: 68,
    material: 'End-grain Victorian oak',
    dimensions: '40 × 30 × 4 cm',
    summary: 'End-grain construction, so it takes a knife edge instead of blunting it.',
    description:
      'End-grain boards let the blade slip between wood fibres rather than across them, which is why chefs put up with the extra weight. Finished with food-safe beeswax and mineral oil. Re-oil it when the surface starts looking thirsty.',
  },
  {
    slug: 'richmond-wool-throw',
    name: 'Richmond Wool Throw',
    category: 'textiles',
    priceCents: 18_500,
    stock: 8,
    featured: false,
    rating: 4.8,
    reviewCount: 39,
    material: '100% Australian merino lambswool',
    dimensions: '130 × 180 cm',
    summary: 'Milled in Geelong from Australian merino. Heavy enough to stay put.',
    description:
      'Spun and milled in Geelong from Australian merino lambswool, with a herringbone weave and hand-knotted fringe. Substantial at 1.4 kg, which is the difference between a throw that stays on the couch and one that slides onto the floor.',
  },
  {
    slug: 'preston-glass-tumbler-set',
    name: 'Preston Glass Tumbler — Set of 4',
    category: 'glassware',
    priceCents: 6_400,
    stock: 30,
    featured: false,
    rating: 4.2,
    reviewCount: 77,
    material: 'Recycled soda-lime glass',
    dimensions: '9 cm tall · 320 ml each',
    summary: 'Made from recycled glass, so no two are perfectly identical.',
    description:
      'Pressed from recycled soda-lime glass, which leaves faint tonal variation from one tumbler to the next. Thick base, slightly tapered walls, stackable to three. Sold as a set of four.',
  },
  {
    slug: 'thornbury-burr-grinder',
    name: 'Thornbury Hand Burr Grinder',
    category: 'coffee',
    priceCents: 16_900,
    stock: 3,
    featured: false,
    rating: 4.7,
    reviewCount: 118,
    material: 'Stainless steel burrs, anodised aluminium body',
    dimensions: '16 cm · 35 g capacity',
    summary: '38 mm conical steel burrs with click-stop adjustment at 25 microns.',
    description:
      'Conical stainless burrs on a double-bearing axle, so the shaft does not wander and the grind stays consistent shot to shot. Click-stop adjustment in 25-micron steps, from Turkish through to French press. About 25 seconds for a filter dose.',
  },
  {
    slug: 'docklands-serving-bowl',
    name: 'Docklands Serving Bowl',
    category: 'ceramics',
    priceCents: 7_200,
    stock: 15,
    featured: false,
    rating: 4.5,
    reviewCount: 33,
    material: 'Speckled stoneware, reactive glaze',
    dimensions: '26 cm diameter · 2.1 L',
    summary: 'Reactive glaze pools at the rim, so every bowl runs slightly different.',
    description:
      'A wide, shallow bowl that works for salad, pasta or fruit on the bench. The reactive glaze pools where the wall meets the rim and breaks lighter over the speckle, which means the colour varies a little from one bowl to the next.',
  },
  {
    slug: 'brighton-linen-apron',
    name: 'Brighton Linen Apron',
    category: 'textiles',
    priceCents: 7_900,
    stock: 19,
    featured: false,
    rating: 4.4,
    reviewCount: 27,
    material: 'Mid-weight washed linen',
    dimensions: 'One size · adjustable neck',
    summary: 'Cross-back straps, so the weight sits on your shoulders instead of your neck.',
    description:
      'Cross-back straps distribute the weight across the shoulders rather than hanging off the neck, which you notice after the second hour. Two deep front pockets, a towel loop at the hip, and mid-weight linen that softens with every wash.',
  },
  {
    slug: 'moonee-double-wall-glass',
    name: 'Moonee Double-Wall Glass — Pair',
    category: 'glassware',
    priceCents: 5_200,
    stock: 26,
    featured: false,
    rating: 4.3,
    reviewCount: 61,
    material: 'Hand-blown borosilicate',
    dimensions: '10 cm tall · 250 ml each',
    summary: 'Hand-blown double wall: hot drinks stay hot, the outside stays touchable.',
    description:
      'Two walls of borosilicate with a sealed air gap between them, which keeps the outside comfortable to hold and slows the drink cooling. Hand-blown, so the seam and the volume vary by a millilitre or two. Sold in pairs.',
  },
  {
    slug: 'st-kilda-pepper-mill',
    name: 'St Kilda Pepper Mill',
    category: 'kitchen',
    priceCents: 8_400,
    stock: 14,
    featured: false,
    rating: 4.6,
    reviewCount: 42,
    material: 'Solid walnut, hardened steel mechanism',
    dimensions: '21 cm tall',
    summary: 'Hardened steel burr with a proper coarse setting, not just "fine" and "less fine".',
    description:
      'Solid walnut turned on a lathe, with a hardened steel mechanism that gives a genuine range from cracked to powder. The adjustment nut sits under the base so it does not drift while you grind.',
  },
  {
    slug: 'geelong-decaf-blend',
    name: 'Geelong Decaf — Swiss Water',
    category: 'coffee',
    priceCents: 2_300,
    stock: 48,
    featured: false,
    rating: 4.1,
    reviewCount: 89,
    material: '250 g whole bean',
    dimensions: 'Roasted weekly',
    summary: 'Swiss Water process, so there is no solvent anywhere near it.',
    description:
      'Decaffeinated by the Swiss Water process, which uses only water and carbon filtration. Colombian base with enough body to survive milk, and none of the flat papery character that gives decaf its reputation.',
  },
  {
    slug: 'williamstown-butter-dish',
    name: 'Williamstown Butter Dish',
    category: 'ceramics',
    priceCents: 4_800,
    stock: 1,
    featured: false,
    rating: 4.2,
    reviewCount: 18,
    material: 'Glazed stoneware',
    dimensions: '16 × 9 × 7 cm',
    summary: 'Holds a 250 g block with the lid on. Most do not.',
    description:
      'Sized around an Australian 250 g block rather than a European one, which is why the lid actually closes. Glazed inside and out so it wipes clean, with a lip that keeps the lid from sliding off when you carry it to the table.',
  },
  {
    slug: 'hawthorn-tea-pot',
    name: 'Hawthorn Teapot',
    category: 'ceramics',
    priceCents: 9_600,
    stock: 11,
    featured: false,
    rating: 4.7,
    reviewCount: 55,
    material: 'Glazed stoneware, stainless infuser',
    dimensions: '14 cm · 800 ml',
    summary: 'Non-drip spout and a basket infuser deep enough for leaves to unfurl.',
    description:
      'The spout is cut at an angle that breaks the stream cleanly, so it stops pouring when you stop pouring. The stainless basket drops most of the way to the base, giving whole leaves room to open instead of compressing them into a plug.',
  },
  {
    slug: 'footscray-canvas-tote',
    name: 'Footscray Canvas Tote',
    category: 'textiles',
    priceCents: 5_900,
    stock: 33,
    featured: false,
    rating: 4.5,
    reviewCount: 72,
    material: '16 oz cotton canvas',
    dimensions: '42 × 38 × 12 cm',
    summary: '16 oz canvas with a flat base, so it stands up when you load it.',
    description:
      'Heavy 16 oz canvas with a boxed base, so it stands on its own at the market instead of collapsing sideways. Bar-tacked handle joins, an internal pocket for keys, and enough depth to take a week of groceries without complaint.',
  },
  {
    slug: 'coburg-measuring-jug',
    name: 'Coburg Measuring Jug',
    category: 'glassware',
    priceCents: 3_900,
    stock: 0,
    featured: false,
    rating: 4.0,
    reviewCount: 24,
    material: 'Borosilicate glass',
    dimensions: '15 cm · 1 L',
    summary: 'Markings you can read from above, not just side-on.',
    description:
      'Borosilicate, so it goes from fridge to microwave without protest. The markings run up the inside wall at an angle that stays legible when you are looking down into the jug, which is how anyone actually reads one.',
  },
  {
    slug: 'malvern-wooden-spoon-set',
    name: 'Malvern Wooden Spoon Set',
    category: 'kitchen',
    priceCents: 4_400,
    stock: 27,
    featured: false,
    rating: 4.3,
    reviewCount: 36,
    material: 'Olive wood',
    dimensions: 'Set of 3 · 28–32 cm',
    summary: 'Olive wood: dense enough not to fuzz after a month in a stockpot.',
    description:
      'Olive wood is dense and closed-grain, so it resists staining and does not go fuzzy the way softer timbers do. Three shapes — flat-edged for scraping, deep for stirring, slotted for lifting. Hand wash and oil occasionally.',
  },
  {
    slug: 'kew-storage-canister',
    name: 'Kew Storage Canister',
    category: 'ceramics',
    priceCents: 5_400,
    stock: 20,
    featured: false,
    rating: 4.4,
    reviewCount: 29,
    material: 'Stoneware with silicone-sealed bamboo lid',
    dimensions: '13 × 18 cm · 1.2 L',
    summary: 'Airtight silicone seal, which is the whole point of a canister.',
    description:
      'A bamboo lid with a silicone gasket that actually seals, keeping beans and flour away from air. Opaque stoneware body, because light degrades coffee nearly as fast as oxygen does. Holds a kilo of beans with room to scoop.',
  },
  {
    slug: 'armadale-cocktail-glass',
    name: 'Armadale Coupe — Pair',
    category: 'glassware',
    priceCents: 7_600,
    stock: 2,
    featured: false,
    rating: 4.6,
    reviewCount: 21,
    material: 'Lead-free crystal',
    dimensions: '12 cm tall · 180 ml each',
    summary: 'Fine-rimmed lead-free crystal with a stem that feels balanced.',
    description:
      'Lead-free crystal pulled to a fine cut rim, which changes how a drink lands more than anyone expects. The stem is weighted so the glass sits balanced in the hand rather than top-heavy. Hand wash. Sold in pairs.',
  },
  {
    slug: 'sandringham-salt-pig',
    name: 'Sandringham Salt Pig',
    category: 'kitchen',
    priceCents: 3_600,
    stock: 25,
    featured: false,
    rating: 4.5,
    reviewCount: 47,
    material: 'Unglazed exterior, glazed interior stoneware',
    dimensions: '11 × 10 cm · 400 ml',
    summary: 'Angled mouth wide enough for a whole hand, not just two fingers.',
    description:
      'The mouth is cut wide and angled down so you can get a full pinch without knocking salt across the bench. Glazed inside so salt does not draw moisture through the wall, unglazed outside for grip with wet hands.',
  },
];

/** Test-suite anchors. Referenced by fixtures so specs never hard-code a slug twice. */
export const SEED_ANCHORS = {
  /** Deep stock, always addable. */
  inStock: 'brunswick-stoneware-mug',
  /** stock === 0, add-to-cart must be blocked. */
  outOfStock: 'carlton-ceramic-pour-over',
  /** stock below LOW_STOCK_THRESHOLD, warning must show. */
  lowStock: 'thornbury-burr-grinder',
  /** stock === 1, the quantity-ceiling boundary. */
  singleUnit: 'williamstown-butter-dish',
  /** Priced so that two units cross the free-shipping threshold. */
  highValue: 'richmond-wool-throw',
} as const;
