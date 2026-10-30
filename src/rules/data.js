// Game data derived from the D&D 5e System Reference Document 5.1 (CC-BY-4.0). See ATTRIBUTION.md.
export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

export const SKILLS = {
  acrobatics: 'dex', animalHandling: 'wis', arcana: 'int', athletics: 'str', deception: 'cha', history: 'int',
  insight: 'wis', intimidation: 'cha', investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis',
  performance: 'cha', persuasion: 'cha', religion: 'int', sleightOfHand: 'dex', stealth: 'dex', survival: 'wis',
};
export const SKILL_LABEL = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

export const XP_LEVELS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000];
export const MAX_LEVEL = 9;
export const CR_XP = { 0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400 };
export const profBonus = (level) => 2 + Math.floor((level - 1) / 4);

export const RACES = {
  human: { name: 'Human', bonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, speed: 30, traits: ['Versatile'] },
  hillDwarf: { name: 'Hill Dwarf', bonus: { con: 2, wis: 1 }, speed: 25, traits: ['Darkvision', 'Dwarven Resilience', 'Dwarven Combat Training', 'Dwarven Toughness'], resist: ['poison'], hpPerLevel: 1, weapons: ['battleaxe', 'handaxe', 'warhammer'], armorSlow: false },
  highElf: { name: 'High Elf', bonus: { dex: 2, int: 1 }, speed: 30, traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Elf Weapon Training'], skills: ['perception'], weapons: ['longsword', 'shortbow', 'shortsword', 'longbow'] },
  lightfootHalfling: { name: 'Lightfoot Halfling', bonus: { dex: 2, cha: 1 }, speed: 25, traits: ['Lucky', 'Brave', 'Halfling Nimbleness'], small: true },
  rockGnome: { name: 'Rock Gnome', bonus: { int: 2, con: 1 }, speed: 25, traits: ['Darkvision', 'Gnome Cunning'], small: true },
  halfOrc: { name: 'Half-Orc', bonus: { str: 2, con: 1 }, speed: 30, traits: ['Darkvision', 'Relentless Endurance', 'Savage Attacks'], skills: ['intimidation'] },
  dragonborn: { name: 'Dragonborn (Red)', bonus: { str: 2, cha: 1 }, speed: 30, traits: ['Breath Weapon', 'Damage Resistance'], resist: ['fire'] },
  tiefling: { name: 'Tiefling', bonus: { cha: 2, int: 1 }, speed: 30, traits: ['Darkvision', 'Hellish Resistance'], resist: ['fire'] },
  halfElf: { name: 'Half-Elf', bonus: { cha: 2, con: 1, dex: 1 }, speed: 30, traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'], skills: ['perception', 'persuasion'] },
};

export const CLASSES = {
  fighter: {
    name: 'Fighter', hitDie: 10, primary: ['str', 'con', 'dex', 'wis', 'cha', 'int'], saves: ['str', 'con'],
    armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'], skillChoices: ['athletics', 'perception'],
    start: { weapon: 'longsword', ranged: 'lightCrossbow', armor: 'chainMail', shield: true }, sub: 'Champion',
    features: { 1: ['Fighting Style (Defense)', 'Second Wind'], 2: ['Action Surge'], 3: ['Improved Critical'], 4: ['Ability Score Improvement'], 5: ['Extra Attack'], 6: ['Ability Score Improvement'], 7: ['Remarkable Athlete'], 8: ['Ability Score Improvement'], 9: ['Indomitable'] },
  },
  cleric: {
    name: 'Cleric', hitDie: 8, primary: ['wis', 'con', 'str', 'dex', 'cha', 'int'], saves: ['wis', 'cha'], caster: 'wis',
    armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple'], skillChoices: ['medicine', 'religion'],
    start: { weapon: 'mace', ranged: 'lightCrossbow', armor: 'chainMail', shield: true }, sub: 'Life Domain',
    features: { 1: ['Spellcasting', 'Disciple of Life', 'Bonus Proficiency (Heavy Armor)'], 2: ['Channel Divinity: Preserve Life'], 4: ['Ability Score Improvement'], 5: ['Destroy Undead (CR 1/2)'], 6: ['Blessed Healer', 'Channel Divinity (2/rest)'], 8: ['Ability Score Improvement', 'Divine Strike'] },
  },
  rogue: {
    name: 'Rogue', hitDie: 8, primary: ['dex', 'con', 'wis', 'int', 'cha', 'str'], saves: ['dex', 'int'],
    armor: ['light'], weapons: ['simple', 'longsword', 'rapier', 'shortsword', 'handCrossbow'], skillChoices: ['stealth', 'perception', 'investigation', 'acrobatics'],
    expertise: ['stealth', 'perception'], start: { weapon: 'shortsword', ranged: 'shortbow', armor: 'leather', shield: false }, sub: 'Thief',
    features: { 1: ['Expertise', 'Sneak Attack', "Thieves' Cant"], 2: ['Cunning Action'], 3: ['Fast Hands', 'Second-Story Work'], 4: ['Ability Score Improvement'], 5: ['Uncanny Dodge'], 6: ['Expertise'], 7: ['Evasion'], 8: ['Ability Score Improvement'], 9: ['Supreme Sneak'] },
  },
  wizard: {
    name: 'Wizard', hitDie: 6, primary: ['int', 'dex', 'con', 'wis', 'cha', 'str'], saves: ['int', 'wis'], caster: 'int',
    armor: [], weapons: ['dagger', 'quarterstaff', 'lightCrossbow'], skillChoices: ['arcana', 'investigation'],
    start: { weapon: 'quarterstaff', ranged: 'lightCrossbow', armor: null, shield: false }, sub: 'School of Evocation',
    features: { 1: ['Spellcasting', 'Arcane Recovery'], 2: ['Evocation Savant', 'Sculpt Spells'], 4: ['Ability Score Improvement'], 6: ['Potent Cantrip'], 8: ['Ability Score Improvement'] },
  },
  barbarian: {
    name: 'Barbarian', hitDie: 12, primary: ['str', 'con', 'dex', 'wis', 'cha', 'int'], saves: ['str', 'con'],
    armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'], skillChoices: ['athletics', 'survival'],
    start: { weapon: 'greataxe', ranged: null, armor: null, shield: false }, sub: 'Path of the Berserker',
    features: { 1: ['Rage', 'Unarmored Defense (Con)'], 2: ['Reckless Attack', 'Danger Sense'], 3: ['Frenzy'], 4: ['Ability Score Improvement'], 5: ['Extra Attack', 'Fast Movement'], 6: ['Mindless Rage'], 7: ['Feral Instinct'], 8: ['Ability Score Improvement'], 9: ['Brutal Critical'] },
  },
  bard: {
    name: 'Bard', hitDie: 8, primary: ['cha', 'dex', 'con', 'wis', 'int', 'str'], saves: ['dex', 'cha'], caster: 'cha',
    armor: ['light'], weapons: ['simple', 'longsword', 'rapier', 'shortsword', 'handCrossbow'], skillChoices: ['performance', 'persuasion', 'insight'],
    start: { weapon: 'rapier', ranged: 'lightCrossbow', armor: 'leather', shield: false }, sub: 'College of Lore',
    features: { 1: ['Spellcasting', 'Bardic Inspiration (d6)'], 2: ['Jack of All Trades', 'Song of Rest'], 3: ['Cutting Words', 'Expertise'], 4: ['Ability Score Improvement'], 5: ['Bardic Inspiration (d8)', 'Font of Inspiration'], 6: ['Countercharm', 'Additional Magical Secrets'], 8: ['Ability Score Improvement'] },
  },
  druid: {
    name: 'Druid', hitDie: 8, primary: ['wis', 'con', 'dex', 'int', 'cha', 'str'], saves: ['int', 'wis'], caster: 'wis',
    armor: ['light', 'medium', 'shield'], weapons: ['club', 'dagger', 'quarterstaff', 'spear', 'mace'], skillChoices: ['nature', 'animalHandling'],
    start: { weapon: 'quarterstaff', ranged: null, armor: 'leather', shield: true }, sub: 'Circle of the Land',
    features: { 1: ['Spellcasting', 'Druidic'], 2: ['Wild Shape', 'Natural Recovery'], 4: ['Ability Score Improvement'], 6: ["Land's Stride"], 8: ['Ability Score Improvement'] },
  },
  monk: {
    name: 'Monk', hitDie: 8, primary: ['dex', 'wis', 'con', 'str', 'int', 'cha'], saves: ['str', 'dex'],
    armor: [], weapons: ['simple', 'shortsword'], skillChoices: ['acrobatics', 'insight'],
    start: { weapon: 'quarterstaff', ranged: null, armor: null, shield: false }, sub: 'Way of the Open Hand',
    features: { 1: ['Unarmored Defense (Wis)', 'Martial Arts'], 2: ['Ki', 'Flurry of Blows', 'Patient Defense'], 3: ['Open Hand Technique', 'Deflect Missiles'], 4: ['Ability Score Improvement', 'Slow Fall'], 5: ['Extra Attack', 'Stunning Strike'], 6: ['Ki-Empowered Strikes', 'Wholeness of Body'], 7: ['Evasion', 'Stillness of Mind'], 8: ['Ability Score Improvement'], 9: ['Unarmored Movement Improvement'] },
  },
  paladin: {
    name: 'Paladin', hitDie: 10, primary: ['str', 'cha', 'con', 'wis', 'dex', 'int'], saves: ['wis', 'cha'], caster: 'cha', half: true,
    armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'], skillChoices: ['athletics', 'religion'],
    start: { weapon: 'longsword', ranged: null, armor: 'chainMail', shield: true }, sub: 'Oath of Devotion',
    features: { 1: ['Divine Sense', 'Lay on Hands'], 2: ['Fighting Style (Defense)', 'Spellcasting', 'Divine Smite'], 3: ['Divine Health', 'Channel Divinity: Sacred Weapon'], 4: ['Ability Score Improvement'], 5: ['Extra Attack'], 6: ['Aura of Protection'], 7: ['Aura of Devotion'], 8: ['Ability Score Improvement'] },
  },
  ranger: {
    name: 'Ranger', hitDie: 10, primary: ['dex', 'wis', 'con', 'str', 'int', 'cha'], saves: ['str', 'dex'], caster: 'wis', half: true,
    armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'], skillChoices: ['survival', 'perception', 'stealth'],
    start: { weapon: 'shortsword', ranged: 'longbow', armor: 'scaleMail', shield: false }, sub: 'Hunter',
    features: { 1: ['Favored Enemy', 'Natural Explorer'], 2: ['Fighting Style (Archery)', 'Spellcasting'], 3: ['Primeval Awareness', 'Colossus Slayer'], 4: ['Ability Score Improvement'], 5: ['Extra Attack'], 6: ['Favored Enemy (2nd)'], 7: ['Escape the Horde'], 8: ['Ability Score Improvement', "Land's Stride"] },
  },
  sorcerer: {
    name: 'Sorcerer', hitDie: 6, primary: ['cha', 'con', 'dex', 'wis', 'int', 'str'], saves: ['con', 'cha'], caster: 'cha',
    armor: [], weapons: ['dagger', 'quarterstaff', 'lightCrossbow'], skillChoices: ['arcana', 'intimidation'],
    start: { weapon: 'dagger', ranged: 'lightCrossbow', armor: null, shield: false }, sub: 'Draconic Bloodline (Red)',
    features: { 1: ['Spellcasting', 'Draconic Resilience'], 2: ['Font of Magic'], 3: ['Metamagic: Empowered Spell'], 4: ['Ability Score Improvement'], 6: ['Elemental Affinity (Fire)'], 8: ['Ability Score Improvement'] },
  },
  warlock: {
    name: 'Warlock', hitDie: 8, primary: ['cha', 'con', 'dex', 'wis', 'int', 'str'], saves: ['wis', 'cha'], caster: 'cha', pact: true,
    armor: ['light'], weapons: ['simple'], skillChoices: ['arcana', 'deception'],
    start: { weapon: 'dagger', ranged: 'lightCrossbow', armor: 'leather', shield: false }, sub: 'The Fiend',
    features: { 1: ['Pact Magic', "Dark One's Blessing"], 2: ['Eldritch Invocations: Agonizing Blast'], 3: ['Pact of the Blade'], 4: ['Ability Score Improvement'], 6: ["Dark One's Own Luck"], 8: ['Ability Score Improvement'] },
  },
};
export const FULL_CASTER_SLOTS = { 1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2], 6: [4, 3, 3], 7: [4, 3, 3, 1], 8: [4, 3, 3, 2], 9: [4, 3, 3, 3, 1] };
export const HALF_CASTER_SLOTS = { 1: [], 2: [2], 3: [3], 4: [3], 5: [4, 2], 6: [4, 2], 7: [4, 3], 8: [4, 3], 9: [4, 3, 2] };
/** Warlock Pact Magic: [slot count, slot level]. Stored as an array with only the pact level filled. */
export const PACT_SLOTS = { 1: [1, 1], 2: [2, 1], 3: [2, 2], 4: [2, 2], 5: [2, 3], 6: [2, 3], 7: [2, 4], 8: [2, 4], 9: [2, 5] };
export function slotsFor(cls, level) {
  const C = CLASSES[cls]; if (!C.caster) return [];
  if (C.pact) { const [n, l] = PACT_SLOTS[level]; return Array.from({ length: l }, (_, i) => (i === l - 1 ? n : 0)); }
  return [...(C.half ? HALF_CASTER_SLOTS : FULL_CASTER_SLOTS)[level]];
}
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const WEAPONS = {
  club: { name: 'Club', dmg: '1d4', type: 'bludgeoning', cat: 'simple', props: ['light'], cost: 1 },
  dagger: { name: 'Dagger', dmg: '1d4', type: 'piercing', cat: 'simple', props: ['finesse', 'light', 'thrown'], cost: 2 },
  mace: { name: 'Mace', dmg: '1d6', type: 'bludgeoning', cat: 'simple', props: [], cost: 5 },
  quarterstaff: { name: 'Quarterstaff', dmg: '1d6', type: 'bludgeoning', cat: 'simple', props: ['versatile'], cost: 2 },
  spear: { name: 'Spear', dmg: '1d6', type: 'piercing', cat: 'simple', props: ['thrown', 'versatile'], cost: 1 },
  handaxe: { name: 'Handaxe', dmg: '1d6', type: 'slashing', cat: 'simple', props: ['light', 'thrown'], cost: 5 },
  lightCrossbow: { name: 'Light Crossbow', dmg: '1d8', type: 'piercing', cat: 'simple', props: ['ranged', 'loading', 'two-handed'], cost: 25 },
  shortbow: { name: 'Shortbow', dmg: '1d6', type: 'piercing', cat: 'simple', props: ['ranged', 'two-handed'], cost: 25 },
  shortsword: { name: 'Shortsword', dmg: '1d6', type: 'piercing', cat: 'martial', props: ['finesse', 'light'], cost: 10 },
  rapier: { name: 'Rapier', dmg: '1d8', type: 'piercing', cat: 'martial', props: ['finesse'], cost: 25 },
  longsword: { name: 'Longsword', dmg: '1d8', type: 'slashing', cat: 'martial', props: ['versatile'], cost: 15 },
  battleaxe: { name: 'Battleaxe', dmg: '1d8', type: 'slashing', cat: 'martial', props: ['versatile'], cost: 10 },
  warhammer: { name: 'Warhammer', dmg: '1d8', type: 'bludgeoning', cat: 'martial', props: ['versatile'], cost: 15 },
  morningstar: { name: 'Morningstar', dmg: '1d8', type: 'piercing', cat: 'martial', props: [], cost: 15 },
  greatsword: { name: 'Greatsword', dmg: '2d6', type: 'slashing', cat: 'martial', props: ['heavy', 'two-handed'], cost: 50 },
  greataxe: { name: 'Greataxe', dmg: '1d12', type: 'slashing', cat: 'martial', props: ['heavy', 'two-handed'], cost: 30 },
  maul: { name: 'Maul', dmg: '2d6', type: 'bludgeoning', cat: 'martial', props: ['heavy', 'two-handed'], cost: 10 },
  handCrossbow: { name: 'Hand Crossbow', dmg: '1d6', type: 'piercing', cat: 'martial', props: ['ranged', 'light', 'loading'], cost: 75 },
  longbow: { name: 'Longbow', dmg: '1d8', type: 'piercing', cat: 'martial', props: ['ranged', 'heavy', 'two-handed'], cost: 50 },
  // Phase D: reach weapons (SRD). A hero in the back row can strike the front line with these.
  glaive: { name: 'Glaive', dmg: '1d10', type: 'slashing', cat: 'martial', props: ['heavy', 'reach', 'two-handed'], cost: 20 },
  halberd: { name: 'Halberd', dmg: '1d10', type: 'slashing', cat: 'martial', props: ['heavy', 'reach', 'two-handed'], cost: 20 },
  pike: { name: 'Pike', dmg: '1d10', type: 'piercing', cat: 'martial', props: ['heavy', 'reach', 'two-handed'], cost: 5 },
  whip: { name: 'Whip', dmg: '1d4', type: 'slashing', cat: 'martial', props: ['finesse', 'reach'], cost: 2 },
};

export const ARMOR = {
  padded: { name: 'Padded', base: 11, type: 'light', cost: 5, stealthDis: true },
  leather: { name: 'Leather', base: 11, type: 'light', cost: 10 },
  studdedLeather: { name: 'Studded Leather', base: 12, type: 'light', cost: 45 },
  hide: { name: 'Hide', base: 12, type: 'medium', cost: 10 },
  chainShirt: { name: 'Chain Shirt', base: 13, type: 'medium', cost: 50, metal: true },
  scaleMail: { name: 'Scale Mail', base: 14, type: 'medium', cost: 50, stealthDis: true, metal: true },
  breastplate: { name: 'Breastplate', base: 14, type: 'medium', cost: 400, metal: true },
  halfPlate: { name: 'Half Plate', base: 15, type: 'medium', cost: 750, stealthDis: true, metal: true },
  ringMail: { name: 'Ring Mail', base: 14, type: 'heavy', cost: 30, stealthDis: true },
  chainMail: { name: 'Chain Mail', base: 16, type: 'heavy', cost: 75, str: 13, stealthDis: true },
  splint: { name: 'Splint', base: 17, type: 'heavy', cost: 200, str: 15, stealthDis: true },
  plate: { name: 'Plate', base: 18, type: 'heavy', cost: 1500, str: 15, stealthDis: true },
};

// Consumables & magic items (SRD magic items). kind: potion | weapon | armor | ring | cloak | junk | key
export const ITEMS = {
  potionHealing: { name: 'Potion of Healing', kind: 'potion', heal: '2d4+2', cost: 50 },
  potionGreater: { name: 'Potion of Greater Healing', kind: 'potion', heal: '4d4+4', cost: 150 },
  antitoxin: { name: 'Antitoxin', kind: 'potion', cure: 'poisoned', cost: 50 },
  ringProtection: { name: 'Ring of Protection', kind: 'ring', ac: 1, saves: 1, cost: 3500 },
  cloakProtection: { name: 'Cloak of Protection', kind: 'cloak', ac: 1, saves: 1, cost: 3500 },
  longsword1: { name: 'Longsword +1', kind: 'weapon', base: 'longsword', magic: 1, cost: 1000 },
  shortsword1: { name: 'Shortsword +1', kind: 'weapon', base: 'shortsword', magic: 1, cost: 1000 },
  mace1: { name: 'Mace +1', kind: 'weapon', base: 'mace', magic: 1, cost: 1000 },
  quarterstaff1: { name: 'Quarterstaff +1', kind: 'weapon', base: 'quarterstaff', magic: 1, cost: 1000 },
  rapier1: { name: 'Rapier +1', kind: 'weapon', base: 'rapier', magic: 1, cost: 1000 },
  greatsword1: { name: 'Greatsword +1', kind: 'weapon', base: 'greatsword', magic: 1, cost: 1000 },
  longbow1: { name: 'Longbow +1', kind: 'weapon', base: 'longbow', magic: 1, cost: 1000 },
  plate1: { name: 'Plate Armor +1', kind: 'armor', base: 'plate', magic: 1, cost: 4000 },
  chainMail1: { name: 'Chain Mail +1', kind: 'armor', base: 'chainMail', magic: 1, cost: 1500 },
  studded1: { name: 'Studded Leather +1', kind: 'armor', base: 'studdedLeather', magic: 1, cost: 1500 },
  tinCup: { name: 'Dented Tin Cup', kind: 'junk', cost: 1 },
  gildedGoblet: { name: 'Gilded Goblet', kind: 'junk', cost: 25 },
  jewelledChalice: { name: 'Jewelled Chalice', kind: 'junk', cost: 100 },
  key1: { name: 'Rusty Iron Key', kind: 'key', level: 0, cost: 0 },
  key2: { name: 'Coral Key', kind: 'key', level: 1, cost: 0 },
  key3: { name: 'Glimmer Key', kind: 'key', level: 2, cost: 0 },
  key4: { name: 'Ashforge Key', kind: 'key', level: 3, cost: 0 },
  key5: { name: 'Obsidian Key', kind: 'key', level: 4, cost: 0 },
  // ---- The Dawn Regalia (legendary set) ----
  dawnfang: { name: 'Dawnfang', kind: 'weapon', base: 'longsword', magic: 2, set: 'dawn', cost: 5000, desc: 'A sword forged at sunrise. Part of the Dawn Regalia.' },
  sunshardAegis: { name: 'Sunshard Aegis', kind: 'shield', ac: 1, set: 'dawn', cost: 5000, desc: 'A mirror-bright shield. +1 AC over a normal shield; reflects petrifying gazes. Part of the Dawn Regalia.' },
  dawncrestHelm: { name: 'Dawncrest Helm', kind: 'helm', ac: 1, saves: 0, set: 'dawn', cost: 5000, desc: '+1 AC; the wearer cannot be frightened. Part of the Dawn Regalia.' },
  emberwardCloak: { name: 'Emberward Cloak', kind: 'cloak', ac: 1, saves: 1, resist: 'fire', set: 'dawn', cost: 5000, desc: '+1 AC and saves, resistance to fire. Part of the Dawn Regalia.' },
  crownGuardPlate: { name: 'Crown-Guard Plate', kind: 'armor', base: 'plate', magic: 2, set: 'dawn', cost: 9000, desc: 'Plate +2 bearing Emberhollow\'s crown. Part of the Dawn Regalia.' },
  dawnstoneAmulet: { name: 'Dawnstone Amulet', kind: 'quest', cost: 0, desc: 'The relic Malthrax meant to bind the five seals with.' },
  // ---- Story items ----
  signetRing: { name: "Elowen's Signet Ring", kind: 'quest', cost: 0, desc: 'Thrown to you as she was dragged away. Proof of your writ.' },
  royalWrit: { name: "Captain Rowan's Writ", kind: 'quest', cost: 0, desc: 'Grants the bearer the Crown\'s authority below Emberhollow.' },
  warhorn: { name: "The Warden's Warhorn", kind: 'quest', cost: 0, desc: 'Sounded in the final battle, it rallies all of Emberhollow.' },
  potionStoneFlesh: { name: 'Potion of Stone-to-Flesh', kind: 'potion', cure: 'restrained', heal: '1d4', cost: 100 },
  weapon2: { name: '+2 Smith-Blessed Blade', kind: 'weapon', base: 'longsword', magic: 2, cost: 4000 },
};
// ---- Rare loot (Phase B): named items with small special effects. fx.elem = bonus damage on every hit; fx.healOnKill = HP restored on a killing blow ----
Object.assign(ITEMS, {
  emberbrand: { name: 'Emberbrand', kind: 'weapon', base: 'longsword', magic: 1, tier: 'rare', cost: 2500, fx: { elem: { dmg: '1d4', type: 'fire' } }, desc: 'Longsword +1. Its edge glows like a forge: +1d4 fire damage on every hit.' },
  rimefang: { name: 'Rimefang', kind: 'weapon', base: 'rapier', magic: 1, tier: 'rare', cost: 2500, fx: { elem: { dmg: '1d4', type: 'cold' } }, desc: 'Rapier +1. Frost creeps along the blade: +1d4 cold damage on every hit.' },
  galeBow: { name: 'Galesong Bow', kind: 'weapon', base: 'longbow', magic: 1, tier: 'rare', cost: 2500, fx: { elem: { dmg: '1d4', type: 'lightning' } }, desc: 'Longbow +1. Arrows crackle in flight: +1d4 lightning damage on every hit.' },
  bloodRing: { name: 'Ring of the Red Cup', kind: 'ring', ac: 0, saves: 0, tier: 'rare', cost: 2000, fx: { healOnKill: 3 }, desc: 'Drinks a little of every foe: heals the wearer 3 HP whenever they land a killing blow.' },
  ironvowHelm: { name: 'Ironvow Helm', kind: 'helm', ac: 1, saves: 0, tier: 'rare', cost: 2000, fx: { healOnKill: 2 }, desc: '+1 AC. Heals the wearer 2 HP on a killing blow.' },
  soulreaver: { name: 'Soulreaver', kind: 'weapon', base: 'greatsword', magic: 2, tier: 'epic', cost: 6000, fx: { elem: { dmg: '1d6', type: 'necrotic' }, healOnKill: 4 }, desc: 'Greatsword +2. +1d6 necrotic damage on every hit, and heals the wielder 4 HP on a killing blow.' },
  stormcaller: { name: 'Stormcaller', kind: 'weapon', base: 'longbow', magic: 2, tier: 'epic', cost: 6000, fx: { elem: { dmg: '1d6', type: 'lightning' } }, desc: 'Longbow +2. Every arrow carries a thunderclap: +1d6 lightning damage on every hit.' },
  phoenixCloak: { name: 'Phoenix-Feather Cloak', kind: 'cloak', ac: 1, saves: 1, resist: 'fire', tier: 'epic', cost: 6000, fx: { healOnKill: 3 }, desc: '+1 AC and saves, resistance to fire, and heals the wearer 3 HP on a killing blow.' },
  hollowCrownRing: { name: 'Ring of the Hollow Crown', kind: 'ring', ac: 1, saves: 1, tier: 'epic', cost: 6000, fx: { healOnKill: 4 }, desc: '+1 AC and saves. Heals the wearer 4 HP on a killing blow.' },
  thunderlordFang: { name: "Thunderlord's Fang", kind: 'weapon', base: 'greatsword', magic: 2, tier: 'legendary', cost: 12000, fx: { elem: { dmg: '1d8', type: 'lightning' }, healOnKill: 5 }, desc: 'Greatsword +2 torn from a thunder-lizard\'s jaw. +1d8 lightning on every hit; heals 5 HP on a killing blow.' },
  blackspireHeart: { name: 'Heart of the Blackspire', kind: 'ring', ac: 2, saves: 2, tier: 'legendary', cost: 12000, fx: { healOnKill: 6 }, desc: '+2 AC and saves. A cold gold heart that beats for you: heals 6 HP on a killing blow.' },
});
// ---- Quest rewards (Phase F: tabletop quests). Named, never in the drop pools. ----
Object.assign(ITEMS, {
  lanternEdge: { name: 'Lantern Edge', kind: 'weapon', base: 'dagger', magic: 1, tier: 'rare', cost: 2500, fx: { elem: { dmg: '1d4', type: 'fire' } }, desc: 'Dagger +1, forged from a Lantern Row crew lamp. +1d4 fire damage on every hit.' },
  posyRibbon: { name: "Posy's Ribbon", kind: 'ring', ac: 1, saves: 1, tier: 'rare', cost: 2500, fx: { healOnKill: 2 }, desc: 'A scorched blue ribbon braided into a ring. +1 AC and saves; heals the wearer 2 HP on a killing blow.' },
  choirMantle: { name: "Chorister's Mantle", kind: 'cloak', ac: 1, saves: 1, tier: 'rare', cost: 2500, fx: { healOnKill: 2 }, desc: 'Sea-green wool that hums faintly. +1 AC and saves; heals the wearer 2 HP on a killing blow.' },
  tideClapper: { name: 'Drowned Bell Clapper', kind: 'weapon', base: 'mace', magic: 1, tier: 'rare', cost: 2500, fx: { elem: { dmg: '1d4', type: 'cold' } }, desc: 'Mace +1, the iron heart of a sunken bell. +1d4 cold damage on every hit.' },
  prismCirclet: { name: 'Prism Circlet', kind: 'helm', ac: 1, saves: 1, tier: 'rare', cost: 2500, desc: 'Verrin glass, ground to a lens. +1 AC and +1 to saves.' },
  wardenSignet: { name: "Warden's Signet", kind: 'ring', ac: 1, saves: 1, tier: 'rare', cost: 2500, fx: { healOnKill: 3 }, desc: 'The ring of a Watch sergeant. +1 AC and saves; heals the wearer 3 HP on a killing blow.' },
  dewboughWreath: { name: 'Dewbough Wreath', kind: 'helm', ac: 1, saves: 1, tier: 'rare', cost: 2500, fx: { healOnKill: 2 }, desc: 'Silver leaves woven by the keeper of the Sunken Orchard. +1 AC and saves; heals the wearer 2 HP on a killing blow.' },
  heartwoodStaff: { name: 'Heartwood Staff', kind: 'weapon', base: 'quarterstaff', magic: 1, tier: 'rare', cost: 2500, fx: { elem: { dmg: '1d4', type: 'radiant' } }, desc: 'Quarterstaff +1, cut from the Heartroot. +1d4 radiant damage on every hit. The orchard remembers who took it.' },
  silverfruit: { name: 'Silverfruit', kind: 'potion', heal: '4d4+4', cost: 150, desc: 'A fruit of living moonlight. Heals like a Potion of Greater Healing.' },
  fennCloak: { name: "Fenn's Fine Cloak", kind: 'cloak', ac: 1, saves: 1, tier: 'uncommon', cost: 1500, desc: 'A pawnbroker\'s best unredeemed cloak. +1 AC and saves.' },
});
// Pools the drops come from, by tier
export const TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const TIER_COLOR = { common: '#d8d4e8', uncommon: '#5cdc6e', rare: '#4aa3ff', epic: '#b66bff', legendary: '#ffc83a' };
export const TIER_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
export const DROP_POOL = {
  uncommon: ['potionGreater', 'longsword1', 'rapier1', 'mace1', 'greatsword1', 'longbow1', 'chainMail1', 'studded1', 'ringProtection', 'cloakProtection'],
  rare: ['emberbrand', 'rimefang', 'galeBow', 'bloodRing', 'ironvowHelm'],
  epic: ['soulreaver', 'stormcaller', 'phoenixCloak', 'hollowCrownRing'],
  legendary: ['thunderlordFang', 'blackspireHeart'],
};
/** Colour tier of any inventory key: explicit tier, else legendary for set pieces, uncommon for magic gear, common for the rest. */
export function tierOf(key) {
  const I = ITEMS[key]; if (!I) return 'common';
  if (I.tier) return I.tier;
  if (I.set) return 'legendary';
  if (I.magic >= 2 || I.cost >= 4000) return 'rare';
  if (I.magic || I.kind === 'ring' || I.kind === 'cloak' || key === 'potionGreater' || key === 'gildedGoblet') return 'uncommon';
  return 'common';
}
// Buyable gear in the town shop
export const SHOP_STOCK = [
  'potionHealing', 'potionGreater', 'antitoxin',
  'w:dagger', 'w:mace', 'w:quarterstaff', 'w:spear', 'w:shortsword', 'w:rapier', 'w:longsword', 'w:battleaxe', 'w:warhammer', 'w:greatsword', 'w:greataxe', 'w:maul', 'w:glaive', 'w:halberd', 'w:pike', 'w:whip', 'w:shortbow', 'w:longbow', 'w:lightCrossbow',
  'a:leather', 'a:studdedLeather', 'a:chainShirt', 'a:scaleMail', 'a:breastplate', 'a:halfPlate', 'a:chainMail', 'a:splint', 'a:plate', 'shield',
];

/* ---------- Spells (SRD 5.1) ----------
 kind: attack (spell attack), save (save for half/none), heal, buff, auto, util
 target: enemy | allEnemies | someEnemies | ally | allAllies | self */
export const SPELLS = {
  // Cleric
  sacredFlame: { name: 'Sacred Flame', level: 0, cls: ['cleric'], kind: 'save', save: 'dex', dmg: '1d8', type: 'radiant', half: false, target: 'enemy', cantrip: true, desc: 'Radiant flame; Dex save negates. Scales at 5th level.' },
  spareTheDying: { name: 'Spare the Dying', level: 0, cls: ['cleric'], kind: 'util', target: 'downedAlly', desc: 'Stabilize a creature at 0 HP.' },
  guidance: { name: 'Guidance', level: 0, cls: ['cleric'], kind: 'util', target: 'none', desc: '+1d4 to one ability check (used automatically out of combat for searches).' },
  bless: { name: 'Bless', level: 1, cls: ['cleric', 'paladin'], kind: 'buff', target: 'allAllies', conc: true, buff: 'blessed', maxTargets: 3, desc: 'Up to 3 allies add 1d4 to attack rolls and saving throws. Concentration.' },
  cureWounds: { name: 'Cure Wounds', level: 1, cls: ['cleric', 'bard', 'druid', 'paladin', 'ranger'], kind: 'heal', heal: '1d8', perLevel: '1d8', addMod: true, target: 'ally', desc: 'Touch heals 1d8 + mod (+1d8 per slot level above 1st).' },
  healingWord: { name: 'Healing Word', level: 1, cls: ['cleric', 'bard', 'druid'], kind: 'heal', heal: '1d4', perLevel: '1d4', addMod: true, target: 'ally', bonus: true, desc: 'Bonus action, heals 1d4 + mod at range.' },
  guidingBolt: { name: 'Guiding Bolt', level: 1, cls: ['cleric'], kind: 'attack', dmg: '4d6', perLevel: '1d6', type: 'radiant', target: 'enemy', rider: 'guided', desc: 'Spell attack 4d6 radiant; next attack against target has advantage.' },
  shieldOfFaith: { name: 'Shield of Faith', level: 1, cls: ['cleric', 'paladin'], kind: 'buff', target: 'ally', conc: true, buff: 'shieldOfFaith', bonus: true, desc: '+2 AC to one creature. Concentration.' },
  inflictWounds: { name: 'Inflict Wounds', level: 1, cls: ['cleric'], kind: 'attack', melee: true, dmg: '3d10', perLevel: '1d10', type: 'necrotic', target: 'enemy', desc: 'Melee spell attack, 3d10 necrotic.' },
  aid: { name: 'Aid', level: 2, cls: ['cleric', 'paladin'], kind: 'buff', target: 'allAllies', buff: 'aid', maxTargets: 3, desc: 'Up to 3 allies gain +5 max and current HP until long rest.' },
  prayerOfHealing: { name: 'Prayer of Healing', level: 2, cls: ['cleric'], kind: 'heal', heal: '2d8', perLevel: '1d8', addMod: true, target: 'allAllies', outOfCombat: true, desc: '10-minute prayer: up to six allies regain 2d8 + mod HP (+1d8 per slot above 2nd). Out of combat only.' },
  lesserRestoration: { name: 'Lesser Restoration', level: 2, cls: ['cleric', 'bard', 'druid', 'paladin', 'ranger'], kind: 'util', target: 'ally', cure: ['poisoned', 'paralyzed', 'blinded'], desc: 'End the poisoned, blinded or paralyzed condition.' },
  spiritualWeapon: { name: 'Spiritual Weapon', level: 2, cls: ['cleric'], kind: 'attack', dmg: '1d8', addMod: true, type: 'force', target: 'enemy', bonus: true, desc: 'Bonus action: spectral weapon makes a melee spell attack for 1d8 + mod force.' },
  spiritGuardians: { name: 'Spirit Guardians', level: 3, cls: ['cleric'], kind: 'buff', target: 'self', conc: true, buff: 'spiritGuardians', dmg: '3d8', type: 'radiant', save: 'wis', desc: 'Concentration. Each enemy takes 3d8 radiant at the start of its turn (Wis save half).' },
  massHealingWord: { name: 'Mass Healing Word', level: 3, cls: ['cleric'], kind: 'heal', heal: '1d4', addMod: true, target: 'allAllies', bonus: true, desc: 'Bonus action, heal each ally 1d4 + mod.' },
  revivify: { name: 'Revivify', level: 3, cls: ['cleric', 'paladin'], kind: 'util', target: 'deadAlly', desc: 'Return a creature that died within the last minute to life with 1 HP (consumes 300 gp of diamonds).' },
  // Wizard
  fireBolt: { name: 'Fire Bolt', level: 0, cls: ['wizard', 'sorcerer'], kind: 'attack', dmg: '1d10', type: 'fire', target: 'enemy', cantrip: true, desc: 'Ranged spell attack, 1d10 fire. Scales at 5th level.' },
  rayOfFrost: { name: 'Ray of Frost', level: 0, cls: ['wizard', 'sorcerer'], kind: 'attack', dmg: '1d8', type: 'cold', target: 'enemy', cantrip: true, desc: 'Ranged spell attack, 1d8 cold.' },
  shockingGrasp: { name: 'Shocking Grasp', level: 0, cls: ['wizard', 'sorcerer'], kind: 'attack', melee: true, dmg: '1d8', type: 'lightning', target: 'enemy', cantrip: true, desc: 'Melee spell attack with advantage vs metal armor, 1d8 lightning.' },
  magicMissile: { name: 'Magic Missile', level: 1, cls: ['wizard', 'sorcerer'], kind: 'auto', darts: 3, dmg: '1d4+1', type: 'force', target: 'enemy', desc: 'Three darts of 1d4+1 force that always hit (+1 dart per slot level above 1st).' },
  sleep: { name: 'Sleep', level: 1, area: true, cls: ['wizard', 'sorcerer', 'bard'], kind: 'sleep', pool: '5d8', perLevel: '2d8', target: 'allEnemies', desc: 'Foes in one chosen group, lowest HP first, fall unconscious (up to 5d8 HP total).' },
  burningHands: { name: 'Burning Hands', level: 1, area: true, cls: ['wizard', 'sorcerer', 'warlock'], kind: 'save', save: 'dex', dmg: '3d6', perLevel: '1d6', type: 'fire', half: true, target: 'someEnemies', maxTargets: 3, desc: 'Cone: every foe in one chosen group, 3d6 fire, Dex save half.' },
  thunderwave: { name: 'Thunderwave', level: 1, area: true, cls: ['wizard', 'sorcerer', 'bard', 'druid'], kind: 'save', save: 'con', dmg: '2d8', perLevel: '1d8', type: 'thunder', half: true, target: 'someEnemies', maxTargets: 2, desc: 'Cube: every foe in one chosen group, 2d8 thunder, Con save half.' },
  shield: { name: 'Shield', level: 1, cls: ['wizard', 'sorcerer'], kind: 'reaction', desc: 'Reaction when hit: +5 AC until your next turn (used automatically if it would turn a hit into a miss).' },
  mageArmor: { name: 'Mage Armor', level: 1, cls: ['wizard', 'sorcerer'], kind: 'buff', target: 'ally', buff: 'mageArmor', outOfCombat: true, desc: 'Unarmored target base AC becomes 13 + Dex for 8 hours.' },
  scorchingRay: { name: 'Scorching Ray', level: 2, cls: ['wizard', 'sorcerer', 'warlock'], kind: 'rays', rays: 3, dmg: '2d6', type: 'fire', target: 'enemy', desc: 'Three rays, each a ranged spell attack for 2d6 fire.' },
  web: { name: 'Web', level: 2, area: true, cls: ['wizard', 'sorcerer'], kind: 'save', save: 'dex', dmg: null, cond: 'restrained', target: 'someEnemies', maxTargets: 3, conc: true, desc: 'Up to 3 enemies must make a Dex save or be restrained. Concentration.' },
  holdPerson: { name: 'Hold Person', level: 2, cls: ['wizard', 'cleric', 'bard', 'druid', 'sorcerer', 'warlock'], kind: 'save', save: 'wis', dmg: null, cond: 'paralyzed', humanoidOnly: true, target: 'enemy', conc: true, desc: 'Humanoid must make a Wis save or be paralyzed. Concentration.' },
  // ---- Bard / Druid / Paladin / Ranger / Sorcerer / Warlock (SRD 5.1) ----
  viciousMockery: { name: 'Vicious Mockery', level: 0, cls: ['bard'], kind: 'save', save: 'wis', dmg: '1d4', type: 'psychic', half: false, target: 'enemy', cantrip: true, cond: 'mocked', desc: 'Wis save or 1d4 psychic and disadvantage on its next attack.' },
  produceFlame: { name: 'Produce Flame', level: 0, cls: ['druid'], kind: 'attack', dmg: '1d8', type: 'fire', target: 'enemy', cantrip: true, desc: 'Hurl a flame: ranged spell attack, 1d8 fire.' },
  eldritchBlast: { name: 'Eldritch Blast', level: 0, cls: ['warlock'], kind: 'beams', dmg: '1d10', type: 'force', target: 'enemy', cantrip: true, desc: 'Beam of crackling energy: 1d10 force (+Cha with Agonizing Blast). Two beams at 5th level.' },
  dissonantWhispers: { name: 'Dissonant Whispers', level: 1, cls: ['bard'], kind: 'save', save: 'wis', dmg: '3d6', perLevel: '1d6', type: 'psychic', half: true, target: 'enemy', desc: 'A maddening melody: 3d6 psychic, Wis save half.' },
  entangle: { name: 'Entangle', level: 1, area: true, cls: ['druid'], kind: 'save', save: 'str', dmg: null, cond: 'restrained', target: 'someEnemies', maxTargets: 4, conc: true, desc: 'Grasping weeds: every foe in one chosen group make a Str save or are restrained. Concentration.' },
  huntersMark: { name: "Hunter's Mark", level: 1, cls: ['ranger'], kind: 'mark', bonus: true, conc: true, dmg: '1d6', type: 'force', target: 'enemy', desc: 'Bonus action: your weapon hits on the marked foe deal +1d6. Concentration.' },
  hex: { name: 'Hex', level: 1, cls: ['warlock'], kind: 'mark', bonus: true, conc: true, dmg: '1d6', type: 'necrotic', target: 'enemy', desc: 'Bonus action: your attacks on the hexed foe deal +1d6 necrotic. Concentration.' },
  shatter: { name: 'Shatter', level: 2, area: true, cls: ['bard', 'sorcerer', 'warlock'], kind: 'save', save: 'con', dmg: '3d8', perLevel: '1d8', type: 'thunder', half: true, target: 'someEnemies', maxTargets: 3, desc: 'A ringing blast: every foe in one chosen group, 3d8 thunder, Con save half.' },
  moonbeam: { name: 'Moonbeam', level: 2, cls: ['druid'], kind: 'save', save: 'con', dmg: '2d10', perLevel: '1d10', type: 'radiant', half: true, target: 'enemy', desc: 'A pale beam of moonlight: 2d10 radiant, Con save half.' },
  callLightning: { name: 'Call Lightning', level: 3, cls: ['druid'], kind: 'save', save: 'dex', dmg: '3d10', perLevel: '1d10', type: 'lightning', half: true, target: 'someEnemies', maxTargets: 2, desc: 'Bolts from a storm cloud: up to 2 enemies, 3d10 lightning, Dex save half.' },
  fear: { name: 'Fear', level: 3, area: true, cls: ['bard', 'sorcerer', 'warlock'], kind: 'save', save: 'wis', dmg: null, cond: 'frightened', target: 'allEnemies', conc: true, desc: 'Every foe in one chosen group makes a Wis save or is frightened (disadvantage on attacks). Concentration.' },
  conjureBarrage: { name: 'Conjure Barrage', level: 3, area: true, cls: ['ranger'], kind: 'save', save: 'dex', dmg: '3d8', type: 'piercing', half: true, target: 'allEnemies', desc: 'A storm of arrows: every foe in one chosen group takes 3d8, Dex save half.' },
  massCureWounds: { name: 'Mass Cure Wounds', level: 5, cls: ['cleric', 'bard', 'druid'], kind: 'heal', heal: '3d8', addMod: true, target: 'allAllies', desc: 'A wave of healing: every ally regains 3d8 + mod HP.' },
  iceStorm: { name: 'Ice Storm', level: 4, area: true, cls: ['druid', 'sorcerer', 'wizard'], kind: 'save', save: 'dex', dmg: '6d6', perLevel: '1d6', type: 'cold', half: true, target: 'allEnemies', desc: 'Hail pounds one whole group: 6d6 cold and bludgeoning, Dex save half.' },
  blight: { name: 'Blight', level: 4, cls: ['druid', 'sorcerer', 'warlock', 'wizard'], kind: 'save', save: 'con', dmg: '8d8', perLevel: '1d8', type: 'necrotic', half: true, target: 'enemy', desc: 'Drain the life from one foe: 8d8 necrotic, Con save half.' },
  guardianOfFaith: { name: 'Guardian of Faith', level: 4, cls: ['cleric', 'paladin'], kind: 'save', save: 'dex', dmg: '4d10', type: 'radiant', half: true, target: 'someEnemies', maxTargets: 2, desc: 'A spectral guardian strikes up to 2 foes: 4d10 radiant, Dex save half.' },
  greaterInvisibility: { name: 'Greater Invisibility', level: 4, cls: ['bard', 'sorcerer', 'wizard'], kind: 'buff', target: 'ally', conc: true, buff: 'invisible', desc: 'One ally becomes invisible: advantage on attacks, attacks against have disadvantage. Concentration.' },
  coneOfCold: { name: 'Cone of Cold', level: 5, area: true, cls: ['sorcerer', 'wizard'], kind: 'save', save: 'con', dmg: '8d8', perLevel: '1d8', type: 'cold', half: true, target: 'someEnemies', maxTargets: 4, desc: 'A blast of frost: every foe in one chosen group, 8d8 cold, Con save half.' },
  flameStrike: { name: 'Flame Strike', level: 5, cls: ['cleric'], kind: 'save', save: 'dex', dmg: '8d6', perLevel: '1d6', type: 'fire', half: true, target: 'someEnemies', maxTargets: 2, desc: 'A column of holy fire: up to 2 enemies, 4d6 fire + 4d6 radiant, Dex save half.' },
  insectPlague: { name: 'Insect Plague', level: 5, area: true, cls: ['druid', 'sorcerer'], kind: 'save', save: 'con', dmg: '4d10', perLevel: '1d10', type: 'piercing', half: true, target: 'allEnemies', desc: 'A biting swarm: every foe in one chosen group takes 4d10 piercing, Con save half.' },
  holdMonster: { name: 'Hold Monster', level: 5, cls: ['bard', 'sorcerer', 'warlock', 'wizard'], kind: 'save', save: 'wis', dmg: null, cond: 'paralyzed', target: 'enemy', conc: true, desc: 'Any creature makes a Wis save or is paralyzed. Concentration.' },
  fireball: { name: 'Fireball', level: 3, area: true, cls: ['wizard', 'sorcerer', 'warlock'], kind: 'save', save: 'dex', dmg: '8d6', perLevel: '1d6', type: 'fire', half: true, target: 'allEnemies', desc: '8d6 fire to every foe in one chosen group, Dex save half.' },
  lightningBolt: { name: 'Lightning Bolt', level: 3, area: true, cls: ['wizard', 'sorcerer'], kind: 'save', save: 'dex', dmg: '8d6', perLevel: '1d6', type: 'lightning', half: true, target: 'someEnemies', maxTargets: 3, desc: 'Line: every foe in one chosen group, 8d6 lightning, Dex save half.' },
};

/* ---------- Monsters (SRD 5.1 stat blocks, condensed) ----------
 attacks: {name, bonus, dmg, type, rider:{save,dc,dmg,type,half,cond}} ; multi = attacks per turn */
export const MONSTERS = {
  giantRat: { name: 'Giant Rat', ac: 12, hp: '2d6', stats: { str: 7, dex: 15, con: 11, int: 2, wis: 10, cha: 4 }, cr: 0.125, pack: true, model: 'Rat', size: 1.0, tint: null,
    attacks: [{ name: 'Bite', bonus: 4, dmg: '1d4+2', type: 'piercing' }] },
  giantPoisonousSnake: { name: 'Giant Poisonous Snake', ac: 14, hp: '2d8', stats: { str: 10, dex: 18, con: 13, int: 2, wis: 10, cha: 3 }, cr: 0.25, model: 'Snake_angry', size: 1.3,
    attacks: [{ name: 'Bite', bonus: 6, dmg: '1d4+4', type: 'piercing', rider: { save: 'con', dc: 11, dmg: '3d6', type: 'poison', half: true } }] },
  giantFrog: { name: 'Giant Frog', ac: 11, hp: '4d8', stats: { str: 12, dex: 13, con: 11, int: 2, wis: 10, cha: 3 }, cr: 0.25, model: 'Frog', size: 1.2,
    attacks: [{ name: 'Bite', bonus: 3, dmg: '1d6+1', type: 'piercing', grapple: 11 }] },
  wolf: { name: 'Wolf', ac: 13, hp: '2d8+2', stats: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, cr: 0.25, pack: true, model: 'Wolf', size: 1.5,
    attacks: [{ name: 'Bite', bonus: 4, dmg: '2d4+2', type: 'piercing', rider: { save: 'str', dc: 11, cond: 'prone' } }] },
  giantWolfSpider: { name: 'Giant Wolf Spider', ac: 13, hp: '4d8', stats: { str: 12, dex: 16, con: 13, int: 3, wis: 12, cha: 4 }, cr: 0.25, model: 'Spider', size: 1.2, tint: 0x30d0c0,
    attacks: [{ name: 'Bite', bonus: 3, dmg: '1d6+1', type: 'piercing', rider: { save: 'con', dc: 11, dmg: '2d6', type: 'poison', half: true } }] },
  giantSpider: { name: 'The Broodmother', ac: 13, hp: '3d10+3', stats: { str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4 }, cr: 1, model: 'Spider', size: 2.2, tint: 0xff3070, boss: true,
    attacks: [{ name: 'Bite', bonus: 5, dmg: '1d8+3', type: 'piercing', rider: { save: 'con', dc: 11, dmg: '2d8', type: 'poison', half: true } }],
    special: { name: 'Web', recharge: 5, bonus: 5, cond: 'restrained', escapeDc: 12 } },
  giantCrab: { name: 'Giant Crab', ac: 15, hp: '3d8', stats: { str: 13, dex: 15, con: 11, int: 1, wis: 9, cha: 3 }, cr: 0.125, model: 'Crab', size: 1.3,
    attacks: [{ name: 'Claw', bonus: 3, dmg: '1d6+1', type: 'bludgeoning', grapple: 11 }] },
  giantWasp: { name: 'Giant Wasp', ac: 12, hp: '3d8', stats: { str: 10, dex: 14, con: 10, int: 1, wis: 10, cha: 3 }, cr: 0.5, model: 'Wasp', size: 1.2, flying: true,
    attacks: [{ name: 'Sting', bonus: 4, dmg: '1d6+2', type: 'piercing', rider: { save: 'con', dc: 11, dmg: '3d6', type: 'poison', half: true } }] },
  giantToad: { name: 'Giant Toad', ac: 11, hp: '6d10+6', stats: { str: 15, dex: 13, con: 13, int: 2, wis: 10, cha: 3 }, cr: 1, model: 'Frog', size: 1.9, tint: 0xffa020,
    attacks: [{ name: 'Bite', bonus: 4, dmg: '1d10+2', type: 'piercing', extra: { dmg: '1d10', type: 'poison' }, grapple: 13 }] },
  direWolf: { name: 'Dire Wolf', ac: 14, hp: '5d10+10', stats: { str: 17, dex: 15, con: 15, int: 3, wis: 12, cha: 7 }, cr: 1, pack: true, model: 'Wolf', size: 2.1, tint: 0x8060ff,
    attacks: [{ name: 'Bite', bonus: 5, dmg: '2d6+3', type: 'piercing', rider: { save: 'str', dc: 13, cond: 'prone' } }] },
  flyingSword: { name: 'Flying Sword', ac: 17, hp: '5d4', stats: { str: 12, dex: 15, con: 11, int: 1, wis: 5, cha: 1 }, cr: 0.25, model: 'Enemy_Flying', size: 1.3, construct: true, immune: ['poison', 'psychic'],
    attacks: [{ name: 'Longsword', bonus: 3, dmg: '1d8+1', type: 'slashing' }] },
  animatedArmor: { name: 'Animated Armor', ac: 18, hp: '6d8+6', stats: { str: 14, dex: 11, con: 13, int: 1, wis: 3, cha: 1 }, cr: 1, model: 'Enemy_Large', size: 2.0, construct: true, immune: ['poison', 'psychic'], multi: 2,
    attacks: [{ name: 'Slam', bonus: 4, dmg: '1d6+2', type: 'bludgeoning' }] },
  allosaurus: { name: 'Allosaurus', ac: 13, hp: '6d10+18', stats: { str: 19, dex: 13, con: 17, int: 2, wis: 12, cha: 5 }, cr: 2, model: 'Velociraptor', size: 2.4, tint: 0x40ff60,
    attacks: [{ name: 'Bite', bonus: 6, dmg: '2d10+4', type: 'piercing' }, { name: 'Claw', bonus: 6, dmg: '1d8+4', type: 'slashing' }] },
  ankylosaurus: { name: 'Old Clubtail', ac: 15, hp: '8d12+16', stats: { str: 19, dex: 11, con: 15, int: 2, wis: 12, cha: 5 }, cr: 3, model: 'Stegosaurus', size: 3.0, boss: true,
    attacks: [{ name: 'Tail', bonus: 7, dmg: '4d6+4', type: 'bludgeoning', rider: { save: 'str', dc: 14, cond: 'prone' } }] },
  triceratops: { name: 'Triceratops', ac: 13, hp: '10d12+30', stats: { str: 22, dex: 9, con: 17, int: 2, wis: 11, cha: 5 }, cr: 5, model: 'Triceratops', size: 3.2,
    attacks: [{ name: 'Gore', bonus: 9, dmg: '4d8+6', type: 'piercing' }] },
  tyrannosaurus: { name: 'Gorvax the Tyrant', ac: 13, hp: '15d12+60', stats: { str: 25, dex: 10, con: 19, int: 2, wis: 12, cha: 9 }, cr: 8, model: 'Trex', size: 3.6, boss: true, final: true,
    attacks: [{ name: 'Bite', bonus: 10, dmg: '4d12+7', type: 'piercing', grapple: 17 }, { name: 'Tail', bonus: 10, dmg: '3d8+7', type: 'bludgeoning' }] },
  // ---- BLACKSPIRE additions (SRD 5.1 stat blocks, condensed / reskinned) ----
  cultist: { name: 'Blackspire Cultist', ac: 12, hp: '2d8', stats: { str: 11, dex: 12, con: 10, int: 10, wis: 11, cha: 10 }, cr: 0.125, model: 'Wizard', size: 1.5, tint: 0x6a1030, type: 'humanoid',
    attacks: [{ name: 'Scimitar', bonus: 3, dmg: '1d6+1', type: 'slashing' }] },
  skarn: { name: 'Skarn the Spider-Rider', ac: 15, hp: '5d6', stats: { str: 10, dex: 14, con: 10, int: 10, wis: 8, cha: 10 }, cr: 1, model: 'Goblin', size: 1.4, tint: 0x40ff90, type: 'humanoid', lieutenant: true, multi: 2,
    attacks: [{ name: 'Scimitar', bonus: 4, dmg: '1d6+2', type: 'slashing' }] },
  sisterVey: { name: 'Sister Vey', ranged: true, ac: 13, hp: '7d8+7', stats: { str: 10, dex: 10, con: 12, int: 13, wis: 16, cha: 13 }, cr: 2, model: 'Wizard', size: 1.7, tint: 0x2050ff, type: 'humanoid', lieutenant: true,
    attacks: [{ name: 'Mace', bonus: 4, dmg: '1d6+2', type: 'bludgeoning', extra: { dmg: '2d6', type: 'necrotic' } }],
    special: { kind: 'blast', name: 'Drowning Hymn', recharge: 5, save: 'wis', dc: 13, dmg: '3d6', type: 'necrotic', text: 'chants a drowning hymn' } },
  violetFungus: { name: 'Violet Fungus', ac: 5, hp: '4d8', stats: { str: 3, dex: 1, con: 10, int: 1, wis: 3, cha: 1 }, cr: 0.25, model: 'MushroomKing', size: 1.3, tint: 0x9040ff, type: 'plant', multi: 2,
    attacks: [{ name: 'Rotting Touch', bonus: 2, dmg: '1d8', type: 'necrotic' }] },
  shrieker: { name: 'Shrieker', ranged: true, ac: 5, hp: '3d8', stats: { str: 1, dex: 1, con: 10, int: 1, wis: 3, cha: 1 }, cr: 0, model: 'Mushnub', size: 0.9, tint: 0xe0c0ff, type: 'plant', shriek: true,
    attacks: [] },
  motherSporegrave: { name: 'Mother Sporegrave', ranged: true, ac: 11, hp: '12d8+24', stats: { str: 14, dex: 6, con: 15, int: 8, wis: 12, cha: 10 }, cr: 4, model: 'MushroomKing', size: 2.6, tint: 0xc040ff, type: 'plant', lieutenant: true, multi: 3,
    attacks: [{ name: 'Rotting Touch', bonus: 5, dmg: '1d8+2', type: 'necrotic' }],
    special: { kind: 'blast', name: 'Spore Cloud', recharge: 5, save: 'con', dc: 13, dmg: '4d6', type: 'poison', cond: 'poisoned', text: 'bursts in a cloud of choking spores' } },
  ochreJelly: { name: 'Ochre Jelly', ac: 8, hp: '6d10+12', stats: { str: 15, dex: 6, con: 14, int: 2, wis: 6, cha: 1 }, cr: 2, model: 'Slime', size: 1.4, tint: 0xd09020, type: 'ooze', immune: ['lightning'],
    attacks: [{ name: 'Pseudopod', bonus: 4, dmg: '2d6+2', type: 'bludgeoning', extra: { dmg: '1d6', type: 'acid' } }] },
  darkmantle: { name: 'Darkmantle', ac: 11, hp: '5d6+5', stats: { str: 16, dex: 12, con: 13, int: 2, wis: 10, cha: 5 }, cr: 0.5, model: 'Bat', size: 1.1, tint: 0x302040, type: 'monstrosity', flying: true,
    attacks: [{ name: 'Crush', bonus: 5, dmg: '1d6+3', type: 'bludgeoning', grapple: 13 }] },
  giantCentipede: { name: 'Giant Centipede', ac: 13, hp: '1d6+2', stats: { str: 5, dex: 14, con: 12, int: 1, wis: 7, cha: 3 }, cr: 0.25, model: 'Centipede', size: 1.0, tint: 0xa04020, type: 'beast', pack: true,
    attacks: [{ name: 'Bite', bonus: 4, dmg: '1d4+2', type: 'piercing', rider: { save: 'con', dc: 11, dmg: '3d6', type: 'poison', half: true } }] },
  gelatinousCube: { name: 'Gelatinous Cube', ac: 6, hp: '8d10+40', stats: { str: 14, dex: 3, con: 20, int: 1, wis: 6, cha: 1 }, cr: 2, model: 'GreenBlob', size: 2.3, tint: 0x40ffe0, type: 'ooze',
    attacks: [{ name: 'Pseudopod', bonus: 4, dmg: '3d6', type: 'acid' }] },
  glasshide: { name: 'Glasshide the Basilisk', ac: 15, hp: '10d8+30', stats: { str: 16, dex: 8, con: 15, int: 2, wis: 8, cha: 7 }, cr: 4, model: 'Dino', size: 2.6, tint: 0x80c0b0, type: 'monstrosity', boss: true,
    attacks: [{ name: 'Bite', bonus: 5, dmg: '2d6+3', type: 'piercing', extra: { dmg: '2d6', type: 'poison' } }],
    special: { kind: 'gaze', name: 'Petrifying Gaze', recharge: 4, save: 'con', dc: 12 } },
  magmin: { name: 'Magmin', ac: 14, hp: '2d6+2', stats: { str: 7, dex: 15, con: 12, int: 8, wis: 11, cha: 10 }, cr: 0.5, model: 'Demon', size: 1.0, tint: 0xff6010, type: 'elemental', immune: ['fire'], flying: true,
    attacks: [{ name: 'Touch', bonus: 4, dmg: '2d6', type: 'fire' }] },
  hellHound: { name: 'Hell Hound', ac: 15, hp: '7d8+14', stats: { str: 17, dex: 12, con: 14, int: 6, wis: 13, cha: 6 }, cr: 3, model: 'Wolf', size: 1.9, tint: 0xff2000, type: 'fiend', pack: true, immune: ['fire'],
    attacks: [{ name: 'Bite', bonus: 5, dmg: '1d8+3', type: 'piercing', extra: { dmg: '2d6', type: 'fire' } }],
    special: { kind: 'blast', name: 'Fire Breath', recharge: 5, save: 'dex', dc: 12, dmg: '6d6', type: 'fire', half: true, text: 'exhales a cone of fire' } },
  gargoyle: { name: 'Gargoyle', ac: 15, hp: '7d8+21', stats: { str: 15, dex: 11, con: 16, int: 6, wis: 11, cha: 7 }, cr: 2, model: 'BlueDemon', size: 1.8, tint: 0x707880, type: 'elemental', immune: ['poison'], multi: 2,
    attacks: [{ name: 'Bite', bonus: 4, dmg: '1d6+2', type: 'piercing' }, { name: 'Claws', bonus: 4, dmg: '1d6+2', type: 'slashing' }] },
  minotaurSkeleton: { name: 'Minotaur Skeleton', ac: 12, hp: '9d10+27', stats: { str: 18, dex: 11, con: 15, int: 6, wis: 8, cha: 5 }, cr: 2, model: 'Skeleton', size: 2.5, tint: 0xe8dcc0, type: 'undead', immune: ['poison'],
    attacks: [{ name: 'Greataxe', bonus: 6, dmg: '2d12+4', type: 'slashing' }] },
  cultFanatic: { name: 'Cult Fanatic', ranged: true, ac: 13, hp: '6d8', stats: { str: 11, dex: 14, con: 12, int: 10, wis: 13, cha: 14 }, cr: 2, model: 'Wizard', size: 1.6, tint: 0xa00020, type: 'humanoid', multi: 2,
    attacks: [{ name: 'Dagger', bonus: 4, dmg: '1d4+2', type: 'piercing' }],
    special: { kind: 'blast', name: 'Inflict Wounds', recharge: 5, save: 'con', dc: 11, dmg: '3d10', type: 'necrotic', single: true, half: true, text: 'lays a withering hand on' } },
  brakk: { name: 'Forgemaster Brakk', ac: 16, hp: '11d8+33', stats: { str: 18, dex: 12, con: 16, int: 10, wis: 11, cha: 12 }, cr: 5, model: 'Orc', size: 2.1, tint: 0xff7030, type: 'humanoid', lieutenant: true, multi: 2,
    attacks: [{ name: 'Forge Hammer', bonus: 7, dmg: '2d6+4', type: 'bludgeoning', extra: { dmg: '1d6', type: 'fire' } }] },
  cindermaw: { name: 'Cindermaw the Chimera', ac: 14, hp: '12d10+36', stats: { str: 19, dex: 11, con: 19, int: 3, wis: 14, cha: 10 }, cr: 6, model: 'Dragon', size: 2.9, tint: 0xff3010, type: 'monstrosity', boss: true, flying: true, multi: 3,
    attacks: [{ name: 'Bite', bonus: 7, dmg: '2d6+4', type: 'piercing' }, { name: 'Horns', bonus: 7, dmg: '1d12+4', type: 'bludgeoning' }, { name: 'Claws', bonus: 7, dmg: '2d6+4', type: 'slashing' }],
    special: { kind: 'blast', name: 'Fire Breath', recharge: 5, save: 'dex', dc: 15, dmg: '7d8', type: 'fire', half: true, text: 'unleashes a torrent of flame' } },
  malthrax: { name: 'Malthrax, the Dread Sovereign', ranged: true, ac: 15, hp: '16d8+32', stats: { str: 9, dex: 14, con: 14, int: 18, wis: 12, cha: 16 }, cr: 7, model: 'LightningWizard', size: 2.0, tint: 0x8020ff, type: 'humanoid', boss: true, multi: 2,
    attacks: [{ name: 'Shadow Bolt', bonus: 7, dmg: '2d10', type: 'necrotic', ranged: true }],
    special: { kind: 'blast', name: 'Chain Lightning', recharge: 5, save: 'dex', dc: 15, dmg: '8d6', type: 'lightning', half: true, text: 'calls down forked lightning from the Blackspire' } },
};

export const CONDITIONS = {
  poisoned: 'Disadvantage on attack rolls and ability checks.',
  prone: 'Disadvantage on attacks; melee attacks against have advantage, ranged attacks against have disadvantage. Standing costs half movement.',
  restrained: 'Attacks have disadvantage; attacks against have advantage; disadvantage on Dex saves.',
  grappled: 'Speed 0 (cannot flee).',
  paralyzed: 'Incapacitated; auto-fail Str/Dex saves; attacks against have advantage; melee hits are critical.',
  unconscious: 'Incapacitated, prone; attacks against have advantage; melee hits are critical.',
  frightened: 'Disadvantage on attack rolls and ability checks while the source is in sight.',
};

// Creature types (for humanoid-only spells and flavour)
const TYPE_OF = { giantRat: 'beast', giantPoisonousSnake: 'beast', giantFrog: 'beast', wolf: 'beast', giantWolfSpider: 'beast', giantSpider: 'beast', giantCrab: 'beast', giantWasp: 'beast', giantToad: 'beast', direWolf: 'beast', flyingSword: 'construct', animatedArmor: 'construct', allosaurus: 'beast', ankylosaurus: 'beast', triceratops: 'beast', tyrannosaurus: 'beast' };
for (const [k, m] of Object.entries(MONSTERS)) m.type ||= TYPE_OF[k] || 'beast';
export const SET_BONUS = { 3: '+1 AC (3 pieces of the Dawn Regalia)', 5: '+2 AC, +1 to saves, weapon hits add 1d6 radiant (all 5 pieces)' };

// Phase D: elemental weaknesses (vuln = double damage), resistances (half) and immunities per monster. SRD where the SRD says so,
// otherwise a game-specific nudge that matches the creature (webs burn, plants burn, forge creatures hate cold).
const MONSTER_TRAITS = {
  giantPoisonousSnake: { resist: ['poison'] }, giantWolfSpider: { vuln: ['fire'] }, giantSpider: { vuln: ['fire'], resist: ['poison'] },
  giantCrab: { vuln: ['lightning'] }, giantToad: { vuln: ['lightning'] }, flyingSword: { vuln: ['lightning'] },
  violetFungus: { vuln: ['fire'], resist: ['poison'] }, shrieker: { vuln: ['fire'] }, motherSporegrave: { vuln: ['fire'], resist: ['poison'] },
  ochreJelly: { resist: ['acid'] }, gelatinousCube: { resist: ['acid'] }, glasshide: { vuln: ['thunder'], resist: ['poison'] },
  magmin: { vuln: ['cold'] }, hellHound: { vuln: ['cold'] }, minotaurSkeleton: { vuln: ['bludgeoning'] }, gargoyle: { resist: ['lightning'] },
  brakk: { resist: ['fire'] }, cindermaw: { resist: ['fire'], vuln: ['cold'] }, sisterVey: { resist: ['necrotic'], vuln: ['radiant'] }, malthrax: { resist: ['necrotic'], vuln: ['radiant'] },
};
for (const [k, t] of Object.entries(MONSTER_TRAITS)) if (MONSTERS[k]) Object.assign(MONSTERS[k], t);

/** Balance-pass tuning (see scripts/balance-results). Plain multipliers on top of the SRD stat lines, so the numbers stay auditable.
 *  B1 is deliberately untouched (every B1 entry is 1 / 0 / absent): the floor-1 balance is signed off.
 *  bossHp: floor-boss and lieutenant hit points. eliteFloorHp: extra elite hit points by floor (B1..B5), on top of the 1.7x leader / 1.25x escort elite bonus. */
export const TUNING = {
  bossHp: { giantSpider: 1.5, skarn: 1, ankylosaurus: 2.35, glasshide: 5.4, brakk: 1.5, cindermaw: 2.8, malthrax: 2.9, tyrannosaurus: 2 },
  eliteFloorHp: [1, 1.4, 1.8, 2.2, 2.0],
  /** B2-B5 pass: every monster on the floor (B1..B5) gets this HP multiplier / this damage multiplier against the party, on top of difficulty. */
  floorHp: [1, 1.15, 1.25, 1.2, 1.2],
  floorDmg: [1, 1.05, 1.1, 1.0, 1.0],
  /** B2 boss when the party has no healer (no cleric, druid, bard or paladin standing): HP and damage multipliers so the floor stays fair without healing magic. */
  noHealerBoss: { hp: 0.85, dmg: 0.9 },
  /** Flat attack-roll bonus per floor (deeper monsters fight like higher-CR creatures: a bigger proficiency bonus). */
  floorAtk: [0, 1, 3, 2, 2],
  /** Legendary-style actions (SRD spirit): extra basic attacks a boss makes at the top of every round (B2-B5 only). */
  legendary: { glasshide: 1, malthrax: 2, cindermaw: 1, tyrannosaurus: 1, ankylosaurus: 1, brakk: 1 },
  /** Per-monster-kind HP and damage multipliers, used on B2-B5 only (a kind may also appear on B1, which must stay as it is). */
  foeHp: { ochreJelly: 1.5, darkmantle: 1.3, violetFungus: 1.5, animatedArmor: 1.3, cultFanatic: 1.8, flyingSword: 1.2 },
  foeDmg: { ochreJelly: 1.25, darkmantle: 1.8, violetFungus: 1.7, glasshide: 2.4, animatedArmor: 2.2, cultFanatic: 1.6, malthrax: 2.8, ankylosaurus: 0.95, brakk: 2.25, cindermaw: 1.45, tyrannosaurus: 1.1, giantWasp: 1, hellHound: 0.85, flyingSword: 1.4, allosaurus: 1.15, triceratops: 1.1, giantToad: 0.9 },
};
