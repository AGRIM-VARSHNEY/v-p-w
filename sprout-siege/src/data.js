// Pip's Expectations: game data (companions, weapons, charms, enemies, shop, icons).

export const RUN_LENGTH = 420; // free play: seconds until the final boss

export const HEROES = [
  {
    id: 'pip', name: 'Pip', title: "The blacksmith's boy",
    blurb: 'Brave and even-handed. Starts with a whirling Nosegay.',
    hp: 100, speed: 1.0, dmg: 1.0, armor: 0, magnet: 0, crit: 0,
    start: 'orbit', unlock: { type: 'free' },
  },
  {
    id: 'joe', name: 'Joe Gargery', title: 'The blacksmith',
    blurb: 'Slow, mighty and gentle. Shrugs off blows. Starts with the Forge Hammer.',
    hp: 150, speed: 0.9, dmg: 1.0, armor: 2, magnet: 0, crit: 0,
    start: 'stomp', unlock: { type: 'chapter', chapter: 0, cost: 150 },
  },
  {
    id: 'herbert', name: 'Herbert Pocket', title: 'The pale young gentleman',
    blurb: 'Fragile but clever, with a long reach for pickups. Starts with the Galvanic Jar.',
    hp: 80, speed: 1.06, dmg: 1.15, armor: 0, magnet: 0.3, crit: 0,
    start: 'zap', unlock: { type: 'chapter', chapter: 2, cost: 300 },
  },
  {
    id: 'biddy', name: 'Biddy', title: 'The village schoolmistress',
    blurb: 'Quick and lucky, with sharp crits. Starts with her Bee Skep.',
    hp: 90, speed: 1.12, dmg: 1.0, armor: 0, magnet: 0, crit: 0.06,
    start: 'bees', unlock: { type: 'chapter', chapter: 4, cost: 500 },
  },
];

export const DIFFICULTIES = [
  { id: 'cozy', name: 'Gentle', desc: 'Soft blows and fewer foes. A fine first reading.', dmg: 0.4, hp: 0.8, spawn: 0.8, acorns: 0.75 },
  { id: 'normal', name: 'Standard', desc: 'The tale as the author intended.', dmg: 1, hp: 1, spawn: 1, acorns: 1 },
  { id: 'spicy', name: 'Harrowing', desc: 'More Miasma, harder blows, half again the shillings.', dmg: 1.4, hp: 1.25, spawn: 1.25, acorns: 1.5 },
];

export const WEAPONS = {
  orbit: {
    name: 'Nosegay', icon: 'posy',
    lv: [
      { n: 2, dmg: 12, r: 1.6, spin: 3.0 },
      { n: 3, dmg: 14, r: 1.75, spin: 3.2 },
      { n: 3, dmg: 18, r: 1.95, spin: 3.5 },
      { n: 4, dmg: 22, r: 2.15, spin: 3.8 },
      { n: 5, dmg: 27, r: 2.35, spin: 4.2 },
    ],
    up: ['Posies whirl round you. In 1812, folk swore flowers kept bad air away.', '+1 posy, +2 damage', '+4 damage, wider circle', '+1 posy, spins faster', '+1 posy, +5 damage'],
  },
  spark: {
    name: 'Tinderbox Spark', icon: 'spark',
    lv: [
      { cd: 0.95, dmg: 14, n: 1, pierce: 1 },
      { cd: 0.85, dmg: 18, n: 1, pierce: 1 },
      { cd: 0.8, dmg: 21, n: 2, pierce: 1 },
      { cd: 0.72, dmg: 25, n: 2, pierce: 2 },
      { cd: 0.62, dmg: 31, n: 3, pierce: 3 },
    ],
    up: ['Flicks a spark at the nearest foe.', 'Strikes faster, +4 damage', '+1 spark each strike', 'Sparks pass through 1 more foe', '+1 spark, passes through more'],
  },
  stomp: {
    name: 'Forge Hammer', icon: 'hammer',
    lv: [
      { cd: 2.6, dmg: 18, r: 3.0 },
      { cd: 2.4, dmg: 23, r: 3.4 },
      { cd: 2.2, dmg: 29, r: 3.8 },
      { cd: 2.0, dmg: 36, r: 4.2 },
      { cd: 1.7, dmg: 46, r: 4.8 },
    ],
    up: ['Bring the hammer down and knock back everything nearby.', 'Wider blow, +5 damage', 'Wider blow, strikes more often', '+7 damage, wider blow', 'Mighty blow, +10 damage'],
  },
  carrot: {
    name: 'Boomerang', icon: 'boomerang',
    lv: [
      { cd: 1.7, dmg: 20, n: 1, range: 7 },
      { cd: 1.6, dmg: 25, n: 1, range: 7.5 },
      { cd: 1.5, dmg: 29, n: 2, range: 8 },
      { cd: 1.4, dmg: 35, n: 2, range: 8.5 },
      { cd: 1.25, dmg: 42, n: 3, range: 9 },
    ],
    up: ['A curiosity from New South Wales. It flies out and comes back.', '+5 damage, longer throw', '+1 boomerang', '+6 damage, throws faster', '+1 boomerang, +7 damage'],
  },
  bees: {
    name: 'Bee Skep', icon: 'skep',
    lv: [
      { cd: 1.5, dmg: 8, n: 2 },
      { cd: 1.4, dmg: 10, n: 3 },
      { cd: 1.3, dmg: 12, n: 4 },
      { cd: 1.2, dmg: 15, n: 5 },
      { cd: 1.0, dmg: 18, n: 7 },
    ],
    up: ['Bees from a straw hive chase down the Miasma.', '+1 bee, +2 damage', '+1 bee, +2 damage', '+1 bee, +3 damage', '+2 bees, swarms faster'],
  },
  zap: {
    name: 'Galvanic Jar', icon: 'jar',
    lv: [
      { cd: 1.9, dmg: 16, chain: 3 },
      { cd: 1.75, dmg: 20, chain: 4 },
      { cd: 1.6, dmg: 24, chain: 5 },
      { cd: 1.45, dmg: 29, chain: 6 },
      { cd: 1.3, dmg: 35, chain: 8 },
    ],
    up: ['Bottled lightning leaps between 3 foes. The newest wonder of science.', '+1 leap, +4 damage', '+1 leap, crackles faster', '+1 leap, +5 damage', '+2 leaps, +6 damage'],
  },
  meteor: {
    name: 'Acorn Fall', icon: 'meteor',
    lv: [
      { cd: 3.0, dmg: 30, n: 2, r: 2.0 },
      { cd: 2.8, dmg: 40, n: 2, r: 2.2 },
      { cd: 2.6, dmg: 48, n: 3, r: 2.4 },
      { cd: 2.4, dmg: 60, n: 4, r: 2.6 },
      { cd: 2.1, dmg: 75, n: 5, r: 3.0 },
    ],
    up: ['Giant acorns drop from the old English oaks.', '+10 damage, bigger thud', '+1 acorn', '+1 acorn, +12 damage', '+1 acorn, enormous thud'],
  },
};

export const PASSIVES = {
  heart: { name: 'Hearty Broth', icon: 'broth', up: '+20 health, and heal 20 now' },
  boots: { name: 'Riding Boots', icon: 'boots', up: '+8% walking speed' },
  blade: { name: 'Sheffield Steel', icon: 'blade', up: '+10% damage' },
  dial: { name: 'Pocket Watch', icon: 'dial', up: 'Weapons ready 7% sooner' },
  honey: { name: 'Honey Jar', icon: 'honey', up: '+30% pickup reach' },
  bloom: { name: 'Garden Posy', icon: 'bloom', up: '+10% attack area' },
  clover: { name: 'Lucky Sixpence', icon: 'sixpence', up: '+8% lucky hits, better parcels' },
  bark: { name: 'Leather Jerkin', icon: 'jerkin', up: 'Take 1 less damage from every blow' },
  regrow: { name: 'Willow-bark Tea', icon: 'tea', up: 'Recover 0.4 health every second' },
};

export const MAX_LEVEL = 5;
export const MAX_WEAPONS = 5;
export const MAX_PASSIVES = 5;

export const ENEMIES = {
  gloop: { name: 'Miasma', hp: 12, speed: 2.5, dmg: 6, xp: 1, r: 0.42, scale: 0.085, colors: ['#7d5fd3', '#a58cf0', '#c9b8ff'] },
  flutter: { name: 'Marsh Bat', hp: 7, speed: 4.2, dmg: 5, xp: 1, r: 0.38, scale: 0.09, fly: true, colors: ['#4b3a6b', '#33264f', '#ffe066'] },
  shroom: { name: 'Mildew Cap', hp: 42, speed: 1.7, dmg: 12, xp: 3, r: 0.58, scale: 0.1, colors: ['#9b4fd1', '#f1e3c8', '#f4e9ff'] },
  spitbud: { name: 'Fen Spitter', hp: 22, speed: 2.0, dmg: 8, xp: 2, r: 0.5, scale: 0.09, ranged: true, colors: ['#d64f9a', '#ff7ac0', '#3e8f4a'] },
  beetle: { name: 'Bramble Beetle', hp: 34, speed: 2.3, dmg: 14, xp: 3, r: 0.55, scale: 0.09, charger: true, colors: ['#2e3f7a', '#4a63b5', '#ff5d5d'] },
};

// model: which voxel body; tint multiplies its colors; size scales it.
export const BOSSES = {
  king: { name: 'King Miasma', model: 'king', hp: 2000, r: 1.5, dmg: 20, speed: 2.2, at: 180, tint: '#ffffff', size: 1, hint: 'He leaps. Watch for his shadow.' },
  golem: { name: 'The Gloom Golem', model: 'golem', hp: 6500, r: 1.8, dmg: 26, speed: 1.8, at: RUN_LENGTH, tint: '#ffffff', size: 1, hint: 'Break the Golem and save the island!' },
  hulk: { name: 'The Hulk Fog', model: 'king', hp: 900, r: 1.3, dmg: 16, speed: 2.0, tint: '#b8d0c0', size: 0.85, hint: 'Fog off the prison ships. It leaps; watch its shadow.' },
  dust: { name: 'The Dust of Years', model: 'king', hp: 1500, r: 1.5, dmg: 18, speed: 2.2, tint: '#f4ece0', size: 1, hint: 'Twenty years of dust, risen up at once.' },
  particular: { name: 'The London Particular', model: 'golem', hp: 2100, r: 1.8, dmg: 20, speed: 1.7, orbs: 11, tint: '#f2e08a', size: 1, hint: 'A yellow fog thick enough to lean on.' },
  riverfog: { name: 'The River Fog', model: 'king', hp: 1900, r: 1.7, dmg: 22, speed: 2.4, tint: '#a8c4f0', size: 1.15, hint: 'It rolls up the Thames to swallow the boat.' },
  fever: { name: 'The Fever', model: 'golem', hp: 3400, r: 1.8, dmg: 24, speed: 1.9, orbs: 13, tint: '#ffb0a0', size: 1, hint: 'Break the fever, and Pip will wake.' },
};

// Free play timeline (seconds).
export const EVENTS = [
  { t: 75, kind: 'flock', type: 'flutter', n: 28, text: 'A flock of marsh bats!' },
  { t: 150, kind: 'ring', type: 'gloop', n: 36, text: 'The Miasma surrounds you!' },
  { t: 180, kind: 'boss', boss: 'king' },
  { t: 270, kind: 'flock', type: 'shroom', n: 18, text: 'The mildew caps are marching!' },
  { t: 330, kind: 'ring', type: 'mix', n: 54, text: 'The night closes in!' },
  { t: 360, kind: 'night', text: 'Night falls. The Miasma grows bolder.' },
  { t: RUN_LENGTH, kind: 'boss', boss: 'golem' },
];

export const SHOP = [
  { id: 'vital', name: 'Hearty Breakfasts', icon: 'broth', desc: '+10 health', max: 5, costs: [25, 50, 90, 140, 200] },
  { id: 'might', name: 'Whetstone', icon: 'blade', desc: '+5% damage', max: 5, costs: [30, 60, 100, 150, 220] },
  { id: 'swift', name: 'Stout Boots', icon: 'boots', desc: '+4% walking speed', max: 5, costs: [25, 50, 90, 140, 200] },
  { id: 'reach', name: 'Deep Pockets', icon: 'honey', desc: '+15% pickup reach', max: 5, costs: [20, 40, 70, 110, 160] },
  { id: 'greed', name: 'Thrift', icon: 'coin', desc: '+10% shillings found', max: 5, costs: [30, 60, 100, 150, 220] },
  { id: 'reroll', name: 'Second Thoughts', icon: 'dial', desc: '+1 card reroll each chapter', max: 3, costs: [40, 90, 160] },
  { id: 'revive', name: 'Another Chance', icon: 'heart', desc: '+1 chance each chapter', max: 2, costs: [180, 320] },
];

export const FLOWER_COLORS = ['#ff8fb1', '#ffd23f', '#f4f7ff', '#7ab8ff', '#ff9f43'];

// 10x10 pixel-art icons. Each char maps to a palette color, '.' is transparent.
export const ICON_PALETTE = {
  k: '#191736', g: '#5fb84a', G: '#2f7a3a', l: '#a6e36b', y: '#ffd23f', Y: '#ff9f1c',
  r: '#e8484a', R: '#a02c3a', p: '#ff8fb1', b: '#4fc3f7', B: '#2b6cb0', c: '#9ef0ff',
  w: '#ffffff', n: '#8b5a2b', N: '#5a3418', t: '#d9a066', v: '#8c6bd6', V: '#4b3a8b',
  s: '#b8bec9', S: '#6d7385', o: '#ff7a1a',
};

export const ICONS = {
  posy: ['.kk...kk..', 'kppk.kyyk.', 'kpwpkkyyk.', '.kkGGkkk..', '..kGkGk...', '...kGGk...', '...kGGk...', '..kRRRRk..', '...kRRk...', '....kk....'],
  spark: ['....kk....', '...kcck...', '..kcwwck..', 'kkcwwwwckk', 'kcccwwccck', '.kkcwwckk.', '..kcccck..', '..kckkck..', '.kck..kck.', '.kk....kk.'],
  hammer: ['.kkkkkkkk.', 'kssssssSSk', 'kssssssSSk', '.kkkkkkkk.', '....knk...', '....knk...', '....knk...', '....knk...', '....knk...', '....kkk...'],
  boomerang: ['..........', '.kkk......', 'knnnk.....', 'knttnk....', '.kntnnk...', '..knnnnkkk', '...knnntnk', '....knnnnk', '.....kkkk.', '..........'],
  skep: ['...kkkk...', '..kyYYyk..', '.kYYyyYYk.', '.kyyyyyyk.', 'kYYyyyYYYk', 'kyyyyyyyyk', 'kYYYkkYYYk', 'kyyykkyyyk', 'kkkkkkkkkk', '..........'],
  jar: ['....kk....', '....kk....', '...kssk...', '..kccccck.', '.kcwcccck.', '.kcwcccck.', '.kssssssk.', '.ksSssSsk.', '.kssssssk.', '..kkkkkk..'],
  meteor: ['Y.Y.......', '.Y.Y.kkkk.', 'Y.Y.kNNNNk', '.Y.kNnnNNk', '..knnnnnnk', '...ktttttk', '...kttttk.', '....kttk..', '.....kk...', '..........'],
  coin: ['...kkkk...', '..kwssssk.', '.kwsSSSssk', '.kwSsssSsk', '.ksSsssSsk', '.ksSsssSsk', '.kssSSSssk', '..kssssk..', '...kkkk...', '..........'],
  sixpence: ['..........', '...kkkk...', '..kyyyyk..', '.kyYyyyyk.', '.kyyYYyyk.', '.kyyyyYyk.', '.kyyyyyyk.', '..kyyyyk..', '...kkkk...', '..........'],
  hourglass: ['.kkkkkkkk.', '.knnnnnnk.', '..kcccck..', '...kyyk...', '....kk....', '....ky....', '...kyyk...', '..kyyyyk..', '.knnnnnnk.', '.kkkkkkkk.'],
  die: ['.kkkkkkkk.', 'kwwwwwwwwk', 'kwkwwwwwwk', 'kwwwwwwwwk', 'kwwwwkwwwk', 'kwwwwwwwwk', 'kwwwwwwkwk', 'kwwwwwwwwk', '.kkkkkkkk.', '..........'],
  grave: ['...kkkk...', '..ksssskk.', '.kssssssk.', '.ksSSSSsk.', '.kssssssk.', '.ksSSSssk.', '.kssssssk.', '.kssssssk.', 'kkgggggggk', '.kkkkkkkk.'],
  brooch: ['...kkkk...', '..kyyyyk..', '.kyvvvvyk.', 'kyvwvvvvyk', 'kyvvvvvvyk', 'kyvvvvvvyk', '.kyvvvvyk.', '..kyyyyk..', '...kkkk...', '..........'],
  compass: ['...kkkk...', '..kyyyyk..', '.kywwrwyk.', 'kywwwrwwyk', 'kywwkwwwyk', 'kywwBwwwyk', '.kywBwwyk.', '..kyyyyk..', '...kkkk...', '..........'],
  receipt: ['.kkkkkkk..', '.kwwwwwwk.', '.kwkkkkwk.', '.kwwwwwwk.', '.kwkkkwwk.', '.kwwwwwwk.', '.kwkkkkwk.', '.kwwwwRwk.', '.kwwwwwwk.', '.kkkkkkkk.'],
  broth: ['..w...w...', '...w...w..', '..w...w...', '..........', 'kkkkkkkkkk', 'knyyyyyynk', '.knnnnnnk.', '..knnnnk..', '...kkkk...', '..........'],
  tea: ['...w.w....', '....w.w...', '..........', '.kkkkkkk..', '.kwnnnwkkk', '.kwnnnwk.k', '.kwwwwwkkk', '..kwwwk...', 'kkkkkkkkk.', '..........'],
  jerkin: ['.kk....kk.', 'knnk..knnk', 'knnnkknnnk', 'knnnnynnnk', 'knnnnnnnnk', 'knnnnynnnk', 'knnnnnnnnk', 'knnnnynnnk', 'kkkkkkkkkk', '..........'],
  parcel: ['....kk....', '..kktnkk..', '.ktttntttk', '.ktttntttk', '.knnnnnnnk', '.ktttntttk', '.ktttntttk', '.ktttntttk', '.kkkkkkkkk', '..........'],
  wave: ['..........', '..........', '.kk...kk..', 'kbbk.kbbk.', 'bwbbkbwbbk', 'bbbbbbbbbb', 'BbbBBbbBBb', 'BBBBBBBBBB', '..........', '..........'],
  bottle: ['....kk....', '....nn....', '...kkkk...', '...kggk...', '..kggggk..', '.kgglgggk.', '.kgglgggk.', '.kggggggk.', '.kggggggk.', '..kkkkkk..'],
  heart: ['..........', '.kkk..kkk.', 'krrrkkrrwk', 'krrrrrrrwk', 'krrrrrrrrk', '.krrrrrrk.', '..krrrrk..', '...krrk...', '....kk....', '..........'],
  boots: ['..........', '....kkkk..', '....kbbk..', '.ww.kbbk..', 'wwwwkbbkkk', '.wwkbbbbbk', '..kBBBBBBk', '..kkkkkkkk', '..........', '..........'],
  blade: ['.........k', '........ks', '.......ksk', '......ksk.', '..k..ksk..', '..kkksk...', '...kRk....', '..kRkk....', '.kRk..k...', 'kkk.......'],
  dial: ['...kkkk...', '..kyyyyk..', '.kywwwwyk.', 'kywwkwwwyk', 'kywwkwwwyk', 'kywwkkkwyk', 'kywwwwwwyk', '.kywwwwyk.', '..kyyyyk..', '...kkkk...'],
  honey: ['...kkkk...', '..knnnnk..', '...kkkk...', '..kyyyyk..', '.kyYyyyyk.', '.kyYyyyyk.', '.kyyyyyYk.', '.kyyyyyYk.', '..kyyyYk..', '...kkkk...'],
  bloom: ['....kk....', '...kppk...', '.kkkppkkk.', 'kpppyypppk', 'kpppyypppk', '.kkkppkkk.', '...kppk...', '....kk....', '...kGGk...', '..kGGGGk..'],
  clover: ['..kk..kk..', '.kggkkggk.', '.kgggggk..', '..kgggk...', '.kggkggk..', 'kgggkgggk.', '.kgk.kgk..', '..k..kk...', '.....kGk..', '......kk..'],
  regrow: ['...kkkk...', '...klgk...', '...kggk...', 'kkkkggkkkk', 'klgggggggk', 'kggggggggk', 'kkkkggkkkk', '...kggk...', '...kggk...', '...kkkk...'],
  chest: ['..........', '.kkkkkkkk.', 'knnnnnnnnk', 'kNNNyyNNNk', 'kkkkyykkkk', 'knnnkknnnk', 'knnnnnnnnk', 'knnnnnnnnk', 'kNNNNNNNNk', '.kkkkkkkk.'],
  apple: ['.....kk...', '....kGk...', '..kkkkkk..', '.krrrrwrk.', 'krrrrrrwrk', 'krrrrrrrrk', 'krrrrrrrrk', '.krrrrrrk.', '..krrrrk..', '...kkkk...'],
  gloop: ['..........', '...kkkk...', '..kvvvvk..', '.kvwkvwkk.', '.kvwkvwkvk', 'kvvvvvvvvk', 'kvvVVVVvvk', 'kvvvvvvvvk', '.kkkkkkkk.', '..........'],
};
