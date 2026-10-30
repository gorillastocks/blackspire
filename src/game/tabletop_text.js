// Phase F: tabletop quests. Pure data (no imports) so the voice catalog, the tests and the sim can all read it.
// A scene is { title?, lines: [[who, text, cond?], ...], fx?, choices?: [...], choicesFrom?, end? }.
//   cond on a line: 'pip' (Pip is in the party), '!pip', 'f:flag', '!f:flag'.
// A choice is { id, label, go | check: { skill, dc, pass, fail, adv?, dcAdj? }, if?, ifNot?, end?, auto? }.
//   if / ifNot: a flag name, or 'n>=2:flagA,flagB,flagC' (at least 2 of those flags are set).
//   check.adv: a flag that grants advantage; check.dcAdj: { flag: delta }.
// fx (applied once, when the scene is shown): gold, xp, item, hurt, bless, curse, aff, flag, moon, prog, stage, q, journal, consume, time ('night' skips ahead to moonrise).
// World flags, refreshed every scene: w_night, w_day, w_rain, w_mist, w_night_rain, w_night_mist (hour of day and the Orchard's weather). Use them in cond, adv and dcAdj.
// The narrator is the Dungeon Master. Voiced text never contains dashes between words.

export const TT_QUESTS = {
  debt: { title: 'A Debt in Lantern Light', giver: 'pip', floor: 'Every floor', need: 3, desc: 'Pip\'s old partner, Garrick Vane, sold the Lantern Row Crew to the cult. Follow the Lantern Row marks down the floors; three clues will do. Then the Seneschal\'s door on B5.', reward: 'Vengeance or mercy, your call. Pip remembers either way.' },
  ledger: { title: "The Pawnbroker's Ledger", giver: 'odalys', floor: 'Emberhollow', desc: 'Someone is forging Odalys Fenn\'s name on pawn tickets for stolen cult silver. Find the forger.', reward: 'Gold and a favour. What you do with the forger is up to you.', stages: { leads: 'Look into the forged tickets, the grave dirt and the back alley, then name the forger.' } },
  choir: { title: 'The Drowned Choir', giver: 'harl', floor: 'B2', desc: 'Harl Tollow\'s wife and her choir went down to the grotto shrine and never came back. Find out what happened.', reward: 'A fisherman\'s thanks, or his grief.', stages: { asked: 'Find the Sunken Chapel on B2.', chapel: 'Look for the Black Pool on B2. The Sisters are singing there.', freed: 'The Sisters are free. Tell Harl Tollow.', bound: 'The Sisters are bound to your will. Tell Harl Tollow.' } },
  glass: { title: "The Glasswright's Mirror", giver: 'ysolde', floor: 'B3', desc: 'Ysolde Verrin ground a scrying mirror for the cult. It is still in the old kiln on B3, and it is watching.', reward: 'Verrin glass, or a glimpse of the Sovereign. Both have a price.', stages: { met: 'Find the old kiln on B3 and decide what to do with the Mirror.', shattered: 'The Mirror is broken. Return to Ysolde Verrin.', gazed: 'You looked into the Mirror. Return to Ysolde Verrin.' } },
  crane: { title: "The Wardens' Last Roll", giver: 'crane', floor: 'B4, B5', desc: 'The ghost of Sergeant Aldous Crane calls the roll of his dead company every night. Three names never answer.', reward: 'A Watch signet, a ghost at your side, or a sergeant laid to rest.', stages: { seek: 'Search the Fourth Company barracks on B5 for the three missing tags, then answer the Sergeant.' } },
  orchard: { title: 'The Sunken Orchard', giver: 'maelis', floor: 'B3', desc: 'Maelis Dewbough, keeper of the Sunken Orchard, wants to know what is killing her silver trees and why the old elven gate will not wake. Read the trees, the open sky and the gate.', reward: 'The Dewbough Wreath, Silverfruit and a blooming orchard, or a heartwood staff and a cold shoulder.', stages: { asked: 'Read the trees, the open sky and the Gate of the Silver Court on B3. The orchard changes with the hour and the weather.', restored: 'The gate is awake. Go down to the Heartroot below it.', broken: 'The gate is open, crooked. Go down to the Heartroot below it.', bought: 'The gate is open, and the cult knows. Go down to the Heartroot below it.', heart: 'Tell Maelis Dewbough what the Heartroot said.' } },
};

export const TT_SCENES = {
  /* ================= Pip: A Debt in Lantern Light ================= */
  'pip.1': { title: 'Chalk on the Wall', lines: [
    ['narrator', 'Behind a heap of gnawed barrels, someone has chalked a lantern with four rays on the stone. The chalk is old. The dust around it is not.'],
    ['pip', 'Don\'t touch that. That is the Lantern Row mark. My crew\'s. We left it wherever it was safe to leave things.', 'pip'],
    ['narrator', 'A halfling thieves\' mark, the kind guild runners leave to say a place is safe. Someone down here knew the code.', '!pip'],
  ], choices: [{ id: 'search', label: '🔎 Search behind the mark', check: { skill: 'investigation', dc: 11, pass: 'pip.1.pass', fail: 'pip.1.fail' }, auto: true }] },
  'pip.1.pass': { lines: [
    ['narrator', 'A loose stone. Behind it, a folded cult payment slip. Forty sovereigns, paid to G. Vane, for the Row.'],
    ['pip', 'G. Vane. Garrick Vane. He crosses his sevens like a man signing a death warrant. Three years I have wondered who sold us. Now I have a name, and a handwriting. Thank you for not making it a speech.', 'pip'],
    ['narrator', 'Somebody named G. Vane was paid forty sovereigns for something called the Row. Whatever that is, it sounds like a sale.', '!pip'],
  ], fx: { prog: 'debt', stage: ['debt', 'active'], flag: 'debt_name', xp: 80, consume: true, journal: 'A Lantern Row mark on B1 hid a cult payment slip: forty sovereigns to G. Vane, for the Row.' }, end: true },
  'pip.1.fail': { lines: [
    ['narrator', 'You find a stone that moves, and a slip of paper that dissolves at a touch. Three words survive: paid to G. Vane.'],
    ['pip', 'Garrick. Of course it is Garrick. He always bought cheap paper. It is the one thing I would have trusted him on.', 'pip'],
  ], fx: { prog: 'debt', stage: ['debt', 'active'], flag: 'debt_name', xp: 30, consume: true, journal: 'A Lantern Row mark on B1: a ruined slip that said "paid to G. Vane".' }, end: true },

  'pip.2': { title: 'A Rowboat Named Posy', lines: [
    ['narrator', 'Half sunk in the shallows lies a child\'s rowboat, painted with the lantern mark. The name on the stern is nearly gone: P, O, S, Y.'],
    ['pip', 'That is her boat. I painted it. Badly. She said it looked like a pudding. She named it herself, at seven years old, and she had opinions.', 'pip'],
    ['narrator', 'A child\'s boat, painted with a thief\'s mark and a girl\'s name. Somebody small once loved it.', '!pip'],
  ], choices: [{ id: 'tracks', label: '🥾 Search the shore for tracks', check: { skill: 'survival', dc: 12, pass: 'pip.2.pass', fail: 'pip.2.fail' }, auto: true }] },
  'pip.2.pass': { lines: [
    ['narrator', 'Boot prints, deep, from a robed figure carrying something small. They lead to a landing, and a ledger page stuck in the mud: tithe received, one halfling girl, unharmed, for the Seneschal\'s own.'],
    ['pip', 'Unharmed. Alive. She was alive. Excuse me. Something in my eye. The dungeon is very dusty.', 'pip'],
    ['narrator', 'A tithe slip. One halfling girl, unharmed, for the Seneschal\'s own. The cult took a living child.', '!pip'],
  ], fx: { prog: 'debt', stage: ['debt', 'active'], flag: 'debt_posy', xp: 100, consume: true, journal: 'A rowboat named Posy on B2, and a tithe slip: one halfling girl, unharmed, for the Seneschal\'s own.' }, end: true },
  'pip.2.fail': { lines: [
    ['narrator', 'The mud has swallowed whatever there was to find. You manage only a scrap of blue ribbon, caught on the oar.'],
    ['pip', 'She wore one just like it. Either they took her, or she lost it. I would like to believe the first. It is the better story.', 'pip'],
  ], fx: { prog: 'debt', stage: ['debt', 'active'], xp: 40, consume: true, journal: 'A rowboat named Posy on B2, and a scrap of blue ribbon.' }, end: true },

  'pip.3': { title: 'The Crystal Tithe', lines: [
    ['narrator', 'A wall of green crystal, scratched with a cult cipher. A column of names and numbers. One line is underlined twice.'],
    ['pip', 'That is a tithe ledger. Names and prices. I know this hand. I would know it in the dark.', 'pip'],
  ], choices: [{ id: 'cipher', label: '📖 Read the cipher', check: { skill: 'arcana', dc: 13, pass: 'pip.3.pass', fail: 'pip.3.fail' }, auto: true }] },
  'pip.3.pass': { lines: [
    ['narrator', 'The cipher unravels. Seneschal of Keys, Garrick Vane, keeper of every door in the vault. And below it: Posy T., held in the servants\' ward, to be returned when the Row is quiet.'],
    ['pip', 'Seneschal. A title and a ring of keys, for eleven of us. And he kept her. Three years he has kept her, to make sure I stayed quiet.', 'pip'],
  ], fx: { prog: 'debt', stage: ['debt', 'active'], flag: 'debt_title', xp: 120, consume: true, journal: 'B3 tithe ledger: Garrick Vane is the Seneschal of Keys. Posy T. is held in the servants\' ward.' }, end: true },
  'pip.3.fail': { lines: [
    ['narrator', 'The cipher fights you. You catch a title, Seneschal, and a name, Vane, before the rest swims away.'],
    ['pip', 'Seneschal. Fancy. I would have given him a better title. Several.', 'pip'],
  ], fx: { prog: 'debt', stage: ['debt', 'active'], flag: 'debt_title', xp: 50, consume: true, journal: 'B3 tithe ledger: Garrick Vane is some kind of Seneschal.' }, end: true },

  'pip.4': { title: 'The Key in the Forge', lines: [
    ['narrator', 'At a cold forge, a Lantern Row key lies half finished in a clay mould, beside a note on cult stationery. Hurry the keys. The Sovereign\'s patience is thin, and so is mine. G.V.'],
    ['pip', 'A master key, Lantern Row pattern. He is having them copied. He is making himself a way out. Coward.', 'pip'],
  ], choices: [{ id: 'cast', label: '🪙 Take a wax cast of the key', check: { skill: 'sleightOfHand', dc: 14, pass: 'pip.4.pass', fail: 'pip.4.fail' }, auto: true }] },
  'pip.4.pass': { lines: [
    ['narrator', 'Quick fingers, soft wax. When you lift your hand, the cast is perfect, and no one is the wiser. In the bow of the key, a pair of initials.'],
    ['pip', 'G.V. In the bow. He signs his keys. Vain to the end.', 'pip'],
  ], fx: { prog: 'debt', stage: ['debt', 'active'], flag: 'pipKey', xp: 150, consume: true, journal: 'Took a wax cast of Garrick\'s master key in the Ashforge.' }, end: true },
  'pip.4.fail': { lines: [
    ['narrator', 'The wax cracks, the mould shatters, and the key stays where it was. You pocket the note instead.'],
    ['pip', 'Close enough. I know his handwriting. I know his keys. I will know his face when I see it.', 'pip'],
  ], fx: { prog: 'debt', stage: ['debt', 'active'], xp: 60, consume: true, journal: 'Found Garrick\'s note in the Ashforge: hurry the keys.' }, end: true },

  'pip.5': { title: 'The Lantern in the Dark', lines: [
    ['narrator', 'Near the vault stair, a lantern hangs in an alcove, still burning. A Lantern Row lamp. Eleven notches are cut into the iron, one for each of the Crew.'],
    ['pip', 'Eleven notches. One for each of us. He kept them. Garrick keeps everything. Sentimental. It is the worst thing about him.', 'pip'],
    ['narrator', 'Beyond the alcove stands a brass door worked with lanterns. The Seneschal\'s counting room, you think. It will open for anyone who is not afraid of what is behind it.'],
  ], choices: [{ id: 'on', label: '🏮 Press on', go: 'pip.5.end', auto: true }] },
  'pip.5.end': { lines: [['narrator', 'You light the lantern again, and carry the flame to the brass door.']], fx: { prog: 'debt', stage: ['debt', 'confront'], flag: 'debt_door', xp: 100, consume: true, journal: 'Found the Seneschal\'s door on B5. Garrick Vane is behind it.' }, end: true },

  'garrick.nopip': { lines: [['narrator', 'A brass door worked with lantern marks, and a keyhole built for small hands. Some quarrels are not yours to settle alone. Pip belongs here, and Pip is not with you.']], end: true },
  'garrick.locked': { lines: [['narrator', 'A brass door worked with lantern marks. A whole story is written on it, and you have missed the first pages. Look for Lantern Row marks on the floors above.']], end: true },
  'g.0': { title: "The Seneschal's Counting Room", lines: [
    ['narrator', 'Gold light from a brazier. Ledgers stacked to the rafters. A man in a grey coat, with a ring of keys at his belt as long as your arm, writes without looking up.'],
    ['garrick', 'Pip. You are late. I had you down for two winters ago. Do sit. Everyone sits eventually.'],
    ['pip', 'Hello, Garrick. You have gone grey. It suits you. It is the first honest thing you have worn.'],
    ['garrick', 'Come now. It was only business. The Row was never going to survive the Sovereign. I chose the winning side, and sold what was already lost.'],
    ['pip', 'You sold eleven of us. And my sister.'],
    ['narrator', 'Pip\'s hand is on a knife. Garrick\'s hands are open on the desk. Behind you, the door has swung shut on its own. Roll if you want answers, and know the whole table is watching.'],
  ], choices: [
    { id: 'insight', label: '👁 Read him: is he lying about Posy?', check: { skill: 'insight', dc: 13, pass: 'g.truth', fail: 'g.lie' }, ifNot: 'g_asked', auto: true },
    { id: 'key', label: '🗝 Set the wax cast of his key on the desk', go: 'g.key', if: 'pipKey' },
    { id: 'choose', label: '⚖ No more talk. Decide his fate', go: 'g.choice' }] },
  'g.truth': { lines: [
    ['narrator', 'You watch his hands, not his face. A tremor in his left thumb, the thing he always did when he would rather not say. He is not lying about the fire. He is lying by leaving something out.'],
    ['garrick', 'She is not in the ash, Pip. I did that much. I did that much, and you may hate me for the rest.'],
  ], fx: { flag: ['g_asked', 'g_posyalive'] }, next: 'g.choice' },
  'g.lie': { lines: [
    ['narrator', 'He is very good. Every line lands calm, every pause is rehearsed. Whatever lies beneath it, you cannot find it.'],
    ['garrick', 'She burned with the others. I am sorry. I think of her every day. I think of her often.'],
    ['narrator', 'Pip\'s jaw tightens. She believes it, and perhaps you should too.'],
  ], fx: { flag: 'g_asked' }, next: 'g.choice' },
  'g.key': { lines: [
    ['narrator', 'You set the cast down: a Lantern Row key, newly forged, with Garrick\'s own initials in the bow. He looks at it the way a man looks at his own gravestone.'],
    ['garrick', 'Well. You have been thorough. Very well. She is not dead. I hid her before the fire. I was never a good man, Pip. I was a careful one.'],
  ], fx: { flag: ['g_asked', 'g_posyalive'] }, next: 'g.choice' },
  'g.choice': { lines: [
    ['narrator', 'There are no more questions. The guards are gone, the keys lie on the desk, and a knife is in Pip\'s hand. Everyone at the table is looking at you.'],
    ['pip', 'It is your call. It was always going to be your call. I just want you to know I have already made up my mind.'],
    ['narrator', 'Vengeance or mercy. There is no die for this one.'],
  ], choices: [
    { id: 'venge', label: '🗡 Vengeance: let Pip finish it', go: 'g.venge' },
    { id: 'mercy', label: '🕊 Mercy: take Garrick alive', check: { skill: 'persuasion', dc: 13, dcAdj: { g_posyalive: -3 }, pass: 'g.mercy', fail: 'g.snap' }, auto: true }] },
  'g.venge': { lines: [
    ['narrator', 'You nod, and say nothing. Pip does not say a word either. It is quick, and cleaner than Garrick deserved.'],
    ['garrick', 'Pip. She is...'],
    ['narrator', 'He does not finish the sentence. The keys hit the floor, and the whole ring rings like a bell.'],
    ['pip', 'That is it? Three years. That is all there was?'],
    ['narrator', 'Garrick said Posy was alive, and the only man who knew where is on the floor. The strongbox holds three hundred gold, a ledger of every name the Row ever sold, and a plain dagger forged from a Lantern Row lamp.', 'f:g_posyalive'],
    ['pip', 'He took her with him. Of course he did. I will find her. It will just take longer.', 'f:g_posyalive'],
    ['narrator', 'The strongbox holds three hundred gold, a ledger of every name the Row ever sold, and a plain dagger forged from a Lantern Row lamp.', '!f:g_posyalive'],
    ['pip', 'Keep the gold. I will take the dagger, and the ledger. Someone should remember their names.', '!f:g_posyalive'],
  ], fx: { gold: 300, item: 'lanternEdge', xp: 500, flag: ['pipVengeance', 'debt_done'], aff: { pip: 1 }, q: ['debt', 'done'], consume: true, journal: 'Garrick Vane is dead. Pip has vengeance, and the Lantern Edge.' }, end: true },
  'g.snap': { lines: [
    ['narrator', 'You say stop. Pip hears you, and does not stop. It is quick, and nobody in the room says a word afterwards.'],
    ['pip', 'I heard you. I am sorry. I could not do it your way.'],
  ], fx: { gold: 300, item: 'lanternEdge', xp: 400, flag: ['pipVengeance', 'pipSnapped', 'debt_done'], aff: { pip: -1 }, q: ['debt', 'done'], consume: true, journal: 'Garrick Vane is dead. I told Pip to stop. She did not.' }, end: true },
  'g.mercy': { lines: [
    ['narrator', 'Put it down, you say, and for a long moment, nothing. Then the knife trembles, and drops point first into the desk, quivering.'],
    ['pip', 'Fine. Fine! I hate this. I am letting him live because you asked, not because he deserves it.'],
    ['garrick', 'Posy is alive. She is in Emberhollow, a lamplighter\'s apprentice on Cant Street, under the name Pell. And here is something you do not know. The Sovereign\'s staff has a crack beneath the third ring. Strike there, and the whole thing shatters.'],
    ['narrator', 'Garrick goes in chains. Pip does not look at him once. The whole way back up the stair, Pip does not say a word.'],
  ], fx: { gold: 120, item: 'posyRibbon', xp: 500, flag: ['pipMercy', 'weakPoint', 'debt_done'], aff: { pip: 2 }, q: ['debt', 'done'], consume: true, journal: 'Spared Garrick Vane. Posy is alive on Cant Street, and the staff breaks beneath the third ring.' }, end: true },

  /* ================= Town: The Pawnbroker's Ledger ================= */
  'led.0': { title: "The Pawnbroker's Ledger", lines: [
    ['narrator', 'Fenn and Daughters, Pawnbrokers, sits crooked between the smithy and the temple. The shutters are closed at noon, which is unheard of. A bell jangles as you enter.'],
    ['odalys', 'Shut the door. Quickly. Someone is selling cult silver in Emberhollow, temple candlesticks with the Blackspire sigil filed off, and every pawn ticket bears my name. I never wrote them.'],
    ['odalys', 'Captain Rowan will see a cult fence, not a victim, if he sees those tickets before I clear this. Find who is forging my hand, and I will make it worth your while.'],
  ], choices: [
    { id: 'ask', label: '❓ Ask why she will not go to the Captain', go: 'led.ask' },
    { id: 'accept', label: '📜 Take the case', go: 'led.ok', auto: true },
    { id: 'later', label: 'Not now', end: true }] },
  'led.ask': { lines: [['odalys', 'Because Rowan would hang the nearest thief and call it justice. I have pawned since I was fourteen. I know how magistrates think.']], choicesFrom: 'led.0' },
  'led.ok': { lines: [['narrator', 'Odalys slides three things across the counter: a forged ticket, a smear of grave dirt on a handkerchief, and a candle stub that smells of lilies. Where you start is up to you.']], fx: { stage: ['ledger', 'leads'], q: ['ledger', 'active'] }, choicesFrom: 'led.hub' },
  'led.hub': { title: 'Where do you look?', lines: [['narrator', 'Three threads, one forger. Pull them in any order. Roll well, and the town starts to talk.']], choices: [
    { id: 'ticket', label: '🔎 Examine the forged tickets', check: { skill: 'investigation', dc: 12, pass: 'led.ticket.pass', fail: 'led.ticket.fail' }, ifNot: 'led_t1', auto: true },
    { id: 'watch', label: '🗣 Question the night watch about the grave dirt', check: { skill: 'persuasion', dc: 13, pass: 'led.watch.pass', fail: 'led.watch.fail' }, ifNot: 'led_t2', auto: true },
    { id: 'alley', label: '🌘 Stake out the pawnshop\'s back alley', check: { skill: 'stealth', dc: 13, pass: 'led.alley.pass', fail: 'led.alley.fail' }, ifNot: 'led_t3', auto: true },
    { id: 'accuse', label: '👉 Name the forger', go: 'led.accuse', if: 'n>=2:led_t1,led_t2,led_t3' }] },
  'led.ticket.pass': { lines: [['narrator', 'The ink is Odalys\'s, but the loops are wrong. The forger is left handed and smudged every final letter. The paper smells faintly of lilies and damp earth.']], fx: { flag: ['led_t1', 'led_c1'], xp: 40 }, choicesFrom: 'led.hub' },
  'led.ticket.fail': { lines: [['narrator', 'You squint until the loops swim. A forgery, certainly, but the ink gives nothing else away. Odalys wrings her hands.']], fx: { flag: 'led_t1' }, choicesFrom: 'led.hub' },
  'led.watch.pass': { lines: [['narrator', 'The night watchman eyes your coin, then your face, then talks. A stooped figure with a spade and a lantern has crossed Cant Street after the third bell, three nights running, always toward the pawnshop.']], fx: { flag: ['led_t2', 'led_c2'], xp: 40 }, choicesFrom: 'led.hub' },
  'led.watch.fail': { lines: [['narrator', 'The watchman clams up. Questions about grave dirt make him nervous, and he suggests you take them elsewhere. A round of drinks might have helped. It costs you ten gold anyway.']], fx: { flag: 'led_t2', gold: -10 }, choicesFrom: 'led.hub' },
  'led.alley.pass': { lines: [['narrator', 'Crouched behind a rain barrel, you wait. After the bell, a stooped man with a spade slips a candlestick through the pawnshop\'s coal hatch, whistling a hymn off key. Dirt crumbles from his boots. He never sees you.']], fx: { flag: ['led_t3', 'led_c3'], xp: 40 }, choicesFrom: 'led.hub' },
  'led.alley.fail': { lines: [['narrator', 'Your knee cracks like a dry twig. A shape in the alley freezes, then bolts, leaving behind the smell of lilies and nothing more.']], fx: { flag: 'led_t3' }, choicesFrom: 'led.hub' },
  'led.accuse': { title: 'The accusation', lines: [['narrator', 'Odalys has found her nerve, and a lantern. Everyone in the shop is waiting for a name. Three people could have done this. Choose carefully, and know that a wrong name costs her dearly.']], choices: [
    { id: 'tuck', label: '⚰ Tuck Harrow, the gravedigger', go: 'led.tuck', if: 'n>=2:led_c1,led_c2,led_c3', auto: true },
    { id: 'tuckblind', label: '⚰ Tuck Harrow, the gravedigger (no real proof)', check: { skill: 'insight', dc: 14, pass: 'led.tuck', fail: 'led.wrong' }, ifNot: 'n>=2:led_c1,led_c2,led_c3' },
    { id: 'sexton', label: '⛪ Sexton Vossel, from the temple', go: 'led.wrong' },
    { id: 'nell', label: '🕯 Nell the candlemaker', go: 'led.wrong' }] },
  'led.wrong': { lines: [['narrator', 'Your suspect proves their innocence quickly, loudly, and in front of witnesses. Odalys apologises to everyone and pays for the trouble. It stings her purse, and her pride.']], fx: { gold: -40 }, choicesFrom: 'led.hub' },
  'led.tuck': { title: 'Dusk in the Churchyard', lines: [
    ['narrator', 'You find Tuck Harrow in the churchyard at dusk, leaning on his spade, a lantern at his feet. Dirt on his boots. Lilies on his hat.'],
    ['tuck', 'Bit late for a stroll, friends. Looking for someone to bury?'],
    ['narrator', 'You lay the evidence out on a headstone. His smile fades. He sits down hard on a grave.'],
    ['tuck', 'It was the candlesticks. The old spares, sat in the crypt since before the Sovereign. Nobody counts the dead\'s candlesticks. I owe three months rent, and my wife is poorly. I used Mistress Fenn\'s name because it was the only name a pawnbroker would trust. I am sorry. I am so sorry.'],
    ['narrator', 'Odalys, at your elbow, has gone very pale. The choice, and the consequence, are yours.'],
  ], choices: [
    { id: 'law', label: '⚖ Turn him in to Captain Rowan', go: 'led.law' },
    { id: 'deal', label: '🤝 Make him repay Odalys, and let him go', check: { skill: 'persuasion', dc: 12, pass: 'led.deal', fail: 'led.run' }, auto: true },
    { id: 'squeeze', label: '💰 Squeeze him for silence money', check: { skill: 'intimidation', dc: 11, pass: 'led.squeeze', fail: 'led.refuse' } }] },
  'led.law': { lines: [
    ['narrator', 'Captain Rowan\'s men come at dawn. Tuck goes quietly, and the town sleeps easier, though a gravedigger\'s wife weeps on Cant Street all that week.'],
    ['odalys', 'Justice is done. It feels like less than I had hoped. Take the cloak. It was never redeemed.'],
  ], fx: { gold: 150, item: 'fennCloak', xp: 150, flag: 'led_law', q: ['ledger', 'done'], journal: 'Turned Tuck Harrow in to Captain Rowan. Odalys Fenn is cleared.' }, end: true },
  'led.deal': { lines: [
    ['tuck', 'I will dig your garden and sweep your shop, Mistress, for a year and a day. And I will pay back every coin.'],
    ['odalys', 'A year and a day. And you tell no one where you found those candlesticks. I would like the Temple to go on believing that crypt is sealed.'],
    ['narrator', 'The town never learns. Odalys sleeps well, and Tuck\'s wife is soon sitting up in bed, thanks to a physician Odalys quietly pays.'],
  ], fx: { gold: 90, bless: 'fortune', xp: 200, flag: 'led_deal', q: ['ledger', 'done'], journal: 'Let Tuck Harrow repay Odalys Fenn with honest work. The town never knew.' }, end: true },
  'led.run': { lines: [
    ['narrator', 'Tuck bolts over the churchyard wall and is gone before you can blink. Odalys sits among the graves and laughs, a short, tired laugh.'],
    ['odalys', 'Well. The thieving stops, at least. I will cover the tickets myself. Take something for your trouble.'],
  ], fx: { gold: 60, xp: 100, flag: 'led_run', q: ['ledger', 'done'], journal: 'Tuck Harrow ran. Odalys Fenn is cleared, and poorer.' }, end: true },
  'led.squeeze': { lines: [
    ['narrator', 'You name a price for your silence, and Tuck pays it in coin he cannot spare.'],
    ['odalys', 'I did not see that, and I did not hear that, and we will never speak of it. Here. Your half of the quiet.'],
  ], fx: { gold: 260, curse: 'hollow', xp: 60, flag: 'led_squeeze', q: ['ledger', 'done'], journal: 'Squeezed Tuck Harrow for silence money. It left a bad taste.' }, end: true },
  'led.refuse': { lines: [['tuck', 'No. I have buried better folk than you. Go on, tell the Captain. See if he believes a pawnbroker\'s ledger over a gravedigger\'s word.'], ['narrator', 'Odalys is trembling. Tuck is waiting, and so is the night.']], choicesFrom: 'led.tuck' },
  'led.wait': { lines: [['odalys', 'Well? The tickets will not forge themselves, though someone seems determined to try.']], choicesFrom: 'led.hub' },
  'led.done': { lines: [['odalys', 'Fenn and Daughters remembers a kindness. Come back any time. There is always a bargain behind the counter.']], end: true },

  /* ================= B2: The Drowned Choir ================= */
  'choir.0': { title: 'The Drowned Choir', lines: [
    ['narrator', 'Harl Tollow mends nets on the Emberhollow wharf, though no boat has gone out in a month. He does not look up until your shadow falls across the cord.'],
    ['harl', 'You are the ones going down. Aye. My wife Anselma led the Sisters of the Tide, fourteen voices, every dusk at the old shrine in the grotto. The cult came for the shrine. The Sisters went down to sing, and never came up.'],
    ['harl', 'Some nights I hear them through the cellar wall, singing the Evening Hymn, only slower. Find out what happened. Bring me my wife, or bring me the truth. I will take either.'],
  ], choices: [{ id: 'accept', label: '🎣 Promise to find her', go: 'choir.0.ok', auto: true }, { id: 'later', label: 'Not now', end: true }] },
  'choir.0.ok': { lines: [['narrator', 'Harl presses his wife\'s silver brooch into your palm. It is cold as pond water. So you know them, he says, and so they know you.']], fx: { stage: ['choir', 'asked'], q: ['choir', 'active'], journal: 'Harl Tollow asked me to find his wife Anselma and her choir in the Drowned Grotto.' }, end: true },
  'choir.h.wait': { lines: [['harl', 'The tide is still turning. Any word of Anselma?']], end: true },
  'choir.h.free': { lines: [
    ['harl', 'She is free? Truly free? Then I will sleep tonight. It is not much, but it is hers: Anselma\'s mantle, and every coin I could scrape. She would say you should have a hot meal.'],
    ['narrator', 'He weeps without embarrassment, and hums a few bars of the Evening Hymn, badly.'],
  ], fx: { gold: 150, item: 'choirMantle', xp: 150, q: ['choir', 'done'], journal: 'Harl Tollow sleeps easy. The Sisters of the Tide are free.' }, end: true },
  'choir.h.bound': { lines: [
    ['narrator', 'Harl hears you out with his hands folded around the net cord. He does not weep. That is worse.'],
    ['harl', 'She is still singing. Still down there. You made a bell of my wife.'],
    ['harl', 'Take your silver and go. I will not say it was wrong. I will not say thank you either.'],
  ], fx: { gold: 40, xp: 80, q: ['choir', 'done'], journal: 'Harl Tollow knows I bound the Sisters of the Tide. He did not thank me.' }, end: true },
  'choir.h.done': { lines: [
    ['harl', 'The nets are full again, and some evenings I sing the hymn myself. Badly. She would laugh.', 'f:choir_free'],
    ['harl', 'I hear her through the cellar wall, still. I do not go down there.', 'f:choir_bound'],
  ], end: true },

  'choir.c1': { title: 'The Sunken Chapel', lines: [
    ['narrator', 'A stair of slick stone leads to a half drowned chapel. Fourteen benches stand in the black water. A hymnal lies open on a lectern, its pages swollen but still legible. Somewhere beneath the floor, a woman is humming.'],
    ['narrator', 'A clever party rolls before it touches anything.'],
  ], choices: [
    { id: 'read', label: '📖 Read the hymnal', check: { skill: 'religion', dc: 12, pass: 'choir.c1.read', fail: 'choir.c1.misread' }, ifNot: 'choir_r', auto: true },
    { id: 'listen', label: '👂 Listen to the humming', check: { skill: 'perception', dc: 13, pass: 'choir.c1.listen', fail: 'choir.c1.deaf' }, ifNot: 'choir_l', auto: true },
    { id: 'wait', label: 'Come back later', end: true, ifNot: 'n>=2:choir_r,choir_l' },
    { id: 'leave', label: 'Leave the chapel', go: 'choir.c1.end', if: 'n>=2:choir_r,choir_l', auto: true }] },
  'choir.c1.read': { lines: [['narrator', 'The last verse is in a different hand, written in haste. Sing me out, if you love me. The deep wants a choir, and we are all the choir it will get. It is a binding rite. Sung backwards, it would also release.']], fx: { flag: ['choir_r', 'choir_hymn'], xp: 60 }, choicesFrom: 'choir.c1' },
  'choir.c1.misread': { lines: [['narrator', 'The ink has run into a blue bruise. You catch a word here and there: sing, deep, hold. Enough to be afraid, not enough to be useful.']], fx: { flag: 'choir_r' }, choicesFrom: 'choir.c1' },
  'choir.c1.listen': { lines: [
    ['narrator', 'The humming does not come from the water. It comes from the lectern\'s brass bell, and when you lean close, a voice speaks from it.'],
    ['anselma', 'Do not let Harl come down. Please. He will wade in after me, and the Pool will keep him too. Tell him I am not afraid. Tell him I lied.'],
  ], fx: { flag: ['choir_l', 'choir_voice'], xp: 60 }, choicesFrom: 'choir.c1' },
  'choir.c1.deaf': { lines: [['narrator', 'The humming slides away from you like a fish. You hear only the water lapping at fourteen empty benches.']], fx: { flag: 'choir_l' }, choicesFrom: 'choir.c1' },
  'choir.c1.end': { lines: [['narrator', 'You close the hymnal gently. Beyond the chapel, a passage slopes down toward cold, black water.']], fx: { stage: ['choir', 'chapel'], q: ['choir', 'active'], consume: true, journal: 'The Sunken Chapel on B2: the Sisters were bound to a drowned bell. The Black Pool is nearby.' }, end: true },
  'choir.p.locked': { lines: [['narrator', 'A black pool, perfectly still, ringed by fourteen stone posts. Something sings beneath it. You decide you are not ready. The chapel might have answers.']], end: true },
  'choir.p.0': { title: 'The Black Pool', lines: [
    ['narrator', 'Fourteen shapes hang in the water below you, robed and swaying. Their mouths open and close in the Evening Hymn. In the middle, tied to a rotted post, a bell as wide as a cartwheel rings without a clapper. A woman\'s face drifts nearest the surface.'],
    ['anselma', 'Harl. Is that Harl? No. Thank the Tide. Listen. The Sisters are bound to the bell. The cult did it to hold the grotto water back from the vault, and we have sung until we forgot we may stop. I cannot stop on my own.'],
    ['narrator', 'You may free them, or you may take the Choir for yourselves. Either way, the bell needs a hand on it, and the water does not like that.'],
  ], choices: [
    { id: 'free', label: '🕊 Free the Sisters: sing the release verse', check: { skill: 'religion', dc: 14, adv: 'choir_hymn', pass: 'choir.p.free', fail: 'choir.p.fail' }, auto: true },
    { id: 'bind', label: '⛓ Bind the Sisters: take the Choir\'s song', check: { skill: 'arcana', dc: 14, adv: 'choir_hymn', pass: 'choir.p.bind', fail: 'choir.p.fail' } },
    { id: 'leave', label: 'Step back and think', end: true }] },
  'choir.p.fail': { lines: [['narrator', 'The water surges and drags at your ankles. Cold bites to the bone. Everyone takes six damage before the Pool lets go.']], fx: { hurt: 6 }, choicesFrom: 'choir.p.0' },
  'choir.p.free': { lines: [
    ['narrator', 'You sing the last verse backwards, one note at a time. The bell rings once, a clean, ordinary sound, and stops. Fourteen lights rise from the water like lanterns, and one of them lingers at your shoulder.'],
    ['anselma', 'Thank you. Tell Harl the brooch is his. Tell him to go fishing.'],
    ['narrator', 'The Pool is only water now. The way is clear.'],
  ], fx: { stage: ['choir', 'freed'], q: ['choir', 'ready'], flag: 'choir_free', xp: 250, consume: true, journal: 'Freed the Sisters of the Tide. Harl Tollow should hear of it.' }, end: true },
  'choir.p.bind': { lines: [
    ['narrator', 'You take up the Choir\'s thread and pull it taut. Fourteen faces turn toward you, empty and obedient. The bell speaks in a voice like cold iron, and it is yours.'],
    ['anselma', 'No. Please. Not like this.'],
    ['narrator', 'She does not stop singing. The Sisters will fight for you, now, wherever there is water to fight in. Whether they would have wished it is another question. The bell\'s iron heart drops into your hands.'],
  ], fx: { stage: ['choir', 'bound'], q: ['choir', 'ready'], flag: 'choir_bound', item: 'tideClapper', bless: 'scholar', curse: 'restless', xp: 250, consume: true, journal: 'Bound the Sisters of the Tide. Harl Tollow should hear of it, if I can face him.' }, end: true },

  /* ================= B3: The Glasswright's Mirror ================= */
  'glass.0': { title: "The Glasswright's Mirror", lines: [
    ['narrator', 'In a seam of green crystal, a woman in a scorched leather apron sits with her knees drawn up and a hammer in her fist. She flinches at your torch, then lowers the hammer an inch.'],
    ['ysolde', 'Do not shine that at me. They bring lights, and then they bring questions. Are you the heroes the cult keeps whispering about? The ones who killed Skarn?'],
  ], choices: [{ id: 'persuade', label: '🤲 Tell her you are here to help', check: { skill: 'persuasion', dc: 11, pass: 'glass.0.open', fail: 'glass.0.wary' }, auto: true }, { id: 'later', label: 'Not now', end: true }] },
  'glass.0.open': { lines: [
    ['ysolde', 'Ysolde Verrin. Third generation, Glimmerdeep Glassworks. The cult took us all for the Sovereign\'s commission: a mirror, tall as a door, to watch whoever came down the stair. I ground the lens. I am so sorry. It is in the old kiln, east of here, and it is looking at you right now.'],
    ['narrator', 'Her eyes flick to the crystal over your shoulder. In it, faint and wrong, your party\'s reflection looks back, one beat late.'],
    ['ysolde', 'Break it, or learn from it. I will not tell you which. A glasswright learns what a mirror costs, and I have paid. Go to the kiln. I will wait here. I am very good at waiting.'],
  ], fx: { stage: ['glass', 'met'], q: ['glass', 'active'], xp: 60, journal: 'Ysolde Verrin ground a scrying mirror for the cult. It stands in the old kiln on B3.' }, end: true },
  'glass.0.wary': { lines: [
    ['narrator', 'She will not believe you, not until you leave a flask of water and twenty gold at her feet. That seems to do it.'],
    ['ysolde', 'Fine. Ysolde Verrin, glasswright. I made the cult a scrying mirror, under duress, and it stands in the old kiln east of here. It watches. Break it or use it. I just want it gone from my sight.'],
  ], fx: { gold: -20, stage: ['glass', 'met'], q: ['glass', 'active'], journal: 'Ysolde Verrin ground a scrying mirror for the cult. It stands in the old kiln on B3.' }, end: true },
  'glass.wait': { lines: [['ysolde', 'Well? The kiln is east. Do not look into it too long. It is rude, and it looks back.']], end: true },
  'glass.k.0': { title: 'The Old Kiln', lines: [
    ['narrator', 'The kiln is a brick cavern, warm for the first time in a week. In the middle stands the Mirror, tall as a door, framed in black iron. The glass shows the room as it will be in an hour: your party, exactly where you stand, and your faces, tired.'],
    ['narrator', 'It wants something from you. Mirrors always do.'],
  ], choices: [
    { id: 'study', label: '🔍 Study the frame', check: { skill: 'arcana', dc: 13, pass: 'glass.k.study', fail: 'glass.k.sting' }, ifNot: 'glass_study', auto: true },
    { id: 'shatter', label: '🔨 Shatter the Mirror', check: { skill: 'athletics', dc: 12, dcAdj: { glass_study: -2 }, pass: 'glass.k.shatter', fail: 'glass.k.bounce' }, auto: true },
    { id: 'gaze', label: '👁 Look into the Mirror', go: 'glass.k.gaze' },
    { id: 'leave', label: 'Step back', end: true }] },
  'glass.k.study': { lines: [['narrator', 'You trace the iron frame with a steady finger. Ten runes, each ending in an eye. It sees what we see, you realise, and reports it to the vault below. Break it and the Sovereign loses an eye. Gaze long enough, and you will see through it. You will also be seen.']], fx: { flag: 'glass_study', xp: 40 }, choicesFrom: 'glass.k.0' },
  'glass.k.sting': { lines: [['narrator', 'Your reflection grabs your wrist, cold as a river stone, and lets go. Everyone takes four damage from the cold.']], fx: { hurt: 4 }, choicesFrom: 'glass.k.0' },
  'glass.k.bounce': { lines: [['narrator', 'The hammer rebounds as if from a drum. Shock shivers up your arm. Everyone takes five damage as the Mirror laughs, soundlessly.']], fx: { hurt: 5 }, choicesFrom: 'glass.k.0' },
  'glass.k.shatter': { lines: [['narrator', 'The hammer comes down. The Mirror does not break so much as sigh. Ten eyes go dark, one by one, and a thousand silver shards rain across the kiln floor. Far beneath the vault, something large snarls, and cannot say why.']], fx: { stage: ['glass', 'shattered'], q: ['glass', 'ready'], flag: 'mirrorShattered', xp: 250, consume: true, journal: 'Shattered the Mirror in the old kiln. The Sovereign has lost an eye.' }, end: true },
  'glass.k.gaze': { lines: [
    ['narrator', 'You look. The glass ripples, then clears. A long table lit by violet fire. A crown of black iron. A staff with a crack beneath the third ring. And then the Sovereign turns his head, and looks straight back at you.'],
    ['malthrax', 'Little heroes. I have been waiting.'],
    ['narrator', 'The glass goes dark. You know where to strike the staff. He knows your faces. Somewhere above, a seal cracks, and you glimpse the cache of the Glassworks guild, three hundred gold left behind.'],
  ], fx: { stage: ['glass', 'gazed'], q: ['glass', 'ready'], flag: ['mirrorGazed', 'weakPoint'], gold: 300, moon: 1, xp: 250, consume: true, journal: 'Looked into the Mirror. I know where the staff breaks, and Malthrax knows my face. A seal cracked.' }, end: true },
  'glass.rs': { lines: [
    ['ysolde', 'It is quiet. The glass hums no more. Take this. Verrin glass, ground for you. It will keep the world\'s tricks out of your eyes.'],
    ['narrator', 'She laughs, a little wildly, and sets down her hammer for the first time in months.'],
  ], fx: { item: 'prismCirclet', gold: 100, xp: 100, q: ['glass', 'done'], consume: true, journal: 'Ysolde Verrin is free of the Mirror. She gave me a Prism Circlet.' }, end: true },
  'glass.rg': { lines: [
    ['ysolde', 'You looked. Of course you looked. Everyone looks. I will not lecture. I will only say the Mirror still stands, and it knows your faces now. Be quick.'],
  ], fx: { xp: 100, q: ['glass', 'done'], consume: true, journal: 'Told Ysolde Verrin I looked into the Mirror. She did not lecture.' }, end: true },

  /* ================= B4, B5: The Wardens' Last Roll ================= */
  'crane.0': { title: "The Sergeant's Roll", lines: [
    ['narrator', 'In the cold ash of a collapsed barracks, a pale man in a Warden\'s tabard stands at attention before a wall of scratched names. He does not blink. Frost forms on your armour as you approach.'],
    ['crane', 'Halt. Name and watch. No. You are not Watch. You are too loud and too alive.'],
    ['crane', 'Sergeant Aldous Crane, Warden\'s Watch, Fourth Company. I call the roll every night, and every night three names do not answer. Corporal Dunstan Hale. Private Ilsa Marn. Private Joss Kettering. I cannot rest until I know where they lie, and why the seals fell on my watch.'],
  ], choices: [
    { id: 'press', label: '👁 Ask what he remembers', check: { skill: 'insight', dc: 12, pass: 'crane.0.insight', fail: 'crane.0.nothing' }, ifNot: 'crane_asked' },
    { id: 'accept', label: '🛡 Promise to find the three', go: 'crane.0.ok', auto: true },
    { id: 'later', label: 'Not now', end: true }] },
  'crane.0.insight': { lines: [['narrator', 'He says why the seals fell on my watch too quickly, the way a man says a thing he has said to himself a thousand times. Whatever happened, the Sergeant suspects someone he loved.']], fx: { flag: ['crane_asked', 'crane_suspect'] }, choicesFrom: 'crane.0' },
  'crane.0.nothing': { lines: [['narrator', 'His face gives you nothing, not even breath. A man long dead keeps his secrets well.']], fx: { flag: 'crane_asked' }, choicesFrom: 'crane.0' },
  'crane.0.ok': { lines: [['crane', 'Then you have my thanks, and my sword arm, if the dead can lend one. They will be deeper. The Fourth\'s barracks were on the vault level. Look for our tags.']], fx: { stage: ['crane', 'seek'], q: ['crane', 'active'], consume: true, journal: 'Sergeant Crane\'s ghost asked me to find three missing Watch tags: Hale, Marn and Kettering.' }, end: true },
  'crane.b.0': { title: "The Fourth Company's Wall", lines: [
    ['narrator', 'Deep in the vault, the Watch\'s barracks has survived untouched: a ring of bunks and a wall of names. Three tags hang on three rusted nails. Each has a story, and each is worth a roll.'],
  ], choices: [
    { id: 'marn', label: '🛏 Check Private Marn\'s bunk', check: { skill: 'investigation', dc: 12, pass: 'crane.b.marn', fail: 'crane.b.dust' }, ifNot: 'crane_tm', auto: true },
    { id: 'kett', label: '🩺 Examine Private Kettering\'s tags', check: { skill: 'medicine', dc: 12, pass: 'crane.b.kett', fail: 'crane.b.dust2' }, ifNot: 'crane_tk', auto: true },
    { id: 'hale', label: '🔐 Pick Corporal Hale\'s footlocker', check: { skill: 'sleightOfHand', dc: 13, pass: 'crane.b.hale', fail: 'crane.b.needle' }, ifNot: 'crane_th', auto: true },
    { id: 'done', label: 'Enough. Call the Sergeant', go: 'crane.b.end', if: 'n>=3:crane_tm,crane_tk,crane_th', auto: true },
    { id: 'wait', label: 'Come back later', end: true, ifNot: 'n>=3:crane_tm,crane_tk,crane_th' }] },
  'crane.b.marn': { lines: [['narrator', 'Her bunk is neat. A letter lies under the pillow. Dunstan told me to guard the north seal. He said the Sergeant ordered it. The Sergeant never did.']], fx: { flag: ['crane_tm', 'crane_marn'], xp: 50 }, choicesFrom: 'crane.b.0' },
  'crane.b.dust': { lines: [['narrator', 'A neat bunk, a folded blanket, dust. Whatever Ilsa Marn left behind, she left it somewhere else.']], fx: { flag: 'crane_tm' }, choicesFrom: 'crane.b.0' },
  'crane.b.kett': { lines: [['narrator', 'Joss Kettering died of a blade in the back, not the front. The sheath on his belt carries Dunstan\'s initials.']], fx: { flag: ['crane_tk', 'crane_kett'], xp: 50 }, choicesFrom: 'crane.b.0' },
  'crane.b.dust2': { lines: [['narrator', 'The tags are brittle and the bones beneath are long past telling stories. Whatever killed him, you cannot say.']], fx: { flag: 'crane_tk' }, choicesFrom: 'crane.b.0' },
  'crane.b.hale': { lines: [['narrator', 'The lock gives. Inside, a ledger of seal rotas in Dunstan\'s hand, and a purse of Sovereign\'s gold, minted before Malthrax ever rose.']], fx: { flag: ['crane_th', 'crane_hale'], xp: 50 }, choicesFrom: 'crane.b.0' },
  'crane.b.needle': { lines: [['narrator', 'The lock jams, and a needle springs from the hasp. Everyone takes four damage as the poison burns off.']], fx: { flag: 'crane_th', hurt: 4 }, choicesFrom: 'crane.b.0' },
  'crane.b.end': { lines: [['narrator', 'You gather what you have found. Behind you, the frost on the wall begins to creep.']], fx: { stage: ['crane', 'seek'], flag: 'crane_roll', consume: true }, end: true },
  'crane.v.locked': { lines: [['narrator', 'Frost pools around a rusted gate. Someone is waiting beyond it, but you are not ready. The Fourth Company\'s barracks should have answers.']], end: true },
  'crane.v.0': { title: 'Roll Call', lines: [
    ['narrator', 'Sergeant Crane\'s ghost waits on a landing of black stone, his tabard bright with frost. The names on the wall behind you seem to be listening.'],
    ['crane', 'You have found them. I see it in how you stand. Tell me, then. Where did Dunstan Hale fall, and who opened my seals?'],
    ['narrator', 'The evidence in your hands is plain: Dunstan Hale opened the north seal for Sovereign\'s gold, and Joss Kettering died trying to stop him.', 'n>=2:crane_marn,crane_kett,crane_hale'],
    ['narrator', 'You have only fragments. Not proof. The Sergeant will know the difference.', '!n>=2:crane_marn,crane_kett,crane_hale'],
  ], choices: [
    { id: 'truth', label: '⚖ Tell him the truth', go: 'crane.v.truth', if: 'n>=2:crane_marn,crane_kett,crane_hale', auto: true },
    { id: 'truthweak', label: '⚖ Tell him the truth, with only fragments', check: { skill: 'persuasion', dc: 14, pass: 'crane.v.truth', fail: 'crane.v.doubt' }, ifNot: 'n>=2:crane_marn,crane_kett,crane_hale' },
    { id: 'lie', label: '🕊 Tell him Dunstan held the line', check: { skill: 'deception', dc: 12, dcAdj: { crane_caught: 3 }, pass: 'crane.v.lie', fail: 'crane.v.caught' } },
    { id: 'leave', label: 'Not yet', end: true }] },
  'crane.v.doubt': { lines: [['crane', 'Fragments. I will not hang a dead man on fragments. Come back with more, or with a kinder story.']], fx: { hurt: 3 }, choicesFrom: 'crane.v.0' },
  'crane.v.caught': { lines: [['crane', 'Do not lie to a sergeant. I have heard a thousand excuses from better liars than you.'], ['narrator', 'The cold bites. Everyone takes five damage.']], fx: { hurt: 5, flag: 'crane_caught' }, choicesFrom: 'crane.v.0' },
  'crane.v.truth': { lines: [
    ['narrator', 'You tell it plainly. Dunstan\'s gold. Joss\'s back. Ilsa\'s letter. The ghost listens without moving, until the frost on his tabard cracks like glass.'],
    ['crane', 'Dunstan. My oldest friend. I would have given him my own pay. Thank you. I would rather know. A man should know who he held the line beside.'],
    ['narrator', 'He draws a sword of pale light and turns toward the depths. His tabard glows, the Watch\'s colours, bright as dawn.'],
    ['crane', 'I will stand with you at the end, if you will have me. Hold the line.'],
  ], fx: { item: 'wardenSignet', xp: 450, flag: ['craneAid', 'crane_done'], q: ['crane', 'done'], consume: true, journal: 'Told Sergeant Crane the truth about Dunstan Hale. His ghost will stand with us at the end.' }, end: true },
  'crane.v.lie': { lines: [
    ['narrator', 'He held the line, you say. To the last. The Sergeant closes his eyes.'],
    ['crane', 'To the last. Yes. That sounds like Dunstan. I will tell the others he held the line.'],
    ['narrator', 'The frost melts. Crane salutes you, and the salute is the last thing you see before he is simply gone. On the step, he has left a pouch of old coin, and two vials. A debt, paid forward.'],
  ], fx: { gold: 200, item: ['potionGreater', 'potionGreater'], bless: 'hush', xp: 450, flag: ['craneRest', 'crane_done'], q: ['crane', 'done'], consume: true, journal: 'Told Sergeant Crane that Dunstan held the line. He rests easy now.' }, end: true },

  /* ================= The Sunken Orchard (B3, under the open sky) ================= */
  'orch.0': { title: 'The Keeper Under the Bough', lines: [
    ['narrator', 'Where the cavern roof gave way, the sky pours in. A hundred pale trees lean in the wet grass, their silver leaves gone the colour of ash. Under the oldest sits an elf woman with moss on her shoulders, pruning a branch that is no longer there.'],
    ['narrator', 'Rain ticks on the leaves and runs down the trunks in thin white streaks.', 'f:w_rain'],
    ['narrator', 'A low mist threads between the trunks, and it clings to the bark like breath on glass.', 'f:w_mist'],
    ['narrator', 'The sky above the hole is full of stars, and the healthy trees glow faintly under them. The sick ones are only black shapes.', 'f:w_night'],
    ['maelis', 'Mind the roots. They remember everyone who walks on them. I am Maelis Dewbough, keeper of this orchard, which is a grand title for the last gardener alive.'],
    ['maelis', 'The roof fell and the sky came in, and I thought it a mercy. Then the fruit turned grey. The trees are dying, and the old gate to the north will not wake. It is the Gate of the Silver Court. It should open at moonrise and water the whole orchard with light. It has not done so in sixty years.'],
    ['maelis', 'Read the trees. Read the sky. Read the gate. Three answers to one question: what is killing my orchard? Do that, and the Silverfruit are yours, what is left of them.'],
  ], choices: [
    { id: 'press', label: '👁 Ask what she is not saying', check: { skill: 'insight', dc: 12, pass: 'orch.0.insight', fail: 'orch.0.nothing' }, ifNot: 'orch_asked' },
    { id: 'accept', label: '🌳 Promise to look into it', go: 'orch.0.ok', auto: true },
    { id: 'later', label: 'Not just yet', end: true }] },
  'orch.0.insight': { lines: [['narrator', 'Her hands stop moving. She does not look at you.'], ['maelis', 'Men came with barrels, the winter the roof fell. They said they were mending the gate. They went in loud and came out quiet. Look for their boots.']], fx: { flag: ['orch_asked', 'orch_hint'] }, choicesFrom: 'orch.0' },
  'orch.0.nothing': { lines: [['narrator', 'Her face is bark and patience. Whatever she is holding back stays held.']], fx: { flag: 'orch_asked' }, choicesFrom: 'orch.0' },
  'orch.0.ok': { lines: [['maelis', 'Then go. The trees are all around you, the gate is at the north edge, and the sky is wherever you stand. Come back and tell me what you find.']], fx: { stage: ['orchard', 'asked'], journal: 'Maelis Dewbough, keeper of the Sunken Orchard on B3, asked me to find what is killing her trees: read the trees, the open sky and the Gate of the Silver Court.' }, end: true },
  'orch.wait': { title: 'Still Looking', lines: [
    ['maelis', 'Still here, and so are my trees. Trees, sky, gate. In any order, but the gate will not listen until you have read both the trees and the sky.'],
    ['narrator', 'You have not yet read the trees.', '!f:orch_trees'],
    ['narrator', 'You have not yet read the open sky.', '!f:orch_sky'],
    ['narrator', 'The trees have told you what they know.', 'f:orch_trees'],
    ['narrator', 'The sky has told you what it knows.', 'f:orch_sky'],
  ], end: true },
  'orch.mid': { title: 'The Gate Hums', lines: [
    ['maelis', 'The gate has changed its voice. I can feel it in my teeth. Whatever you did there, the old roots under it are awake. Go down to them. Tell me what they say.'],
  ], end: true },

  'orch.t.0': { title: 'The Silverfruit Trees', lines: [
    ['narrator', 'Pale bark and ash coloured leaves. Fruit hangs in hard grey knots, and each one holds a faint smear of old light, like a coin seen through water.'],
    ['narrator', 'Rain runs down the trunks in white streaks, and where it runs whitest, something crusted is washing out of the bark.', 'f:w_rain'],
    ['narrator', 'Mist beads on the bark in strange hard drops, as if it were settling on salt.', 'f:w_mist'],
    ['narrator', 'In the dark, the living trees glow silver and the dying ones swallow the light. Count the black ones. There are too many.', 'f:w_night'],
  ], choices: [
    { id: 'nat', label: '🌿 Read the bark and the roots', check: { skill: 'nature', dc: 12, adv: 'w_rain', pass: 'orch.t.nat', fail: 'orch.t.natfail' }, ifNot: 'orch_t1', auto: true },
    { id: 'trk', label: '🥾 Follow the bootprints in the grass', check: { skill: 'survival', dc: 12, dcAdj: { w_night: 2, orch_hint: -2 }, pass: 'orch.t.trk', fail: 'orch.t.trkfail' }, ifNot: 'orch_t2', auto: true },
    { id: 'fruit', label: '🩺 Cut open a grey fruit', check: { skill: 'medicine', dc: 11, pass: 'orch.t.fruit', fail: 'orch.t.fruitfail' }, ifNot: 'orch_t3', auto: true },
    { id: 'done', label: 'Enough. The trees have said what they will', go: 'orch.t.end', if: 'n>=2:orch_t1,orch_t2,orch_t3', auto: true },
    { id: 'wait', label: 'Look again later', end: true, ifNot: 'n>=2:orch_t1,orch_t2,orch_t3' }] },
  'orch.t.nat': { lines: [['narrator', 'The roots are laced with a white crust. Brine. Cult brine, poured into the soil by the barrelful. Salt to kill the roots, so the gate would starve and stay shut.']], fx: { flag: ['orch_t1', 'orch_blight'], xp: 30 }, choicesFrom: 'orch.t.0' },
  'orch.t.natfail': { lines: [['narrator', 'The bark is only bark. Whatever is wrong is down in the soil, and the soil keeps its own counsel.']], fx: { flag: 'orch_t1' }, choicesFrom: 'orch.t.0' },
  'orch.t.trk': { lines: [['narrator', 'Boot prints, heavy ones, in a line: men carrying barrels. They go to the gate and come back empty. One left boot is missing a heel nail, and the nail lies in the grass, bright as a tooth. You pocket it.']], fx: { flag: ['orch_t2', 'orch_tracks'], xp: 30 }, choicesFrom: 'orch.t.0' },
  'orch.t.trkfail': { lines: [['narrator', 'The grass holds a hundred prints and says nothing. A crow watches you from a branch, unimpressed.']], fx: { flag: 'orch_t2' }, choicesFrom: 'orch.t.0' },
  'orch.t.fruit': { lines: [['narrator', 'The grey rind peels away. Inside is a thread of true silver light, still alive. A Silverfruit, nearly sound. You wrap it in a leaf.']], fx: { flag: 'orch_t3', item: 'silverfruit', xp: 20 }, choicesFrom: 'orch.t.0' },
  'orch.t.fruitfail': { lines: [['narrator', 'The fruit bursts in a puff of grey spores. Everyone coughs and takes three damage.']], fx: { flag: 'orch_t3', hurt: 3 }, choicesFrom: 'orch.t.0' },
  'orch.t.end': { lines: [['narrator', 'You step back from the trees. They do not thank you, but the leaves stop shivering.']], fx: { flag: 'orch_trees', consume: true, journal: 'The orchard trees: someone has poisoned the roots to keep the Gate of the Silver Court shut.' }, end: true },

  'orch.s.0': { title: 'Under the Open Sky', lines: [
    ['narrator', 'You stand where the cavern roof used to be. The hole is a ragged ring of rock, and through it comes the whole sky.'],
    ['narrator', 'It is day, and the sky is a lid of grey cloud. No stars to read. Only the sun, a pale coin, and the long shadow of the gate behind you.', 'f:w_day'],
    ['narrator', 'It is night. Seven stars hang low in the north, over the old gate, like a hand held open.', 'f:w_night'],
    ['narrator', 'The rain falls straight down through the hole and veils half the stars.', 'f:w_night_rain'],
    ['narrator', 'The mist rises to meet the sky and softens every star into a smudge.', 'f:w_night_mist'],
  ], choices: [
    { id: 'wait', label: '🌙 Wait for nightfall', go: 'orch.s.wait', ifNot: 'w_night', auto: true },
    { id: 'shadow', label: '☀ Read the shadow of the gate by daylight', check: { skill: 'survival', dc: 15, pass: 'orch.s.shadow', fail: 'orch.s.fail' }, ifNot: 'w_night' },
    { id: 'star', label: '✨ Study the seven stars', check: { skill: 'arcana', dc: 13, dcAdj: { w_rain: 3, w_mist: 2 }, pass: 'orch.s.pass', fail: 'orch.s.fail' }, if: 'w_night', auto: true },
    { id: 'leave', label: 'Leave the sky for now', end: true }] },
  'orch.s.wait': { lines: [['narrator', 'You sit under the broken ring while the light drains out of the cloud. The orchard changes its voice: drip of leaf, tick of rain, a bird that has no business underground. Hours pass. The first star comes out.']], fx: { time: 'night' }, choicesFrom: 'orch.s.0' },
  'orch.s.pass': { lines: [['narrator', 'The old elves called them the Hand of the Court. Seven stars, and the hand points down, to the keystone of the gate. At midnight the moon will stand exactly there. The gate answers to a song sung in moonlight, with water on its runes.']], fx: { flag: ['orch_sky', 'orch_star'], xp: 45, consume: true, journal: 'The open sky: seven stars point at the keystone of the gate. It answers to a moonlit song, with water on its runes.' }, end: true },
  'orch.s.shadow': { lines: [['narrator', 'The gate\'s long shadow falls across the grass and ends on a flat stone. Beneath it, a seven pointed star, cut in the rock. The elves marked the hour so no one could forget it: moonlight, a song, and water on the runes.']], fx: { flag: ['orch_sky', 'orch_star'], xp: 45, consume: true, journal: 'The open sky: the gate\'s shadow ends on a seven pointed star. It answers to a moonlit song, with water on its runes.' }, end: true },
  'orch.s.fail': { lines: [['narrator', 'The cloud shifts, the stars swim, and your neck begins to ache. You lose count somewhere past five. You will have to improvise at the gate.']], fx: { flag: 'orch_sky', xp: 15, consume: true, journal: 'The open sky: I lost count of the stars. I will have to improvise at the gate.' }, end: true },

  'orch.t.cold': { title: 'The Silverfruit Trees', lines: [
    ['narrator', 'Grey fruit hangs in hard knots on pale bark. Something is badly wrong with them, but you would not know where to begin. A gardener might. There is a keeper somewhere under the nearest bough.'],
  ], end: true },
  'orch.s.cold': { title: 'Under the Open Sky', lines: [
    ['narrator', 'The cavern roof has fallen away, and the whole sky stands open above you. It is lovely, and it means nothing to you yet. Ask the keeper of the orchard what she wants read in it.'],
  ], end: true },
  'orch.g.cold': { title: 'The Gate of the Silver Court', lines: [
    ['narrator', 'An archway of white stone, carved with leaves and a crescent moon. It is cold, and it is silent. It feels like a door that is waiting for the right person to ask permission. Perhaps the keeper under the bough would know who that is.'],
  ], end: true },
  'orch.g.dim': { title: 'The Gate Stirs', lines: [
    ['narrator', 'The gate hums at the edge of hearing, then forgets you. It is waiting for something you do not yet know. Read the trees and the open sky first, then come back.'],
  ], end: true },
  'orch.g.0': { title: 'The Gate of the Silver Court', lines: [
    ['narrator', 'The archway is white stone carved with leaves and a crescent moon. A runnel winds through every rune, as if the elves expected the sky to fill it.'],
    ['narrator', 'Rain gathers in the runnel and fills the runes with water. They begin to shine.', 'f:w_rain'],
    ['narrator', 'Mist beads in the runnel and the runes weep silver.', 'f:w_mist'],
    ['narrator', 'The crescent moon on the keystone is catching real moonlight from the hole in the roof. It glows.', 'f:w_night'],
    ['narrator', 'You know where the moon will stand: directly over the keystone.', 'f:orch_star'],
    ['narrator', 'You know the soil below has been salted, and that the gate is choking on it.', 'f:orch_blight'],
    ['narrator', 'The heel nail from the grass fits a greasy iron lock hidden under the lowest leaf. The cult built a key.', 'f:orch_tracks'],
  ], choices: [
    { id: 'rite', label: '🎵 Sing the old rite and wake the gate', check: { skill: 'arcana', dc: 14, dcAdj: { orch_star: -3, orch_blight: -1, w_rain: -1, w_night: -1 }, pass: 'orch.g.restore', fail: 'orch.g.rebuff' }, auto: true },
    { id: 'force', label: '💪 Break the seal by force', check: { skill: 'athletics', dc: 13, pass: 'orch.g.broken', fail: 'orch.g.rebuff' } },
    { id: 'key', label: '🗝 Turn the cult\'s brine key', go: 'orch.g.bought', if: 'orch_tracks' },
    { id: 'leave', label: 'Step back from the gate', end: true }] },
  'orch.g.rebuff': { lines: [['narrator', 'The runes flare, and the gate throws you back like a wet dog shaking off water. Everyone takes four damage.']], fx: { hurt: 4 }, choicesFrom: 'orch.g.0' },
  'orch.g.restore': { lines: [
    ['narrator', 'The song comes out of you as if it had been waiting. Water spills down the runnel, light follows the water, and the gate opens like an eyelid. Beyond it a stair of moonlit roots descends into the dark.'],
    ['narrator', 'Far above, the trees shiver. Silver comes back to the leaves, one by one, like lamps being lit.'],
  ], fx: { stage: ['orchard', 'restored'], flag: ['orch_open', 'orch_restored'], xp: 150, bless: 'scholar', consume: true, journal: 'I woke the Gate of the Silver Court with the old rite. The trees are lighting up, and a stair of roots leads down to the Heartroot.' }, end: true },
  'orch.g.broken': { lines: [
    ['narrator', 'You put your shoulder to the keystone and heave. It cracks with a sound like a bone, and the gate swings open crooked, with a gap of silvered dark.'],
    ['narrator', 'The trees groan. Somewhere under the earth, something very old opens an eye and is not pleased.'],
  ], fx: { stage: ['orchard', 'broken'], flag: ['orch_open', 'orch_broken'], gold: 120, xp: 100, curse: 'hollow', hurt: 2, consume: true, journal: 'I broke the Gate of the Silver Court open by force. It is open, but crooked, and something under it is angry.' }, end: true },
  'orch.g.bought': { lines: [
    ['narrator', 'The key turns with a greasy click. The gate swings open without a sound, because it has been told to by someone it does not love. Far below, a bell rings once. The cult will know someone has been here.'],
    ['narrator', 'On the step lies a purse the cult left for whoever opened this door for them. You take it.'],
  ], fx: { stage: ['orchard', 'bought'], flag: ['orch_open', 'orch_bought'], gold: 300, xp: 75, moon: 1, consume: true, journal: 'I used the cult\'s brine key on the Gate of the Silver Court. It opened. A bell rang below, and a seal cracked.' }, end: true },

  'orch.h.locked': { title: 'A Knot of Roots', lines: [
    ['narrator', 'A knot of roots the width of a door, grown across a stair that leads nowhere yet. Whatever sleeps down there will not wake for you. Not until the gate is open.'],
  ], end: true },
  'orch.h.0': { title: 'The Heartroot', lines: [
    ['narrator', 'Beneath the gate, the stair opens into a hollow cut by roots as thick as a man. At its heart a tree no taller than a child glows with silver light. It turns toward you the way a flower turns, and speaks without a mouth.'],
    ['aelindra', 'You sang me awake. It has been sixty years. I thought the sky had forgotten us.', 'f:orch_restored'],
    ['aelindra', 'You broke my door and woke me with a splinter in my side. I am old, and I am angry, and I am listening.', 'f:orch_broken'],
    ['aelindra', 'The salt smells of men with keys. You turned a key I did not choose. Still, you are here, and they are not.', 'f:orch_bought'],
    ['aelindra', 'I am Aelindra, the Heartroot of the Silver Court. The salt has gone to my heart. A little care will save me, and a little greed will end me. Choose.'],
  ], choices: [
    { id: 'tend', label: '🌱 Tend the Heartroot, cleanse the salt', check: { skill: 'nature', dc: 13, dcAdj: { orch_blight: -2, orch_broken: 2 }, pass: 'orch.h.tend', fail: 'orch.h.tendfail' }, auto: true },
    { id: 'boon', label: '🙏 Ask the Heartroot for a boon', check: { skill: 'persuasion', dc: 14, dcAdj: { orch_restored: -3, orch_bought: 2 }, pass: 'orch.h.boon', fail: 'orch.h.refuse' } },
    { id: 'graft', label: '🪵 Cut a graft of heartwood for yourself', go: 'orch.h.graft' },
    { id: 'leave', label: 'Leave it to sleep', end: true }] },
  'orch.h.tendfail': { lines: [['narrator', 'The salt will not leave. The roots recoil, and a thorn finds the back of your hand. Everyone takes three damage.']], fx: { hurt: 3 }, choicesFrom: 'orch.h.0' },
  'orch.h.refuse': { lines: [['aelindra', 'A boon is for those who ask without wanting. You want very loudly.'], ['narrator', 'The hollow gets colder. Everyone takes three damage.']], fx: { hurt: 3 }, choicesFrom: 'orch.h.0' },
  'orch.h.tend': { lines: [
    ['narrator', 'You kneel, pour out the clean rain from the runnel, and draw the salt out of the roots, a little at a time, until your hands are white to the wrists. The Heartroot sighs.'],
    ['aelindra', 'There. That is what rain is for. Go and tell Maelis the orchard will blossom at the next moonrise.'],
  ], fx: { stage: ['orchard', 'heart'], flag: ['orch_tended', 'orch_heart'], xp: 125, consume: true, journal: 'I cleansed the Heartroot of salt. Maelis should hear that the orchard will bloom.' }, end: true },
  'orch.h.boon': { lines: [
    ['narrator', 'The Heartroot considers you for the length of three heartbeats, and then a single silver fruit swells at the end of a low branch, and falls into your hand.'],
    ['aelindra', 'A gift, and no more than a gift. The orchard will be slow to forgive. Tell Maelis what you were given.'],
  ], fx: { stage: ['orchard', 'heart'], flag: ['orch_boon', 'orch_heart'], item: 'silverfruit', xp: 125, bless: 'fortune', consume: true, journal: 'The Heartroot gave me a Silverfruit and its favour. Maelis should hear.' }, end: true },
  'orch.h.graft': { lines: [
    ['narrator', 'The blade goes in cleanly. The Heartroot makes no sound, but all the way up the stair you hear the trees begin to groan, one after another, like an audience leaving.'],
    ['aelindra', 'Take it, then. Take it and go. Do not come back in spring.'],
  ], fx: { stage: ['orchard', 'heart'], flag: ['orch_grafted', 'orch_heart'], item: 'heartwoodStaff', gold: 250, xp: 100, consume: true, journal: 'I cut a graft from the Heartroot. The trees groaned. I should tell Maelis, or avoid her.' }, end: true },

  'orch.pay.a': { title: 'The Orchard Blooms', lines: [
    ['narrator', 'As you reach the oldest tree, silver blossom opens on every branch at once, in the rain or the dark or whatever weather the sky has chosen. Maelis stands among it with her hands over her mouth.'],
    ['maelis', 'You did it. Sixty years, and the orchard remembers its own name. I cannot pay you enough, so I will pay you with what grows here.'],
    ['maelis', 'The gate was a door, you know. Not a wall. It will open for you again, whenever the moon is out and you need somewhere to be quiet.'],
  ], fx: { gold: 150, item: ['dewboughWreath', 'silverfruit', 'silverfruit'], xp: 250, bless: 'fortune', q: ['orchard', 'done'], flag: 'orch_done', consume: true, journal: 'The Sunken Orchard bloomed. Maelis Dewbough gave me the Dewbough Wreath and two Silverfruit.' }, end: true },
  'orch.pay.b': { title: 'What the Trees Remember', lines: [
    ['narrator', 'Maelis is waiting under the oldest tree, and she is looking at the staff on your back.'],
    ['maelis', 'I could feel it when you cut. The roots told me before you came up the stair. You took what was growing, and you left what was dying.'],
    ['maelis', 'I will not take it from you. That is not the keeper\'s way. But I will not thank you, either. Here. A little coin, for the road. You will not be welcome in the spring.'],
  ], fx: { gold: 100, xp: 100, q: ['orchard', 'done'], flag: 'orch_done', consume: true, journal: 'Maelis Dewbough would not thank me for the graft. She gave me a little coin and I will not be welcome in the Orchard in spring.' }, end: true },
  'orch.pay.c': { title: 'A Gift from the Roots', lines: [
    ['narrator', 'Maelis meets you at the oldest tree. You hold up the Silverfruit, and she takes a long breath.'],
    ['maelis', 'She gave you that? She has not given a fruit in sixty years. Then it is a good sign. Slow, but good. The salt will take a season to leave.'],
    ['maelis', 'Take this wreath, with my thanks. It was my mother\'s. May it keep a few of your heads cool.'],
  ], fx: { gold: 100, item: ['dewboughWreath', 'silverfruit'], xp: 200, q: ['orchard', 'done'], flag: 'orch_done', consume: true, journal: 'The Heartroot trusted me with a Silverfruit. Maelis gave me her mother\'s Dewbough Wreath.' }, end: true },
  'orch.done': { title: 'The Keeper Under the Bough', lines: [
    ['maelis', 'The orchard is doing what orchards do. Go on. I am busy being right about the weather.'],
    ['narrator', 'She smiles without looking up. Rain, mist, or stars, the trees are quiet.'],
  ], end: true },
};
