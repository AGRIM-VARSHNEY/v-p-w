# Pip's Expectations

A voxel adventure in five chapters, adapted from Charles Dickens's *Great Expectations* (1861, public domain). The story starts on Christmas Eve, 1812, on the Kent marshes. You play young Pip as the Miasma, the "bad air" that people of the time blamed for disease, rolls in off the river. Every blob of Miasma you scatter plants a posy, and the grey world turns back to colour. A toy-theatre sheet of the 1810s was sold "a penny plain, twopence coloured", and the game works the same way: the island starts plain and you colour it in.

The folder is still named `sprout-siege` because the game grew out of that earlier prototype.

## The themes, and where each one lives

| Theme | How it shows up |
| --- | --- |
| **Early 1800s** | Chapters dated 1812–1829 (epilogue 1840). The world includes gas lamps (new in London then), prison hulks, a blacksmith's forge, a stagecoach-era inn, and Dr Jenner's vaccine at the apothecary. |
| **Story from old English novels** | The chapters follow *Great Expectations*: the convict in the churchyard, Miss Havisham's stopped clocks, the anonymous fortune, escaping down the Thames, Pip's fever. Each chapter opens with a real quote from the novel. |
| **Nostalgia** | Satis House, where every clock stopped at twenty to nine, is nostalgia itself. Blocky voxel art, a pocket-watch charm, keepsakes to collect, a book-page UI, and an optional black-and-white "penny plain" print mode. |
| **Adventure** | Five chapters, each with its own objective: gather wittles for the convict, wind the stopped clocks, clear the London fog, escort Provis to the river stairs, ride out the fever. Then a boss for each. |
| **Life and health** | A health bar and healing items. In the last chapter a fever drains Pip's health unless he stays close to Joe. |
| **Life expectancy** | Pip starts at an expected 50 years, roughly what an English boy who had survived to 7 could hope for in 1812. His health at the end of each chapter, being knocked down, story choices and remedies all change it. The epilogue carves the final age on his tombstone and compares it with 1805 and today. |
| **Chances** | Each chapter gives 3 chances (lives); being knocked down costs 2 years of life expectancy. Games of chance include Hazard dice at the Blue Boar inn (odds shown), a lawsuit gamble, and a quack elixir with even odds. |
| **Reward** | Shillings, strongboxes, a keepsake hidden in each chapter, companions who join as the story goes on, and a fortune in Chapter III that is bigger if you were kind to the convict in Chapter I. |
| **Cheat codes** | Seven secret words. Type them on the title screen or enter them in Settings. Riddles in Settings hint at each one. |

## How to play

- **Move:** WASD, arrow keys, a gamepad stick, or drag anywhere on a touch screen
- **Dash:** Space or Shift (or the DASH button on phones)
- **Attack:** automatic. Pick 1 of 3 upgrade cards each level (keys 1–3, R to reroll)
- **Story:** Title → Begin the tale → read a chapter → choose a companion → play. Each chapter ends with a choice and a page of Pip's ledger.
- **Free play:** *The Long Night* is the original 7-minute survival mode, with two bosses.

## Secret codes (spoilers)

| Code | Effect |
| --- | --- |
| `MAGWITCH` | Nothing can hurt you (toggle) |
| `SATISHOUSE` | Every foe moves at half speed (toggle) |
| `WHATLARKS` | Every companion unlocked |
| `JAGGERS` | Every chapter open (chapters played ahead count as practice) |
| `GREATEXPECTATIONS` | 500 shillings, once |
| `PUMBLECHOOK` | Big heads (toggle) |
| `PENNYPLAIN` | Black-and-white engraving look (toggle) |

## Tech

Plain ES modules plus Three.js r160 from jsDelivr. No build step, and no image or audio files: all art is voxel geometry and all sound is synthesized with WebAudio.

```
index.html      page, HUD, story screens and styles
src/game.js     game loop, combat, objectives, NPCs, life ledger, screens, codes
src/story.js    chapters, choices, remedies, keepsakes, codes, epilogue
src/voxel.js    voxel model builder, island mesher, characters and set pieces
src/audio.js    synthesized sound effects and adaptive music
src/data.js     companions, weapons, charms, enemies, bosses, shop, pixel icons
```

To run it locally, serve the folder with any static server (ES modules don't load from `file://`):

```bash
npx serve .
```

Progress (shillings, upgrades, the current tale, keepsakes and codes) is saved in the browser's local storage.
