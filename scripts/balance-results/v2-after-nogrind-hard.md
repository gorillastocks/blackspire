# Blackspire balance sim — v2-after-nogrind-hard

200 seeded campaigns (200 per party × standard), difficulty hard, grinding off, seeds 1…200. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 11s.

## All parties (200 runs; victories 193/200; results {"victory":193,"stuck on B3":3,"stuck on B5":2,"stuck on B4":1,"stuck on B1":1}; mean wipes/run 2.0; mean moon 7.0, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.6 (50) | 0.0 | 9.9 | 1 | 6.0 | 0.9 | 2.7 | 0.5 | 84 (2.4) | 622 / 475 | 2.0 | 1.9/0.3/0.0 | 0 · 0.0 · 0.0 | 300 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 91 / 91 | – | 0.2 (18) | 0.1 | 8.5 | 10 | 4.6 | 0.4 | 0.4 | 0.2 | 97 (2.1) | 1329 / 540 | 4.0 | 1.9/0.4/0.1 | 0 · 0.0 · 0.0 | 276 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 91 / 84 | – | 0.4 (25) | 0.2 | 13.5 | 15 | 5.1 | 0.5 | 0.2 | 0.1 | 94 (3.2) | 2816 / 2092 | 3.0 | 2.2/0.9/0.3 | 0 · 0.0 · 0.0 | 483 | 20 |
| B4 | 7.0 (7) | 7.9 (8) | 88 / 86 | – | 0.5 (33) | 0.2 | 12.0 | 6 | 6.1 | 0.5 | 0.2 | 0.1 | 92 (3.3) | 3577 / 309 | 3.0 | 1.9/1.2/0.4 | 0 · 0.0 · 0.0 | 421 | 20 |
| B5 | 9.0 (9) | 9.0 (9) | 95 / 96 | 96 / 93 | 0.3 (23) | 0.1 | 9.9 | 6 | 7.3 | 0.4 | 0.1 | 0.2 | 97 (3.1) | 4539 / 188 | 3.0 | 1.8/1.3/0.5 | 0 · 0.0 · 0.0 | 264 | 18 |

## Party: standard (200 runs; victories 193/200; results {"victory":193,"stuck on B3":3,"stuck on B5":2,"stuck on B4":1,"stuck on B1":1}; mean wipes/run 2.0; mean moon 7.0, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.6 (50) | 0.0 | 9.9 | 1 | 6.0 | 0.9 | 2.7 | 0.5 | 84 (2.4) | 622 / 475 | 2.0 | 1.9/0.3/0.0 | 0 · 0.0 · 0.0 | 300 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 91 / 91 | – | 0.2 (18) | 0.1 | 8.5 | 10 | 4.6 | 0.4 | 0.4 | 0.2 | 97 (2.1) | 1329 / 540 | 4.0 | 1.9/0.4/0.1 | 0 · 0.0 · 0.0 | 276 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 91 / 84 | – | 0.4 (25) | 0.2 | 13.5 | 15 | 5.1 | 0.5 | 0.2 | 0.1 | 94 (3.2) | 2816 / 2092 | 3.0 | 2.2/0.9/0.3 | 0 · 0.0 · 0.0 | 483 | 20 |
| B4 | 7.0 (7) | 7.9 (8) | 88 / 86 | – | 0.5 (33) | 0.2 | 12.0 | 6 | 6.1 | 0.5 | 0.2 | 0.1 | 92 (3.3) | 3577 / 309 | 3.0 | 1.9/1.2/0.4 | 0 · 0.0 · 0.0 | 421 | 20 |
| B5 | 9.0 (9) | 9.0 (9) | 95 / 96 | 96 / 93 | 0.3 (23) | 0.1 | 9.9 | 6 | 7.3 | 0.4 | 0.1 | 0.2 | 97 (3.1) | 4539 / 188 | 3.0 | 1.8/1.3/0.5 | 0 · 0.0 · 0.0 | 264 | 18 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | elite | direWolfx1 | 263 | 24.3 | 1.21 | 0.31 | 0.94 | 36 | 5.2 | 1.5 | 1 |
| B4 | elite | hellHoundx2 | 235 | 17.0 | 1.68 | 0.18 | 0.00 | 54 | 6.4 | 7.0 | 5 |
| B3 | boss | glasshidex1+gargoylex2+darkmantlex2 | 232 | 15.5 | 1.35 | 0.15 | 0.05 | 38 | 6.4 | 6.0 | 5 |
| B4 | boss | brakkx1+cindermawx1 | 226 | 13.7 | 1.46 | 0.07 | 0.17 | 49 | 3.1 | 7.9 | 7 |
| B2 | boss | ankylosaurusx1+giantWaspx3 | 218 | 8.7 | 1.60 | 0.06 | 0.12 | 43 | 4.6 | 4.0 | 4 |
| B1 | random | wolfx2 | 82 | 8.5 | 0.73 | 0.07 | 0.39 | 19 | 2.5 | 1.1 | 1 |
| B3 | elite | ochreJellyx2 | 217 | 8.3 | 0.98 | 0.20 | 0.05 | 29 | 6.8 | 5.0 | 3 |
| B5 | phase2 | tyrannosaurusx1 | 207 | 6.8 | 2.16 | 0.05 | 0.01 | 18 | 5.0 | 9.0 | 5 |
| B1 | fixed | wolfx2 | 400 | 6.8 | 0.87 | 0.12 | 0.32 | 19 | 2.7 | 1.1 | 1 |
| B5 | elite | triceratopsx1+allosaurusx2 | 208 | 6.7 | 1.02 | 0.12 | 0.01 | 25 | 6.0 | 9.0 | 6 |
| B2 | elite | giantToadx1+giantCrabx3 | 213 | 6.6 | 0.96 | 0.19 | 0.09 | 24 | 6.1 | 3.1 | 2 |
| B5 | fixed | triceratopsx2+allosaurusx1 | 194 | 6.2 | 0.85 | 0.06 | 0.01 | 23 | 4.3 | 9.0 | 8 |
| B5 | random | hellHoundx3 | 69 | 5.8 | 0.75 | 0.01 | 0.00 | 31 | 3.4 | 9.0 | 5 |
| B3 | elite | darkmantlex4 | 210 | 5.7 | 0.50 | 0.02 | 0.00 | 28 | 4.4 | 5.1 | 2 |
| B1 | fixed | giantFrogx2+giantRatx2 | 200 | 5.5 | 0.78 | 0.04 | 0.14 | 20 | 3.5 | 1.0 | 1 |
| B1 | elite | giantWolfSpiderx1+giantRatx2 | 210 | 5.2 | 0.48 | 0.05 | 0.19 | 22 | 3.4 | 1.6 | 1 |
| B4 | elite | animatedArmorx3 | 205 | 4.9 | 0.31 | 0.02 | 0.00 | 17 | 5.0 | 7.0 | 3 |
| B5 | boss | malthraxx1+gargoylex2+animatedArmorx2 | 203 | 4.4 | 1.43 | 0.01 | 0.05 | 33 | 5.6 | 9.0 | 8 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|
| B2 | random | cultistx3 | 33 | 3 | 0.00 | 67 | 3.1 | 1 |
| B4 | random | magminx4 | 46 | 4 | 0.00 | 72 | 7.0 | 2 |
| B2 | random | giantCrabx2 | 23 | 4 | 0.00 | 70 | 3.2 | 1 |
| B5 | random | animatedArmorx3 | 37 | 4 | 0.00 | 81 | 9.0 | 3 |
| B2 | random | giantCrabx3 | 29 | 5 | 0.00 | 69 | 3.1 | 1 |

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 247 · B1 wolf: 161 · B1 giantWolfSpider: 62 · B4 cindermaw: 37 · B2 giantToad: 30 · B2 ankylosaurus: 22 · B1 giantFrog: 21 · B2 giantWasp: 20 · B1 giantPoisonousSnake: 19 · B1 giantRat: 15 · B3 ochreJelly: 11 · B5 malthrax: 11 · B3 glasshide: 11 · B2 sisterVey: 9

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B1 wolf: 51 · B1 direWolf: 27 · B2 giantToad: 24 · B5 malthrax: 13 · B5 tyrannosaurus: 10 · B1 giantWolfSpider: 10 · B3 motherSporegrave: 9 · B3 ochreJelly: 8 · B3 glasshide: 7 · B4 minotaurSkeleton: 5 · B4 cultFanatic: 5 · B2 giantWasp: 5 · B4 cindermaw: 4 · B1 cultist: 4
