# Spark of Being

A gothic action game in voxel 3D, adapted from Mary Shelley's *Frankenstein; or, The Modern Prometheus* (1818, public domain). You play Victor Frankenstein from 1816 to 1818, from the night his creature wakes to the final chase across the Arctic ice. Every hit you land is your own: there is no auto-attack. You aim, slash, shoot, reload and roll through blows that you can see coming.

The folder is still named `sprout-siege` because the game grew out of an earlier prototype.

## How it plays

- **Combat you control.** Victor faces your cursor. The sabre strikes in a three-blow combo, and the third blow is heavy. The flintlock pistol fires one heavy shot and then has to be reloaded. The dodge roll makes you untouchable while you roll and has two charges. Landing hits fills a galvanic jar; when it is full, Q sends lightning leaping between foes.
- **Every attack is telegraphed.** Before a foe strikes, it flashes red and the ground under the blow is marked: a cone for a swing, a lane for a charge, a circle for a slam or a thrown bottle, and a ring for a shockwave. Learn the marks, roll through the blow, then punish the recovery.
- **A roguelite structure.** There are four acts, each with five walled chambers and a boss. Each gate shows what waits behind it (an insight, a tonic, guineas, a letter from home, a gaming table, or the boss), so you pick your own route. Insights are boons that build into a run: a sabre that bleeds, a pistol that fires grapeshot, a coat that leaves lightning where you rolled.
- **Five foes and four bosses.** Reanimated corpses, resurrection men, hounds, galvanists who throw sparking jars, and the Stitched, a giant that never flinches when you hit it. The bosses are the Sexton of Ingolstadt, the Creature on the Mer de Glace (who stops fighting to speak), the Unfinished companion in the Orkneys, and the Creature again at the edge of the world.

## The themes, and where each one lives

| Theme | How it shows up |
| --- | --- |
| **Old English novel** | The acts follow *Frankenstein*: Ingolstadt, the Mer de Glace, the Orkneys, the Arctic. Each act opens with a real quote from the novel, and the tale is framed by Captain Walton's letters to his sister. |
| **Early 1800s** | The acts are dated 1816–1818. Victor fights with a cavalry sabre and a flintlock, wears a tailcoat and top hat, buys tonics, and gambles at Hazard, the dice game of the period. |
| **Life and health** | A health bar, tonics that heal, and boons that add health or let kills heal you. |
| **Life expectancy** | Victor starts with 36 years left to live, about what a 24-year-old gentleman of 1816 could hope for. Falling in battle costs years (2, 4 or 6, by difficulty). Some boons cost years, and so do some story choices. Letters from home give years back. The ending carves his age at death on his headstone, and it can range from "as Mary Shelley wrote it" to a long, quiet life. |
| **Chances** | When Victor falls you can tempt fate: roll a 5 or 6 and he rises where he fell; roll anything else and you lose two more years. At the gaming table you can stake guineas or a year of your life on Hazard, with the odds shown. |
| **Reward** | Boons after each chamber, guineas to spend in the Laboratory on permanent upgrades, letters to collect in the journal, and several endings. |
| **Nostalgia** | Letters from Elizabeth, Clerval and Victor's father, a parchment journal, and an optional black-and-white silhouette mode. |
| **Cheat codes** | Eight secret words. Type them on the title screen or enter them in Settings, where a riddle hints at each one. |

## Controls

| Input | Action |
| --- | --- |
| WASD or arrow keys | Move |
| Mouse | Aim |
| Left click or J | Sabre (click in rhythm for the combo) |
| Right click or K | Pistol (R reloads early) |
| Space or Shift | Dodge roll |
| Q | Galvanic discharge, when the blue bar is full |
| E | Drink a tonic, or play the gaming table |
| Esc or P | Pause |
| Gamepad | Left stick to move, right stick to aim, X sabre, RT pistol, A dodge, LB discharge, Y tonic |
| Touch | Drag on the left half to move; buttons on the right. Aim locks onto the nearest foe. |

There are three difficulties. **Story** softens the damage you take and a fall costs 2 years. **Gothic** is the intended challenge and a fall costs 4 years. **Nightmare** hits harder and a fall costs 6.

## Secret words (spoilers)

| Word | Effect |
| --- | --- |
| `MODERNPROMETHEUS` | Nothing can hurt you (toggle) |
| `GALVANI` | Galvanic charge always full (toggle) |
| `WALTON` | Everything moves at two-thirds speed (toggle) |
| `INGOLSTADT` | Every act can be chosen from the journal |
| `ELIZABETH` | +10 years in the current tale |
| `CLERVAL` | 500 guineas |
| `PHRENOLOGY` | Big heads (toggle) |
| `SILHOUETTE` | Black-and-white (toggle) |

## Tech

Plain ES modules plus Three.js r160 from jsDelivr. There is no build step and there are no image or audio files: all art is voxel geometry built in code, and all sound is synthesized with WebAudio.

```
index.html      page, HUD, story screens and styles
src/game.js     game loop, player combat, enemy AI and telegraphs, rooms, boons, story flow, screens, codes
src/story.js    prologue, act texts and choices, letters, endings, secret words
src/voxel.js    voxel builder, characters, props and room generator
src/audio.js    synthesized sound effects, ambience and adaptive music
src/data.js     player stats, boons, enemies, bosses, acts, rewards, laboratory upgrades
```

To run it locally, serve the folder with any static server (ES modules don't load from `file://`):

```bash
npx serve .
```

Progress (guineas, laboratory upgrades, the current tale, letters, endings and codes) is saved in the browser's local storage.
