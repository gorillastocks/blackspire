// Game data derived from the D&D 5e System Reference Document 5.1 (CC-BY-4.0). See ATTRIBUTION.md.
export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

export const SKILLS = {
  acrobatics: 'dex', animalHandling: 'wis', arcana: 'int', athletics: 'str', deception: 'cha', history: 'int',
  insight: 'wis', intimidation: 'cha', investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis',
  performance: 'cha', persuasion: 'cha', religion: 'int', sleightOfHand: 'dex', stealth: 'dex', survival: 'wis',
};
export const SKILL_LABEL = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

export const XP_LEVELS = [0, 300, 900, 2700, 6500, 14000, 23000];
export const MAX_LEVEL = 6;
export const CR_XP = { 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 8: 3900 };
export const profBonus = (level) => 2 + Math.floor((level - 1) / 4);

export const RACES = {
  human: { name: 'Human', bonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, speed: 30, traits: ['Versatile'] },
  hillDwarf: { name: 'Hill Dwarf', bonus: { con: 2, wis: 1 }, speed: 25, traits: ['Darkvision', 'Dwarven Resilience', 'Dwarven Toughness'], resist: ['poison'], hpPerLevel: 1 },
  highElf: { name: 'High Elf', bonus: { dex: 2, int: 1 }, speed: 30, traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry'], skills: ['perception'] },
  lightfootHalfling: { name: 'Lightfoot Halfling', bonus: { dex: 2, cha: 1 }, speed: 25, traits: ['Lucky', 'Brave', 'Halfling Nimbleness'] },
  rockGnome: { name: 'Rock Gnome', bonus: { int: 2, con: 1 }, speed: 25, traits: ['Darkvision', 'Gnome Cunning'] },
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
    features: { 1: ['Fighting Style (Defense)', 'Second Wind'], 2: ['Action Surge'], 3: ['Improved Critical'], 4: ['Ability Score Improvement'], 5: ['Extra Attack'], 6: ['Ability Score Improvement'] },
  },
  cleric: {
    name: 'Cleric', hitDie: 8, primary: ['wis', 'con', 'str', 'dex', 'cha', 'int'], saves: ['wis', 'cha'], caster: 'wis',
    armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple'], skillChoices: ['medicine', 'religion'],
    start: { weapon: 'mace', ranged: 'lightCrossbow', armor: 'chainMail', shield: true }, sub: 'Life Domain',
    features: { 1: ['Spellcasting', 'Disciple of Life', 'Bonus Proficiency (Heavy Armor)'], 2: ['Channel Divinity: Preserve Life'], 4: ['Ability Score Improvement'], 5: ['Destroy Undead (CR 1/2)'], 6: ['Blessed Healer', 'Channel Divinity (2/rest)'] },
  },
  rogue: {
    name: 'Rogue', hitDie: 8, primary: ['dex', 'con', 'wis', 'int', 'cha', 'str'], saves: ['dex', 'int'],
    armor: ['light'], weapons: ['simple', 'longsword', 'rapier', 'shortsword', 'handCrossbow'], skillChoices: ['stealth', 'perception', 'investigation', 'acrobatics'],
    expertise: ['stealth', 'perception'], start: { weapon: 'shortsword', ranged: 'shortbow', armor: 'leather', shield: false }, sub: 'Thief',
    features: { 1: ['Expertise', 'Sneak Attack', "Thieves' Cant"], 2: ['Cunning Action'], 3: ['Fast Hands', 'Second-Story Work'], 4: ['Ability Score Improvement'], 5: ['Uncanny Dodge'], 6: ['Expertise'] },
  },
  wizard: {
    name: 'Wizard', hitDie: 6, primary: ['int', 'dex', 'con', 'wis', 'cha', 'str'], saves: ['int', 'wis'], caster: 'int',
    armor: [], weapons: ['dagger', 'quarterstaff', 'lightCrossbow'], skillChoices: ['arcana', 'investigation'],
    start: { weapon: 'quarterstaff', ranged: 'lightCrossbow', armor: null, shield: false }, sub: 'School of Evocation',
    features: { 1: ['Spellcasting', 'Arcane Recovery'], 2: ['Evocation Savant', 'Sculpt Spells'], 4: ['Ability Score Improvement'], 6: ['Potent Cantrip'] },
  },
};
export const FULL_CASTER_SLOTS = { 1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2], 6: [4, 3, 3] };
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
};

export const ARMOR = {
  padded: { name: 'Padded', base: 11, type: 'light', cost: 5, stealthDis: true },
  leather: { name: 'Leather', base: 11, type: 'light', cost: 10 },
  studdedLeather: { name: 'Studded Leather', base: 12, type: 'light', cost: 45 },
  hide: { name: 'Hide', base: 12, type: 'medium', cost: 10 },
  chainShirt: { name: 'Chain Shirt', base: 13, type: 'medium', cost: 50 },
  scaleMail: { name: 'Scale Mail', base: 14, type: 'medium', cost: 50, stealthDis: true },
  breastplate: { name: 'Breastplate', base: 14, type: 'medium', cost: 400 },
  halfPlate: { name: 'Half Plate', base: 15, type: 'medium', cost: 750, stealthDis: true },
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
  spoon: { name: 'Silver Spoon', kind: 'junk', cost: 1, spoon: true },
  goldSpoon: { name: 'Gilded Soup Spoon', kind: 'junk', cost: 25, spoon: true },
  runcibleSpoon: { name: 'Legendary Runcible Spoon', kind: 'junk', cost: 100, spoon: true },
  key1: { name: 'Rusty Iron Key', kind: 'key', level: 0, cost: 0 },
  key2: { name: 'Coral Key', kind: 'key', level: 1, cost: 0 },
  key3: { name: 'Obsidian Key', kind: 'key', level: 2, cost: 0 },
};
// Buyable gear in the town shop
export const SHOP_STOCK = [
  'potionHealing', 'potionGreater', 'antitoxin',
  'w:dagger', 'w:mace', 'w:quarterstaff', 'w:spear', 'w:shortsword', 'w:rapier', 'w:longsword', 'w:battleaxe', 'w:warhammer', 'w:greatsword', 'w:greataxe', 'w:maul', 'w:shortbow', 'w:longbow', 'w:lightCrossbow',
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
  bless: { name: 'Bless', level: 1, cls: ['cleric'], kind: 'buff', target: 'allAllies', conc: true, buff: 'blessed', maxTargets: 3, desc: 'Up to 3 allies add 1d4 to attack rolls and saving throws. Concentration.' },
  cureWounds: { name: 'Cure Wounds', level: 1, cls: ['cleric'], kind: 'heal', heal: '1d8', perLevel: '1d8', addMod: true, target: 'ally', desc: 'Touch heals 1d8 + mod (+1d8 per slot level above 1st).' },
  healingWord: { name: 'Healing Word', level: 1, cls: ['cleric'], kind: 'heal', heal: '1d4', perLevel: '1d4', addMod: true, target: 'ally', bonus: true, desc: 'Bonus action, heals 1d4 + mod at range.' },
  guidingBolt: { name: 'Guiding Bolt', level: 1, cls: ['cleric'], kind: 'attack', dmg: '4d6', perLevel: '1d6', type: 'radiant', target: 'enemy', rider: 'guided', desc: 'Spell attack 4d6 radiant; next attack against target has advantage.' },
  shieldOfFaith: { name: 'Shield of Faith', level: 1, cls: ['cleric'], kind: 'buff', target: 'ally', conc: true, buff: 'shieldOfFaith', bonus: true, desc: '+2 AC to one creature. Concentration.' },
  inflictWounds: { name: 'Inflict Wounds', level: 1, cls: ['cleric'], kind: 'attack', melee: true, dmg: '3d10', perLevel: '1d10', type: 'necrotic', target: 'enemy', desc: 'Melee spell attack, 3d10 necrotic.' },
  aid: { name: 'Aid', level: 2, cls: ['cleric'], kind: 'buff', target: 'allAllies', buff: 'aid', maxTargets: 3, desc: 'Up to 3 allies gain +5 max and current HP until long rest.' },
  lesserRestoration: { name: 'Lesser Restoration', level: 2, cls: ['cleric'], kind: 'util', target: 'ally', cure: ['poisoned', 'paralyzed', 'blinded'], desc: 'End the poisoned, blinded or paralyzed condition.' },
  spiritualWeapon: { name: 'Spiritual Weapon', level: 2, cls: ['cleric'], kind: 'attack', dmg: '1d8', addMod: true, type: 'force', target: 'enemy', bonus: true, desc: 'Bonus action: spectral weapon makes a melee spell attack for 1d8 + mod force.' },
  spiritGuardians: { name: 'Spirit Guardians', level: 3, cls: ['cleric'], kind: 'buff', target: 'self', conc: true, buff: 'spiritGuardians', dmg: '3d8', type: 'radiant', save: 'wis', desc: 'Concentration. Each enemy takes 3d8 radiant at the start of its turn (Wis save half).' },
  massHealingWord: { name: 'Mass Healing Word', level: 3, cls: ['cleric'], kind: 'heal', heal: '1d4', addMod: true, target: 'allAllies', bonus: true, desc: 'Bonus action, heal each ally 1d4 + mod.' },
  revivify: { name: 'Revivify', level: 3, cls: ['cleric'], kind: 'util', target: 'deadAlly', desc: 'Return a creature that died within the last minute to life with 1 HP (consumes 300 gp of diamonds).' },
  // Wizard
  fireBolt: { name: 'Fire Bolt', level: 0, cls: ['wizard'], kind: 'attack', dmg: '1d10', type: 'fire', target: 'enemy', cantrip: true, desc: 'Ranged spell attack, 1d10 fire. Scales at 5th level.' },
  rayOfFrost: { name: 'Ray of Frost', level: 0, cls: ['wizard'], kind: 'attack', dmg: '1d8', type: 'cold', target: 'enemy', cantrip: true, desc: 'Ranged spell attack, 1d8 cold.' },
  shockingGrasp: { name: 'Shocking Grasp', level: 0, cls: ['wizard'], kind: 'attack', melee: true, dmg: '1d8', type: 'lightning', target: 'enemy', cantrip: true, desc: 'Melee spell attack with advantage vs metal armor, 1d8 lightning.' },
  magicMissile: { name: 'Magic Missile', level: 1, cls: ['wizard'], kind: 'auto', darts: 3, dmg: '1d4+1', type: 'force', target: 'enemy', desc: 'Three darts of 1d4+1 force that always hit (+1 dart per slot level above 1st).' },
  sleep: { name: 'Sleep', level: 1, cls: ['wizard'], kind: 'sleep', pool: '5d8', perLevel: '2d8', target: 'allEnemies', desc: 'Creatures with the lowest HP fall unconscious, up to 5d8 HP total.' },
  burningHands: { name: 'Burning Hands', level: 1, cls: ['wizard'], kind: 'save', save: 'dex', dmg: '3d6', perLevel: '1d6', type: 'fire', half: true, target: 'someEnemies', maxTargets: 3, desc: 'Cone: up to 3 enemies, 3d6 fire, Dex save half.' },
  thunderwave: { name: 'Thunderwave', level: 1, cls: ['wizard'], kind: 'save', save: 'con', dmg: '2d8', perLevel: '1d8', type: 'thunder', half: true, target: 'someEnemies', maxTargets: 2, desc: 'Cube: up to 2 enemies, 2d8 thunder, Con save half.' },
  shield: { name: 'Shield', level: 1, cls: ['wizard'], kind: 'reaction', desc: 'Reaction when hit: +5 AC until your next turn (used automatically if it would turn a hit into a miss).' },
  mageArmor: { name: 'Mage Armor', level: 1, cls: ['wizard'], kind: 'buff', target: 'ally', buff: 'mageArmor', outOfCombat: true, desc: 'Unarmored target base AC becomes 13 + Dex for 8 hours.' },
  scorchingRay: { name: 'Scorching Ray', level: 2, cls: ['wizard'], kind: 'rays', rays: 3, dmg: '2d6', type: 'fire', target: 'enemy', desc: 'Three rays, each a ranged spell attack for 2d6 fire.' },
  web: { name: 'Web', level: 2, cls: ['wizard'], kind: 'save', save: 'dex', dmg: null, cond: 'restrained', target: 'someEnemies', maxTargets: 3, conc: true, desc: 'Up to 3 enemies must make a Dex save or be restrained. Concentration.' },
  holdPerson: { name: 'Hold Person', level: 2, cls: ['wizard', 'cleric'], kind: 'save', save: 'wis', dmg: null, cond: 'paralyzed', humanoidOnly: true, target: 'enemy', conc: true, desc: 'Humanoid must make a Wis save or be paralyzed. Concentration.' },
  fireball: { name: 'Fireball', level: 3, cls: ['wizard'], kind: 'save', save: 'dex', dmg: '8d6', perLevel: '1d6', type: 'fire', half: true, target: 'allEnemies', desc: '8d6 fire to every enemy, Dex save half.' },
  lightningBolt: { name: 'Lightning Bolt', level: 3, cls: ['wizard'], kind: 'save', save: 'dex', dmg: '8d6', perLevel: '1d6', type: 'lightning', half: true, target: 'someEnemies', maxTargets: 3, desc: 'Line: up to 3 enemies, 8d6 lightning, Dex save half.' },
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
  giantSpider: { name: 'Giant Spider', ac: 14, hp: '4d10+4', stats: { str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4 }, cr: 1, model: 'Spider', size: 2.2, tint: 0xff3070, boss: true,
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
  ankylosaurus: { name: 'Ankylosaurus', ac: 15, hp: '8d12+16', stats: { str: 19, dex: 11, con: 15, int: 2, wis: 12, cha: 5 }, cr: 3, model: 'Stegosaurus', size: 3.0, boss: true,
    attacks: [{ name: 'Tail', bonus: 7, dmg: '4d6+4', type: 'bludgeoning', rider: { save: 'str', dc: 14, cond: 'prone' } }] },
  triceratops: { name: 'Triceratops', ac: 13, hp: '10d12+30', stats: { str: 22, dex: 9, con: 17, int: 2, wis: 11, cha: 5 }, cr: 5, model: 'Triceratops', size: 3.2,
    attacks: [{ name: 'Gore', bonus: 9, dmg: '4d8+6', type: 'piercing' }] },
  tyrannosaurus: { name: 'Tyrannosaurus Rex', ac: 13, hp: '13d12+52', stats: { str: 25, dex: 10, con: 19, int: 2, wis: 12, cha: 9 }, cr: 8, model: 'Trex', size: 3.6, boss: true, final: true,
    attacks: [{ name: 'Bite', bonus: 10, dmg: '4d12+7', type: 'piercing', grapple: 17 }, { name: 'Tail', bonus: 10, dmg: '3d8+7', type: 'bludgeoning' }] },
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
