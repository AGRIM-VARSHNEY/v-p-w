// Spark of Being: story text, adapted from Mary Shelley's Frankenstein; or, The Modern Prometheus (1818),
// a public-domain novel. Narration is original; quoted lines are from the novel.

export const BIRTH_YEAR = 1792;
export const START_YEARS = 36; // Victor is 24 in 1816; a gentleman of that age could hope to reach about 60.

export const PROLOGUE = {
  head: 'To Mrs Saville, England',
  date: 'Aboard ship, the frozen sea. August, 1818.',
  body: [
    'My dear sister,',
    'Two days ago, from the deck, we saw a sledge drawn by dogs cross the ice to the north, and in it a figure of gigantic stature. The next morning we took aboard a second traveller, half frozen, his body wasted by hunger and pursuit.',
    'His name is Victor Frankenstein. He has made me promise to set down his story exactly as he tells it, so that someone, at least, may judge him fairly.',
    'He says he has very few years left in him. I have begun to believe that he means it literally.',
  ],
  sign: 'R. Walton',
};

export const ACT_TEXT = [
  {
    num: 'I', title: 'Ingolstadt', date: 'A night of November, 1816', place: 'The University of Ingolstadt',
    quote: { text: 'It was on a dreary night of November that I beheld the accomplishment of my toils.', src: 'Frankenstein, chapter V' },
    intro: [
      'For two years I haunted the charnel houses and dissecting rooms of Ingolstadt. Tonight, in a storm, I infused a spark of being into the thing I had made, and the moment it opened its dull yellow eye, I fled from it.',
      'The storm did not stop with one. Every failure I buried in the churchyard is stirring, and the resurrection men who sold me their dead want my silence paid for in blood.',
      'I must put my mistakes back in the ground.',
    ],
    outro: [
      'The Sexton’s lantern gutters out among the graves. Of the thing I made, there is no trace.',
      'I fall into a nervous fever that lasts the whole winter. Only my friend Henry Clerval’s patient care brings me back.',
    ],
    choice: {
      prompt: 'Spring comes. Clerval begs you to rest a while longer before you touch your instruments again.',
      options: [
        { label: 'Rest until summer', detail: '+2 years of life', years: 2, result: 'You walk with Clerval in the countryside until colour returns to your face.' },
        { label: 'Return to your work at once', detail: 'Begin the next act with a free rare boon, but −2 years', years: -2, boon: 'rare', result: 'You work by candlelight until dawn, every night, and your hands never quite stop shaking.' },
      ],
    },
  },
  {
    num: 'II', title: 'The Mer de Glace', date: 'August, 1817', place: 'The glacier above Chamounix',
    quote: { text: 'Remember that I am thy creature; I ought to be thy Adam, but I am rather the fallen angel.', src: 'The Creature, Frankenstein, chapter X' },
    intro: [
      'A letter from my father: my little brother William has been murdered. Our gentle Justine was hanged for it. I know the true killer. I saw him in a flash of lightning on the road home.',
      'Seeking peace, I climb to the glacier above Chamounix. Wolves and worse prowl the ice, and something enormous moves among the crevasses, faster than any man.',
      'This time I will not run from it.',
    ],
    yieldLine: 'He lowers his fists. “I ought to be thy Adam,” he says, “but I am rather the fallen angel. Hear my tale, creator.”',
    outro: [
      'He tells me everything: the cottage in the forest, the blind old man, the family who drove him out with sticks, the books from which he learned what loneliness is.',
      'Then he makes his demand. I must make him a companion, as hideous as himself, and he will vanish with her into the wilds of South America for ever.',
    ],
    choice: {
      prompt: 'He waits for your answer, wind tearing at his black hair.',
      options: [
        { label: 'Hear him out, and promise', detail: '+2 years: your conscience is lighter', years: 2, flag: 'mercy', result: 'You give your word. For a moment the terrible face looks almost grateful.' },
        { label: 'Strike him while he speaks', detail: 'He flees wounded: your final foe starts weaker. −2 years of guilt', years: -2, flag: 'cruel', result: 'Your blade opens his side. He flees across the ice, and his howl follows you down the mountain.' },
      ],
    },
  },
  {
    num: 'III', title: 'The Orkneys', date: 'Autumn, 1817', place: 'A bare island in the northern sea',
    quote: { text: 'I shall be with you on your wedding-night.', src: 'The Creature, Frankenstein, chapter XX' },
    intro: [
      'On the loneliest island of the Orkneys I build my second creature, in a hut where the wind never stops.',
      'Halfway through, a thought freezes me. What if she hates him? What if they have children, and their children have children? I look up, and he is at the window, grinning.',
      'I tear her apart. He swears he will be with me on my wedding night. And the lightning that strikes the island does not leave her in pieces for long.',
    ],
    outro: [
      'I sink what remains far out at sea and drift ashore in Ireland, where I am arrested for murder. The dead man on the beach is Henry Clerval. My friend. The marks on his neck are not human.',
    ],
    choice: {
      prompt: 'In the Irish prison a fever takes you again. The doctor offers laudanum.',
      options: [
        { label: 'Take the laudanum', detail: '+1 tonic carried in the final act, −2 years', years: -2, flag: 'laudanum', result: 'The fever loosens its grip. So does everything else.' },
        { label: 'Endure it', detail: '+1 year', years: 1, result: 'You sweat it out on a straw mattress, and walk out of the prison on your own feet.' },
      ],
    },
  },
  {
    num: 'IV', title: 'The Arctic', date: 'The winter of 1818', place: 'The frozen sea',
    quote: { text: 'Life, although it may only be an accumulation of anguish, is dear to me, and I will defend it.', src: 'The Creature, Frankenstein, chapter X' },
    intro: [
      'He kept his word. On my wedding night, at the inn at Evian, Elizabeth was killed. My father died of grief within days.',
      'Since then I have followed him across Europe and Russia and out onto the frozen sea, by sledge and by starlight, guided by the taunts he carves into trees for me to find.',
      'The ice is breaking up. One of us will not leave it.',
    ],
    final: {
      prompt: 'The Creature lies broken on the ice. He does not raise a hand against you.',
      options: [
        { label: 'Let him go north', flag: 'spare', detail: 'He says he will build his own funeral pyre.' },
        { label: 'Finish what you began', flag: 'kill', detail: 'End him with your own hand.' },
      ],
    },
  },
];

export const ENDINGS = {
  quote: { text: 'He was soon borne away by the waves and lost in darkness and distance.', src: 'Frankenstein, the final line' },
  spare: 'He springs from the cabin window onto an ice raft and is borne away by the waves into the dark. Far to the north, a single fire burns for a night, and then goes out.',
  kill: 'You bury your creation under the ice, alone, with no prayer, and never speak of it again to anyone but Walton.',
  tiers: [
    { min: 20, title: 'A long life, and a quiet one', text: 'Walton turns his ship for England. Victor returns to Geneva and lives on for many years, a grey and gentle man who lectures young students on the arrogance of science.' },
    { min: 8, title: 'A life cut short', text: 'Walton brings him home, but the chase has broken his health. He spends his last years by the lake where he grew up, writing letters he never sends.' },
    { min: 1, title: 'The last of his strength', text: 'He lives just long enough to see the coast of England, and dies in a rented room with Walton’s hand in his.' },
    { min: -999, title: 'As Mary Shelley wrote it', text: 'Victor Frankenstein dies aboard Walton’s ship in September 1818, worn out by the chase, exactly as the novel tells it.' },
  ],
  spent: 'Victor’s years ran out before his story did. Walton set down the half of it he had been told, and the rest was lost on the ice.',
};

// Letters from home, found behind doors. Each one steadies Victor: +1 year.
export const LETTERS = [
  { from: 'Elizabeth Lavenza', text: 'Dearest Victor, little William asks after you every day, and Justine has come back to live with us. Write, even one line, so that we know you are well.' },
  { from: 'Henry Clerval', text: 'Victor! Your father has given way at last: I am coming to Ingolstadt. Prepare yourself for a great deal of talk about Persian poetry.' },
  { from: 'Alphonse Frankenstein', text: 'My son, the vintage was good and the lake is calm. Come home when your studies allow. You look too much at books and too little at the sky.' },
  { from: 'Elizabeth Lavenza', text: 'Snow has come early to the mountains, and the children skate on the lake. I have put a sprig of gentian in this letter. It is the colour of your eyes.' },
  { from: 'Henry Clerval', text: 'We shall go down the Rhine together, you and I, and see the vineyards and the ruined castles, and you shall forget whatever it is that keeps you awake.' },
  { from: 'Elizabeth Lavenza', text: 'Tell me honestly: do you love another? If you are happy, I am happy. But I would rather hear it from you than guess it from your silences.' },
];

export const CODES = [
  { code: 'MODERNPROMETHEUS', key: 'god', type: 'toggle', name: 'The Modern Prometheus', desc: 'Nothing can hurt you.', hint: 'The novel’s full subtitle, as one word.' },
  { code: 'GALVANI', key: 'galvani', type: 'toggle', name: 'Galvani’s Frog', desc: 'Your galvanic charge is always full.', hint: 'The Italian who made dead frogs’ legs twitch.' },
  { code: 'WALTON', key: 'slow', type: 'toggle', name: 'The Long Watch', desc: 'Everything moves at two-thirds speed.', hint: 'The captain who wrote it all down.' },
  { code: 'INGOLSTADT', key: 'acts', type: 'once', name: 'The University Key', desc: 'Every act can be chosen from the Journal.', hint: 'Where Victor studied.' },
  { code: 'ELIZABETH', key: 'years', type: 'once', name: 'Her Letter', desc: '+10 years in the current tale.', hint: 'Victor’s bride.' },
  { code: 'CLERVAL', key: 'money', type: 'once', name: 'A Friend’s Purse', desc: '500 guineas.', hint: 'Victor’s truest friend.' },
  { code: 'PHRENOLOGY', key: 'bighead', type: 'toggle', name: 'Phrenology', desc: 'Every head swells to show its character.', hint: 'The fashionable science of reading skulls.' },
  { code: 'SILHOUETTE', key: 'plain', type: 'toggle', name: 'Silhouette', desc: 'See the world in black and white.', hint: 'The cut-paper portraits every parlour had.' },
];

export const DICE_RULES = 'Throw two dice. A 7 or 11 wins at once. A 2, 3 or 12 is “crabs”, and you lose. Any other number becomes your point: throw again until you match it to win, or throw a 7 and lose.';
