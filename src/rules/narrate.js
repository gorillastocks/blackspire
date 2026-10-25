// Vivid combat narration. Pure functions + a small "recently used" memory so the same line never repeats back-to-back.
// Placeholders: {a} attacker, {t} target, {w} weapon / spell / attack name, {d} damage.
const pools = {
  // ---- party weapon hits, by damage type ----
  slashing: [
    '{a} carves a red arc across {t}!', '{a}\'s {w} bites deep into {t}.', 'Steel flashes — {a} slashes {t} open.',
    '{a} spins and cleaves into {t}\'s flank.', '{a} hacks at {t}, and the blow lands true.', 'A whistling cut from {a} opens {t} from shoulder to hip.',
    '{a} drives {t} back with a brutal sweep of the {w}.', '{a}\'s blade sings, and {t} howls.',
  ],
  piercing: [
    '{a} lunges and runs {t} through!', '{a}\'s {w} punches straight through {t}\'s guard.', '{a} finds a gap and stabs deep into {t}.',
    'A quick thrust from {a} — {t} staggers, bleeding.', '{a} jabs {t} twice in a heartbeat.', '{a} feints left and skewers {t} on the right.',
    '{a} buries the point of the {w} in {t}.',
  ],
  bludgeoning: [
    '{a}\'s {w} lands with a sickening crunch on {t}!', '{a} caves in {t}\'s guard with a thunderous blow.', 'CRACK! {a} smashes {t} off its feet.',
    '{a} brings the {w} down on {t} like a falling bell.', '{a} batters {t} — something inside it snaps.', '{a} swings low and shatters {t}\'s footing.',
    '{a} clubs {t} square in the skull.',
  ],
  ranged: [
    '{a} looses — the shot thuds into {t}!', 'A bolt from {a} hisses across the dark and strikes {t}.', '{a} draws, breathes, releases: a clean hit on {t}.',
    '{a}\'s missile pins {t} against the stone.', 'Thwip! {a} catches {t} mid-stride.', '{a} fires between two heartbeats and wings {t}.',
  ],
  // ---- spells, by damage type ----
  fire: [
    'Flames roar from {a}\'s hands and engulf {t}!', '{a}\'s {w} explodes against {t} in a burst of sparks.', '{t} shrieks as {a}\'s fire licks across its hide.',
    'The air turns orange — {a}\'s {w} scorches {t}.', '{a} hurls a ball of living flame that splashes over {t}.', 'Embers swirl as {t} is wreathed in {a}\'s fire.',
  ],
  cold: [
    'A lance of frost from {a} rimes {t} in ice!', '{a}\'s {w} freezes {t}\'s limbs stiff.', 'Breath turns to mist — {t} is struck by {a}\'s bitter cold.',
    '{a} flicks a shard of winter into {t}, and frost spiders across it.',
  ],
  lightning: [
    'Lightning leaps from {a} and crackles through {t}!', '{a}\'s {w} jolts {t}, every hair standing on end.', 'A blue-white fork of power from {a} slams into {t}.',
    'The smell of storms fills the hall as {a} electrocutes {t}.',
  ],
  radiant: [
    'Holy light blazes down on {t} at {a}\'s word!', '{a} calls the dawn — {t} burns in searing radiance.', 'A shaft of sunlight lances from {a} into {t}.',
    '{t} recoils as {a}\'s radiance scours it.', 'Golden fire from {a} limns {t} in judgment.',
  ],
  necrotic: [
    '{a}\'s touch withers {t} — flesh greys and cracks.', 'Shadow pours from {a} and drinks the life from {t}.', '{t} shudders as {a}\'s {w} rots it from within.',
    'A cold, dead hand of magic from {a} clutches {t}\'s heart.',
  ],
  force: [
    'Glowing darts streak from {a} and slam into {t}!', '{a}\'s {w} hammers {t} with raw arcane force.', 'An invisible fist of magic from {a} knocks {t} sprawling.',
    'Shimmering force from {a} crumples {t} like parchment.', 'Eldritch energy crackles from {a} and blasts {t}.',
  ],
  thunder: [
    'BOOM! {a}\'s {w} rattles {t}\'s bones.', 'A wave of thunder from {a} hurls {t} backward.', 'The cavern shakes as {a} strikes {t} with pure sound.',
  ],
  poison: [
    'A sickly green cloud from {a} chokes {t}.', '{a}\'s venomous magic seeps into {t}\'s veins.', '{t} gags and reels from {a}\'s poison.',
  ],
  acid: [
    'Hissing acid from {a} splashes over {t}!', '{a}\'s {w} eats into {t}, smoking and bubbling.', '{t} writhes as {a}\'s acid sizzles into it.',
  ],
  psychic: [
    '{a}\'s {w} claws at {t}\'s mind — it clutches its head.', 'A psychic shriek from {a} drives {t} to its knees.', '{t}\'s eyes glaze as {a} lashes its thoughts.',
  ],
  // ---- monster attacks, by attack kind ----
  bite: [
    '{a} sinks its fangs into {t}!', '{a} lunges, jaws snapping shut on {t}.', '{a} tears a ragged bite from {t}.', 'Teeth flash — {a} bites {t} hard.',
    '{a} clamps down on {t} and shakes its head savagely.', '{a} snaps at {t} and draws blood.',
  ],
  claw: [
    '{a} rakes {t} with hooked claws!', '{a}\'s talons shred {t}\'s armor.', 'A swipe from {a} leaves three red lines across {t}.', '{a} slashes wildly and catches {t}.',
  ],
  sting: [
    '{a} drives its stinger into {t}!', '{a} darts in and stings {t}.', 'A barbed tail flicks — {a} stabs {t}.', '{a}\'s stinger punches through {t}\'s defenses.',
  ],
  tail: [
    '{a}\'s massive tail whips around and smashes {t}!', '{a} swings its tail like a battering ram into {t}.', 'The tail of {a} sweeps {t} off their feet.',
  ],
  slam: [
    '{a} slams into {t} with crushing weight!', '{a} pounds {t} with a fist of iron.', '{a} batters {t} with a heavy blow.', '{a} rams {t} into the wall.',
  ],
  gore: [
    '{a} lowers its horns and gores {t}!', '{a} charges and tosses {t} like a rag doll.', '{a}\'s horns punch into {t}.',
  ],
  weapon: [
    '{a} swings a wicked {w} at {t} — it connects!', '{a} strikes {t} with its {w}.', '{a} lunges with its {w} and cuts {t}.', '{a}\'s {w} finds {t}\'s flesh.',
    '{a} hammers {t} with a vicious {w} blow.',
  ],
  touch: [
    '{a}\'s burning touch sears {t}!', '{a} engulfs {t}\'s arm in its slime.', 'A pseudopod from {a} lashes {t}.', '{a} brushes {t}, and the skin blisters.',
  ],
  spores: [
    '{a} bursts in a cloud of choking spores around {t}!', 'Glittering spores from {a} fill {t}\'s lungs.',
    'A rotten puff of spores erupts from {a}, and {t} doubles over coughing.', '{a} sheds a sickly violet haze over {t}.',
  ],
  tentacle: [
    'A slick tendril from {a} lashes {t} across the face.', '{a} wraps {t} in a cold, crushing grip.',
    '{a}\'s tentacles coil around {t} and squeeze!', '{a} drops onto {t}, smothering them in its folds.',
  ],
  // ---- misses ----
  missParty: [
    '{a} swings — {t} twists aside!', '{a}\'s {w} glances off {t}\'s hide.', '{t} ducks under {a}\'s strike.', '{a} overextends and hits only air.',
    'Sparks fly as {a}\'s {w} strikes stone instead of {t}.', '{t} slips away from {a} at the last instant.', '{a} misjudges the distance to {t}.',
  ],
  missMonster: [
    '{a} lunges at {t} — and misses!', '{t} raises a shield just in time to stop {a}.', '{t} rolls clear of {a}\'s attack.', '{a}\'s attack whistles past {t}\'s ear.',
    '{t} sidesteps {a} with a grunt.', '{a} snaps at empty air where {t} stood.',
  ],
  // ---- crits ----
  crit: [
    'CRITICAL! {a} finds the perfect opening!', 'A devastating blow — CRITICAL HIT!', 'CRITICAL! The strike lands with bone-shaking force!', 'CRITICAL! Time seems to slow as {a} strikes true!',
    'CRITICAL! A strike the bards will sing about!',
  ],
  critMonster: [
    'CRITICAL! {a} lands a savage blow on {t}!', 'CRITICAL! {t} is hurled across the floor!', 'CRITICAL! A sickening crunch — {t} reels!',
  ],
  // ---- kills, by creature type ----
  kill_beast: [
    '{t} lets out a final whimper and lies still.', '{t} collapses in a heap.', '{t} twitches once, then moves no more.', '{t} crashes to the ground, slain.',
    'With a last snarl, {t} goes limp.',
  ],
  kill_construct: [
    '{t} clatters apart into lifeless pieces!', 'The magic animating {t} gutters out — it falls with a crash.', '{t} shatters, its enchantment broken.',
  ],
  kill_undead: [
    '{t} rattles apart, and its bones scatter across the stones.','{t} crumbles into dust and bone.', 'The unholy light in {t}\'s eyes winks out.'],
  kill_ooze: [
    '{t} shudders, goes still, and seeps into the cracks.','{t} splatters across the floor and stops quivering.', '{t} dissolves into a harmless puddle.'],
  kill_plant: [
    '{t} droops and sloughs apart in a puff of rot.','{t} withers and blackens.', '{t} collapses into a heap of rotting spores.'],
  kill_humanoid: ['{t} drops their weapon and falls.', '{t} crumples with a groan.', '{t} staggers, then topples, defeated.'],
  kill_fiend: [
    'With a shriek, {t} burns away to ash and sulfur.','{t} dissolves in a burst of brimstone.', '{t} howls back to whatever pit spawned it.'],
  kill_elemental: [
    'The fire inside {t} gutters and dies.','{t} sputters out in a hiss of steam and cinders.', '{t} breaks apart into cooling slag.'],
  kill_monstrosity: [
    '{t} gives one last snarl and collapses.','{t} thrashes, roars, and finally falls still.', 'The great bulk of {t} crashes down, shaking the floor.'],
  kill_dragon: [
    '{t} sways, bellows once more, and crashes to the ground.','{t} lets out an earth-shaking roar and topples!', 'The mighty {t} falls, and the cavern trembles.'],
  // ---- party member downed / heals ----
  down: ['{t} crumples to the ground!', '{t} falls, gasping, and does not rise.', '{t} drops to one knee… then collapses.'],
  heal: ['Warm light knits {t}\'s wounds closed.', '{t} breathes easier as the wounds close.', 'Color returns to {t}\'s face.', 'Golden light washes over {t}.'],
};
export const NARRATION_POOLS = pools;

const recent = []; const RECENT = 12; const lastByPool = {};
function choose(pool, key) {
  const fresh = pool.filter((l) => !recent.includes(l) && l !== lastByPool[key]);
  const list = fresh.length ? fresh : pool.filter((l) => l !== lastByPool[key]);
  const line = (list.length ? list : pool)[Math.floor(Math.random() * (list.length ? list.length : pool.length))];
  lastByPool[key] = line; recent.push(line); if (recent.length > RECENT) recent.shift();
  return line;
}
const fill = (line, ctx) => line.replace(/\{(\w)\}/g, (_, k) => ({ a: ctx.a, t: ctx.t, w: ctx.w, d: ctx.d }[k] ?? ''));
export function line(key, ctx = {}) { const pool = pools[key] || pools.weapon; return fill(choose(pool, key), ctx); }

export function attackKind(name = '') {
  const n = name.toLowerCase();
  for (const [k, re] of [['bite', /bite|fang|jaw/], ['claw', /claw|talon|rake/], ['sting', /sting/], ['tail', /tail/], ['slam', /slam|fist|punch|stomp|headbutt/], ['gore', /gore|horn|ram/],
    ['touch', /touch|pseudopod|engulf/], ['spores', /spore/], ['tentacle', /tentacle|crush/]]) if (re.test(n)) return k;
  return 'weapon';
}
const SPELL_TYPES = ['fire', 'cold', 'lightning', 'radiant', 'necrotic', 'force', 'thunder', 'poison', 'acid', 'psychic'];
/** Flavor for a resolved attack. o: {att, tgt, label, type, hit, crit, ranged, spell, killed, downed} */
export function narrateAttack(o) {
  const a = o.att.name, t = o.tgt.name, w = (o.label || 'weapon').replace(/ \+\d$/, '').toLowerCase();
  const ctx = { a, t, w };
  const party = o.att.side === 'party';
  if (!o.hit) return line(party ? 'missParty' : 'missMonster', ctx);
  let key;
  if (o.spell || (SPELL_TYPES.includes(o.type) && party)) key = SPELL_TYPES.includes(o.type) ? o.type : 'force';
  else if (party) key = o.ranged ? 'ranged' : (['slashing', 'piercing', 'bludgeoning'].includes(o.type) ? o.type : 'slashing');
  else key = attackKind(o.label);
  let txt = line(key, ctx);
  if (o.crit) txt = line(party ? 'crit' : 'critMonster', ctx) + ' ' + txt;
  if (o.killed) txt += ' ' + narrateKill(o.tgt);
  if (o.downed) txt += ' ' + line('down', { t });
  return txt;
}
export function narrateKill(m) { const ty = m.T?.type || (m.T?.construct ? 'construct' : 'beast'); return line(pools['kill_' + ty] ? 'kill_' + ty : 'kill_beast', { t: m.name }); }
