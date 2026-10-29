# Blackspire balance sim — ranks-before-nogrind

1200 seeded campaigns (300 per party × standard / nohealer / liora / rush), difficulty normal, grinding off, seeds 1…300. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 75s.

## All parties (1200 runs; victories 953/1200; results {"victory":953,"stuck on B4":34,"stuck on B2":118,"stuck on B3":50,"stuck on B5":45}; mean wipes/run 3.4; mean moon 6.6, empowered finale 91%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.5 (3) | 99 / 99 | – | 0.1 (11) | 0.0 | 8.2 | 1 | 2.8 | 0.3 | 0.9 | 0.2 | 97 (1.8) | 533 / 437 | 1.5 | 1.5/0.3/0.0 | 0 · 0.0 · 0.0 | 234 | 9 |
| B2 | 3.0 (3) | 3.7 (4) | 75 / 45 | – | 1.2 (31) | 1.1 | 8.5 | 12 | 7.5 | 0.6 | 0.3 | 0.1 | 96 (1.6) | 1056 / 593 | 3.0 | 1.4/0.4/0.0 | 0 · 0.0 · 0.0 | 294 | 13 |
| B3 | 4.8 (5) | 5.8 (6) | 87 / 68 | – | 0.6 (22) | 0.5 | 12.2 | 14 | 5.0 | 0.5 | 0.1 | 0.1 | 95 (2.5) | 2425 / 1805 | 2.4 | 1.8/0.7/0.1 | 0 · 0.0 · 0.0 | 475 | 19 |
| B4 | 6.8 (7) | 7.6 (8) | 86 / 79 | – | 0.7 (29) | 0.3 | 10.9 | 6 | 5.3 | 0.5 | 0.2 | 0.1 | 88 (3.0) | 3111 / 397 | 2.5 | 1.8/0.9/0.3 | 0 · 0.0 · 0.0 | 388 | 18 |
| B5 | 8.8 (9) | 9.0 (9) | 73 / 65 | 86 / 86 | 1.1 (45) | 0.7 | 10.2 | 6 | 13.2 | 0.5 | 0.3 | 0.3 | 91 (3.1) | 4194 / 467 | 2.5 | 1.7/1.2/0.4 | 0 · 0.0 · 0.0 | 314 | 20 |

## Party: standard (300 runs; victories 296/300; results {"victory":296,"stuck on B4":1,"stuck on B3":2,"stuck on B2":1}; mean wipes/run 1.0; mean moon 6.7, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (11) | 0.0 | 9.4 | 1 | 2.8 | 0.3 | 0.9 | 0.2 | 96 (2.1) | 629 / 552 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 285 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 88 / 85 | – | 0.2 (16) | 0.2 | 8.7 | 13 | 3.7 | 0.3 | 0.1 | 0.1 | 98 (2.0) | 1332 / 568 | 4.0 | 1.9/0.5/0.1 | 0 · 0.0 · 0.0 | 283 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 95 / 91 | – | 0.2 (12) | 0.1 | 13.2 | 15 | 3.5 | 0.3 | 0.1 | 0.1 | 98 (3.1) | 2846 / 2043 | 3.0 | 2.3/0.9/0.2 | 0 · 0.0 · 0.0 | 469 | 19 |
| B4 | 7.0 (7) | 8.0 (8) | 91 / 91 | – | 0.3 (19) | 0.1 | 11.7 | 6 | 4.1 | 0.3 | 0.1 | 0.1 | 96 (3.1) | 3592 / 155 | 3.0 | 2.1/1.0/0.4 | 0 · 0.0 · 0.0 | 418 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 90 / 91 | 92 / 93 | 0.3 (23) | 0.2 | 10.0 | 7 | 8.3 | 0.3 | 0.1 | 0.2 | 99 (3.0) | 4599 / 137 | 3.0 | 1.9/1.2/0.5 | 0 · 0.0 · 0.0 | 249 | 18 |

## Party: nohealer (300 runs; victories 247/300; results {"victory":247,"stuck on B4":11,"stuck on B2":21,"stuck on B5":5,"stuck on B3":16}; mean wipes/run 3.6; mean moon 7.5, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (19) | 0.0 | 9.4 | 1 | 4.5 | 0.6 | 1.4 | 0.4 | 94 (2.1) | 623 / 528 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 287 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 78 / 53 | – | 1.1 (35) | 0.8 | 9.5 | 11 | 8.3 | 1.2 | 0.2 | 0.1 | 93 (2.2) | 1323 / 849 | 4.0 | 1.8/0.5/0.1 | 0 · 0.0 · 0.0 | 327 | 14 |
| B3 | 4.9 (5) | 5.9 (6) | 79 / 61 | – | 0.9 (35) | 0.6 | 13.9 | 12 | 6.4 | 0.9 | 0.2 | 0.1 | 92 (3.2) | 2833 / 1788 | 3.0 | 2.3/0.9/0.2 | 0 · 0.0 · 0.0 | 526 | 21 |
| B4 | 6.9 (7) | 7.8 (8) | 91 / 89 | – | 0.8 (40) | 0.1 | 12.1 | 5 | 6.4 | 0.9 | 0.2 | 0.1 | 83 (3.5) | 3485 / 785 | 2.9 | 2.1/1.0/0.2 | 0 · 0.0 · 0.0 | 416 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 76 / 75 | 77 / 82 | 0.9 (58) | 0.5 | 10.3 | 5 | 13.9 | 0.8 | 0.1 | 0.2 | 91 (3.2) | 4480 / 726 | 3.0 | 1.8/1.2/0.5 | 0 · 0.0 · 0.0 | 312 | 20 |

## Party: liora (300 runs; victories 290/300; results {"victory":290,"stuck on B3":3,"stuck on B4":2,"stuck on B2":4,"stuck on B5":1}; mean wipes/run 1.3; mean moon 6.9, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (8) | 0.0 | 9.4 | 1 | 2.5 | 0.2 | 0.7 | 0.2 | 98 (2.0) | 626 / 557 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 284 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 88 / 82 | – | 0.3 (16) | 0.2 | 8.8 | 13 | 3.7 | 0.3 | 0.0 | 0.1 | 99 (2.0) | 1334 / 799 | 4.0 | 1.9/0.4/0.0 | 0 · 0.0 · 0.0 | 286 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 95 / 89 | – | 0.2 (16) | 0.1 | 13.4 | 14 | 4.1 | 0.4 | 0.0 | 0.1 | 96 (3.1) | 2850 / 2475 | 3.0 | 2.3/0.9/0.2 | 0 · 0.0 · 0.0 | 470 | 20 |
| B4 | 7.0 (7) | 7.9 (8) | 94 / 94 | – | 0.2 (14) | 0.1 | 11.7 | 6 | 2.8 | 0.2 | 0.0 | 0.1 | 96 (3.1) | 3579 / 297 | 3.0 | 2.1/1.0/0.3 | 0 · 0.0 · 0.0 | 415 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 71 / 74 | 95 / 95 | 0.5 (39) | 0.4 | 10.3 | 6 | 10.4 | 0.2 | 0.2 | 0.3 | 99 (3.0) | 4578 / 134 | 3.0 | 1.9/1.2/0.4 | 0 · 0.0 · 0.0 | 260 | 19 |

## Party: rush (300 runs; victories 120/300; results {"stuck on B2":92,"victory":120,"stuck on B3":29,"stuck on B5":39,"stuck on B4":20}; mean wipes/run 7.6; mean moon 5.4, empowered finale 62%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 1.0 (3) | 96 / 96 | – | 0.0 (4) | 0.0 | 4.6 | 0 | 1.6 | 0.1 | 0.5 | 0.1 | 100 (1.0) | 255 / 109 | 0.0 | 0.8/0.2/0.0 | 0 · 0.0 · 0.0 | 79 | 6 |
| B2 | 3.0 (3) | 3.0 (4) | 44 / 18 | – | 3.3 (56) | 3.2 | 7.0 | 11 | 14.2 | 0.7 | 0.9 | 0.3 | – (0.0) | 233 / 158 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 278 | 15 |
| B3 | 4.0 (5) | 5.0 (6) | 73 / 42 | – | 1.5 (30) | 1.2 | 6.5 | 14 | 6.6 | 0.6 | 0.2 | 0.2 | 100 (0.0) | 667 / 532 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 423 | 14 |
| B4 | 6.0 (7) | 6.0 (8) | 54 / 46 | – | 2.1 (56) | 1.1 | 6.7 | 6 | 9.5 | 0.5 | 0.7 | 0.2 | 54 (1.7) | 994 / 389 | 0.0 | 0.6/0.3/0.1 | 0 · 0.0 · 0.0 | 250 | 13 |
| B5 | 7.9 (9) | 8.8 (9) | 37 / 29 | 63 / 66 | 3.8 (79) | 2.3 | 9.9 | 3 | 26.0 | 0.8 | 1.1 | 0.5 | 61 (3.1) | 2280 / 1279 | 0.0 | 0.8/0.8/0.2 | 0 · 0.0 · 0.0 | 537 | 23 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B2 | boss | ankylosaurusx1+giantWaspx3 | 2396 | 54.8 | 2.75 | 0.18 | 0.13 | 71 | 5.8 | 3.5 | 4 |
| B5 | boss | malthraxx1+gargoylex2+animatedArmorx2 | 1472 | 35.1 | 4.03 | 0.07 | 0.19 | 61 | 6.5 | 8.9 | 8 |
| B3 | boss | glasshidex1+gargoylex2+darkmantlex2 | 1519 | 32.1 | 1.57 | 0.18 | 0.04 | 50 | 6.6 | 5.7 | 5 |
| B4 | elite | animatedArmorx3 | 1283 | 21.6 | 0.98 | 0.14 | 0.00 | 37 | 7.1 | 6.7 | 3 |
| B4 | boss | brakkx1+cindermawx1 | 1270 | 21.4 | 1.56 | 0.05 | 0.13 | 52 | 3.2 | 7.4 | 7 |
| B5 | elite | triceratopsx1+allosaurusx2 | 1198 | 18.6 | 1.26 | 0.12 | 0.00 | 36 | 6.9 | 8.7 | 6 |
| B5 | phase2 | tyrannosaurusx1 | 1110 | 14.1 | 3.37 | 0.05 | 0.01 | 20 | 6.2 | 9.0 | 5 |
| B4 | elite | hellHoundx2 | 903 | 6.9 | 0.78 | 0.12 | 0.00 | 47 | 7.0 | 7.0 | 5 |
| B3 | elite | violetFungusx4+shriekerx2 | 932 | 6.4 | 0.42 | 0.03 | 0.00 | 22 | 3.9 | 5.0 | 2 |
| B1 | elite | direWolfx1 | 953 | 5.6 | 0.84 | 0.15 | 0.54 | 21 | 4.5 | 1.1 | 1 |
| B2 | elite | giantToadx1+giantCrabx3 | 951 | 5.5 | 0.78 | 0.17 | 0.01 | 21 | 6.6 | 3.1 | 2 |
| B3 | elite | ochreJellyx2 | 922 | 5.2 | 0.74 | 0.16 | 0.01 | 27 | 6.9 | 5.0 | 3 |
| B4 | random | animatedArmorx3 | 453 | 4.4 | 0.22 | 0.02 | 0.00 | 15 | 3.4 | 6.9 | 3 |
| B4 | random | cultFanaticx3+cultistx2 | 414 | 4.3 | 0.37 | 0.02 | 0.02 | 20 | 3.4 | 6.8 | 5 |
| B5 | elite | animatedArmorx4 | 1035 | 4.0 | 0.16 | 0.01 | 0.00 | 23 | 5.0 | 8.8 | 3 |
| B5 | random | animatedArmorx4 | 212 | 3.8 | 0.20 | 0.02 | 0.00 | 12 | 3.3 | 8.9 | 3 |
| B4 | elite | cultFanaticx2+cultistx2 | 871 | 3.6 | 0.28 | 0.04 | 0.01 | 28 | 6.2 | 7.0 | 4 |
| B2 | random | giantCrabx2+giantWaspx2 | 191 | 3.1 | 0.32 | 0.04 | 0.03 | 14 | 3.3 | 3.1 | 2 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 511 · B5 malthrax: 277 · B2 ankylosaurus: 216 · B1 giantWolfSpider: 208 · B1 wolf: 191 · B4 cindermaw: 108 · B2 giantWasp: 102 · B3 glasshide: 64 · B1 giantSpider: 61 · B1 giantPoisonousSnake: 59 · B4 brakk: 54 · B4 cultFanatic: 41 · B3 ochreJelly: 22 · B2 giantToad: 21

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B5 malthrax: 166 · B1 wolf: 83 · B2 ankylosaurus: 75 · B1 direWolf: 73 · B3 glasshide: 66 · B5 tyrannosaurus: 62 · B1 giantWolfSpider: 48 · B2 giantToad: 44 · B4 cultFanatic: 39 · B5 triceratops: 24 · B4 brakk: 23 · B2 giantWasp: 21 · B3 ochreJelly: 20 · B4 cindermaw: 18
