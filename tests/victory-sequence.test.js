import { describe, it, expect } from 'vitest';
import { createVictorySequencer, insertAfterNarrator } from '../src/voices/victory-sequence.js';

function hookBox() {
  const log = [];
  let musicDone = null;
  let lineDone = null;
  const playing = { music: false, line: null };
  const hooks = {
    playMusic(done) { playing.music = true; log.push('music:start'); musicDone = done; },
    playLine(line, done) { playing.line = line; log.push(`line:${line.role}:${line.text}`); lineDone = done; },
    stopMusic() { if (playing.music) log.push('music:stop'); playing.music = false; },
    stopLine() { if (playing.line) log.push(`line:stop:${playing.line.role}`); playing.line = null; lineDone = null; },
  };
  const seq = createVictorySequencer(hooks);
  return {
    seq, log, playing,
    endMusic() { const d = musicDone; musicDone = null; playing.music = false; log.push('music:end'); if (d) d(); },
    endLine() { const d = lineDone; const line = playing.line; lineDone = null; playing.line = null; log.push(`line:end:${line?.role || '?'}`); if (d) d(); },
  };
}

describe('victory audio sequencer', () => {
  it('plays music fully, then narrator, then each character line, never overlapping', () => {
    const h = hookBox();
    h.seq.start({
      lines: [
        { role: 'narrator', text: 'The last rat falls.', who: 'narrator', kind: 'other' },
        { role: 'character', text: 'Told you. I am a delight in a crisis.', who: 'pip', kind: 'battle' },
        { role: 'character', text: 'For the Dawn!', who: 'serAldric', kind: 'battle' },
      ],
    });
    expect(h.seq.state).toBe('music');
    expect(h.playing.music).toBe(true);
    expect(h.playing.line).toBeNull();
    expect(h.log).toEqual(['music:start']);

    h.endMusic();
    expect(h.seq.state).toBe('narrator');
    expect(h.playing.music).toBe(false);
    expect(h.playing.line).toMatchObject({ role: 'narrator', text: 'The last rat falls.' });

    h.endLine();
    expect(h.seq.state).toBe('character');
    expect(h.playing.line).toMatchObject({ role: 'character', text: 'Told you. I am a delight in a crisis.' });

    h.endLine();
    expect(h.seq.state).toBe('character');
    expect(h.playing.line).toMatchObject({ role: 'character', text: 'For the Dawn!' });

    h.endLine();
    expect(h.seq.state).toBe('idle');
    expect(h.playing.line).toBeNull();
    expect(h.playing.music).toBe(false);
    expect(h.log).toEqual([
      'music:start',
      'music:end',
      'line:narrator:The last rat falls.',
      'line:end:narrator',
      'line:character:Told you. I am a delight in a crisis.',
      'line:end:character',
      'line:character:For the Dawn!',
      'line:end:character',
    ]);
  });

  it('skips a missing narrator and goes to the character after the sting', () => {
    const h = hookBox();
    h.seq.start({
      lines: [
        { role: 'narrator', text: '', who: 'narrator' },
        { role: 'character', text: 'For the Dawn!', who: 'serAldric' },
      ],
    });
    h.endMusic();
    expect(h.seq.state).toBe('character');
    expect(h.playing.line.text).toBe('For the Dawn!');
  });

  it('onDismiss during music stops the sting and starts the narrator immediately', () => {
    const h = hookBox();
    h.seq.start({
      lines: [
        { role: 'narrator', text: 'Victory is yours.', who: 'narrator' },
        { role: 'character', text: 'Hold the line!', who: 'serAldric' },
      ],
    });
    expect(h.seq.state).toBe('music');
    h.seq.onDismiss();
    expect(h.log).toContain('music:stop');
    expect(h.playing.music).toBe(false);
    expect(h.seq.state).toBe('narrator');
    expect(h.playing.line).toMatchObject({ role: 'narrator' });
    // A late music-end from a cancelled sting must not skip or overlap the narrator.
    h.endMusic();
    expect(h.seq.state).toBe('narrator');
    expect(h.playing.line).toMatchObject({ role: 'narrator', text: 'Victory is yours.' });
  });

  it('onDismiss during a voice line lets it finish, then continues in order', () => {
    const h = hookBox();
    h.seq.start({
      lines: [
        { role: 'narrator', text: 'Victory is yours.', who: 'narrator' },
        { role: 'character', text: 'Hold the line!', who: 'serAldric' },
      ],
    });
    h.endMusic();
    h.seq.onDismiss();
    expect(h.seq.state).toBe('narrator');
    expect(h.playing.line.text).toBe('Victory is yours.');
    h.endLine();
    expect(h.seq.state).toBe('character');
    expect(h.playing.line.text).toBe('Hold the line!');
  });

  it('onLeave stops everything and drops the remaining queue', () => {
    const h = hookBox();
    h.seq.start({
      lines: [
        { role: 'narrator', text: 'Victory is yours.', who: 'narrator' },
        { role: 'character', text: 'Hold the line!', who: 'serAldric' },
      ],
    });
    h.endMusic();
    expect(h.seq.state).toBe('narrator');
    h.seq.onLeave();
    expect(h.seq.state).toBe('idle');
    expect(h.seq.isActive()).toBe(false);
    expect(h.playing.line).toBeNull();
    expect(h.log).toContain('line:stop:narrator');
    h.endLine(); // stale end must not restart a dropped line
    expect(h.seq.state).toBe('idle');
    expect(h.playing.line).toBeNull();
  });

  it('a second start cancels the first sequence', () => {
    const h = hookBox();
    h.seq.start({ lines: [{ role: 'narrator', text: 'First win.', who: 'narrator' }] });
    h.endMusic();
    expect(h.playing.line.text).toBe('First win.');
    h.seq.start({ lines: [{ role: 'narrator', text: 'Second win.', who: 'narrator' }] });
    expect(h.seq.state).toBe('music');
    expect(h.log).toContain('line:stop:narrator');
    expect(h.log).toContain('music:start');
    h.endLine(); // stale first-line end must not jump the new sting
    expect(h.seq.state).toBe('music');
    h.endMusic();
    expect(h.playing.line.text).toBe('Second win.');
  });

  it('late character lines enqueue and wait their turn instead of overlapping or being dropped', () => {
    const h = hookBox();
    h.seq.start({ lines: [{ role: 'narrator', text: 'Victory is yours.', who: 'narrator' }] });
    expect(h.seq.isActive()).toBe(true);
    const queued = h.seq.enqueue({ role: 'character', text: 'For the Dawn!', who: 'serAldric' });
    expect(queued).toBe(true);
    expect(h.playing.music).toBe(true);
    expect(h.playing.line).toBeNull();
    h.endMusic();
    expect(h.playing.line.text).toBe('Victory is yours.');
    h.endLine();
    expect(h.playing.line.text).toBe('For the Dawn!');
    h.endLine();
    expect(h.seq.state).toBe('idle');
    expect(h.seq.enqueue({ role: 'character', text: 'too late', who: 'pip' })).toBe(false);
  });

  it('whenIdle resolves after the last line, and immediately when already idle', async () => {
    const h = hookBox();
    await expect(h.seq.whenIdle()).resolves.toBeUndefined();
    let settled = false;
    h.seq.start({ lines: [{ role: 'narrator', text: 'Victory is yours.', who: 'narrator' }] });
    const p = h.seq.whenIdle().then(() => { settled = true; });
    expect(settled).toBe(false);
    h.endMusic();
    expect(settled).toBe(false);
    h.endLine();
    await p;
    expect(h.seq.state).toBe('idle');
  });

  it('onLeave makes whenIdle resolve and drops leftover lines', async () => {
    const h = hookBox();
    h.seq.start({
      lines: [
        { role: 'narrator', text: 'Victory is yours.', who: 'narrator' },
        { role: 'character', text: 'Hold the line!', who: 'serAldric' },
      ],
    });
    const p = h.seq.whenIdle();
    h.endMusic();
    h.seq.onLeave();
    await p;
    expect(h.seq.state).toBe('idle');
    expect(h.playing.line).toBeNull();
  });

  it('start can use a custom playMusic hook (chest/rare reveal) and still run voices after', () => {
    const h = hookBox();
    const custom = [];
    let revealDone = null;
    h.seq.start({
      lines: [
        { role: 'narrator', text: 'Rare find!', who: 'narrator' },
        { role: 'character', text: 'Shiny!', who: 'pip' },
      ],
      playMusic: (done) => { custom.push('reveal:start'); h.playing.music = true; revealDone = done; },
    });
    expect(h.seq.state).toBe('music');
    expect(custom).toEqual(['reveal:start']);
    expect(h.log).not.toContain('music:start');
    expect(h.playing.line).toBeNull();
    h.playing.music = false; custom.push('reveal:end'); revealDone();
    expect(h.seq.state).toBe('narrator');
    expect(h.playing.line.text).toBe('Rare find!');
    h.endLine();
    expect(h.playing.line.text).toBe('Shiny!');
    h.endLine();
    expect(h.seq.state).toBe('idle');
  });
});

describe('insertAfterNarrator', () => {
  it('places pending kill barks after the narrator and before later character lines', () => {
    const lines = insertAfterNarrator([
      { role: 'narrator', text: 'Victory! You found 38 gold.', who: 'narrator' },
      { role: 'character', text: 'We won. And yet… did we?', who: 'grumsh' },
    ], [
      { role: 'character', text: 'Farewell, Blackspire Cultist. You will have a stanza. A short one.', who: 'grumsh' },
    ]);
    expect(lines.map((l) => l.text)).toEqual([
      'Victory! You found 38 gold.',
      'Farewell, Blackspire Cultist. You will have a stanza. A short one.',
      'We won. And yet… did we?',
    ]);
  });
});
