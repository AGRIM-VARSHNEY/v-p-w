# Sprout Siege

A voxel survivors-style action game that runs in the browser. You defend a floating island from the Gloom, a wave of cute purple blobs. Every enemy you pop plants a flower, and the grey island slowly blooms back to color as you fight.

## Why this design

The concept follows what was breaking out in 2025–2026:

| Signal | What it showed | How Sprout Siege uses it |
| --- | --- | --- |
| **Megabonk** (solo dev, 1M copies in 2 weeks) | Low-poly 3D survivors-like with chunky characters, auto-attacks and screen-filling builds is very watchable and easy to pick up | Survivors-like core loop: move, weapons fire on their own, pick 1 of 3 upgrades per level |
| **"Friendslop" hits** (PEAK, R.E.P.O., Schedule I) | Players accept, even prefer, simple stylized graphics when readability, physics and juice are strong | Blocky voxel art with baked lighting, bold silhouettes, hit-flash, knockback, screen shake and damage numbers |
| **Tiny Glade** and the cozy diorama trend | Small, handcrafted-looking worlds you watch change are deeply shareable | The whole arena is one floating voxel diorama that visibly transforms from grey to full bloom |
| **Grow a Garden / Steal a Brainrot** (20M+ concurrent players on Roblox) | Dead-simple loops with visible progress and collectible goals pull in kids and adults alike | Bloom % goal with milestone chests, acorns that carry over between runs, unlockable heroes |
| **Minecraft-style voxels** | Instantly familiar to every age group | Face-culled voxel island with ambient occlusion and grass-side strips, in a different genre |

## How to play

- **Move:** WASD, arrow keys, a gamepad stick, or drag anywhere on a touch screen
- **Dash:** Space or Shift (or the DASH button on phones). Dashing makes you briefly untouchable
- **Attack:** automatic
- **Level up:** pick 1 of 3 cards (keys 1–3, R to reroll)
- **Goal:** survive 7 minutes, beat King Gloop at 3:00 and the Gloom Golem at 7:00, and bloom as much of the island as you can

## What's inside

- 4 heroes (Pip, Moss, Brick, Clove), each with a starting weapon and stat profile
- 7 weapons with 5 levels each: Leaf Orbit, Spark Bolt, Stomp Quake, Boomer Carrot, Bee Swarm, Firefly Zap, Acorn Meteor
- 9 passive charms
- 5 enemy types plus elites, 2 bosses, timed swarm events
- A day-to-night sky over the run, and a sunrise when you win
- The island bloom system: kills plant flowers, 3 flowers color a 4×4 patch, every 20% drops a chest
- The Treehouse: permanent upgrades bought with acorns
- 3 difficulties (Cozy, Normal, Spicy), settings for music, sound, screen shake and damage numbers
- All sound and music synthesized live with WebAudio, so there are no asset files

## Tech

Plain ES modules plus Three.js r160 from jsDelivr. No build step.

```
index.html      page, HUD, menus and styles
src/game.js     game loop, combat, AI, bloom system, UI
src/voxel.js    voxel model builder, island mesher with ambient occlusion, all models
src/audio.js    synthesized sound effects and adaptive music
src/data.js     heroes, weapons, enemies, shop, pixel-art icons
```

To run it locally, serve the folder with any static server (ES modules don't load from `file://`):

```bash
npx serve .
```

Progress (acorns, upgrades, unlocks, records) is saved in the browser's local storage.
