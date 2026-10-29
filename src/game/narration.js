// Dungeon Master read-aloud: area descriptions shown once per save, plus companion quips on reaching a new area.
import { COMPANIONS, banter } from './companions.js';

const DM = '🕯 ';
/** First arrival on each floor: 3-5 sentences of sights, sounds, smells, mood and danger. */
export const FLOOR_INTROS = [
  'Wet steps lead down into low, dripping tunnels that reek of damp straw and old cheese. Tiny claws scritch in every crack. Your torch catches dozens of red eyes that blink out the moment you look. Somewhere ahead a soup-tin bell tinkles once: the Rat-Warrens are awake.',
  'Cold water closes over your boots, and the splash rolls away through vaulted caves. Pale fungus glows above black pools far deeper than they look. The air tastes of salt and rust. Something large shifts beneath the Drowned Grotto, then goes still.',
  'The Glimmerdeep opens like the inside of a geode, its crystals humming one endless note. A hundred reflections march beside you, each a heartbeat out of step. The air smells of flint and ozone. Deeper in stand statues frozen in surprise. Nobody carved them.',
  'Heat slaps your face. Slag crawls glowing through dwarf-cut channels, and hammers ring from forges that should be cold. Ash sifts down, bitter with sulphur, gritty between your teeth. Every shadow flickers, and some flicker back. Whatever feeds the Ashforge is still hungry.',
  'Silence falls like a lid. Colossal pillars carved with roaring lizards rise into darkness above claw-scored floors. The air smells of warm scales and old blood, and trembles with slow, heavy breathing. Elowen\'s light lies somewhere beyond. So does the thing that guards it.',
];
/** Returning to a floor: one line at most. */
export const FLOOR_REMINDERS = [
  'Back in the Rat-Warrens. The scratching starts up again.',
  'The Drowned Grotto. Cold water closes over your boots once more.',
  'The Glimmerdeep hums its single note. Your reflections are waiting.',
  'The Ashforge heat greets you like an old, bad-tempered friend.',
  'The Vault. The breathing has not stopped.',
];
/** Distinct areas within each floor (1-2 sentences). rooms[] are themed and picked per room. */
export const AREAS = [
  { // B1
    boss: 'The tunnel widens into a nest of chewed bones, gnawed armour and stolen cutlery, piled into a lopsided throne. Something big stirs on top of it and sniffs the air.',
    quest: 'Here the rat-sign stops, as if even the vermin give this spot a wide berth. Something waits here that is not a rat.',
    fountain: 'Clear water bubbles from a cracked basin carved with a smiling face. It smells, astonishingly, of mint.',
    down: 'A spiral stair corkscrews down into the dark. A cold draught rises from it, carrying the smell of standing water.',
    secret: 'The hidden passage is lined with tiny claw-marked tallies. Someone, or several someones, has been counting days here.',
    rooms: [
      'A low chamber stacked with mouldy grain sacks, every one of them gnawed open. The floor crunches underfoot, and you decide not to look down.',
      'Dozens of tiny shrines line this room: thimbles, buttons and bent spoons arranged with real devotion around a portrait of a very fat rat.',
      'Water pools in the middle of this chamber, and the walls are furred with nests of shredded cloth. The smell is magnificent, in the worst way.',
      'Old smuggler\'s crates rot in the corners, stamped with the crest of Emberhollow. One still rattles faintly when you pass.',
    ],
  },
  { // B2
    boss: 'The cave drops into a drowned amphitheatre, water black and mirror-still. Ripples spread from the centre, where nothing should be.',
    quest: 'A ring of half-sunken lanterns marks this place, each one still somehow burning beneath the water.',
    fountain: 'A spring of warm, glowing water rises here, fizzing gently. The fungus around it grows in the shape of open hands.',
    down: 'Steps slick with algae lead down past a waterline carved with the warning "HIGH TIDE". The ink is fresh.',
    secret: 'Behind the false wall is a dry pocket of air that smells of old parchment. Someone hid here while the water rose.',
    rooms: [
      'A flooded hall where bioluminescent eels drift between broken columns, lighting the water in slow blue pulses.',
      'Shipwreck timbers jut from the walls of this cave, though the sea is miles away. A barnacled figurehead watches you pass.',
      'Stalactites drip in this grotto like a broken water clock. The pools below are full of tiny white crabs that click in unison.',
      'Nets heavy with old catches hang from the ceiling here. Some of the catches are wearing boots.',
    ],
  },
  { // B3
    boss: 'Crystals here grow in a perfect ring around a pedestal of black glass. Your reflections in them stop moving when you do. Then one of them smiles.',
    quest: 'The hum of the crystals drops to a low, almost-words murmur here, as if the cavern is trying to tell you something.',
    fountain: 'A pool of liquid starlight shimmers in a crystal bowl. Drinking it tastes like the first cold breath of winter.',
    down: 'A crystal stair spirals downward, each step chiming a note as you test it. The tune is not a happy one.',
    secret: 'The concealed grotto is dark: no crystals, no reflections, no hum. The silence is the loudest thing you have heard all day.',
    rooms: [
      'A gallery of statues frozen mid-stride, each one carrying a mirror that was raised a moment too late.',
      'Huge amethyst columns split the light into slow purple rainbows. The floor is warm, and faintly ticks like cooling glass.',
      'A garden of luminous mushrooms grows in a perfect spiral here. Stepping off the path makes them all turn to face you.',
      'Shards of a shattered geode the size of a cottage litter this chamber, still humming with whatever broke out of it.',
    ],
  },
  { // B4
    boss: 'The forge-hall opens up around an anvil the size of a wagon, glowing white-hot. Heavy footsteps ring out from beyond the smoke.',
    quest: 'Here the hammer-song stops. Tools lie where they were dropped, mid-swing, and the air smells of a hasty departure.',
    fountain: 'Cool water pours from the mouth of a stone dwarf into a quenching trough. Steam curls up, smelling of iron and relief.',
    down: 'A brass-railed stair plunges into dark heat. Each step down is a little warmer, and the walls start to sweat.',
    secret: 'A hidden smithy, its tools neatly hung and its coals banked as if the smith stepped out for lunch a hundred years ago.',
    rooms: [
      'A chamber of cooling moulds, each one shaped like a different weapon. Several of the moulds are empty and still warm.',
      'Bellows the size of houses wheeze in this hall, pushed by nothing you can see. Embers dance in the draught.',
      'An ore-cart track loops through this cavern, and a cart full of glowing slag still creaks slowly along it.',
      'Racks of half-finished armour line the walls here, helmets turned so that every empty visor watches the door.',
    ],
  },
  { // B5
    boss: 'The ground shakes. Bones of enormous beasts form an archway here, and the hot, rotten wind blowing through it is breath.',
    quest: 'Old murals here show tiny heroes fleeing a towering lizard. The last panel has been scratched out with claws.',
    fountain: 'A basin of violet light pulses slowly, like a resting heartbeat. The pain of the road drains away as you drink.',
    altar: 'Elowen\'s light pours from the altar ahead, golden and steady. Five keyholes wait around its rim.',
    secret: 'This hidden alcove holds the bones of a knight in mirrored armour, one hand still pointing toward the vault.',
    rooms: [
      'Eggshells as big as barrels lie cracked open across this chamber. Whatever hatched has had a long time to grow.',
      'Carved pillars of roaring lizards hold up a ceiling lost in darkness. Rain-sound echoes from far above, though there is no sky.',
      'A trophy hall of crushed shields and bent swords, each tagged with a name in neat, patient handwriting.',
      'The floor here is scorched in a long, perfect line, as if lightning once ran along it on four legs.',
    ],
  },
];
/** Emberhollow on first visit to each place. */
export const TOWN = {
  square: 'Emberhollow huddles in the long shadow of the Blackspire, a jumble of slate roofs and leaning chimneys. The square smells of woodsmoke and hot pies, and a bell tolls the hour a little nervously. Townsfolk hurry past, glancing at the dark tower the way you glance at a sleeping dog. Everyone here has lost someone to the maze.',
  tavern: 'The Boar & Spoon is warm, loud and smells of spilled ale, roast onions and wet dog. A fiddler saws at something cheerful in the corner while a mounted boar\'s head, wearing a spoon on a string, watches the door. Adventurers swap tall tales at long tables, and every one of them has a story about the Blackspire.',
  temple: 'The Temple of Cant is cool and hushed, lit by tall candles that never quite drip. Incense of cedar and myrrh drifts past a donation box the size of a coffin. Somewhere a priest is counting coins very quietly.',
  train: 'Straw dummies hang from posts in the Training Grounds, most of them missing their heads. The air rings with clashing steel, barked orders and the thud of arrows striking targets. A grizzled sergeant watches you sideways and mutters something about soft hands.',
  shop: 'Fizzbang\'s Trading Post is an avalanche of goods waiting to happen: ropes, lanterns, potions and at least one suspicious barrel. It smells of lamp oil and lavender soap. A gnome peers at you over a counter piled high with "bargains".',
  edge: 'The cobbles end at a ring of standing stones around a gaping stair. Cold air breathes up from below, carrying faint echoes: a drip, a scratch, something like distant laughter. The town\'s last lantern swings above the entrance, and nobody has ever bothered to light it.',
};
/** Companion quips on reaching a new area. */
const QUIPS = {
  brambur: ['Lovely. Lovely, lovely place. I hate it. Sorry.', 'I\'ll just say a small prayer for whoever lived here. And for us.'],
  fizzwick: ['Fizzwick has catalogued this room. It is unworthy of Fizzwick.', 'Note the architecture. Note also Fizzwick, noting it.'],
  pip: ['Ooh, new room! Anyone see any spoons?', 'I\'ll check the corners. Corners are where the good stuff hides.'],
  grumsh: ['Another room. Another reminder that all rooms end.', 'This place has seen sorrow. I relate.'],
  zizzy: ['New place! Does anything here explode? Can I check?', 'I love it. It smells like danger and singed eyebrows.'],
  vexrath: ['My clan built halls like this. Better ones, mind you.', 'Keep your blades ready. Places this quiet are rarely empty.'],
  nettle: ['Bah, I\'ve seen grander. I once owned a cave twice this size.', 'Leave the talking to me if anything in here wants to talk.'],
};
for (const [k, lines] of Object.entries(QUIPS)) if (COMPANIONS[k]) COMPANIONS[k].lines.newArea = lines;

const seen = (s) => (s.seen ||= {});
/** One read-aloud card the first time; on return an optional one-line reminder (log only). */
export function describe(s, key, text, reminder = null, quip = 0.35) {
  if (!text) return [];
  if (seen(s)[key]) return reminder ? [{ log: reminder, cls: 'dim', voice: true }] : [];
  seen(s)[key] = 1;
  return [{ log: DM + text, cls: 'lore', card: true, dm: true, ambient: true, quip: banter(s.party, 'newArea', {}, quip) }];
}
export const floorIntro = (s, lvl) => describe(s, `floor:${lvl}`, FLOOR_INTROS[lvl], FLOOR_REMINDERS[lvl], 0.6);
export const townIntro = (s, sub) => describe(s, `town:${sub || 'square'}`, TOWN[sub || 'square'], null, 0.25);

/** Room centres: open 3x3 areas in the floor's base layout (classic or random), cached per layout. */
const roomCache = new WeakMap();
function roomCentres(L) {
  if (roomCache.has(L)) return roomCache.get(L);
  const t = L.tiles, open = (x, y) => t[y]?.[x] !== undefined && t[y][x] !== '#' && t[y][x] !== 'S', out = [];
  for (let y = 1; y < t.length - 1; y++) for (let x = 1; x < t[y].length - 1; x++) {
    let ok = true; for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (!open(x + dx, y + dy)) { ok = false; break; }
    if (ok && !out.some(([a, b]) => Math.abs(a - x) <= 2 && Math.abs(b - y) <= 2)) out.push([x, y]);
  }
  roomCache.set(L, out); return out;
}
/** Area descriptions for the tile the party just stepped on. */
export function areaAt(s, L, x, y) {
  const A = AREAS[s.level]; if (!A) return [];
  const base = L.tiles[y]?.[x], k = (kind) => `${s.level}:${kind}:${x},${y}`;
  const kind = { B: 'boss', Q: 'quest', F: 'fountain', '>': 'down', A: 'altar' }[base];
  if (kind) return describe(s, k(kind), A[kind]);
  const rooms = roomCentres(L), i = rooms.findIndex(([cx, cy]) => Math.abs(cx - x) <= 1 && Math.abs(cy - y) <= 1);
  if (i >= 0) { const [cx, cy] = rooms[i]; return describe(s, `${s.level}:room:${cx},${cy}`, A.rooms[i % A.rooms.length]); }
  return [];
}
/** Stepping through a doorway that was hidden (a secret door) in the base layout. */
export function secretAt(s, L, x, y) { return L.tiles[y]?.[x] === 'S' ? describe(s, `${s.level}:secret:${x},${y}`, AREAS[s.level]?.secret) : []; }
