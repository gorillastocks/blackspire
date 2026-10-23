// The three quirky NPC companions and their banter.
import { pick, rand } from '../rules/dice.js';

export const COMPANIONS = {
  brambur: {
    name: 'Brambur Thistlebeard', short: 'Brambur', race: 'hillDwarf', cls: 'cleric', color: '#7fd1ff',
    base: { str: 14, dex: 10, con: 14, int: 8, wis: 15, cha: 12 }, skills: ['medicine', 'religion', 'insight'],
    blurb: 'An anxious hill dwarf cleric of a very forgiving god. Apologizes to monsters, doors, and occasionally the floor.',
    lines: {
      combatStart: ["Oh no. Oh no no. Sorry! Sorry in advance!", "I'm terribly sorry about what's about to happen to you.", "Could we not? No? Right. Apologies.", "Nobody panic! I'll panic for all of us."],
      kill: ["I'm so sorry. Rest well, little {m}.", "Was that me? That was me. Forgive me!", "Oh dear, it's stopped moving. I'll say a few words."],
      crit: ["Sorry! That one was a bit much!", "My god, the CRUNCH. Apologies all round."],
      enemyCrit: ["Ow! Fair enough, I suppose.", "I deserved that. Probably."],
      lowHp: ["I'm leaking! Is that normal? That's not normal.", "Just a scratch. A big, terrifying scratch."],
      down: ["Hold on {p}, I'm coming! Sorry I'm slow!", "No no no — {p}, stay with me!"],
      loot: ["Is it stealing if they're dead? I'll leave a thank-you note.", "We should really return some of this."],
      stairs: ["Deeper? Must we? We must. Right.", "Every step down is a step further from my mum."],
      rest: ["I'll take first watch. I won't sleep anyway.", "Everyone hydrate. And pray. Mostly hydrate."],
      trap: ["I KNEW the floor was suspicious!", "Sorry, floor. I didn't mean to step on you."],
      victory: ["We did it! I think. Is everyone attached?", "Thank the gods. And thank you, monsters, for being good sports."],
      levelUp: ["I feel... holier? Is that allowed?"],
      secret: ["A secret door! I hope it doesn't mind being found."],
    },
    camp: [
      "Brambur: \"Do you think the rats have families? I've been thinking about the rats.\"",
      "Brambur: \"My god is Mother Pellwen, patron of second chances. She has a lot of work with me.\"",
      "Brambur: \"I apologized to a door once and it opened. Never been sure if that was a miracle.\"",
      "Brambur: \"Fizzwick, could you narrate a bit quieter? The walls have ears. Probably literal ones.\"",
      "Brambur: \"I've packed eleven extra bandages. And one emotional-support pebble. His name is Gary.\"",
    ],
  },
  fizzwick: {
    name: 'Professor Fizzwick Gearsprocket', short: 'Fizzwick', race: 'rockGnome', cls: 'wizard', color: '#ff8cff',
    base: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }, skills: ['arcana', 'history', 'investigation'],
    blurb: 'A pompous rock gnome evoker who narrates himself in the third person and considers fireballs "a form of peer review."',
    lines: {
      combatStart: ["Fizzwick steps forward, magnificent and unafraid.", "Behold! Fizzwick prepares an academically rigorous beating.", "Fizzwick notes the enemy's poor posture. Advantage: Fizzwick."],
      kill: ["Fizzwick has disproved that {m}'s hypothesis of continued existence.", "Another triumph for Fizzwick. He will mention it in his memoirs. Chapter nine."],
      crit: ["Fizzwick did that. Write it down.", "A flawless execution, as Fizzwick predicted in his 1374 treatise."],
      enemyCrit: ["Fizzwick... will allow it. This once.", "Fizzwick's dignity has been bruised. Also his spleen."],
      lowHp: ["Fizzwick is merely resting his vital signs.", "Fizzwick would like it noted he is VERY close to dying."],
      down: ["Fizzwick shall avenge {p}! After a short lecture!", "Unacceptable! {p} was Fizzwick's favorite audience member!"],
      loot: ["Fizzwick shall appraise this. Verdict: 'mine'.", "Treasure! Fizzwick always knew he deserved this."],
      stairs: ["Fizzwick descends, as all great minds eventually must.", "Down we go! Fizzwick will lead. From the back. For tactical reasons."],
      rest: ["Fizzwick will now study his spellbook, which is mostly about Fizzwick.", "Fizzwick requires eight hours of beauty sleep. Ten for the beard."],
      trap: ["Fizzwick saw that coming. He simply chose not to mention it.", "A trap! How derivative."],
      victory: ["As Fizzwick foretold. Applause may begin.", "Fizzwick accepts your gratitude in the form of gold."],
      levelUp: ["Fizzwick ascends to new heights of Fizzwickery!"],
      secret: ["Fizzwick's keen intellect reveals a hidden door! (Others may have helped.)"],
    },
    camp: [
      "Fizzwick: \"Fizzwick once lectured to a hall of three hundred. Two hundred ninety were asleep. Fizzwick counts that as a Sleep spell.\"",
      "Fizzwick: \"Pip, Fizzwick will trade you one spoon for a signed portrait of Fizzwick. No? Your loss.\"",
      "Fizzwick: \"The Amulet of Grok is said to know everything. Fizzwick merely wishes to confirm it knows about Fizzwick.\"",
      "Fizzwick: \"Brambur, stop apologizing to the campfire. It is a chemical reaction.\" Brambur: \"Sorry.\" Fizzwick: \"...\"",
      "Fizzwick: \"Fizzwick's spellbook is bound in genuine dragon leather. Fine — lizard. A very confident lizard.\"",
    ],
  },
  pip: {
    name: 'Pip "Silverspoon" Tealeaf', short: 'Pip', race: 'lightfootHalfling', cls: 'rogue', color: '#ffd34d',
    base: { str: 8, dex: 15, con: 14, int: 12, wis: 13, cha: 10 }, skills: ['stealth', 'perception', 'sleightOfHand', 'investigation', 'acrobatics'],
    blurb: 'A lightfoot halfling thief obsessed with collecting spoons. Rates every dungeon by its cutlery.',
    lines: {
      combatStart: ["Does it have spoons? Ask it if it has spoons.", "Right, stabbing time. Then spoon time.", "If anyone sees a spoon during this, call it out."],
      kill: ["Dibs on its spoons. It didn't have spoons? Tragic.", "{m} down! Checking pockets for cutlery…"],
      crit: ["Straight in the soup-hole!", "Like a spoon through custard."],
      enemyCrit: ["Oi! I bruise like a ripe pear!", "Not the hands! These hands hold spoons!"],
      lowHp: ["If I die, bury me with my spoons. ALL of them.", "Feeling a bit… ladle-headed."],
      down: ["{p}! You can't die, you owe me a teaspoon!", "Get up {p}, I'll let you hold a spoon!"],
      loot: ["Ooh, shiny. Not a spoon, but shiny.", "Gold? Fine. Spoons would've been better."],
      spoon: ["A SPOON! A beautiful, perfect spoon! Nobody touch it!", "This is the best day of my life. Again!", "Look at the curve on this one. Exquisite."],
      stairs: ["Deeper means older spoons. Let's GO.", "Stairs! I bet the boss has a silverware drawer."],
      rest: ["I'll polish the collection. Again.", "Goodnight, spoons. Goodnight, everyone else, I suppose."],
      trap: ["Who puts a trap HERE? Amateurs.", "Ow. That's coming out of someone's cutlery budget."],
      victory: ["Excellent! Now, the important part — looting.", "Another win for Team Spoon!"],
      levelUp: ["Faster fingers, more spoons. Simple maths."],
      secret: ["A secret door! Secret doors always lead to secret spoons."],
    },
    camp: [
      "Pip: \"I've got eighty-three spoons. Eighty-four if you count the spork, which I don't, because I have standards.\"",
      "Pip: \"A runcible spoon is a fork with a spoon's soul. There's one down here. I can FEEL it.\"",
      "Pip: \"Brambur keeps apologizing to the monsters. I keep apologizing to their spoons. We're not so different.\"",
      "Pip: \"Fizzwick talks about himself in third person. Pip thinks that's weird. …Oh no. It's contagious.\"",
      "Pip: \"My nan said 'never trust a man with no spoons.' Then she stole mine. Complicated woman.\"",
    ],
  },
};
export const COMPANION_KEYS = ['brambur', 'fizzwick', 'pip'];

const lastSaid = {};
/** Return a banter line for an event, or null. Includes a cooldown so they don't spam. */
export function banter(party, event, ctx = {}, chance = 0.6) {
  const speakers = party.filter((c) => c.companion && !c.dead && c.hp > 0 && COMPANIONS[c.companion].lines[event]);
  if (!speakers.length || rand() > chance) return null;
  const who = ctx.who && ctx.who.companion && COMPANIONS[ctx.who.companion].lines[event] && !ctx.who.dead ? ctx.who : pick(speakers);
  const C = COMPANIONS[who.companion];
  const now = Date.now();
  if (lastSaid[who.id] && now - lastSaid[who.id] < 2500 && event !== 'spoon') return null;
  lastSaid[who.id] = now;
  const line = pick(C.lines[event]).replace('{m}', ctx.m || 'creature').replace('{p}', ctx.p || 'friend');
  return { who: C.short, color: C.color, text: line };
}
