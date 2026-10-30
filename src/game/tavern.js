// Listen In: eavesdropping on the Boar & Spoon's patrons. DOM-free.
// Each tap overhears one short voiced exchange chosen from the save: reactions to what the party just did come first, then hints toward quests that
// are not started or are stuck, then warnings about the frontier floor, then plain chatter. A rumour is not repeated until every relevant one has been heard.

export const PATRONS = {
  brogan: { name: 'Brogan Flint, miner', icon: '⛏', color: '#d9a066', blurb: 'A drunk miner with a deep thirst and a loud voice.' },
  tilda: { name: 'Tilda Pennyroyal, barmaid', icon: '🍶', color: '#ff9ec2', blurb: 'The barmaid. She hears everything and keeps nothing.' },
  ketter: { name: 'Old Ketter, retired adventurer', icon: '🗡', color: '#b9c4d8', blurb: 'A retired delver with bad knees and good advice.' },
  mosk: { name: 'Mosk Ferrow, merchant', icon: '🎒', color: '#9fe0a8', blurb: 'A nervous merchant who counts his coins and his exits.' },
  iolen: { name: 'Sister Iolen, pilgrim', icon: '🕊', color: '#f2e6b8', blurb: 'A gentle pilgrim passing through on the long road.' },
};
const B = 'brogan', T = 'tilda', K = 'ketter', M = 'mosk', I = 'iolen';

const Q = (s, id) => s.quests?.[id];
const open = (s, id) => !!Q(s, id) && Q(s, id) !== 'done';
const rx = (s, id) => !!s.seen?.['rx:' + id];
const dead = (s, i) => !!s.bossDead?.[i];
/** The frontier: the first floor (0 to 4) whose boss still lives; 5 once every boss is down. */
export const frontier = (s) => { const i = (s.bossDead || []).findIndex((d) => !d); return i < 0 ? 5 : i; };
const healer = (s) => (s.party || []).some((c) => !c.dead && ['cleric', 'druid', 'paladin'].includes(c.cls));
const hasPip = (s) => [...(s.party || []), ...(s.roster || [])].some((c) => c.companion === 'pip' && !c.dead);

/** kind: react (3) beats hint (2) beats tip (1) beats idle (0). jr is the Journal line for a quest hint. */
const R = (id, kind, when, lines, jr) => ({ id, kind, pri: { react: 3, hint: 2, tip: 1, idle: 0 }[kind], when, lines, jr });
export const RUMORS = [
  // ---- reactions: what the party did ----
  R('r.venge', 'react', (s) => rx(s, 'g.venge') || rx(s, 'g.snap'), [[T, 'They say a halfling put Garrick Vane in the ground. Lantern Row held a vigil.'], [B, 'Hard justice. I will not say I blame her.']]),
  R('r.mercy', 'react', (s) => rx(s, 'g.mercy'), [[T, 'I heard the halfling let Garrick Vane walk. Mercy, in Lantern Row!'], [K, 'It takes more nerve to spare a man than to stab him.']]),
  R('r.freed', 'react', (s) => rx(s, 'choir.p.free'), [[I, 'The Sisters sing free now. Harl Tollow rows out, and the water answers him.'], [B, 'Gave me goosebumps, it did.']]),
  R('r.bound', 'react', (s) => rx(s, 'choir.p.bind'), [[I, 'The Drowned Choir sings for a master now. Harl has stopped rowing.'], [M, 'A song with a leash on it. I do not like it.']]),
  R('r.shatter', 'react', (s) => rx(s, 'glass.k.shatter'), [[M, 'Ysolde\'s Mirror is shards on the kiln floor. The glasswright sleeps at last.'], [T, 'Silver glitter in every boot that comes up from the Glimmerdeep.']]),
  R('r.gaze', 'react', (s) => rx(s, 'glass.k.gaze'), [[I, 'Someone looked into the Mirror, I am told. They came out knowing things.'], [K, 'I once saw a man go quiet after a mirror. He was never the same.']]),
  R('r.ledgerA', 'react', (s) => rx(s, 'led.law') || rx(s, 'led.deal'), [[B, 'Odalys named the forger to their face. Pawn tickets are honest again.'], [T, 'Whoever pointed the finger had proof. Nobody is arguing.']]),
  R('r.ledgerB', 'react', (s) => rx(s, 'led.run') || rx(s, 'led.squeeze'), [[T, 'The forger left town by lantern light, and Odalys looks lighter.'], [M, 'I heard coins changed hands. I heard nothing else. I heard nothing.']]),
  R('r.orchGood', 'react', (s) => rx(s, 'orch.g.restore'), [[I, 'The Sunken Orchard blooms again under open sky. Silverfruit in the market!'], [B, 'One bite and my cough was gone.']]),
  R('r.orchBad', 'react', (s) => rx(s, 'orch.g.broken') || rx(s, 'orch.g.bought'), [[I, 'The orchard gate stands crooked and the trees have gone quiet.'], [M, 'Somebody paid a price down there. I bar my door at night.']]),
  R('r.crane', 'react', (s) => rx(s, 'crane.v.truth') || rx(s, 'crane.v.lie'), [[K, 'The Sergeant of the Fourth Company has his roll called at last. You gave him peace.']]),
  R('r.boss0', 'react', (s) => dead(s, 0), [[B, 'Skarn the Spider Rider is dead! The Warrens are quiet. Mostly.'], [T, 'The rats never read the news, love.']]),
  R('r.boss1', 'react', (s) => dead(s, 1), [[T, 'Old Clubtail is down! Miners say the Grotto doors open easier now.']]),
  R('r.boss2', 'react', (s) => dead(s, 2), [[M, 'Glasshide fell. The Glimmerdeep glows, and nobody has turned to glass this week.']]),
  R('r.boss3', 'react', (s) => dead(s, 3), [[K, 'Forgemaster Brakk is finished. The Ashforge anvils ring for free folk again.']]),
  R('r.boss4', 'react', (s) => dead(s, 4), [[T, 'The Dread Sovereign is dead! Somebody drinks free tonight. I hope it is you.'], [K, 'The Tyrant still sleeps under the vault, mind. Do not celebrate too long.']]),
  R('r.moon1', 'react', (s) => (s.moon | 0) >= 1 && (s.moon | 0) < 3, [[I, 'The moon looks cracked tonight. One seal is gone, they say.'], [B, 'Every third rest, another one breaks. Count your naps.']]),
  R('r.moon3', 'react', (s) => (s.moon | 0) >= 3, [[K, 'Three seals broken. Gorvax shifts in his sleep. Do not linger up here.']]),

  // ---- hints: quests not started, or started and stuck ----
  R('h.ledger0', 'hint', (s) => !Q(s, 'ledger'), [[T, 'Odalys at the pawn shop is white as flour. Someone forged her tickets.'], [M, 'If you find the forger, she pays well. If you do not, she remembers.']], 'Rumour: Odalys at the pawnshop has forged tickets and needs someone to find the forger.'),
  R('h.ledger1', 'hint', (s) => open(s, 'ledger'), [[K, 'Three leads at the pawn shop: the tickets, the grave dirt, the back alley. Check all three first.'], [T, 'Odalys wants proof, not a guess. A hasty accusation never ends well.']], 'Rumour: check all three leads in Odalys\'s case before naming the forger.'),
  R('h.choir0', 'hint', (s) => !Q(s, 'choir'), [[I, 'Harl Tollow rows out each dusk and listens. He swears his wife still sings under the water.'], [B, 'Down in the Drowned Grotto, second floor. You need a strong stomach.']], 'Rumour: Harl Tollow hears his drowned wife singing in the Grotto on B2.'),
  R('h.choir1', 'hint', (s) => open(s, 'choir'), [[I, 'The Sunken Chapel stands on the second floor. The Black Pool lies beyond it. Bring a steady heart.']], 'Rumour: the Sunken Chapel and the Black Pool on B2 hold the Drowned Choir.'),
  R('h.glass', 'hint', (s) => !Q(s, 'glass') && frontier(s) >= 2, [[K, 'A glasswright named Ysolde lost her trust in mirrors. The old kiln, third floor.'], [M, 'Do not look at any mirror down there longer than you must.']], 'Rumour: Ysolde the glasswright waits at the old kiln on B3 with a Mirror she cannot trust.'),
  R('h.crane', 'hint', (s) => !Q(s, 'crane') && frontier(s) >= 3, [[K, 'A Sergeant of the Fourth Company still walks the Ashforge, counting his dead.'], [B, 'Three tags missing from his roll. Search the old barracks.']], 'Rumour: a Sergeant of the Fourth Company wants three missing tags found in the barracks, B4 and B5.'),
  R('h.orchard', 'hint', (s) => !Q(s, 'orchard') && frontier(s) >= 2, [[I, 'A keeper named Maelis tends the Sunken Orchard on the third floor. The trees listen.'], [I, 'They answer to the hour and the weather. Read the sky and the trees before you choose.']], 'Rumour: Maelis Dewbough tends the Sunken Orchard on B3, and the orchard changes with the hour and the weather.'),
  R('h.debt', 'hint', (s) => hasPip(s) && Q(s, 'debt') !== 'done' && (s.flags?.n_debt | 0) < 3, [[T, 'Chalk marks on the cellar doors in Lantern Row. Three dots and a hook. Still fresh.'], [B, 'Garrick Vane\'s old crew. Eleven gone, and one man walks free.']], 'Rumour: fresh Lantern Row marks lead down the floors toward Garrick Vane.'),
  R('h.guards', 'hint', (s) => open(s, 'guards'), [[B, 'Four of the Watch went into the Warrens and never came back. Rowan will not say it.'], [K, 'Bound, not dead, I would bet my knee. Cut them loose.']], 'Rumour: four guards are bound somewhere in the Rat Warrens on B1.'),
  R('h.tunnel', 'hint', (s) => !Q(s, 'tunnel'), [[T, 'Marga hears digging under the cellar. Not rats. Someone tunnels toward the barrels.'], [M, 'First floor, I heard. Collapse it and she will never stop thanking you.']], 'Rumour: a tunnel on B1 runs up toward the Boar and Spoon cellar. Collapse it.'),
  R('h.satchel', 'hint', (s) => !Q(s, 'satchel') && frontier(s) >= 1, [[I, 'Brother Osric lost temple relics in a satchel stitched with the royal sun.'], [M, 'The Grotto swallowed it. Sunk in the water, but dry inside, by some blessing.']], 'Rumour: Elowen\'s relic satchel sank in the Drowned Grotto on B2.'),
  R('h.smiths', 'hint', (s) => !Q(s, 'smiths') && frontier(s) >= 3, [[K, 'Dwarven smiths sit in chains at the Ashforge. Dobbin swears they will fight for you.'], [B, 'Smash the chains. Do not pick the locks.']], 'Rumour: captive smiths in the Ashforge on B4 will fight for Dobbin\'s friends.'),

  // ---- tips: the frontier floor ----
  R('t.b1', 'tip', (s) => frontier(s) === 0, [[K, 'First floor, the Warrens. Skarn rides a spider, and spiders burn. Bring fire.'], [B, 'Rats come in packs. Fight in the corridor, not the open room.']]),
  R('t.b2h', 'tip', (s) => frontier(s) === 1 && healer(s), [[K, 'Old Clubtail hits like a falling roof. Keep your healer behind the line and topped up.']]),
  R('t.b2n', 'tip', (s) => frontier(s) === 1 && !healer(s), [[M, 'No healer in your party? Down in the Grotto? Old Clubtail breaks bones.'], [B, 'Hire a priest at the bar before you go. It is cheaper than a funeral.']]),
  R('t.b3a', 'tip', (s) => frontier(s) === 2, [[K, 'Glasshide the Basilisk turns folk to glass. Thunder shatters it. Poison does nothing.']]),
  R('t.b3b', 'tip', (s) => frontier(s) === 2, [[B, 'Gargoyles in the Glimmerdeep shrug off lightning and poison. Hit them with steel.']]),
  R('t.b4a', 'tip', (s) => frontier(s) === 3, [[K, 'Forgemaster Brakk shrugs off fire. Odd, for a man who lives in a forge.']]),
  R('t.b4b', 'tip', (s) => frontier(s) === 3, [[M, 'The chimera Cindermaw burns, flies and bites three ways. Cold drops it like a stone.']]),
  R('t.b5a', 'tip', (s) => frontier(s) === 4, [[K, 'Malthrax fears radiant light and shrugs off the dark. Bring something that shines.']]),
  R('t.b5b', 'tip', (s) => frontier(s) === 4 && !s.flags?.weakPoint, [[I, 'The Sovereign\'s staff has a crack under the third ring. Find the tall tale and strike there.']]),

  // ---- chatter ----
  R('i.1', 'idle', () => true, [[B, 'Another round! And a dwarf\'s blessing on whoever pays!'], [T, 'Pay first, bless after, Brogan.']]),
  R('i.2', 'idle', () => true, [[M, 'Ninety gold, three pelts and a lamp. That is all I have left, and I was robbed twice.']]),
  R('i.3', 'idle', () => true, [[K, 'Thirty years in the dungeons. My knees remember every one of them.']]),
  R('i.4', 'idle', () => true, [[I, 'The road is long, but this tavern is warm. I rest here between pilgrimages.']]),
  R('i.5', 'idle', () => true, [[T, 'Marga waters the ale. Do not tell her I said so.'], [B, 'I could not tell. Is that bad?']]),
  R('i.6', 'idle', () => true, [[B, 'I heard the stew has rat in it.'], [T, 'Only on weekdays, love.']]),
];

const ensure = (s) => { const r = (s.rumors ||= { heard: {}, taps: 0 }); r.heard ||= {}; r.taps |= 0; return r; };
export const eligible = (s) => RUMORS.filter((r) => { try { return r.when(s); } catch { return false; } });
export const heardCount = (s) => Object.keys(ensure(s).heard).length;

/** The next rumour: an unheard one of the highest priority, else (everything relevant heard) the least heard, so nothing repeats until exhausted. */
export function pickRumor(s, rng = Math.random) {
  const heard = ensure(s).heard, el = eligible(s);
  const fresh = el.filter((r) => !heard[r.id]); let pool;
  if (fresh.length) { const top = Math.max(...fresh.map((r) => r.pri)); pool = fresh.filter((r) => r.pri === top); }
  else { const lo = Math.min(...el.map((r) => heard[r.id])); pool = el.filter((r) => heard[r.id] === lo); }
  return pool[Math.floor(rng() * pool.length) % pool.length];
}
/** Overhear one rumour: marks it heard, files quest hints in the Journal (once), and returns { rumor, lines, logs }. */
export function overhear(s, rng = Math.random, addJournal = null) {
  const st = ensure(s), r = pickRumor(s, rng), first = !st.heard[r.id];
  st.heard[r.id] = (st.heard[r.id] | 0) + 1; st.taps++;
  if (first && r.jr && addJournal) addJournal(s, r.jr);
  const lines = r.lines.map(([who, text]) => ({ who, text }));
  return { rumor: r, lines, first, logs: lines.map((l) => `🗣 Overheard, ${PATRONS[l.who].name.split(',')[0]}: "${l.text}"`) };
}
/** One tap in the bar: about one tap in four is the party's own banter (when somebody is there to speak), else a rumour. */
export function listenKind(s, rng = Math.random) {
  const talkers = (s.party || []).some((c) => c.companion && !c.dead);
  return talkers && rng() < 0.25 ? 'banter' : 'rumor';
}
/** Every line, for the voice catalogue: [speaker, text, id]. */
export function allLines() { const o = []; for (const r of RUMORS) for (const [w, t] of r.lines) o.push([w, t, r.id]); return o; }
