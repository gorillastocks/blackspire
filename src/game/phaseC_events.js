// Phase C: branching story events, 2-3 per dungeon. Text-and-portrait cards with 2-3 choices each.
// fx keys: gold (scaled by floor tier; negative = cost, capped at what you have), xp (base, scaled), item, rare (tier), heal,
//   hurt, aff {companion|party: n}, mem [npc, tag], bless / curse (see BUFFS), flag, recruit, check {skill, dc, pass, fail}.
// Every event can be walked away from ("Not now") and returns later: nothing is ever silently locked out.

export const BUFFS = {
  hush: { kind: 'bless', label: 'Hushed Steps', desc: 'Far fewer random encounters for 120 steps.', steps: 120 },
  scholar: { kind: 'bless', label: 'Scholar\'s Insight', desc: '+25% XP from your next 3 fights.', fights: 3 },
  fortune: { kind: 'bless', label: 'Fortune\'s Favour', desc: 'Your next chest holds double gold and may hide a rare find.', chests: 1 },
  restless: { kind: 'curse', label: 'Restless Dead', desc: 'More random encounters for 80 steps. Lifted by the Temple or a night at the Inn.', steps: 80 },
  hollow: { kind: 'curse', label: 'Hollow Purse', desc: 'Your next 2 fights drop half the gold. Lifted by the Temple or a night at the Inn.', fights: 2 },
};

const hale = { who: 'Corporal Hale', color: '#9fc0ff', portrait: 3 };

export const EVENTS = [
  // ---- B1: Rat-Warrens ----
  [
    {
      id: 'b1-liora', title: 'A Lantern in the Warrens', who: 'Liora Wardenfall', color: '#ffb866', portrait: 36,
      card: (s) => (s.pc?.liora?.present
        ? { title: 'Liora\'s Tally', text: 'Liora runs a thumb along five scratched bars on the wall, low and neat. "The Watch counts in fives," she says quietly. "Dad was here."', choices: [
          { id: 'add', label: 'Scratch a mark beside it with her', res: 'She smiles, sharp and warm, and cuts a sixth bar beside the five. "One for him. One for us." The party moves on a little lighter.', fx: { aff: { liora: 1 }, xp: 40 } },
          { id: 'read', label: 'Read the marks aloud with her', res: '"Day one. Rations low. Day nine. The rats are polite." She laughs, then stops. "He kept his sense of humour. I\'m glad."', fx: { aff: { liora: 1 }, xp: 30 } },
          { id: 'loot', label: 'Search the alcove for supplies', res: 'Between the scratched bars you find a Watch ration tin with a few coins and a note: "For whoever comes next."', fx: { gold: 25, item: 'potionHealing' } }] }
        : { title: 'A Lantern in the Warrens', text: 'A woman crouches behind a toppled cheese barrel, bow half-drawn at a rat the size of a mastiff. Her braid is the colour of old copper and her smile is entirely too calm. "Don\'t mind me," she whispers. "Liora Wardenfall, of the Warden\'s Watch. I\'m tracking my father, and this fellow is in the way."', choices: [
          { id: 'join', label: 'Drive the rat off and invite her to join', note: (s) => (s.party.length >= 4 ? `${s.party.filter((c) => c.companion && c.companion !== 'liora').pop()?.name || 'A companion'} will wait for you at the Tavern.` : ''), res: 'The rat takes one look at the pair of you and flees, squeaking. Liora laughs and lowers her bow. "Twenty years I have walked these halls alone. Lead on, then."', fx: { recruit: 'liora', aff: { liora: 1 }, xp: 40 } },
          { id: 'ask', label: 'Share your rations and ask about her father', res: '"Aldous Wardenfall. The Watch\'s last Warden," she says, chewing. "I\'ll be at the Boar & Spoon when you want company. Ask for me, and I will come." (She is now in the Tavern\'s hire list.)', fx: { aff: { liora: 1 }, xp: 30, flag: 'lioraMet' } },
          { id: 'wave', label: 'Wish her luck and walk on', res: 'She tips two fingers to her brow. "You\'ll find me at the Boar & Spoon, if you change your mind."', fx: { flag: 'lioraMet' } }] }),
    },
    {
      id: 'b1-shrine', title: 'The Shrine of the Fat Rat', who: 'The Shrine', color: '#e8c07a', icon: '🧀',
      card: () => ({ text: 'Thimbles, buttons and a wedge of cheese the size of a wagon wheel ring a painted rat in a tiny crown. The rats around it have gone very quiet. All of them are looking at you.', choices: [
        { id: 'take', label: 'Pocket the golden thimbles', res: 'The thimbles are heavy, bright gold. Somewhere inside the walls, a thousand tiny feet start moving.', fx: { gold: 35, curse: 'restless', mem: ['marga', 'ratsAngered'] } },
        { id: 'offer', label: 'Leave a coin for the Fat Rat (10 gp)', res: 'You set a coin before the crown. The rats bow. Truly. The tunnels feel quieter.', fx: { gold: -10, bless: 'hush', mem: ['marga', 'ratsAppeased'], xp: 25 } },
        { id: 'share', label: 'Split the cheese with the whole party', res: 'It is alarmingly good cheese. Pip is moved to tears. Everyone feels rested and oddly proud.', fx: { heal: true, aff: { pip: 1, brambur: 1 } } }] }),
    },
    {
      id: 'b1-hale', title: 'The Deserter', who: hale.who, color: hale.color, portrait: hale.portrait,
      card: () => ({ text: 'A guardsman in a scorched Watch tabard sits wedged in a niche, sword across his knees. "Corporal Hale," he mumbles. "I ran. When the cultists came, I ran. I can\'t go back to the Captain. I can\'t."', choices: [
        { id: 'home', label: 'Pay his way home and tell him courage is a habit (20 gp)', res: '"Thank you. I\'ll tell Rowan myself." He straightens a little, tabard and all. You feel like you did something that matters.', fx: { gold: -20, xp: 50, aff: { liora: 1 }, mem: ['rowan', 'forgave'] } },
        { id: 'report', label: 'Take his name and report him to Captain Rowan', res: 'He closes his eyes and nods. "Fair." You note his name and leave him his sword. Duty is a heavy coat.', fx: { gold: 30, mem: ['rowan', 'reported'] } },
        { id: 'squeeze', label: 'Lean on him for his stash', res: 'He hands over a battered pouch without meeting your eyes. It stings a little, taking it.', fx: { item: 'potionGreater', aff: { liora: -1 }, mem: ['rowan', 'extorted'] } }] }),
    },
  ],
  // ---- B2: Drowned Grotto ----
  [
    {
      id: 'b2-bell', title: 'The Drowned Bell', who: 'The Bell', color: '#7fd1ff', icon: '🔔',
      card: () => ({ text: 'A bronze bell hangs half-sunk in a black pool, its rope trailing underwater. It tolls once, very softly, though nothing touched it.', choices: [
        { id: 'ring', label: 'Ring it three times', res: 'Each toll rolls out across the water. Something far away answers, then thinks better of it. You feel rather wiser, and rather watched.', fx: { xp: 60, curse: 'restless' } },
        { id: 'dive', label: 'Dive for its clapper (Athletics DC 13)', check: { skill: 'athletics', dc: 13,
          pass: { res: 'Cold hands find a clapper of pearl-white bone-metal. It hums in your palm: a fortune charm, still warm.', fx: { rare: 'uncommon', bless: 'fortune' } },
          fail: { res: 'The water is deeper than it looks. You scramble out, coughing, with nothing but a bruise and a lesson.', fx: { hurt: 4, xp: 20 } } } },
        { id: 'leave', label: 'Leave it be', res: 'The bell sighs out one last quiet note, as if relieved. Brambur prays for it.', fx: { aff: { brambur: 1 }, xp: 25 } }] }),
    },
    {
      id: 'b2-ferryman', title: 'The Ferryman\'s Fare', who: 'The Ferryman', color: '#a8d0d0', icon: '👻',
      card: () => ({ text: 'A drowned ferryman sits in a rotted skiff, one dripping hand held out. "Thirty years I have waited for a fare," he says. "Pay, and I may finally sleep."', choices: [
        { id: 'pay', label: 'Pay the fare (30 gp)', res: 'He bows. The skiff slides gently under the black water, and in the ripples lies a pearl the size of a plum.', fx: { gold: -30, rare: 'uncommon', mem: ['osric', 'ferrymanRested'], aff: { brambur: 1 } } },
        { id: 'pray', label: 'Offer a prayer for him instead (Religion DC 12)', check: { skill: 'religion', dc: 12,
          pass: { res: 'The words come true and quiet. He sighs, smiles, and the skiff goes down with him. The tunnels feel safer.', fx: { bless: 'hush', mem: ['osric', 'ferrymanRested'], xp: 60 } },
          fail: { res: 'He listens to the whole prayer, kindly. "A good try," he says. "I will wait a little longer." He gives you a nod.', fx: { xp: 25 } } } },
        { id: 'rob', label: 'Search the skiff while he waits', res: 'You find a cache of waterlogged coins. The ferryman watches you without a word. It is somehow the worst part.', fx: { gold: 60, curse: 'hollow', mem: ['osric', 'ferrymanRobbed'] } }] }),
    },
  ],
  // ---- B3: Glimmerdeep ----
  [
    {
      id: 'b3-mirror', title: 'The Honest Mirror', who: 'The Mirror', color: '#d19cff', icon: '🪞',
      card: () => ({ text: 'A tall crystal shows each of you as you truly are: braver, kinder and a little more frightened than you thought. It hums, waiting.', choices: [
        { id: 'look', label: 'Look until it finishes', res: 'You each see what you are. Nobody speaks for a while, but everyone feels clearer. A strange new steadiness settles over the party.', fx: { bless: 'scholar', xp: 80, aff: { party: 1 } } },
        { id: 'shatter', label: 'Shatter it and take the shards', res: 'The shards are worth a small fortune. The purse in your pocket feels suspiciously lighter afterwards.', fx: { gold: 90, curse: 'hollow' } },
        { id: 'study', label: 'Study its facets (Arcana DC 14)', check: { skill: 'arcana', dc: 14,
          pass: { res: 'The facets are tuned like a harp. You find a seam, and a small lens of mirror-glass comes away in your hand.', fx: { rare: 'uncommon', aff: { fizzwick: 1 } } },
          fail: { res: 'The crystal gives you a headache, and a very smug reflection of yourself. That is all.', fx: { xp: 30 } } } }] }),
    },
    {
      id: 'b3-prospector', title: 'The Lost Prospector', who: 'Tobble Grindlewick', color: '#c8e8a0', portrait: 17,
      card: () => ({ text: 'A gnome with a lantern for a hat huddles in a crystal seam, sobbing into a pouch of glowing mushrooms. "Tobble Grindlewick!" he sniffles. "I sell glowcaps to the herbalist in Emberhollow! I got lost three days ago!"', choices: [
        { id: 'escort', label: 'Walk him to the stairs yourself', res: 'It takes a while, and a little shouting. Tobble hugs your boots and runs for the surface. You feel good about it.', fx: { xp: 70, mem: ['wren', 'tobbleSafe'], aff: { party: 1 } } },
        { id: 'feed', label: 'Feed him and let him find his own way', res: 'He eats everything, thanks you with enormous dignity, and gives you a bundle of the best glowcaps. "For the herbalist. Or you."', fx: { item: 'potionStoneFlesh', mem: ['wren', 'tobbleFed'] } },
        { id: 'rob', label: 'Take his gem pouch while he cries', res: 'It is heavy and bright. He does not stop you. You realise a bit late that he is looking at you as if you were a monster.', fx: { gold: 120, curse: 'restless', mem: ['wren', 'tobbleRobbed'] } }] }),
    },
  ],
  // ---- B4: Ashforge ----
  [
    {
      id: 'b4-anvil', title: 'The Silent Anvil', who: 'The Anvil', color: '#ff9a4a', icon: '⚒',
      card: () => ({ text: 'An anvil older than the Forge stands in a ring of cold ash, a hammer laid across its face. Words are cut into the iron: STRIKE ONCE FOR STRENGTH. STRIKE TWICE FOR FEAR.', choices: [
        { id: 'once', label: 'Strike it once', res: 'A single clear note rings out of the iron. Your hands steady, and the next chest you open will feel lucky.', fx: { bless: 'fortune', xp: 90, mem: ['dobbin', 'anvilOnce'] } },
        { id: 'twice', label: 'Strike it twice', res: 'The second ring is wrong: deep and hungry. It gives you something precious and takes something less visible. The dead stir in the walls.', fx: { rare: 'rare', curse: 'restless', mem: ['dobbin', 'anvilTwice'] } },
        { id: 'leave', label: 'Set the hammer down and walk away', res: 'You lay the hammer neatly across the anvil. A faint warmth follows you: respect, from something old. A flask of tempering oil appears at your feet.', fx: { item: 'potionGreater', xp: 40, mem: ['dobbin', 'anvilLeft'] } }] }),
    },
    {
      id: 'b4-foreman', title: 'The Foreman\'s Plea', who: 'The Foreman', color: '#ff7a5a', portrait: 20,
      card: () => ({ text: 'A burned cultist foreman kneels beside a cooling channel, sobbing. "Mercy. I only held the keys. I never struck them. Let me go, and I will tell you where the smiths are held."', choices: [
        { id: 'spare', label: 'Spare him and take his keys', res: 'He gives you the keys and a hurried map of the lower forges. He bolts for the stairs, and a quiet nod from the party says you were right.', fx: { xp: 70, item: 'potionHealing', aff: { liora: 1, brambur: 1 }, mem: ['dobbin', 'foremanSpared'] } },
        { id: 'swear', label: 'Make him swear to leave the Spire (Intimidation DC 13)', check: { skill: 'intimidation', dc: 13,
          pass: { res: 'He swears on his mother, his mother\'s mother and the keys. He leaves, and you leave with his purse.', fx: { gold: 60, xp: 40 } },
          fail: { res: 'He laughs, hysterical, and darts away into the dark. The keys remain, but his promise does not.', fx: { xp: 20 } } } },
        { id: 'slay', label: 'Show him no mercy', res: 'It is quick and ugly. His keys are good keys, and his purse is heavy. Nobody says anything for a while.', fx: { gold: 90, aff: { liora: -1 }, mem: ['dobbin', 'foremanSlain'] } }] }),
    },
  ],
  // ---- B5: The Vault ----
  [
    {
      id: 'b5-oath', title: 'The Warden\'s Oath', who: 'The Warden\'s Statue', color: '#e8e2c8', icon: '🛡',
      card: () => ({ text: 'A weathered statue of a Warden stands with open hands. At its feet a cracked plate reads: WHO KEEPS THE SEALS KEEPS THE TOWN. A faint horn-note hangs in the air.', choices: [
        { id: 'town', label: 'Swear to protect Emberhollow', res: 'The statue\'s hands close, just slightly, around yours. Warmth floods the party, and the hush of a good road settles around you.', fx: { heal: true, bless: 'hush', aff: { party: 1 }, mem: ['tamsin', 'oathSworn'] } },
        { id: 'friends', label: 'Swear to protect each other', res: 'Four voices, one oath. The statue\'s head tilts, almost fondly. The bond of the party tightens.', fx: { xp: 100, aff: { party: 2 }, mem: ['tamsin', 'oathFriends'] } },
        { id: 'gauntlet', label: 'Take the statue\'s gauntlet', res: 'It comes away with a groan of old iron. Even as you lift it, you know the vault is going to remember this.', fx: { rare: 'rare', curse: 'hollow', mem: ['tamsin', 'oathBroken'] } }] }),
    },
    {
      id: 'b5-whisper', title: 'The Sovereign\'s Whisper', who: 'A Seal in the Wall', color: '#c03cff', icon: '💀',
      card: (s) => ({ text: 'A cracked seal in the wall breathes a voice like warm oil. "Little knights. I can make you stronger. I ask only for a small favour."', choices: [
        { id: 'bargain', label: 'Accept the bargain', res: 'Power pours into your hand. Something cold settles into your purse, and the dead begin to turn in their sleep.', fx: { rare: 'epic', curse: 'restless', aff: { liora: -1 } } },
        { id: 'refuse', label: 'Refuse and mock it', res: 'The seal sputters, outraged. Nerves steady across the party, and the vault seems to wince.', fx: { bless: 'fortune', xp: 120, aff: { party: 1 } } },
        ...(s.pc?.liora?.present ? [{ id: 'ask', label: 'Ask Liora what she knows about the sixth seal', res: '"Dad\'s journal said the five seals hold only if the sixth is kept," Liora says, steady, though her hand finds yours. "I think the sixth is not a stone at all. I think it\'s a person. And I think he is still down here."', fx: { aff: { liora: 2 }, xp: 80, flag: 'sixthSeal' } }] : [])] }),
    },
  ],
];
