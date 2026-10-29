# Blackspire balance sim — bosses-after-nogrind

300 seeded campaigns (300 per party × standard), difficulty normal, grinding off, seeds 1…300. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 17s.

## All parties (300 runs; victories 288/300; results {"victory":288,"stuck on B4":1,"stuck on B3":7,"stuck on B2":4}; mean wipes/run 1.5; mean moon 6.6, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (11) | 0.0 | 9.6 | 1 | 3.2 | 0.2 | 1.0 | 0.2 | 96 (2.1) | 630 / 540 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 284 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 81 / 74 | – | 0.4 (24) | 0.3 | 9.0 | 8 | 4.3 | 0.4 | 0.1 | 0.1 | 98 (2.0) | 1367 / 652 | 4.0 | 1.9/0.5/0.1 | 0 · 0.0 · 0.0 | 292 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 86 / 73 | – | 0.4 (17) | 0.4 | 13.6 | 14 | 4.1 | 0.4 | 0.2 | 0.1 | 99 (3.0) | 2871 / 1961 | 3.0 | 2.4/0.9/0.2 | 0 · 0.0 · 0.0 | 495 | 20 |
| B4 | 7.0 (7) | 7.9 (8) | 85 / 85 | – | 0.3 (22) | 0.2 | 12.0 | 5 | 3.5 | 0.2 | 0.1 | 0.0 | 98 (3.1) | 3723 / 146 | 3.0 | 2.1/1.1/0.3 | 0 · 0.0 · 0.0 | 416 | 20 |
| B5 | 9.0 (9) | 9.0 (9) | 85 / 86 | 95 / 96 | 0.2 (20) | 0.2 | 10.1 | 6 | 7.4 | 0.3 | 0.1 | 0.2 | 99 (3.0) | 4682 / 127 | 3.0 | 1.8/1.3/0.5 | 0 · 0.0 · 0.0 | 244 | 18 |

## Party: standard (300 runs; victories 288/300; results {"victory":288,"stuck on B4":1,"stuck on B3":7,"stuck on B2":4}; mean wipes/run 1.5; mean moon 6.6, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (11) | 0.0 | 9.6 | 1 | 3.2 | 0.2 | 1.0 | 0.2 | 96 (2.1) | 630 / 540 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 284 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 81 / 74 | – | 0.4 (24) | 0.3 | 9.0 | 8 | 4.3 | 0.4 | 0.1 | 0.1 | 98 (2.0) | 1367 / 652 | 4.0 | 1.9/0.5/0.1 | 0 · 0.0 · 0.0 | 292 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 86 / 73 | – | 0.4 (17) | 0.4 | 13.6 | 14 | 4.1 | 0.4 | 0.2 | 0.1 | 99 (3.0) | 2871 / 1961 | 3.0 | 2.4/0.9/0.2 | 0 · 0.0 · 0.0 | 495 | 20 |
| B4 | 7.0 (7) | 7.9 (8) | 85 / 85 | – | 0.3 (22) | 0.2 | 12.0 | 5 | 3.5 | 0.2 | 0.1 | 0.0 | 98 (3.1) | 3723 / 146 | 3.0 | 2.1/1.1/0.3 | 0 · 0.0 · 0.0 | 416 | 20 |
| B5 | 9.0 (9) | 9.0 (9) | 85 / 86 | 95 / 96 | 0.2 (20) | 0.2 | 10.1 | 6 | 7.4 | 0.3 | 0.1 | 0.2 | 99 (3.0) | 4682 / 127 | 3.0 | 1.8/1.3/0.5 | 0 · 0.0 · 0.0 | 244 | 18 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B3 | boss | glasshidex1+gargoylex2+darkmantlex2 | 395 | 26.8 | 1.77 | 0.20 | 0.12 | 44 | 8.2 | 6.0 | 5 |
| B2 | boss | ankylosaurusx1+giantWaspx3 | 400 | 26.0 | 2.10 | 0.13 | 0.04 | 55 | 6.9 | 4.0 | 4 |
| B4 | boss | brakkx1+cindermawx1 | 339 | 15.0 | 1.50 | 0.04 | 0.09 | 48 | 3.4 | 7.9 | 7 |
| B5 | boss | malthraxx1+gargoylex2+animatedArmorx2 | 333 | 13.5 | 3.55 | 0.11 | 0.12 | 46 | 7.8 | 9.0 | 8 |
| B4 | random | gargoylex3+magminx2+cultFanaticx2 | 52 | 7.7 | 0.62 | 0.15 | 0.00 | 19 | 5.3 | 7.0 | 7 |
| B1 | elite | direWolfx1 | 319 | 6.0 | 0.82 | 0.13 | 0.54 | 20 | 4.2 | 1.1 | 1 |
| B3 | random | ochreJellyx2+darkmantlex2+giantCentipedex2+shriekerx1 | 66 | 4.5 | 0.55 | 0.08 | 0.00 | 23 | 4.8 | 5.0 | 5 |
| B5 | phase2 | tyrannosaurusx1 | 301 | 4.3 | 1.92 | 0.02 | 0.00 | 11 | 6.1 | 9.0 | 5 |
| B2 | elite | giantToadx1+giantCrabx3 | 312 | 3.8 | 0.48 | 0.09 | 0.02 | 19 | 6.9 | 3.0 | 2 |
| B4 | elite | hellHoundx2 | 300 | 3.7 | 0.43 | 0.03 | 0.00 | 39 | 7.3 | 7.0 | 5 |
| B3 | random | ochreJellyx2+darkmantlex2+giantCentipedex1+shriekerx1 | 58 | 3.4 | 0.59 | 0.09 | 0.00 | 24 | 4.6 | 5.0 | 5 |
| B2 | random | giantCrabx2+giantWaspx1 | 36 | 2.8 | 0.22 | 0.03 | 0.00 | 10 | 2.9 | 3.2 | 1 |
| B4 | elite | cultFanaticx2+cultistx2 | 295 | 2.4 | 0.18 | 0.02 | 0.00 | 20 | 5.8 | 7.0 | 4 |
| B1 | random | wolfx2 | 128 | 2.3 | 0.33 | 0.02 | 0.09 | 8 | 1.9 | 1.1 | 1 |
| B4 | random | minotaurSkeletonx2+magminx2+cultistx2+cultFanaticx1 | 88 | 2.3 | 0.24 | 0.01 | 0.01 | 17 | 4.2 | 7.0 | 5 |
| B5 | random | minotaurSkeletonx2+hellHoundx1+animatedArmorx1+cultFanaticx1 | 99 | 2.0 | 0.22 | 0.04 | 0.00 | 16 | 4.8 | 9.0 | 6 |
| B2 | random | direWolfx1+flyingSwordx2+cultistx2 | 104 | 1.9 | 0.51 | 0.09 | 0.01 | 18 | 4.8 | 3.1 | 2 |
| B4 | fixed | cultFanaticx4 | 289 | 1.7 | 0.25 | 0.01 | 0.00 | 18 | 3.6 | 7.0 | 5 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|
| B4 | random | magminx3 | 56 | 1 | 0.00 | 79 | 7.1 | 2 |
| B2 | random | cultistx3 | 32 | 2 | 0.00 | 78 | 3.1 | 1 |
| B2 | random | giantCrabx2 | 22 | 3 | 0.00 | 73 | 3.0 | 1 |
| B5 | random | minotaurSkeletonx2+animatedArmorx1 | 43 | 4 | 0.00 | 79 | 9.0 | 5 |
| B2 | random | cultistx4 | 41 | 4 | 0.00 | 80 | 3.1 | 1 |
| B5 | random | allosaurusx2 | 69 | 5 | 0.00 | 83 | 9.0 | 3 |
| B3 | random | giantCentipedex3+violetFungusx2+shriekerx1 | 30 | 6 | 0.00 | 70 | 5.1 | 2 |
| B5 | random | allosaurusx3 | 46 | 6 | 0.00 | 0 | 9.0 | 5 |
| B3 | random | giantCentipedex3+violetFungusx1+shriekerx1 | 27 | 7 | 0.00 | 74 | 5.1 | 2 |

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 171 · B1 giantWolfSpider: 62 · B3 glasshide: 49 · B1 wolf: 49 · B5 malthrax: 41 · B4 cindermaw: 23 · B1 giantPoisonousSnake: 16 · B2 ankylosaurus: 15 · B2 giantToad: 8 · B4 brakk: 8 · B1 giantFrog: 8 · B2 flyingSword: 4 · B2 giantWasp: 3 · B1 cultist: 2

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B5 malthrax: 42 · B1 direWolf: 28 · B1 wolf: 26 · B3 glasshide: 24 · B2 ankylosaurus: 8 · B1 giantWolfSpider: 8 · B5 tyrannosaurus: 7 · B2 giantToad: 7 · B1 giantPoisonousSnake: 6 · B4 cultFanatic: 5 · B4 brakk: 4 · B3 ochreJelly: 4 · B5 triceratops: 3 · B2 sisterVey: 3
