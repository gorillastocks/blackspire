// Phase C: all authored text for reactive banter, per-dungeon threads, Liora's moments and the branching events.
// Pure data (no imports) so scripts/voice-queue can read it and tests can check it.

/** Reactive one-liners: REACT[companion][trigger]. Each line plays at most once per save. {p} = fallen friend's name. */
export const REACT = {
  brambur: {
    room: ['Nice room. Is it safe? It never is. Lovely.', 'I\'ll just say hello to the walls, so they know we\'re friendly.', 'Is it me, or is this room judging us? Sorry, room.'],
    loot: ['I\'ll write a thank-you note to whoever left this. Posthumously.', 'Is it wrong that I\'m a little excited? Don\'t tell Mother Pellwen.'],
    secret: ['A secret! I do hope nobody lived in there. Sorry if they did.', 'Hidden doors are just doors that are shy. Hello, shy door.'],
    elite: ['Oh no. That one is bigger than the others. Sorry. I\'ll pray quietly.', 'We could... not? We could very much not.'],
    death: ['{p}... oh, {p}. I\'ll say the words. Someone hold my hand.', 'I\'m so sorry, {p}. Mother Pellwen will have a seat for you.'],
    town: ['Home! Sort of. Nobody here wants to eat us, which is lovely.', 'Fresh air, no scratching, and Marga\'s pie. Heaven.'],
  },
  fizzwick: {
    room: ['Fizzwick approves of the proportions. They are almost as grand as Fizzwick.', 'The acoustics are splendid. Fizzwick shall test them by being brilliant.', 'A chamber! Fizzwick shall make a note, and then a bigger note about himself.'],
    loot: ['Fizzwick has appraised it. Verdict: Fizzwick\'s, with minor concessions.', 'A fine acquisition. Fizzwick will mention it in his memoirs, chapter eleven.'],
    secret: ['Fizzwick suspected a hidden passage all along. He was merely waiting for a witness.', 'Observe: a concealed door. Fizzwick has discovered it with his eyes. Mostly.'],
    elite: ['Fizzwick has identified a significant threat. Fizzwick will be standing behind someone.', 'Statistically, this is where Fizzwick suggests a strategic retreat. Statistically.'],
    death: ['Fizzwick... has no words, which is rare. {p}, you were a fine audience.', 'Unacceptable! {p} had so much left to applaud!'],
    town: ['Emberhollow! Where Fizzwick\'s genius is, regrettably, underappreciated.', 'Fizzwick shall now bathe in adoration. Or at least a warm bath.'],
  },
  pip: {
    room: ['Ooh, a room with no cutlery. Disappointing, but gorgeous.', 'Anyone else feel watched? No? Just me? I\'ll check the corners.', 'Nice room. Good bones. Bad spoons.'],
    loot: ['Mine, mine, mine. I mean, ours! Ours, ours, mine.', 'That\'s a fine find. I\'d say it\'s spoon-adjacent.'],
    secret: ['Hidden doors are just treasure with manners.', 'Ha! Called it. I called it in my head. Loudly.'],
    elite: ['Big one. Nope. Nope nope. I\'ll be the one holding the door.', 'Remember: when it chases us, I run fastest. You\'re welcome.'],
    death: ['{p}... no. No, no. I\'ll keep your spoon safe, I promise.', 'Not {p}. Not like this. We\'ll get you back. We WILL.'],
    town: ['Smell that? Bread, smoke and other people\'s spoons. Home.', 'Town! I\'ll just... browse. Innocently. Everything.'],
  },
  grumsh: {
    room: ['Another hall for the dead to echo in.', 'I hear a verse in this room. A sad one.', 'Quiet halls make loud poets. Please excuse me.'],
    loot: ['Gold for a dirge. Fair trade.', 'Shiny things, brief joy. Write that down.'],
    secret: ['A secret: the oldest rhyme there is. Behind every wall, another wall.', 'Hidden, but not forgotten. Like most of my poetry.'],
    elite: ['The big one. Good. A hero\'s song needs a worthy verse.', 'I shall hum it a dirge before it falls. Out of respect.'],
    death: ['{p}. I\'ll write you a verse. The best one.', 'Oh, {p}. I should have written a happier song for you.'],
    town: ['A town. People. I\'ll hum quietly so they don\'t flee.', 'Warm ale and loud laughter. The only verse I can\'t write.'],
  },
  zizzy: {
    room: ['Wide open space! Perfect for explosions!', 'Look at all the flammable stuff! Not that I\'m looking. I\'m looking.', 'New room, new ways to set things on fire. I mean, new ways to admire it.'],
    loot: ['Ooh, shiny! Does it go boom? Can it go boom?', 'Loot! Rate: seven out of ten. Would explode again.'],
    secret: ['A secret room! Statistically, there\'s something flammable in it!', 'Hidden door found! Can I knock on it with a fireball? Gently?'],
    elite: ['That one looks very flammable. Or very not. Let\'s find out!', 'Big monster! Big boom! It\'s like we planned it!'],
    death: ['{p}? {p}, don\'t be a joke! This is the one time I don\'t laugh!', 'No... no, no. {p}, I\'d trade every spark I have.'],
    town: ['Town! Everything smells like bread and "please don\'t set me on fire". Home!', 'Hello, Emberhollow! I promise to be only a little bit explosive.'],
  },
  vexrath: {
    room: ['Room surveyed. No permits on display. Suspicious.', 'Entering an unlicensed chamber. I shall file a report in triplicate.', 'Floor plan acceptable. Ceiling: pending review.'],
    loot: ['Recovered goods. Logged. Stamped. Mine. Ours. Logged.', 'Item received. Chain of custody: us.'],
    secret: ['A concealed passage with no signage. Outrageous. Fascinating.', 'Hidden door located. Form 12-S: Notice of Discovery. Filed.'],
    elite: ['Hostile of exceptional rank. Form 9: Notice of Imminent Violence. Filed.', 'A notable adversary. I shall treat it with the honour it is owed.'],
    death: ['{p}. I shall file an honourable discharge. And attend in person.', 'Cause of death: us failing. Remedy: do not fail again. {p}, rest.'],
    town: ['Emberhollow. Forms are processed here on time. I approve.', 'Municipal lighting inadequate. Morale: acceptable.'],
  },
  nettle: {
    room: ['I once hosted a banquet in a room just like this. Mostly ghosts.', 'Fun fact: I designed this style of ceiling. Possibly.', 'Hush. I smell a good story, or a bad cheese. Either way.'],
    loot: ['I once found a chest like this and gave it to a queen. She never gave it back.', 'That is exactly the kind of loot that makes a ballad worthwhile.'],
    secret: ['Hidden door! A bard\'s favourite words: "I knew there was a story here."', 'A secret passage. I\'ll tell this one later, with improvements.'],
    elite: ['Big fellow. I once wrestled one of those. It was a tie. I won.', 'That one looks like the third act of a tragedy. Let\'s skip to the comedy.'],
    death: ['{p}... you were my best audience. The best. Don\'t go.', 'No jokes. Not now. {p}, you deserved a better ending than this.'],
    town: ['Ah, the sweet sound of strangers who owe me a drink.', 'Town! I\'ll be around the tavern, being modest.'],
  },
  liora: {
    room: ['Quiet in here. Quiet that\'s been practising.', 'Fresh tracks near the wall. Keep your eyes up.', 'Look at the floor dust. Someone passed here recently. Or something wearing boots.'],
    loot: ['Dad always said to check every chest twice. I\'ll hold your torch.', 'A nice find. Keep what helps, leave what haunts you.'],
    secret: ['A hidden door. Dad would have been so smug. Let\'s be smug for him.', 'I knew that wall was wrong. I just wanted you to feel clever.'],
    elite: ['That one\'s dangerous. We go slow, we go together.', 'Stay close. It watches the corridor, but it hasn\'t seen the bow yet.'],
    death: ['No. Stay with us, {p}. I\'m not losing another one.', 'Oh, {p}. I\'m so sorry. We carry you out, however long it takes.'],
    town: ['Smell that? Bread and woodsmoke. It\'s nice to be reminded what we\'re fighting for.', 'I\'ll light the lantern in my window, just in case. Old habit.'],
  },
};

/** One personal thread per dungeon per companion: THREAD[companion][floor] = [line, line] (floor 0 = B1). */
export const THREAD = {
  brambur: [
    ['I wrote Mum a letter before we left. "Dear Mum, I\'m in a cave. Love, Brambur."', 'I didn\'t send it. She\'d only worry. She\'d also send soup.'],
    ['This water reminds me of the font where Mother Pellwen blessed me. It was this cold.', 'I cried. She said that\'s how you know it took.'],
    ['I said a prayer for the rats. And the mirrors. Is that strange?', 'Mother Pellwen says every creature deserves one prayer. I save the spares for us.'],
    ['That hammer of Mum\'s. It\'ll be somewhere near here, won\'t it? The Ashforge.', 'I won\'t hit anyone with it. Probably. Maybe once.'],
    ['If we don\'t come back, tell Mum I was brave. Lie if you must.', 'Actually, tell her I apologised to the dragon. That\'ll make her laugh.'],
  ],
  fizzwick: [
    ['Fizzwick has been informed he is "a bit much." Fizzwick has chosen to be flattered.', '...Fizzwick is flattered. Mostly.'],
    ['Fizzwick\'s thesis was laughed at by the Academy. It was correct. Fizzwick has the scorch marks to prove it.', 'It was about fire. Their roof, specifically.'],
    ['Fizzwick sees himself in these crystals. Brilliant, faceted, and slightly cracked.', 'Fizzwick will deny having said that.'],
    ['Fizzwick admits the forge is magnificent. Fizzwick does not admit he is sweating.', 'Fizzwick is merely... glistening.'],
    ['Should Fizzwick fall here, he asks that his footnote be larger than the others.', 'And that someone read it aloud. With feeling.'],
  ],
  pip: [
    ['Fun fact: I stole my first spoon at six. My mum wept with pride.', 'Then she made me give it back. Then I stole it again.'],
    ['Spoon count: zero. But I found a very good fork. It\'s a start.', 'A fork is just a spoon with ambition.'],
    ['I grew up with eleven cousins and one spoon. You learn to be quick.', 'I still sleep with it under my pillow. Don\'t tell the others.'],
    ['The Spoon-Keepers say a hero\'s measure is what they leave on the table.', 'I always leave a spoon. Mostly mine.'],
    ['If I find that armory, I\'ll share it. A little. We\'ll discuss terms.', 'I\'d share all of it, actually. Don\'t repeat that.'],
  ],
  grumsh: [
    ['Verse one: "Oh rat, oh rat, you gnawed my boot."', 'It gets better. It does not get shorter.'],
    ['I failed my bardic audition. They said my dirges were "too much." The audience wept.', 'Which was the point, no?'],
    ['A crystal sings one note forever. I envy that. I can\'t hold a note longer than my temper.', 'Fine. Longer than that. Barely.'],
    ['Verse four is a battle verse. I\'m not sure I\'m brave enough to write it.', 'I shall be brave. After one more mope.'],
    ['I\'ll finish the ballad tonight. Whatever happens tomorrow, it has an ending.', 'Even if the ending is: Grumsh hit it very hard.'],
  ],
  zizzy: [
    ['Confession: I lost my eyebrows at a wedding. Not mine. I was a guest.', 'There was cake. The cake was fine.'],
    ['Water is fire\'s rival. I respect that. I\'ll still try to boil it.', 'Gently. For science.'],
    ['These crystals focus light! Which means they can focus FIRE!', 'I know because of the eyebrows.'],
    ['Home! Not home, but this is the first place that smells like my kitchen!', 'I burned that down too. Great memories.'],
    ['I never had friends who stayed when I lit something. You all stayed.', 'Thanks. Truly. Can I light something now?'],
  ],
  vexrath: [
    ['Form 7-B: Application to Exist in a Cave. Filed.', 'Approved. Naturally.'],
    ['My clan forged a decree to exile me. I have written to the Registrar eleven times.', 'The Registrar is, regrettably, a goat.'],
    ['I cannot be certain the decree was forged. I can only be sure.', 'Certainty is not paperwork, but it is close.'],
    ['I have never missed a deadline. I may miss the end of the world.', 'I am preparing a form for that.'],
    ['If I fall, stamp me PROCESSED. And add "with honour." In ink.', 'Pencil is for people who plan to be erased.'],
  ],
  nettle: [
    ['I once fought a hundred rats. Two. One was a ghost rat.', '...Fine, it was one rat. It bit my boot.'],
    ['I\'ve never told a true story to a crowd. They always want the dragon one.', 'I\'d tell the real one to you, if you\'d keep it.'],
    ['A mirror and a bard: bad combination. All those versions of me, arguing.', 'I came out ahead in every one. Most of them.'],
    ['I wrote songs about a hundred heroes. None of them knew me.', 'You all know me. It\'s a strange feeling. A good strange.'],
    ['If you ever sing about this, make me taller. Or at least give me better hair.', 'And mention I carried the morale. On my back. Like a small mule.'],
  ],
  liora: [
    ['Five-bar tally marks scratched low on the wall. That\'s the Watch\'s count. Dad was here.', 'Twenty-nine days of marks. Then they stop. I want to know why.'],
    ['A lantern hangs above the tide line, its wick still fresh. Someone has tended it.', 'Someone. Or something kind. I\'d settle for either.'],
    ['A journal page, tucked in a crystal seam: "The seals hold only if the sixth is kept."', 'Sixth? There are five. Isn\'t that the whole point?'],
    ['A Watch sword, laid in the cooling trough. His grip-wrap. Not broken. Left.', 'Like he put it down on purpose. Like he had somewhere to be.'],
    ['Dad\'s boots, at the foot of the stair. Side by side. Neat, like him.', 'I think he walked the rest of the way barefoot. That\'s exactly like him.'],
  ],
};

/** Liora's five conversations (one per dungeon, at camp or at the Boar & Spoon). Choices raise affinity; every path continues. */
export const MOMENTS = [
  {
    title: 'The Lantern', intro: ['Do you mind if I sit? The fire is better company than the dark.', 'This clasp was my father\'s. Aldous Wardenfall, last Warden of the Watch. He took the horn and went down to reseal the vault. I was nine.', 'Every floor, I find a little of him. Tally marks. A boot. I haven\'t told anyone I talk to the marks.'],
    choices: [
      { id: 'listen', label: 'Tell her you\'ll listen for as long as she needs.', aff: 2, reply: ['...Thank you. Most people want me to cheer up.', 'You\'re very easy to talk to. Annoyingly easy.'] },
      { id: 'joke', label: 'Joke that the rats probably owe him rent.', aff: 1, reply: ['Ha! He would have loved you. Terrible taste, my father.', 'Thank you. I needed to laugh more than I knew.'] },
      { id: 'promise', label: 'Promise her: "We will find him."', aff: 1, reply: ['Don\'t promise what the dark might not give back.', '...But I\'ll hold you to it. Gently. With a bow.'], flag: 'lioraPromise' },
    ],
  },
  {
    title: 'Cold Water', intro: ['You\'re soaked through. So am I. Don\'t look; I\'m not at my best when I\'m dripping.', 'I found his lantern, hung above the tide line. Still tended. He was still being careful.', 'I find that comforting and unbearable, both.'],
    choices: [
      { id: 'cloak', label: 'Drape your cloak around her shoulders.', aff: 2, reply: ['A cloak. A hero\'s cloak. You smell like campfire and rat.', 'Keep smelling exactly like that. It\'s very warm, thank you.'] },
      { id: 'drink', label: 'Pass her a hot drink and sit quietly beside her.', aff: 2, reply: ['You\'re good at this. The quiet. Don\'t let anyone talk you out of it.'] },
      { id: 'tease', label: 'Tease her about how much she is dripping.', aff: 1, reply: ['Oh, you are going to pay for that. Slowly. In small, annoying ways.'] },
    ],
  },
  {
    title: 'Reflections', intro: ['Every crystal down here shows me what I want. Then takes it back.', 'One of those reflections smiled at me with his face.', 'I know it\'s only the glass. I know. It still lands.'],
    choices: [
      { id: 'hand', label: 'Take her hand until the glow passes.', aff: 2, reply: ['Your hand\'s warm. ...Okay. I can look now.', 'Don\'t let go yet. Not until the crystals stop.'] },
      { id: 'see', label: 'Tell her: "I\'m looking at you, not the glass."', aff: 2, reply: ['That\'s smooth. Ridiculous. Do it again later.', 'I may have blushed. It was the crystals. Obviously.'] },
      { id: 'move', label: 'Suggest moving on until the humming fades.', aff: 1, reply: ['Practical. Fair. Thank you for not letting me spiral.'] },
    ],
  },
  {
    title: 'Embers', intro: ['Ember light suits you. I mean that as a compliment. Mostly.', 'Can I ask something? Is there someone waiting for you up top? A family? A person you write to?'],
    choices: [
      { id: 'noone', label: '"No one. Until recently."', aff: 3, reply: ['Careful. I\'m very good at keeping the things I find.', 'She leans her shoulder against yours and says nothing at all, which says everything.'] },
      { id: 'party', label: '"My party counts. You count."', aff: 2, reply: ['That might be the nicest thing anyone has said to me in the dark.', 'I\'ll take it. I\'ll keep it.'] },
      { id: 'forge', label: 'Change the subject and joke about the forge.', aff: 1, reply: ['Mm. Deflecting. I see you. I\'ll let you off. This once.'] },
    ],
  },
  {
    title: 'Before the Vault', intro: ['Tomorrow this ends, one way or the other. I found his boots at the stair. Only the boots.', 'Whatever the vault holds, I\'d like to have asked something first, so I don\'t wonder for another twenty years.'],
    choices: [
      { id: 'stay', label: 'Ask her to come back to Emberhollow with you. For good.', aff: 3, reply: ['Yes. Obviously yes.', 'She kisses your cheek, quick and warm, then pretends to check her bowstring.'], flag: 'lioraStays' },
      { id: 'beside', label: 'Tell her you\'ll stand beside her whatever the vault holds.', aff: 2, reply: ['She rests her forehead against yours for one long breath.', 'Beside me. I can do beside.'] },
      { id: 'win', label: '"Win first. Ask me again with the sun up."', aff: 1, reply: ['Deal. I\'ll hold the sun up myself if I have to.'] },
    ],
  },
];

/** Closing words by how close you grew. Spoken after the Rowan line in the ending. */
export const LIORA_ENDING = {
  sweetheart: ['He kept something burning down here for twenty years. Whatever that last light is, I will be the one to find it.', 'I\'m staying in Emberhollow. If the Knight will have me.', 'She takes your hand in front of the whole Boar & Spoon, and nobody says a word, which, for Emberhollow, is a miracle.'],
  close: ['He kept something burning down here for twenty years. Whatever that last light is, I will be the one to find it.', 'I\'ll keep the lantern lit in my window. And maybe, if you ask nicely, keep your fire company too.'],
  friend: ['He kept something burning down here for twenty years. Whatever that last light is, I will be the one to find it.', 'Thank you for walking me to him. Whatever comes next, I\'m glad you were beside me.'],
};

/** What the town folk say once they hear what you did. NPC_MEMORY[npc][tag]. */
export const NPC_MEMORY = {
  rowan: {
    forgave: 'Hale wrote to me. Said a stranger gave him back his courage. I\'d wager that was you. The Watch owes you.',
    reported: 'You brought Hale\'s name to me. Hard thing to do. I\'ll see he gets a fair hearing. Thank you.',
    extorted: 'Hale says someone leaned on him down there. I\'m not saying it was you. I\'m saying I noticed.',
  },
  marga: {
    ratsAppeased: 'Funny thing: the scratching under my cellar floor has gone quiet. Rats seem... respectful lately. Is that you? Don\'t answer.',
    ratsAngered: 'Something\'s been digging in my cellar all night. They\'re wearing tiny gold thimbles. Do you know anything about that?',
  },
  osric: {
    ferrymanRested: 'A drowned soul came to me in a dream, smiling. They say you paid his fare. The Temple blesses you.',
    ferrymanRobbed: 'The dead keep accounts, child. I pray you balance yours.',
  },
  wren: {
    tobbleSafe: 'Tobble\'s back in town! He says you walked him out yourself. Dear heart, I\'m making you a tea.',
    tobbleFed: 'Tobble says you fed him and let him keep his pride. That\'s worth more than glowcaps.',
    tobbleRobbed: 'Tobble came in with an empty pouch and a full heart of anger. I\'m not saying anything. I\'m saying a very loud nothing.',
  },
  dobbin: {
    anvilOnce: 'One strike, they say. One clean strike. That\'s how it\'s done.',
    anvilTwice: 'Word is you struck the Silent Anvil twice. Show me your hands, lad. Hm. Steady. Good smithing in those.',
    anvilLeft: 'You left the old anvil alone. Smart. My grandfather struck it twice. Never did get the shaking out of his hands.',
    foremanSpared: 'My brothers say a foreman gave them water in the dark. Not forgiveness, mind. But I heard you let him walk. I\'ll think on it.',
    foremanSlain: 'They say the foreman never walked out of the Forge. My brothers were chained by him. I won\'t weep.',
  },
  tamsin: {
    oathSworn: 'Oh, pet. I heard the old horn in my sleep last night. Somebody swore the Warden\'s oath. Was that you?',
    oathFriends: 'Somebody swore to guard each other in that vault, pet. Not the town, each other. That\'s the oath that holds.',
    oathBroken: 'The old Warden\'s gauntlet is gone from the vault, I hear. Well. Everything is for sale in the end. Not everything, pet.',
  },
};
