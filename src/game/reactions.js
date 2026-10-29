// Party reactions: companions react to the choices you make at quest points with a short, voiced one-liner, and each keeps a simple approval value.
// DOM-free. Approval only colours flavour text and unlocks one bonus line; it never changes the numbers of a fight. Saved in `s.approval`.
// No dashes between words in anything spoken: commas, periods and ellipses only.

export const COMP_KEYS = ['brambur', 'fizzwick', 'pip', 'grumsh', 'zizzy', 'vexrath', 'nettle', 'liora'];
const SHORT = { brambur: 'Brambur', fizzwick: 'Fizzwick', pip: 'Pip', grumsh: 'Grumsh', zizzy: 'Zizzy', vexrath: 'Vexrath', nettle: 'Nettle', liora: 'Liora' };
export const APPROVAL_MIN = -5, APPROVAL_MAX = 8;
export const MOOD_DELTA = { approve: 1, object: -1, joke: 0 };

/** What each companion leans toward: tone -> +1 likes, -1 dislikes (anything not listed is neutral). Used for companions without a spoken line on an event. */
export const LEAN = {
  brambur: { mercy: 1, honest: 1, pious: 1, wild: 1, ruthless: -1, greed: -1, deceit: -1, force: -1, bargain: -1 },
  fizzwick: { arcane: 1, greed: 1, bargain: 1, law: 0, force: -1 },
  pip: { ruthless: 1, greed: 1, deceit: 1, bargain: 1, pious: -1, law: -1 },
  grumsh: { force: 1, honest: 1, wild: 1, deceit: -1, bargain: -1 },
  zizzy: { force: 1, greed: 1, arcane: 1, ruthless: 1, mercy: -1, law: -1 },
  vexrath: { law: 1, honest: 1, pious: 1, deceit: -1, bargain: -1, greed: -1, ruthless: -1 },
  nettle: { deceit: 1, greed: 1, bargain: 1, mercy: 1, law: -1 },
  liora: { mercy: 1, wild: 1, honest: 1, pious: 1, ruthless: -1, bargain: -1, greed: -1, force: -1 },
};

const A = 'approve', O = 'object', J = 'joke';
/** Reaction events, keyed by the tabletop scene a choice leads to (or a story.* key). tones: what the choice was. lines: companion -> [mood, text]. */
export const EVENTS = {
  'g.venge': { tones: ['ruthless'], lines: {
    pip: [A, 'Garrick Vane. Dead. Three years I waited for that sound, and it is smaller than I thought.'],
    liora: [O, 'That was not justice. That was a grave dug in anger, and I will not forget it.'],
    brambur: [O, 'Oh dear. He was begging, wasn\'t he? I\'m not judging. Much. Sorry.'],
    grumsh: [A, 'Some debts are paid only in blood. I do not like it. I understand it.'] } },
  'g.snap': { tones: ['ruthless'], lines: {
    pip: [J, 'You said stop. I heard you. I simply chose not to listen. Old habit.'],
    liora: [O, 'You told him to stop, and he did not. Remember who leads this road.'],
    fizzwick: [J, 'Fizzwick observes that the chain of command has been, shall we say, creatively interpreted.'],
    vexrath: [O, 'An order defied, and a man dead. I shall be writing a very long report.'] } },
  'g.mercy': { tones: ['mercy'], lines: {
    pip: [A, 'I wanted him dead. I still do. But Posy is alive, so... fine. Thank you.'],
    liora: [A, 'You chose the harder road. That takes more courage than any blade.'],
    brambur: [A, 'Oh, bless you. Bless you twice. I was going to cry, and now I can.'],
    zizzy: [J, 'No explosion? Not even a little one? Zizzy is disappointed in a very kind way.'] } },
  'led.law': { tones: ['law'], lines: {
    vexrath: [A, 'The Watch takes the thief, the town keeps its peace. Order, restored. Splendid.'],
    nettle: [O, 'Handed him straight to the Watch? Dull. I would have struck a better bargain.'],
    pip: [J, 'Turning a man in. Respectable. Boring, but respectable.'],
    brambur: [A, 'That seems fair. I think. I hope. Is it fair? It feels fair.'] } },
  'led.deal': { tones: ['mercy', 'bargain'], lines: {
    nettle: [A, 'A forger repaying a debt with honest toil. Now that is a good yarn.'],
    brambur: [A, 'Second chances! Mother Pellwen would be so pleased. I am so pleased.'],
    vexrath: [O, 'A criminal walks on a promise. The law frowns, and so do I.'],
    liora: [A, 'He will do right by her. I could see it in his face.'] } },
  'led.run': { tones: ['mercy'], lines: {
    pip: [J, 'He ran. Smart man. I would have run too.'],
    vexrath: [O, 'A criminal at large, and we watched him go. Disappointing.'],
    nettle: [A, 'Never corner a man with nothing left to lose. Wisdom, that.'],
    fizzwick: [J, 'Fizzwick predicted the escape. Fizzwick simply did not mention it.'] } },
  'led.squeeze': { tones: ['greed'], lines: {
    pip: [A, 'Hush money. Now that is a language I speak.'],
    zizzy: [A, 'Gold for nothing! Zizzy loves it. Spend it on gunpowder!'],
    liora: [O, 'We squeezed a frightened man for coin. I do not like who that makes us.'],
    brambur: [O, 'Oh no. Oh, that is a bit mean. Sorry. I am only saying.'] } },
  'choir.p.free': { tones: ['pious', 'mercy'], lines: {
    brambur: [A, 'They are free. Oh, they are free! I am crying. Sorry. Not sorry.'],
    liora: [A, 'Let them go home. That is the only right ending to a song like that.'],
    grumsh: [A, 'A good verse. The kind that ends with a door opening.'],
    fizzwick: [J, 'Fizzwick contributed morally and acoustically. Mostly morally.'] } },
  'choir.p.bind': { tones: ['bargain', 'arcane'], lines: {
    fizzwick: [A, 'Binding the Choir. Elegant. Terrifying. Fizzwick approves, privately.'],
    brambur: [O, 'Oh, but they were people. They were someone\'s sisters. I am so sorry.'],
    liora: [O, 'You chained a sorrow to your belt. I hope it does not sing to you at night.'],
    nettle: [J, 'A bound choir. Now that is a tale worth drinking to, and a debt worth avoiding.'] } },
  'glass.k.shatter': { tones: ['force'], lines: {
    zizzy: [A, 'Smash! Zizzy loves it when a plan is also a hammer.'],
    fizzwick: [O, 'A masterwork of the optical arts, destroyed. Fizzwick will weep. Briefly.'],
    grumsh: [A, 'Some things should not see us. Good riddance.'],
    pip: [J, 'Seven years bad luck. Fine. I was already on a streak.'] } },
  'glass.k.gaze': { tones: ['arcane'], lines: {
    fizzwick: [A, 'Fizzwick gazed into the Sovereign\'s own glass and lived! Do write that down.'],
    liora: [O, 'You looked, knowing he would see you. That was brave. And foolish.'],
    brambur: [O, 'It saw us! It saw all of us! I will light a candle. Several candles.'],
    pip: [A, 'Knowledge is a weapon. I like a weapon. I just wish it did not look back.'] } },
  'crane.v.truth': { tones: ['honest'], lines: {
    vexrath: [A, 'The truth, however bitter, is the only honourable coin. Well spoken.'],
    liora: [A, 'He deserved to know. So did his men. Thank you for telling him.'],
    grumsh: [A, 'The dead are owed the truth. Few remember that.'],
    pip: [J, 'Honest with a ghost. Bold. I would have lied and slept fine.'] } },
  'crane.v.lie': { tones: ['deceit', 'mercy'], lines: {
    pip: [A, 'A kind lie. Best sort there is. He rests, and nobody gets hurt.'],
    nettle: [A, 'Ah, a fine fib told for a good cause. I could not have done it better.'],
    vexrath: [O, 'You lied to a Warden of the Crown. I will pretend I was elsewhere.'],
    liora: [J, 'A kind lie. I do not love it. But I saw his face, so I will not argue.'] } },
  'orch.g.restore': { tones: ['wild', 'arcane'], lines: {
    liora: [A, 'Listen. The trees are singing again. You woke them gently, and they know it.'],
    fizzwick: [A, 'The old rite, correctly performed. Fizzwick is pleased. Mostly with himself.'],
    brambur: [A, 'It worked! The roots are glowing! Sorry, trees. Well done, trees.'],
    grumsh: [A, 'A quiet door, opened quietly. I like that.'] } },
  'orch.g.broken': { tones: ['force'], lines: {
    zizzy: [A, 'We kicked the door! Zizzy approves! Subtlety is for people who cannot blow things up!'],
    grumsh: [J, 'Open, but crooked. Like most things I have forced.'],
    liora: [O, 'You broke an elven gate. It will remember that, and so will I.'],
    brambur: [O, 'Oh, the poor gate. It was so old. Sorry, sorry, sorry.'] } },
  'orch.g.bought': { tones: ['bargain'], lines: {
    nettle: [A, 'Using the cult\'s own key! Poetic. I would have charged admission.'],
    pip: [A, 'Stolen key, stolen door. I am beginning to like you.'],
    vexrath: [O, 'We opened sacred ground with a cultist\'s key. I have concerns.'],
    liora: [O, 'The gate opened, and a seal broke. That was not worth it.'] } },
  'orch.h.tend': { tones: ['wild', 'mercy'], lines: {
    liora: [A, 'You healed the Heartroot without asking for anything. That is rare.'],
    brambur: [A, 'The roots are drinking! Oh, that is lovely. Well done, truly.'],
    grumsh: [A, 'A garden saved. Not every poem ends so well.'],
    zizzy: [J, 'You cleaned a tree. Zizzy would have burned the weeds. Zizzy respects your way, though.'] } },
  'orch.h.boon': { tones: ['honest', 'pious'], lines: {
    liora: [A, 'The Heartroot trusts you. I have not seen that in years.'],
    nettle: [A, 'You asked it nicely and it gave you fruit. Best negotiation I have ever seen.'],
    brambur: [A, 'It gave us a gift! Mother Pellwen is showing off.'],
    fizzwick: [J, 'Fizzwick notes that politeness is, apparently, a spell.'] } },
  'orch.h.graft': { tones: ['greed'], lines: {
    pip: [A, 'One graft, one fortune. Do not look at me like that. It is a good trade.'],
    nettle: [J, 'Cut a branch from a sacred tree and sold the splinters. Is it wrong that I admire it?'],
    liora: [O, 'The trees groaned when you cut it. I heard them. You did too.'],
    brambur: [O, 'Oh no. Oh, the poor tree. Sorry. I am so sorry.'] } },
  'story.vow': { tones: ['honest', 'mercy'], lines: {
    liora: [A, 'Home. Yes. That is the only word that matters, and you said it first.'],
    brambur: [A, 'I will help. I will carry the bandages. Let us bring her home.'],
    pip: [J, 'Bring her home. Lovely. Someone should bring Posy home as well.'],
    vexrath: [A, 'A vow properly sworn is binding. I shall hold you to it.'] } },
  'story.grim': { tones: ['ruthless', 'force'], lines: {
    grumsh: [A, 'Malthrax will kneel. The tower will know it. I will write the verse.'],
    zizzy: [A, 'Kneel! He will kneel! Zizzy will bring the powder!'],
    brambur: [O, 'Kneeling is a strong word. Could we maybe... ask him to sit?'],
    liora: [J, 'Bold words. Let us make sure you can pay for them.'] } },
  'story.collapse': { tones: ['force', 'ruthless'], lines: {
    zizzy: [A, 'Controlled demolition! Zizzy is so proud of you.'],
    brambur: [O, 'The cultists! Under the... oh. Sorry, cultists.'],
    pip: [A, 'Why fight them when the ceiling will do it for free?'],
    vexrath: [J, 'A tidy solution. Structurally unsound, morally grey. Efficient.'] } },
};

/** One bonus line each, the first time a companion warms to you (approval 4) and the first time they cool (approval minus 3). */
export const WARM_AT = 4, COLD_AT = -3;
export const BONUS = {
  warm: {
    brambur: 'You know, I think I stopped being afraid of you somewhere around the last door. Thank you.',
    fizzwick: 'Fizzwick has decided you are almost as clever as Fizzwick. This is the highest honour he bestows.',
    pip: 'I do not trust people. I trust you a little. Do not make me regret it.',
    grumsh: 'I will put your name in a verse. A good one. The kind that survives the tower.',
    zizzy: 'You are my favourite party member! The explosions are only second favourite!',
    vexrath: 'My clan would have called you worthy. I have decided to agree with them.',
    nettle: 'In all my tall tales, the hero had a face like yours. Remarkable coincidence, that.',
    liora: 'My father would have liked you. I think that is the best thing I can say.',
  },
  cold: {
    brambur: 'I do not like how quiet I have become around you. Sorry. I just wanted you to know.',
    fizzwick: 'Fizzwick is composing a strongly worded footnote about your recent decisions.',
    pip: 'You keep making choices I cannot forgive. I am still here. Do not push it.',
    grumsh: 'The verse I am writing about you is a short one, and it ends badly.',
    zizzy: 'This is not as fun as it used to be. Just saying.',
    vexrath: 'I follow you because I swore to. Do not mistake that for approval.',
    nettle: 'I have sailed with villains who made me feel better about myself than you do.',
    liora: 'I will keep walking beside you. But I will be watching what you do.',
  },
};

const ensure = (s) => (s.approval ||= {});
export const approval = (s, k) => ensure(s)[k] | 0;
export function approvalLabel(n) { return n >= 6 ? 'Devoted' : n >= WARM_AT ? 'Fond' : n >= 1 ? 'Friendly' : n >= 0 ? 'Neutral' : n > COLD_AT ? 'Wary' : 'Cold'; }
export const approvalIcon = (n) => (n >= 6 ? '💖' : n >= WARM_AT ? '😊' : n >= 1 ? '🙂' : n >= 0 ? '😐' : n > COLD_AT ? '😒' : '😠');
export function addApproval(s, k, n) { const p = ensure(s); p[k] = Math.max(APPROVAL_MIN, Math.min(APPROVAL_MAX, (p[k] | 0) + n)); return p[k]; }
const present = (s) => (s.party || []).filter((c) => c.companion && COMP_KEYS.includes(c.companion) && !c.dead && c.hp > 0).map((c) => c.companion);
export const isEvent = (id) => !!EVENTS[id];

/** Silent approval from tone alone (a companion with no spoken line on this event). */
function leanDelta(k, tones) { const t = tones.reduce((a, x) => a + (LEAN[k]?.[x] || 0), 0); return t > 0 ? 1 : t < 0 ? -1 : 0; }

/**
 * React to a choice. Returns { lines, fx }: spoken lines ({ who, text, react, delta }) for the companions present who have something to say,
 * and short approval notes for the dialogue. Each event reacts once per save; approval moves by at most one point per companion per event.
 */
export function react(s, id) {
  const E = EVENTS[id]; const out = { lines: [], fx: [] };
  if (!E) return out;
  const seen = (s.seen ||= {}); if (seen['rx:' + id]) return out;
  seen['rx:' + id] = 1;
  for (const k of present(s)) {
    const row = E.lines[k]; const mood = row ? (row[0] === A ? 'approve' : row[0] === O ? 'object' : 'joke') : null;
    const d = mood ? MOOD_DELTA[mood] : leanDelta(k, E.tones || []);
    const before = approval(s, k); const now = d ? addApproval(s, k, d) : before;
    if (row) out.lines.push({ who: k, text: row[1], react: mood, delta: now - before });
    if (now !== before) out.fx.push({ t: `${SHORT[k]} ${now > before ? 'approves' : 'disapproves'}  ${approvalIcon(now)} ${approvalLabel(now)}`, cls: now > before ? 'good' : 'bad' });
    const warm = before < WARM_AT && now >= WARM_AT, cold = before > COLD_AT && now <= COLD_AT;
    if ((warm || cold) && !seen[`bonus:${k}:${warm ? 'warm' : 'cold'}`]) { seen[`bonus:${k}:${warm ? 'warm' : 'cold'}`] = 1; out.lines.push({ who: k, text: BONUS[warm ? 'warm' : 'cold'][k], react: warm ? 'approve' : 'object', bonus: true, delta: 0 }); }
  }
  return out;
}
/** The same reactions as spoken-bubble objects for the dungeon view's banter (prologue vow and the like): { who, color, text, personal }. */
export function bubbles(s, id, colorOf) {
  const r = react(s, id); return { fx: r.fx, say: r.lines.map((l) => ({ who: SHORT[l.who], color: colorOf?.(l.who), text: l.text, personal: true })) };
}
/** Every spoken line the game can say, for the voice catalogue: [companion, text, key]. */
export function allLines() {
  const out = [];
  for (const [id, E] of Object.entries(EVENTS)) for (const [k, row] of Object.entries(E.lines)) out.push([k, row[1], id]);
  for (const kind of ['warm', 'cold']) for (const [k, t] of Object.entries(BONUS[kind])) out.push([k, t, 'bonus.' + kind]);
  return out;
}
