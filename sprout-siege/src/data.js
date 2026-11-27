// Spark of Being: combat data. Every enemy attack has a windup (telegraph), an active window and a recovery,
// so fights are about reading and punishing, not about stats.

export const BASE = {
  hp: 100, speed: 6.2, tonics: 2, maxTonics: 3, tonicHeal: 45,
  dodges: 2, dodgeRecharge: 1.05, dodgeTime: 0.26, dodgeSpeed: 17, dodgeIframes: 0.32,
  sabre: [14, 14, 28], sabreReach: 2.35, sabreArc: [115, 115, 170], swingTime: [0.3, 0.3, 0.42],
  pistolDmg: 42, reload: 1.3, ammo: 1, bulletSpeed: 42,
  galPerHit: 3, galPerShot: 5, discharge: 48, chain: 5,
};

export const DIFFICULTIES = [
  { id: 'story', name: 'Story', desc: 'Gentler blows. Death costs 2 years.', dmg: 0.6, hp: 0.85, deathYears: 2 },
  { id: 'gothic', name: 'Gothic', desc: 'The intended challenge. Death costs 4 years.', dmg: 1, hp: 1, deathYears: 4 },
  { id: 'nightmare', name: 'Nightmare', desc: 'Faster, harder foes. Death costs 6 years.', dmg: 1.4, hp: 1.25, deathYears: 6 },
];

// Weighted 60 / 30 / 10 by rarity. Promethean boons are paid for in years of Victor's life.
export const BOONS = [
  { id: 'keen', name: 'Keen Edge', tag: 'Sabre', rarity: 'common', max: 3, desc: 'Sabre strikes deal 20% more damage.' },
  { id: 'reach', name: 'Duellist’s Reach', tag: 'Sabre', rarity: 'common', max: 2, desc: 'Your sabre reaches 18% farther and sweeps wider.' },
  { id: 'riposte', name: 'Riposte', tag: 'Sabre', rarity: 'rare', max: 1, desc: 'Strike within a second of dodging for double damage.' },
  { id: 'whirl', name: 'Whirling Finish', tag: 'Sabre', rarity: 'rare', max: 1, desc: 'The third blow of a combo cuts all the way around you.' },
  { id: 'bleed', name: 'Anatomist’s Cut', tag: 'Sabre', rarity: 'rare', max: 2, desc: 'Sabre hits open wounds that bleed 14 damage over 3 seconds.' },
  { id: 'rifled', name: 'Rifled Barrel', tag: 'Pistol', rarity: 'common', max: 3, desc: 'Pistol shots deal 30% more damage.' },
  { id: 'quick', name: 'Quick Hands', tag: 'Pistol', rarity: 'common', max: 2, desc: 'Reload 28% faster.' },
  { id: 'double', name: 'Twin Barrels', tag: 'Pistol', rarity: 'rare', max: 1, desc: 'Hold two shots before you must reload.' },
  { id: 'grape', name: 'Grapeshot', tag: 'Pistol', rarity: 'rare', max: 1, desc: 'Each shot sprays five lead balls in a fan.' },
  { id: 'silver', name: 'Silver Ball', tag: 'Pistol', rarity: 'rare', max: 1, desc: 'Shots pass through every foe in a line.' },
  { id: 'capacitor', name: 'Leyden Capacitor', tag: 'Galvanic', rarity: 'common', max: 3, desc: 'Your galvanic charge fills 25% faster.' },
  { id: 'arc', name: 'Arc Leap', tag: 'Galvanic', rarity: 'common', max: 2, desc: 'Discharge leaps to 3 more foes and hits 20% harder.' },
  { id: 'stormcoat', name: 'Storm Coat', tag: 'Galvanic', rarity: 'rare', max: 1, desc: 'Dodging leaves a crackling field that shocks foes.' },
  { id: 'voltaic', name: 'Voltaic Blade', tag: 'Galvanic', rarity: 'rare', max: 1, desc: 'The third blow of every combo jolts nearby foes.' },
  { id: 'constitution', name: 'Iron Constitution', tag: 'Body', rarity: 'common', max: 3, desc: '+20 maximum health, and heal 20 now.' },
  { id: 'greatcoat', name: 'Caped Greatcoat', tag: 'Body', rarity: 'common', max: 2, desc: 'Take 12% less damage.' },
  { id: 'fleet', name: 'Fleet of Foot', tag: 'Body', rarity: 'common', max: 2, desc: '+8% speed, and dodges recharge 20% faster.' },
  { id: 'leech', name: 'Hunger', tag: 'Body', rarity: 'rare', max: 1, desc: 'Every kill restores 3 health.' },
  { id: 'spark', name: 'Spark of Being', tag: 'Promethean', rarity: 'promethean', max: 1, years: 3, desc: 'When you fall, rise again once per act at half health.' },
  { id: 'fire', name: 'Promethean Fire', tag: 'Promethean', rarity: 'promethean', max: 1, years: 3, desc: 'Discharge charges twice as fast and leaves foes burning.' },
  { id: 'heart', name: 'Galvanic Heart', tag: 'Promethean', rarity: 'promethean', max: 1, years: 4, desc: 'All your damage +35%. A heart was never meant to beat this fast.' },
  { id: 'stitch', name: 'Stitched Sinew', tag: 'Promethean', rarity: 'promethean', max: 1, years: 2, desc: '+50 maximum health, borrowed from the dead.' },
];

// Attack kinds: swing (cone), lunge (line dash), slam (circle on self), throw (arcing shot to a circle),
// leap (jump to a circle), nova (expanding ring to dodge through), summon.
export const ENEMIES = {
  shambler: {
    name: 'Reanimated', hp: 46, speed: 1.75, r: 0.45, cost: 1, gold: 2, model: 'shambler',
    attacks: [{ kind: 'lunge', range: 2.6, windup: 0.75, dist: 2.8, speed: 9, dmg: 14, width: 1.1, recover: 0.85, cd: 1.0 }],
  },
  robber: {
    name: 'Resurrection Man', hp: 66, speed: 3.4, r: 0.45, cost: 2, gold: 4, model: 'robber',
    attacks: [{ kind: 'swing', range: 2.1, windup: 0.48, arc: 110, reach: 2.2, dmg: 12, recover: 0.5, cd: 0.9, combo: 2 }],
  },
  hound: {
    name: 'Hound', hp: 32, speed: 6.4, r: 0.42, cost: 1.5, gold: 2, model: 'hound',
    attacks: [{ kind: 'lunge', range: 5.5, windup: 0.5, dist: 6, speed: 16, dmg: 11, width: 0.9, recover: 0.9, cd: 1.7 }],
  },
  acolyte: {
    name: 'Galvanist', hp: 40, speed: 2.6, r: 0.42, cost: 2, gold: 4, model: 'acolyte', keep: 7,
    attacks: [{ kind: 'throw', range: 12, minRange: 3, windup: 0.85, flight: 1.0, radius: 1.6, dmg: 12, recover: 0.7, cd: 3.6, hazard: 'spark' }],
  },
  brute: {
    name: 'The Stitched', hp: 320, speed: 1.55, r: 0.95, cost: 6, gold: 16, poise: true, model: 'brute',
    attacks: [
      { kind: 'slam', range: 2.9, windup: 1.0, radius: 3.0, dmg: 28, recover: 1.0, cd: 1.8 },
      { kind: 'lunge', range: 9, minRange: 4, windup: 0.95, dist: 9, speed: 12, dmg: 24, width: 1.8, recover: 1.2, cd: 5 },
    ],
  },
};

export const BOSSES = {
  sexton: {
    name: 'The Sexton of Ingolstadt', title: 'Keeper of the resurrection men', hp: 1100, speed: 2.9, r: 0.6, model: 'sexton',
    attacks: [
      { kind: 'swing', range: 2.6, windup: 0.62, arc: 130, reach: 2.7, dmg: 13, recover: 0.7, cd: 1.2, combo: 3, w: 3 },
      { kind: 'throw', range: 15, minRange: 4, windup: 0.6, flight: 1.0, radius: 2.3, dmg: 16, recover: 0.4, cd: 3, hazard: 'fire', w: 2, count: 1 },
      { kind: 'summon', range: 99, windup: 1.0, type: 'shambler', n: 3, recover: 0.6, cd: 12, w: 1 },
    ],
    phase2: { at: 0.5, speed: 1.25, count: 2, line: 'The Sexton hurls his lantern oil wide!' },
  },
  creature1: {
    name: 'The Creature', title: 'Upon the Mer de Glace', hp: 1700, speed: 4.3, r: 0.7, model: 'creature', yieldAt: 0.4,
    attacks: [
      { kind: 'swing', range: 2.7, windup: 0.5, arc: 140, reach: 2.9, dmg: 22, recover: 0.55, cd: 0.9, combo: 2, w: 3 },
      { kind: 'leap', range: 15, minRange: 4, windup: 0.6, air: 0.75, radius: 2.8, dmg: 26, recover: 0.8, cd: 4, w: 2 },
      { kind: 'throw', range: 16, minRange: 5, windup: 0.8, flight: 1.1, radius: 2.1, dmg: 22, recover: 0.5, cd: 4, hazard: 'ice', w: 1.5 },
      { kind: 'slam', range: 3.1, windup: 0.9, radius: 3.6, dmg: 24, recover: 0.9, cd: 5, w: 1.5 },
    ],
  },
  unfinished: {
    name: 'The Unfinished', title: 'The companion that was never meant to wake', hp: 1900, speed: 1.7, r: 1.1, model: 'unfinished',
    attacks: [
      { kind: 'slam', range: 3.4, windup: 0.95, radius: 3.5, dmg: 22, recover: 1.1, cd: 1.6, w: 3 },
      { kind: 'nova', range: 99, windup: 1.0, speed: 6.5, maxR: 14, dmg: 18, recover: 0.9, cd: 7, w: 2 },
      { kind: 'lunge', range: 13, minRange: 4, windup: 1.05, dist: 12, speed: 13, dmg: 20, width: 2.2, recover: 1.3, cd: 5, w: 2 },
      { kind: 'summon', range: 99, windup: 0.9, type: 'acolyte', n: 2, recover: 0.5, cd: 14, w: 1 },
    ],
    phase2: { at: 0.5, speed: 1.2, count: 1, line: 'Galvanic fire pours into the Unfinished!' },
  },
  creature2: {
    name: 'The Creature', title: 'At the edge of the world', hp: 2200, speed: 4.4, r: 0.7, model: 'creature',
    attacks: [
      { kind: 'swing', range: 2.7, windup: 0.55, arc: 150, reach: 3.0, dmg: 16, recover: 0.65, cd: 1.1, combo: 3, w: 3 },
      { kind: 'leap', range: 16, minRange: 4, windup: 0.6, air: 0.75, radius: 3.0, dmg: 23, recover: 0.8, cd: 4, w: 2 },
      { kind: 'throw', range: 17, minRange: 5, windup: 0.7, flight: 1.0, radius: 2.2, dmg: 20, recover: 0.5, cd: 3.8, hazard: 'ice', w: 1.5, count: 2 },
      { kind: 'nova', range: 99, windup: 1.0, speed: 7, maxR: 15, dmg: 17, recover: 0.85, cd: 7.5, w: 1.2 },
      { kind: 'summon', range: 99, windup: 0.8, type: 'hound', n: 3, recover: 0.5, cd: 15, w: 0.8 },
    ],
    phase2: { at: 0.5, speed: 1.3, count: 3, line: 'The Creature roars across the ice!' },
  },
};

export const ACTS = [
  { id: 'ingolstadt', biome: 'graveyard', rooms: 5, elite: 3, boss: 'sexton', hp: 1, dmg: 1, pool: { shambler: 6, robber: 3, hound: 1.2 }, budget: [9, 11, 13, 14, 16] },
  { id: 'alps', biome: 'glacier', rooms: 5, elite: 3, boss: 'creature1', hp: 1.25, dmg: 1.1, pool: { hound: 5, shambler: 3, robber: 2 }, budget: [12, 14, 16, 18, 20] },
  { id: 'orkney', biome: 'lab', rooms: 5, elite: 3, boss: 'unfinished', hp: 1.45, dmg: 1.15, pool: { acolyte: 2, shambler: 4.5, robber: 3, hound: 1.2 }, budget: [13, 15, 17, 19, 21] },
  { id: 'arctic', biome: 'ice', rooms: 5, elite: 3, boss: 'creature2', hp: 1.7, dmg: 1.22, pool: { hound: 3, shambler: 4, acolyte: 2, robber: 2.5 }, budget: [15, 17, 19, 21, 24] },
];

// What can wait behind a door.
export const REWARDS = {
  boon: { name: 'Insight', icon: 'spark', desc: 'Choose one of three boons' },
  tonic: { name: 'Tonic', icon: 'flask', desc: '+1 tonic (or a full refill)' },
  guineas: { name: 'Guineas', icon: 'coin', desc: 'A purse of guineas' },
  letter: { name: 'A Letter', icon: 'letter', desc: 'News from home: +1 year' },
  chance: { name: 'The Gaming Table', icon: 'dice', desc: 'Wager guineas or years' },
  boss: { name: 'The Reckoning', icon: 'skull', desc: 'Face what waits beyond' },
};

// Permanent upgrades bought with guineas in Victor's laboratory.
export const LAB = [
  { id: 'fencing', name: 'Fencing Lessons', icon: 'sabre', desc: '+8% sabre damage', max: 5, costs: [60, 120, 200, 300, 420] },
  { id: 'marksman', name: 'Steady Aim', icon: 'pistol', desc: '+10% pistol damage', max: 5, costs: [60, 120, 200, 300, 420] },
  { id: 'vigour', name: 'Vigour', icon: 'heart', desc: '+10 maximum health', max: 5, costs: [50, 100, 170, 260, 380] },
  { id: 'apothecary', name: 'Apothecary', icon: 'flask', desc: '+1 tonic at the start of each act', max: 1, costs: [240] },
  { id: 'jar', name: 'Larger Leyden Jar', icon: 'bolt', desc: 'Galvanic charge fills 10% faster', max: 3, costs: [80, 160, 260] },
];
