# GrokWizard

A Wizardry-style first-person grid dungeon crawler rendered in neon 3D with three.js, using D&D 5e **SRD 5.1** rules.

**Play:** https://gorillastocks.github.io/grokwizard/

- Create a hero. Three quirky companions (Brambur, Fizzwick, Pip) join you, and each can be set to AI or player control.
- In the town of Grokhaven you'll find the tavern, inn, temple, shop, and training grounds.
- There are 3 maze levels (21×21), with doors, secret doors, traps, chests, keys, a boss per level, and the final boss GROKZILLA.
- Combat is turn-based SRD 5e: initiative, advantage, crits, death saves, concentration, spell slots, short and long rests, and levels 1–6.
- Saves go to localStorage. Controls: keyboard (WASD/QE/arrows), touch swipes, and on-screen buttons. It installs as a PWA.

## Dev
```
npm install
npm run dev        # play locally
npm test           # rules, level-solvability and balance-sim tests (vitest)
npm run build && npm run e2e   # Playwright smoke (desktop + iPhone)
```
See ATTRIBUTION.md for licenses.
