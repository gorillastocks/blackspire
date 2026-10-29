// Voice packs for player-created characters: short reaction lines, recorded once and played in combat and camp.
// Each pack is a cast.json speaker (`vp_<id>`). No dashes between words in any line (tests/voice-text.test.js guards this).
// Kinds: attack x3, hit x2, miss, crit, spell, heal, levelUp, victory, downed, camp, lowHp, select.

export const DEFAULT_PACK = 'aldric';

export const PACKS = [
  { id: 'aldric', name: 'Ser Aldric', blurb: 'The default hero: a devoted knight.', cast: 'serAldric', lines: {
    attack: ['For the Dawn!', 'Steel and faith!', 'Stand and fall!'], hit: ['I have taken worse.', 'Hold the line!'], miss: ['Not yet.'],
    crit: ['Dawn guide my blade!'], spell: ['Light, answer me!'], heal: ['Rise, friend. We are not done.'], levelUp: ['I feel the Dawn grow stronger.'],
    victory: ['The way is clear. Onward.'], downed: ['Tell Emberhollow... I tried.'], camp: ['Rest while you can. I will keep watch.'], lowHp: ['I cannot fall yet.'], select: ['Ser Aldric, at your service.'] } },
  { id: 'gruffWarrior', name: 'Gruff Warrior', blurb: 'A scarred veteran of too many fights.', cast: 'vp_gruffwarrior', voice: 'SOYHLrjzK2X1ezoPC6cr', settings: { stability: 0.4, similarity_boost: 0.8, style: 0.55 }, lines: {
    attack: ['Take that!', 'Come get some.', 'Out of my way.'], hit: ['Ugh. Is that all?', 'That one stung.'], miss: ['Hold still, you.'],
    crit: ['That is how it is done!'], spell: ['Whatever works.'], heal: ['Stop bleeding on my boots.'], levelUp: ['Still got some fight left.'],
    victory: ['Done. Who is buying?'], downed: ['Bah... not like this.'], camp: ['Fire, food, then sleep.'], lowHp: ['I am not dead yet!'], select: ['What now?'] } },
  { id: 'youngHeroine', name: 'Young Heroine', blurb: 'Bright, brave and a little reckless.', cast: 'vp_youngheroine', voice: 'cgSgspJ2msm6clMCkdW9', settings: { stability: 0.4, similarity_boost: 0.8, style: 0.5 }, lines: {
    attack: ['Here I come!', 'Take this!', 'Let me through!'], hit: ['Ow! Okay, ow.', 'I am fine, I am fine!'], miss: ['Oh, so close!'],
    crit: ['Did you see that?!'], spell: ['Please work, please work!'], heal: ['Thank you, I needed that!'], levelUp: ['I feel stronger already!'],
    victory: ['We did it! We really did it!'], downed: ['I am sorry... I tried.'], camp: ['Can we tell stories by the fire?'], lowHp: ['I am not giving up!'], select: ['Ready when you are!'] } },
  { id: 'wiseElder', name: 'Wise Elder', blurb: 'Calm, slow and very old.', cast: 'vp_wiseelder', voice: 'pqHfZKP75CvOlQylNhV4', settings: { stability: 0.5, similarity_boost: 0.8, style: 0.4 }, lines: {
    attack: ['Patience, then precision.', 'Be still.', 'Forgive me.'], hit: ['Old bones, young foes.', 'A fair strike.'], miss: ['Age slows the hand.'],
    crit: ['Experience, young one.'], spell: ['Listen to the old words.'], heal: ['Be well, child.'], levelUp: ['Even now, I learn.'],
    victory: ['Another lesson, well taught.'], downed: ['The road ends... for now.'], camp: ['Sit. Let me tell you a story.'], lowHp: ['I have seen worse days.'], select: ['Ah, you have need of me?'] } },
  { id: 'slyRogue', name: 'Sly Rogue', blurb: 'Smooth, quick and never quite honest.', cast: 'vp_slyrogue', voice: 'N2lVS1w4EtoT3dr4eOWO', settings: { stability: 0.4, similarity_boost: 0.8, style: 0.55 }, lines: {
    attack: ['Right behind you.', 'Nothing personal.', 'Surprise!'], hit: ['Hey! Watch the face.', 'Lucky shot.'], miss: ['Slippery, aren\'t you?'],
    crit: ['Straight between the ribs.'], spell: ['A little trick of mine.'], heal: ['Nice. I owe you one.'], levelUp: ['Sharper every day.'],
    victory: ['Now, about that loot.'], downed: ['Well, that went badly.'], camp: ['Count the coins. Twice.'], lowHp: ['Time for a quiet exit!'], select: ['You rang?'] } },
  { id: 'nobleKnight', name: 'Noble Knight', blurb: 'Formal, honourable and unshakeable.', cast: 'vp_nobleknight', voice: 'onwK4e9ZLuTAKqWW03F9', settings: { stability: 0.5, similarity_boost: 0.8, style: 0.35 }, lines: {
    attack: ['In the name of the Crown!', 'Have at thee!', 'For honour!'], hit: ['A scratch. Nothing more.', 'I shall not yield.'], miss: ['Fortune, spare me.'],
    crit: ['A blow worthy of a song!'], spell: ['By oath and light!'], heal: ['My gratitude, friend.'], levelUp: ['I am worthy of the oath.'],
    victory: ['Justice is served.'], downed: ['My duty... is done.'], camp: ['A knight sleeps lightly. Rest.'], lowHp: ['I will stand to the last.'], select: ['At your command.'] } },
  { id: 'fierceShieldmaiden', name: 'Fierce Shieldmaiden', blurb: 'A northern warrior who loves a fight.', cast: 'vp_fierceshieldmaiden', voice: 'XrExE9yKIg1WjnnlVkGX', settings: { stability: 0.35, similarity_boost: 0.8, style: 0.7 }, lines: {
    attack: ['For the shield wall!', 'Face me!', 'Break and bleed!'], hit: ['Is that your best?', 'Pain is only a rumour.'], miss: ['Stand still, coward!'],
    crit: ['Valhalla sees that one!'], spell: ['Ancestors, lend me fire!'], heal: ['Good. Back to the fight.'], levelUp: ['The gods smile on me.'],
    victory: ['Sing of this day!'], downed: ['Tell them... I fell fighting.'], camp: ['Sharpen steel. Drink deep.'], lowHp: ['I will die laughing!'], select: ['Point me at them.'] } },
  { id: 'cheerfulBard', name: 'Cheerful Bard', blurb: 'Quick with a joke and a tune.', cast: 'vp_cheerfulbard', voice: 'FGY2WhTYpPnrIDTdsKH5', settings: { stability: 0.35, similarity_boost: 0.8, style: 0.65 }, lines: {
    attack: ['A little rhythm!', 'And a one, and a two!', 'Encore!'], hit: ['Not the lute!', 'Ooh, that is a sour note.'], miss: ['I blame the audience.'],
    crit: ['Take a bow, me!'], spell: ['Hit it, maestro!'], heal: ['You are a lifesaver, truly!'], levelUp: ['New verse, who dis?'],
    victory: ['That is a ballad, right there!'], downed: ['Remember my name... in song.'], camp: ['Who wants a lullaby?'], lowHp: ['No no no, not the finale!'], select: ['Shall I play something?'] } },
  { id: 'dourDwarf', name: 'Dour Dwarf', blurb: 'Gloomy, gravelly and utterly dependable.', cast: 'vp_dourdwarf', voice: 'nPczCjzI2devNBz1zQrb', settings: { stability: 0.5, similarity_boost: 0.8, style: 0.4 }, lines: {
    attack: ['Hmph. Take it.', 'By my beard.', 'Down you go.'], hit: ['Typical.', 'I have had worse. Not much worse.'], miss: ['Of course I missed.'],
    crit: ['Well. That worked.'], spell: ['I do not like magic. Fine.'], heal: ['Hm. Thank you, I suppose.'], levelUp: ['Better. Still gloomy, though.'],
    victory: ['We lived. Do not celebrate.'], downed: ['I knew it. I knew it.'], camp: ['Cold stew. Lovely.'], lowHp: ['This is how dwarves die.'], select: ['What is it now?'] } },
  { id: 'mysticSorceress', name: 'Mystic Sorceress', blurb: 'Ethereal, calm and a little eerie.', cast: 'vp_mysticsorceress', voice: 'ksryVoNAGZT8GxWCTiVm', settings: { stability: 0.5, similarity_boost: 0.8, style: 0.45 }, lines: {
    attack: ['Be undone.', 'The stars command it.', 'Fade.'], hit: ['The veil trembles.', 'You will regret that.'], miss: ['The threads slip.'],
    crit: ['Witness true power!'], spell: ['Arcane winds, rise!'], heal: ['Light mends all things.'], levelUp: ['The weave grows brighter.'],
    victory: ['As the stars foretold.'], downed: ['The dark... takes me.'], camp: ['The moon is kind tonight.'], lowHp: ['My light is fading.'], select: ['Speak, and I shall listen.'] } },
  { id: 'boomingBarbarian', name: 'Booming Barbarian', blurb: 'Huge, loud and delighted by violence.', cast: 'vp_boomingbarbarian', voice: 'pNInz6obpgDQGcFmaJgB', settings: { stability: 0.3, similarity_boost: 0.8, style: 0.75 }, lines: {
    attack: ['RAAAGH!', 'SMASH!', 'COME ON, THEN!'], hit: ['HA! TICKLES!', 'Now I am angry!'], miss: ['HOLD STILL!'],
    crit: ['CRUSHED!'], spell: ['Magic? Sure! BOOM!'], heal: ['Aye, that is the stuff!'], levelUp: ['I AM MIGHTIER!'],
    victory: ['VICTORY! MORE ENEMIES!'], downed: ['Tell my axe... I loved it.'], camp: ['MEAT! Where is the meat?'], lowHp: ['NOT YET! NOT YET!'], select: ['WHO NEEDS SMASHING?'] } },
];

export const KINDS = ['attack', 'hit', 'miss', 'crit', 'spell', 'heal', 'levelUp', 'victory', 'downed', 'camp', 'lowHp', 'select'];
export const packById = (id) => PACKS.find((p) => p.id === id) || null;
/** A character's pack: what they picked at creation; the default hero (and anyone without a pick) uses Ser Aldric. Companions have their own voices. */
export function packOf(c) {
  if (!c || c.companion) return null;
  return packById(c.voicePack) || packById(DEFAULT_PACK);
}
export const packSpeaker = (p) => p.cast;

/** A random line of this kind from the pack (never the same twice in a row). */
export function packLine(pack, kind, last = null, rnd = Math.random) {
  const a = pack?.lines?.[kind]; if (!a?.length) return null;
  const pool = a.length > 1 ? a.filter((t) => t !== last) : a;
  return pool[Math.floor(rnd() * pool.length)];
}

/** Per kind: chance a reaction speaks, and the minimum quiet time (ms) between reactions of that character / of anyone. */
export const RATES = {
  attack: 0.22, hit: 0.3, miss: 0.18, crit: 0.8, spell: 0.4, heal: 0.5, levelUp: 1, victory: 0.7, downed: 1, camp: 1, lowHp: 1, select: 1,
};
/** Decides whether a reaction may play now. Pure (clock injected) so it can be unit-tested. */
export function createBarkLimiter({ perChar = 9000, global = 3500, rnd = Math.random } = {}) {
  const lastChar = new Map(); let lastAny = -Infinity; const lastKind = new Map();
  return {
    /** now: ms; id: character id; kind; busy: true when another voice is playing. Records the bark when it returns true. */
    allow(now, id, kind, busy = false) {
      if (busy && kind !== 'downed' && kind !== 'levelUp') return false;
      if (kind !== 'select' && kind !== 'levelUp' && kind !== 'downed') {
        if (now - lastAny < global) return false;
        if (now - (lastChar.get(id) ?? -Infinity) < perChar) return false;
        if (rnd() > (RATES[kind] ?? 0.3)) return false;
      }
      if (kind === 'lowHp' || kind === 'downed') { const k = `${id}:${kind}`; if (now - (lastKind.get(k) ?? -Infinity) < 20000) return false; lastKind.set(k, now); }
      lastAny = now; lastChar.set(id, now); return true;
    },
    reset() { lastChar.clear(); lastKind.clear(); lastAny = -Infinity; },
  };
}
