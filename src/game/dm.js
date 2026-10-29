// The Dungeon Master's short read-aloud beats (1-3 sentences each), spoken by the 'dm' voice in a read-aloud box.
// Floors, the town and the room descriptions live in narration.js; this file holds the key places, boss lairs, discoveries and quest beats.
// DOM-free. Each beat is told once per save (the `seen` map is in the save). No dashes between words in anything spoken.

export const DM_VOICE = 'dm';
const MARK = '🕯 ';

/** id -> text. */
export const BEATS = {
  // Key places
  orchard: 'The roof of the world has fallen away, and open sky pours down on the Sunken Orchard. Rain whispers through old silver trees, and an elven gate waits among them, patient as a held breath.',
  kiln: 'The old kiln is a cavern of warm brick, and in its heart stands the Mirror, tall as a door and framed in black iron. It shows you the room as it will be in an hour, and it does not blink.',
  // Boss lairs: the last words before steel is drawn
  'lair:0': 'The tunnel widens into a nest of gnawed bones and stolen cutlery, heaped into a lopsided throne. Something large and orcish stirs on top of it, and beside it the Broodmother clicks her fangs. Roll for initiative.',
  'lair:1': 'The cave drops into a drowned amphitheatre, black and mirror still. Then the water parts, and Old Clubtail rises with his wasps humming round him like a crown. Steady now, heroes.',
  'lair:2': 'Crystals grow in a perfect ring around a pedestal of black glass. Gargoyles lean from the shadows, and in the centre Glasshide the Basilisk lifts her eyes. Do not look her in the face.',
  'lair:3': 'The forge hall opens around an anvil the size of a wagon, glowing white hot. Forgemaster Brakk steps out of the smoke with Cindermaw at his heel, and the hammer in his fist is far too fine for him.',
  'lair:4': 'At the heart of the vault, a crown of black iron rises from the dark, and beneath it sits Malthrax, the Dread Sovereign himself. He smiles like a man who has been expecting you. Every die at this table is about to matter.',
  gorvax: 'The floor splits like rotten wood, and the Tyrant of the Blackspire climbs up out of the dark. Gorvax is awake, and he is hungry. Steel yourselves, for this is the last roll.',
  // Notable discoveries
  'key:0': 'In the dust lies an iron key, cold and heavy with purpose. The way down is yours to open.',
  'key:1': 'From the silt of the grotto you lift a key, green with weed and still as sharp as the day it was cut.',
  'key:2': 'A key of pale crystal rests in your palm, and it hums, very softly, in the same sad tune as the cavern.',
  'key:3': 'The Ashforge key is still warm from the fire that made it. Someone left in a hurry.',
  'key:4': 'The final key is black and heavy as a verdict. Beyond it, one door remains.',
  'find:rare': 'Light spills from the treasure like a promise kept. Not every adventurer lives long enough to hold something so fine.',
  'find:elite': 'The named brute lies still. Somewhere in the Spire, someone is going to hear about this.',
  // Quest beats: a quest begins
  'start:debt': 'A halfling\'s grudge is a quiet thing, until it is not. Lantern Row left its mark on these halls, and the road to Garrick Vane runs through every floor.',
  'start:ledger': 'In Emberhollow, a pawnbroker is being robbed in her own name. Somebody forged her hand, and somebody else is digging up the dead.',
  'start:choir': 'A fisherman\'s wife went down to the grotto shrine to sing, and the water kept her songs. Harl Tollow waits on the shore, and he has almost stopped hoping.',
  'start:glass': 'A glasswright asks you to destroy her finest work. It stands in the old kiln, and it has been watching since the day it was made.',
  'start:crane': 'A sergeant dead three years still keeps his post, and he cannot rest until he knows what became of his three missing soldiers.',
  'start:orchard': 'Maelis Dewbough tends the Orchard like a garden of old graves. Something is rotting its heartwood, and the grey fruit is telling her so.',
  // Quest beats: turning points
  'garrick': 'The Seneschal of Keys turns from his ledger, unhurried, and he is smiling. Behind him a small voice cries out, and everyone at this table knows whose it is.',
  'heartroot': 'Roots as old as the Spire coil round a pool of black water, and in it a pale light turns, slowly, like an eye. The Heartroot is listening. Choose your words with care.',
  'stage:glass:shattered': 'The hammer falls, and the Mirror sighs rather than shatters. Ten eyes go dark one by one, and far below, something loses its sight.',
  'stage:glass:gazed': 'You look, and the Mirror shows you everything it has ever seen. Now you know where the staff will break, and the Sovereign knows your face. A seal cracks in the dark.',
  'stage:choir:freed': 'The release verse rings out, and the Sisters of the Tide rise from the black water, singing. They go home at last.',
  'stage:choir:bound': 'The Choir\'s song bends to your will, and the Sisters fall silent, bound. The water shivers as though it were weeping.',
  'stage:orchard:restored': 'The old rite sounds, and the Gate of the Silver Court wakes. One by one the trees light up, and a stair of roots leads down.',
  'stage:orchard:broken': 'The seal breaks with a crack like a bone, and the gate stands open, but crooked. Something beneath it is very angry.',
  'stage:orchard:bought': 'The brine key turns, and the gate opens as if it had always belonged to the cult. Far below, a bell rings, and a seal cracks.',
  // Quest beats: endings
  'done:debt:vengeance': 'Garrick Vane falls, and a debt of three long years is paid in a single breath. Pip does not speak, and the table is very quiet.',
  'done:debt:mercy': 'You lower the blade, and a sparrow of hope flies out of a three year cage. Somewhere on Cant Street, a girl named Posy is waiting to be found.',
  'done:ledger:law': 'The law takes its due, and Odalys Fenn\'s name is clean again. Justice has been served, cold and tidy.',
  'done:ledger:deal': 'A forger repays his debt with honest work, and the town never learns the tale. Sometimes mercy is the better coin.',
  'done:ledger:run': 'The forger bolts into the night, and the pawnbroker\'s name is cleared, though her purse is lighter. Not every story ends with a bow.',
  'done:ledger:squeeze': 'The silver is heavy in your hand, and the silence you bought is heavier still. Some coins leave a stain.',
  'done:choir:freed': 'Harl Tollow weeps on the shore, and for the first time in years, it is a good weeping. The Sisters are free.',
  'done:choir:bound': 'Harl Tollow learns what became of the Choir, and he does not thank you. A bargain has been struck, and its price is not yet paid.',
  'done:glass:shattered': 'Ysolde Verrin is free of her Mirror, and a thousand shards of silver lie across the kiln floor. She presses a circlet into your hand and does not look back.',
  'done:glass:gazed': 'Ysolde listens to what you saw, and she does not lecture. A glasswright knows exactly what a mirror costs.',
  'done:crane:truth': 'The truth is a hard coin, but Sergeant Crane takes it gladly. His ghost will stand beside you at the end.',
  'done:crane:lie': 'A kind lie is told, and a restless soldier is finally at peace. The Wardens\' last roll is settled.',
  'done:orchard:bloom': 'Spring comes early to the Sunken Orchard. Silver blossom drifts through the rain, and Maelis Dewbough laughs aloud.',
  'done:orchard:boon': 'The Heartroot trusts you with its fruit, and Maelis trusts you with her mother\'s wreath. A rare thing, in any age.',
  'done:orchard:graft': 'The trees groan as you leave. Maelis takes your coin, but she will not meet your eye, and you will not be welcome here in spring.',
};

/** Tabletop scene id (when first shown) -> the beat the DM reads before the scene's own lines. */
export const SCENE_BEATS = {
  'pip.1': 'start:debt', 'led.0': 'start:ledger', 'choir.0': 'start:choir', 'glass.0': 'start:glass', 'crane.0': 'start:crane', 'orch.0': 'start:orchard',
  'glass.k.0': 'kiln', 'g.0': 'garrick', 'orch.h.0': 'heartroot',
  'glass.k.shatter': 'stage:glass:shattered', 'glass.k.gaze': 'stage:glass:gazed',
  'choir.p.free': 'stage:choir:freed', 'choir.p.bind': 'stage:choir:bound',
  'orch.g.restore': 'stage:orchard:restored', 'orch.g.broken': 'stage:orchard:broken', 'orch.g.bought': 'stage:orchard:bought',
  'g.venge': 'done:debt:vengeance', 'g.snap': 'done:debt:vengeance', 'g.mercy': 'done:debt:mercy',
  'led.law': 'done:ledger:law', 'led.deal': 'done:ledger:deal', 'led.run': 'done:ledger:run', 'led.squeeze': 'done:ledger:squeeze',
  'choir.h.free': 'done:choir:freed', 'choir.h.bound': 'done:choir:bound',
  'glass.rs': 'done:glass:shattered', 'glass.rg': 'done:glass:gazed',
  'crane.v.truth': 'done:crane:truth', 'crane.v.lie': 'done:crane:lie',
  'orch.pay.a': 'done:orchard:bloom', 'orch.pay.c': 'done:orchard:boon', 'orch.pay.b': 'done:orchard:graft',
};

export const lairBeat = (lvl, phase2 = false) => (phase2 ? 'gorvax' : `lair:${lvl}`);
export const keyBeat = (lvl) => `key:${lvl}`;
export const BEAT_IDS = Object.keys(BEATS);

const seenMap = (s) => (s.seen ||= {});
export const beatSeen = (s, id) => !!seenMap(s)['dm:' + id];
/** The beat as a dialogue line ({ who: 'dm', text }), once per save; null if unknown or already told. */
export function take(s, id) {
  const text = BEATS[id]; if (!text || beatSeen(s, id)) return null;
  seenMap(s)['dm:' + id] = 1;
  return { who: DM_VOICE, text, beat: id };
}
/** The DM line for a tabletop scene the first time it is shown, else null. */
export const sceneLine = (s, sceneId) => (SCENE_BEATS[sceneId] ? take(s, SCENE_BEATS[sceneId]) : null);
/** The beat as a read-aloud card event for the dungeon view (once per save). `pre` cards are read in full before the fight that follows them. */
export function beat(s, id, { pre = false } = {}) {
  const l = take(s, id); if (!l) return [];
  return [{ log: MARK + l.text, cls: 'lore', card: true, dm: true, ambient: !pre, pre, voice: { text: l.text, who: DM_VOICE }, beat: id }];
}
