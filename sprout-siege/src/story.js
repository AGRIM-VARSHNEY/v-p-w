// Pip's Expectations: the story campaign, adapted from Charles Dickens's
// Great Expectations (1861), a public-domain novel set from 1812 onward.

export const BIRTH_YEAR = 1805;
export const NEW_TALE_YEARS = 50;

// Island looks per chapter. Props are placed in world units around the island centre.
export const THEMES = {
  meadow: { palette: 'meadow', seed: 7, trees: 28, treeKinds: [0, 1], rocks: 30, tufts: 420, reeds: 0, fog: [55, 170], props: [] },
  marsh: {
    palette: 'marsh', seed: 21, trees: 7, treeKinds: [1], rocks: 16, tufts: 140, reeds: 260, fog: [34, 125], snow: true,
    start: [0, 4],
    props: [
      { m: 'church', x: -19, z: -14, rot: 0.6, circles: [[0, 0, 2.4], [0, 2.4, 1.4]] },
      { m: 'grave', scatter: { x: -11, z: -6, r: 5.5, n: 11 }, circle: 0.35 },
      { m: 'battery', x: 17, z: 10, rot: -2.3, circles: [[0, 0, 1.3]] },
    ],
  },
  satis: {
    palette: 'garden', seed: 33, trees: 24, treeKinds: [0], rocks: 8, tufts: 640, reeds: 0, fog: [45, 150],
    start: [0, 4],
    props: [
      { m: 'manor', x: 0, z: -24, rot: 0, circles: [[-3.8, 0, 2.0], [0, 0, 2.0], [3.8, 0, 2.0]] },
      { m: 'cake', x: 5, z: -15, rot: 0.3, circles: [[0, 0, 1.3]] },
    ],
  },
  london: {
    palette: 'cobble', seed: 45, trees: 6, treeKinds: [0], rocks: 0, tufts: 60, reeds: 0, fog: [26, 95],
    start: [0, 0],
    props: [
      { m: 'townhouse', ring: { r: 25.5, n: 12, offset: 0.2 }, circles: [[0, 0, 1.8]], face: true, alt: 'townhouse2' },
      { m: 'lamp', ring: { r: 9, n: 6, offset: 0.5 }, circles: [[0, 0, 0.35]], glow: true },
      { m: 'lamp', ring: { r: 17, n: 9, offset: 0 }, circles: [[0, 0, 0.35]], glow: true },
      { m: 'crate', scatter: { x: 0, z: 0, r: 21, n: 10 }, circle: 0.45 },
      { m: 'barrel', scatter: { x: 0, z: 0, r: 21, n: 8 }, circle: 0.4 },
    ],
  },
  river: {
    palette: 'bank', seed: 57, trees: 12, treeKinds: [0, 1], rocks: 10, tufts: 200, reeds: 220, fog: [40, 140],
    start: [0, 6],
    props: [
      { m: 'boat', ring: { r: 29.5, n: 7, offset: 0.3 }, face: true },
      { m: 'barrel', scatter: { x: 0, z: 0, r: 20, n: 6 }, circle: 0.4 },
    ],
  },
  forge: {
    palette: 'village', seed: 69, trees: 18, treeKinds: [0], rocks: 12, tufts: 420, reeds: 0, fog: [55, 170],
    start: [0, 2],
    props: [
      { m: 'cottage', x: 0, z: -10, rot: 0, circles: [[-2.6, 0, 1.9], [0.2, 0, 2.0], [2.0, 0, 1.6]], smoke: [2.07, 4.96, -10.1] },
      { m: 'anvil', x: 4.5, z: -5, rot: 0.4, circles: [[0, 0, 0.6]] },
      { m: 'hay', scatter: { x: -13, z: 6, r: 3.5, n: 5 }, circle: 0.6 },
      { m: 'fence', line: { x0: 8, z0: 8, x1: 20, z1: 8, n: 5 } },
      { m: 'fence', line: { x0: 8, z0: 18, x1: 18, z1: 18, n: 4 } },
    ],
  },
};

const ATMOS = {
  freeDay: null,
  marsh: [
    { top: '#4b5a8a', mid: '#c9a7b8', bot: '#d9c8cf', hs: '#d0d6f0', hg: '#5a5070', hi: 1.6, sun: '#ffd0a8', si: 1.6, night: 0.35 },
    { top: '#1d2350', mid: '#5a5478', bot: '#6a6488', hs: '#8a96c8', hg: '#2a2448', hi: 1.15, sun: '#b8c4ff', si: 1.0, night: 0.85 },
  ],
  satis: [
    { top: '#6b6a7a', mid: '#c8b89a', bot: '#d8ccb0', hs: '#e8dcc0', hg: '#5a5060', hi: 1.6, sun: '#ffe0b0', si: 1.5, night: 0.2 },
    { top: '#5f8fd0', mid: '#e6d6b0', bot: '#f0e6cc', hs: '#f4ead2', hg: '#6a6080', hi: 1.85, sun: '#fff0d0', si: 2.2, night: 0 },
  ],
  london: [
    { top: '#6a6650', mid: '#bdb07a', bot: '#c9be8e', hs: '#e8deb0', hg: '#4a4438', hi: 1.45, sun: '#ffe6a0', si: 1.3, night: 0.55 },
    { top: '#5a7aa8', mid: '#d6cfa8', bot: '#e0d8b8', hs: '#f0e8c8', hg: '#5a5048', hi: 1.7, sun: '#fff0c0', si: 1.9, night: 0.25 },
  ],
  river: [
    { top: '#0e1236', mid: '#2c3166', bot: '#3a3f78', hs: '#8090e0', hg: '#2a2050', hi: 1.15, sun: '#a8b8ff', si: 1.1, night: 1 },
    { top: '#3a4a8a', mid: '#e0a090', bot: '#f0c8b0', hs: '#ffd8c0', hg: '#4a3a60', hi: 1.55, sun: '#ffc090', si: 1.8, night: 0.3 },
  ],
  forge: [
    { top: '#5a78c0', mid: '#ffd8a8', bot: '#ffe8cc', hs: '#ffe8cc', hg: '#7a6a8a', hi: 1.7, sun: '#ffd08a', si: 2.0, night: 0.1 },
    { top: '#3f9cf5', mid: '#a6dbff', bot: '#d4f0ff', hs: '#e2f3ff', hg: '#7a6a9a', hi: 1.9, sun: '#fff4dc', si: 2.4, night: 0 },
  ],
};

export const CHAPTERS = [
  {
    id: 'marsh', num: 'I', title: 'The Marshes', date: 'Christmas Eve, 1812', place: 'The Kent marshes', age: 7,
    theme: 'marsh', atmos: ATMOS.marsh, length: 200,
    quote: { text: 'So, I called myself Pip, and came to be called Pip.', src: 'Great Expectations, chapter I' },
    intro: [
      'It is Christmas Eve, and the mist is rising off the river. Pip, seven years old and an orphan, has come to the lonely churchyard to look at the stones over his parents’ grave.',
      'Out of the mist a man starts up from among the graves: a convict in coarse grey, an iron on his leg, shaking with cold. He wants a file to cut his chain, and food, and he wants them before morning.',
      'But tonight the mist is no ordinary mist. Every doctor in Kent will tell you that sickness rides on bad air, and the Miasma has come off the marshes with teeth.',
      'Gather what the convict asked for, carry it to him at the old Battery, and keep the Miasma back. Every blob you scatter leaves a posy behind, and a little colour comes back to the world.',
    ],
    objectives: [
      { type: 'collect', n: 6, names: ['the file', 'a pork pie', 'a heel of bread', 'a rind of cheese', 'a pot of mincemeat', 'a meat bone'], text: 'Gather a file and wittles ({done}/{n})', surge: { kind: 'flock', type: 'flutter', n: 12 } },
      { type: 'reach', npc: 'convict', text: 'Carry them to the convict at the old Battery' },
      { type: 'boss', boss: 'hulk', at: 80, text: 'Drive back the Hulk Fog' },
    ],
    npcs: [{ look: 'convict', id: 'convict', x: 15.2, z: 7.6, mode: 'stand' }],
    mix: { gloop: 10, flutter: 4 }, hp: 1.0, spawn: 0.85,
    outro: [
      'The convict tears into the pie like a starving dog. When he looks up at last, his eyes are wet. “You’re a good boy,” he mutters, and the iron on his leg rasps under the file.',
      'Far off across the marsh, torches bob in the mist. Soldiers are out, hunting for him.',
    ],
    choice: {
      prompt: 'Back at the forge, a sergeant of soldiers fills the doorway. “Seen an escaped man on the marshes, boy?”',
      options: [
        { label: 'Keep the convict’s secret', detail: 'Nothing now. Kindness has a long memory.', flag: 'kind', result: 'You shake your head and say nothing. Somewhere out on the marsh, a hunted man will remember the small boy who kept his word.' },
        { label: 'Tell the soldiers where he is', detail: '+40 shillings reward from the sergeant', shillings: 40, flag: 'told', result: 'The sergeant presses forty shillings into your hand. That night you dream of the convict’s eyes.' },
      ],
    },
    keepsake: 'rubbing',
  },
  {
    id: 'satis', num: 'II', title: 'Satis House', date: 'Autumn, 1813', place: 'The old town, Kent', age: 8,
    theme: 'satis', atmos: ATMOS.satis, length: 220,
    quote: { text: 'Pause you who read this, and think for a moment of the long chain of iron or gold, of thorns or flowers, that would never have bound you, but for the formation of the first link on one memorable day.', src: 'Great Expectations, chapter IX' },
    intro: [
      'Miss Havisham was jilted on her wedding morning, at twenty minutes to nine. She stopped every clock in Satis House at that minute, and she has worn her wedding dress ever since.',
      'Pip has been sent to “play” at the great dark house. The garden is choked with weeds, the wedding cake on the long table is grey with cobwebs, and Estella, the proud girl who lives there, calls him a common labouring boy.',
      'Nothing at Satis House wants to move forward. Wind the four stopped clocks and let time run again, if the dust of years will let you.',
    ],
    objectives: [
      { type: 'wind', points: [[-14, -4], [14, -6], [-8, 13], [11, 12]], time: 6, text: 'Wind the stopped clocks ({done}/{n}). Stand beside one.', surge: { kind: 'ring', type: 'gloop', n: 22 } },
      { type: 'boss', boss: 'dust', at: 100, text: 'Lay the Dust of Years to rest' },
    ],
    npcs: [],
    mix: { gloop: 8, flutter: 4, shroom: 3 }, hp: 1.1, spawn: 0.95,
    outro: [
      'One by one the clocks begin to tick. Twenty minutes to nine becomes a quarter to nine, then nine, then ten.',
      'Miss Havisham’s hand tightens on her stick. She does not look pleased, but she does not stop you.',
    ],
    choice: {
      prompt: 'Miss Havisham offers you a purse, if you will come every week and sit with her in the dark among the stopped clocks.',
      options: [
        { label: 'Throw open the shutters', detail: '+2 years: daylight and fresh air', years: 2, result: 'Daylight floods the room for the first time in twenty years. Miss Havisham shrinks from it, but your lungs fill with clean air.' },
        { label: 'Take the purse', detail: '+60 shillings, −1 year: long afternoons in a dusty room', shillings: 60, years: -1, result: 'The purse is heavy. The afternoons are long, and the dust settles in your chest.' },
      ],
    },
    keepsake: 'watch',
  },
  {
    id: 'london', num: 'III', title: 'Great Expectations', date: 'Spring, 1823', place: 'London', age: 18,
    theme: 'london', atmos: ATMOS.london, length: 230,
    quote: { text: 'Take nothing on its looks; take everything on evidence. There’s no better rule.', src: 'Mr Jaggers, Great Expectations, chapter XL' },
    intro: [
      'A stout lawyer named Jaggers arrives at the forge with astonishing news. An unknown benefactor has settled a fortune on Pip. He is to leave the forge and be brought up a gentleman in London. He has great expectations.',
      'London in 1823 is the largest city on earth, and the dirtiest. Coal smoke and river fog thicken into the yellow soup that Londoners would come to call a “London particular”.',
      'The new gas lamps glow through it like oranges. Clear the fog from the square, and see what your fortune can buy.',
    ],
    fortune: { kind: 200, told: 120 },
    objectives: [
      { type: 'bloom', pct: 18, text: 'Clear the fog from the square ({pct}% of {goal}%)', surge: { kind: 'ring', type: 'mix', n: 30 } },
      { type: 'boss', boss: 'particular', at: 140, text: 'Lift the London Particular' },
    ],
    npcs: [],
    mix: { gloop: 7, flutter: 4, shroom: 3, spitbud: 2.5 }, hp: 1.15, spawn: 1.0,
    outro: [
      'The yellow fog thins until you can see the far side of the square, and a pale young gentleman grinning at you from a doorway. It is Herbert Pocket, who will be your friend for life.',
      'Herbert shows you London: the theatres, the coffee houses, the river crowded with masts.',
    ],
    choice: {
      prompt: 'Herbert’s acquaintances invite you to join the Finches of the Grove, a club of young gentlemen who dine expensively and quarrel.',
      options: [
        { label: 'Join the Finches of the Grove', detail: '−60 shillings, −2 years: late suppers and claret', shillings: -60, years: -2, result: 'The suppers are grand and the bills are grander. You stumble home at dawn more often than you can count.' },
        { label: 'Keep sensible hours with Herbert', detail: '+1 year', years: 1, result: 'You and Herbert dine on chops at home and plan your futures by candlelight.' },
      ],
    },
    keepsake: 'brooch',
  },
  {
    id: 'river', num: 'IV', title: 'Down the River', date: 'March, 1829', place: 'The Thames', age: 23,
    theme: 'river', atmos: ATMOS.river, length: 230,
    quote: { text: '…life is made of ever so many partings welded together…', src: 'Joe Gargery, Great Expectations, chapter XXVII' },
    intro: [
      'One stormy night a weather-beaten man climbs Pip’s stair. It is the convict from the marshes. Transported to New South Wales, he made a fortune there, and every penny of Pip’s great expectations came from him.',
      '{kindLine}',
      'He calls himself Provis now. If he is caught in England, the law will show him no mercy.',
      'With Herbert at the oars, Pip must get Provis down the Thames to a steamer bound for Hamburg. Keep him close, and keep him safe.',
    ],
    kindLine: {
      kind: '“You kept my secret on the marshes, dear boy,” he says. “I swore I’d make a gentleman of you.”',
      told: '“You told the soldiers, I know,” he says. “You was a frightened child. I never held it against you.”',
    },
    objectives: [
      { type: 'escort', npc: 'provis', points: [[19, -12], [-4, -21], [-21, 9], [8, 21]], hold: 4, text: 'Bring Provis to the river stairs ({done}/{n})', surge: { kind: 'flock', type: 'flutter', n: 16 } },
      { type: 'boss', boss: 'riverfog', at: 120, text: 'Fight through the River Fog' },
    ],
    npcs: [{ look: 'provis', id: 'provis', x: 1.6, z: 7.6, mode: 'follow', hp: 160 }],
    mix: { gloop: 7, flutter: 5, shroom: 2, spitbud: 2, beetle: 2 }, hp: 1.2, spawn: 0.95,
    outro: [
      'The fog lifts over the estuary at dawn, but the law is waiting at the river’s mouth. Provis is taken.',
      'Pip stays by his side to the very end, holding his hand, and tells him the one thing that makes him smile: the daughter he lost long ago is alive, and Pip loves her.',
    ],
    choice: {
      prompt: 'Provis’s fortune is forfeit to the Crown. Mr Jaggers says you might fight for it in the courts, though he would not advise it.',
      options: [
        { label: 'Let the money go', detail: '+1 year: no lawsuit to fret over', years: 1, result: 'You let it go. It was never the money you cared for, in the end.' },
        { label: 'Fight for it in court', detail: 'A gamble: 1 chance in 4 of 300 shillings. Otherwise lose 50 and a year to worry.', chance: { p: 0.25, win: { shillings: 300, result: 'Against every expectation, the court finds in your favour. Mr Jaggers raises one eyebrow, which for him is wild applause.' }, lose: { shillings: -50, years: -1, result: 'The case drags on for months and eats your savings. Mr Jaggers washes his hands of it, quite literally.' } } },
      ],
    },
    keepsake: 'compass',
  },
  {
    id: 'forge', num: 'V', title: 'The Fever', date: 'Summer, 1829', place: 'The forge', age: 24,
    theme: 'forge', atmos: ATMOS.forge, length: 210, fever: true,
    quote: { text: 'Heaven knows we need never be ashamed of our tears, for they are rain upon the blinding dust of earth, overlying our hard hearts.', src: 'Great Expectations, chapter XIX' },
    intro: [
      'Worn out by grief and buried in debts, Pip falls into a burning fever. Through long weeks of wandering dreams, one face is always there beside him. It is Joe’s.',
      'In 1829 nobody yet knows about germs. Doctors blame foul air, bleed their patients and hope.',
      'Your health drains away while the fever burns. Stay close to Joe and he will cool it, drink every cup of willow-bark tea you find, and hold on until the fever breaks.',
    ],
    objectives: [
      { type: 'survive', time: 100, text: 'Ride out the fever: {left}s. Stay near Joe to cool it.' },
      { type: 'boss', boss: 'fever', text: 'Break the Fever' },
    ],
    npcs: [{ look: 'joe', id: 'joe', x: 2.2, z: 3.2, mode: 'ally' }],
    mix: { gloop: 7, flutter: 4, shroom: 3, spitbud: 2, beetle: 3 }, hp: 1.3, spawn: 1.0,
    outro: [
      'When Pip opens his eyes at last, the window is open and the sun lies warm across the floor. Joe is asleep in the chair beside the bed.',
      'On the table is a receipt. Every one of Pip’s debts has been paid, in Joe’s slow and careful hand.',
    ],
    choice: {
      prompt: 'Joe and Biddy ask you to stay a while at the forge and grow strong again.',
      options: [
        { label: 'Stay the summer', detail: '+3 years', years: 3, result: 'You walk the marsh paths every morning and eat Biddy’s bread every night. By autumn you are strong again.' },
        { label: 'Hurry abroad to work with Herbert', detail: '+80 shillings', shillings: 80, result: 'You sail for the East with Herbert’s firm. The work is hard and honest, and the wages are good.' },
      ],
    },
    keepsake: 'receipt',
  },
];

export const EPILOGUE = {
  date: 'Eleven years later. Winter, 1840.',
  text: [
    'Pip comes back to the ruins of Satis House on a winter evening. The house is gone; only the old garden wall remains. In the rising mist a figure is walking among the ruins. It is Estella.',
    'They walk out of the ruined place together, hand in hand.',
  ],
  quote: { text: 'I saw no shadow of another parting from her.', src: 'Great Expectations, chapter LIX' },
  facts: 'An English child born in 1805 could expect about 40 years of life, mostly because so many died as babies. A boy who survived to seven, as Pip did, could hope for about 50. A child born in England today can expect about 80.',
  tiers: [
    { min: 72, title: 'A long life, and a gentle one', text: 'Pip lived to see railways cross the marshes. He told the village children about the convict, the stopped clocks and the fog, and none of them quite believed him.' },
    { min: 60, title: 'A full life, well spent', text: 'Pip and Herbert’s firm prospered, and Pip never once let a year go by without a visit to the forge.' },
    { min: 48, title: 'A good life', text: 'A good life, if a shorter one than Pip deserved. Joe and Biddy\u2019s little son, who was also called Pip, kept flowers on his grave.' },
    { min: 0, title: 'A short life, but not a small one', text: 'The marsh mists claimed Pip early, as they claimed so many in those years. Everyone who knew him remembered his kindness.' },
  ],
};

export const KEEPSAKES = {
  rubbing: { name: 'Tombstone rubbing', icon: 'grave', chapter: 0, desc: 'Pip never saw his parents. He imagined their faces from the shapes of the letters on their stone.' },
  watch: { name: 'The stopped watch', icon: 'dial', chapter: 1, desc: 'Twenty minutes to nine, for ever.' },
  brooch: { name: 'A mourning brooch', icon: 'brooch', chapter: 2, desc: 'Mr Wemmick’s advice: always get hold of portable property.' },
  compass: { name: 'A sailor’s compass', icon: 'compass', chapter: 3, desc: 'Provis carried it all the way from New South Wales and back.' },
  receipt: { name: 'Joe’s receipt', icon: 'receipt', chapter: 4, desc: 'Every debt paid in full, in a slow and careful hand.' },
};

// Bought at the apothecary. They change Pip's life expectancy for the current tale, once each.
export const REMEDIES = [
  { id: 'vaccine', name: 'Cowpox vaccination', icon: 'regrow', cost: 120, years: 5, note: 'Dr Jenner’s new method guards against smallpox, one of the great killers of the age.' },
  { id: 'country', name: 'A summer of country air', icon: 'clover', cost: 90, years: 2, note: 'Out of the smoke and away from the crowded courts.' },
  { id: 'greatcoat', name: 'A warm greatcoat', icon: 'jerkin', cost: 60, years: 1, note: 'Winter chills carried off many a Londoner.' },
  { id: 'seabath', name: 'Sea-bathing at Margate', icon: 'wave', cost: 50, years: 1, note: 'Regency doctors prescribed a cold dip in the sea for almost everything.' },
  { id: 'elixir', name: 'Dr Wexley’s Celebrated Elixir', icon: 'bottle', cost: 30, chance: { p: 0.5, win: 2, lose: -2 }, note: 'Sold at every market. Nobody knows what is in it. Even odds it helps or harms.' },
];

// Secret codes, typed on the title screen or in Settings.
export const CODES = [
  { code: 'MAGWITCH', key: 'god', type: 'toggle', name: 'Magwitch’s Pardon', desc: 'Nothing can hurt you.', hint: 'The convict’s true surname.' },
  { code: 'SATISHOUSE', key: 'slow', type: 'toggle', name: 'Stopped Clocks', desc: 'Every foe moves at half speed.', hint: 'The house where every clock says twenty to nine.' },
  { code: 'WHATLARKS', key: 'heroes', type: 'once', name: 'What Larks!', desc: 'Every companion joins you.', hint: 'Joe’s happiest saying, as one word.' },
  { code: 'JAGGERS', key: 'chapters', type: 'once', name: 'The Lawyer’s Key', desc: 'Every chapter is open.', hint: 'The lawyer who is forever washing his hands.' },
  { code: 'GREATEXPECTATIONS', key: 'money', type: 'once', name: 'A Mysterious Benefactor', desc: '500 shillings, no questions asked.', hint: 'The name of the whole tale.' },
  { code: 'PUMBLECHOOK', key: 'bighead', type: 'toggle', name: 'Swelled Heads', desc: 'Everyone gets a pompous big head.', hint: 'Joe’s puffed-up uncle, the corn-chandler.' },
  { code: 'PENNYPLAIN', key: 'plain', type: 'toggle', name: 'Penny Plain', desc: 'See the world as an old black-and-white print.', hint: 'Toy-theatre sheets were sold “a ___ ___, twopence coloured”.' },
];

export const DICE_RULES = 'Throw two dice. A 7 or 11 wins at once. A 2, 3 or 12 is “crabs”, and you lose. Any other number becomes your point: keep throwing until you match it and win, or throw a 7 and lose.';
