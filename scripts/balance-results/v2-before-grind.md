# Blackspire balance sim — v2-before-grind

600 seeded campaigns (150 per party × standard / nohealer / liora / rush), difficulty normal, grinding on, seeds 1…150. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 556s.

## All parties (600 runs; victories 599/600; results {"victory":599,"stuck on B1":1}; mean wipes/run 0.2; mean moon 4.7, empowered finale 69%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (17) | 0.0 | 12.1 | 0 | 4.0 | 0.4 | 1.2 | 0.3 | 96 (2.0) | 651 / 545 | 1.6 | 1.7/0.3/0.0 | 90 · 4.4 · 23.6 | 2029 | 33 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (1) | 0.0 | 7.5 | 13 | 0.9 | 0.1 | 0.0 | 0.0 | 100 (1.6) | 1042 / 563 | 3.0 | 1.5/0.4/0.0 | 25 · 0.4 · 0.6 | 268 | 11 |
| B3 | 4.8 (5) | 5.8 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.3 | 18 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (2.8) | 2474 / 1949 | 2.4 | 2.2/0.8/0.2 | 31 · 2.6 · 8.1 | 885 | 24 |
| B4 | 6.8 (7) | 7.6 (8) | 99 / 99 | – | 0.0 (2) | 0.0 | 12.3 | 10 | 0.5 | 0.0 | 0.0 | 0.0 | 100 (2.8) | 3276 / 259 | 2.5 | 1.8/1.0/0.3 | 76 · 2.7 · 10.4 | 980 | 26 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 8.8 | 7 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (2.8) | 3607 / 8 | 2.3 | 1.6/1.1/0.5 | 0 · 0.0 · 0.0 | 192 | 16 |

## Party: standard (150 runs; victories 150/150; results {"victory":150}; mean wipes/run 0.2; mean moon 4.9, empowered finale 84%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.2 (16) | 0.0 | 12.2 | 0 | 3.5 | 0.3 | 1.0 | 0.2 | 96 (2.1) | 692 / 595 | 2.0 | 1.7/0.4/0.0 | 86 · 3.0 · 21.9 | 2003 | 32 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (1) | 0.0 | 8.4 | 13 | 0.5 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 1257 / 469 | 4.0 | 1.9/0.4/0.1 | 0 · 0.0 · 0.0 | 276 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.0 | 18 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2579 / 2145 | 3.0 | 2.3/0.8/0.2 | 1 · 0.0 · 0.1 | 468 | 19 |
| B4 | 7.0 (7) | 7.8 (8) | 99 / 99 | – | 0.0 (1) | 0.0 | 12.5 | 8 | 0.5 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3504 / 0 | 3.0 | 2.0/1.2/0.2 | 70 · 1.2 · 6.1 | 784 | 24 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.6 | 8 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4055 / 0 | 3.0 | 1.8/1.2/0.5 | 0 · 0.0 · 0.0 | 221 | 17 |

## Party: nohealer (150 runs; victories 150/150; results {"victory":150}; mean wipes/run 0.3; mean moon 5.0, empowered finale 91%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.3 (24) | 0.0 | 12.3 | 0 | 5.6 | 0.7 | 1.6 | 0.4 | 94 (2.1) | 685 / 571 | 2.0 | 1.8/0.4/0.0 | 81 · 2.8 · 21.7 | 1996 | 32 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (3) | 0.0 | 8.3 | 11 | 2.3 | 0.3 | 0.1 | 0.1 | 99 (2.0) | 1249 / 802 | 4.0 | 1.8/0.4/0.0 | 0 · 0.0 · 0.0 | 278 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.3 | 18 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2611 / 1493 | 3.0 | 2.4/0.8/0.2 | 21 · 0.4 · 2.1 | 606 | 21 |
| B4 | 7.0 (7) | 7.8 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 12.8 | 8 | 0.5 | 0.1 | 0.0 | 0.0 | 100 (3.0) | 3582 / 4 | 3.0 | 2.1/1.1/0.3 | 75 · 1.4 · 7.0 | 866 | 25 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.5 | 6 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4064 / 0 | 3.0 | 1.9/1.2/0.4 | 0 · 0.0 · 0.0 | 218 | 17 |

## Party: liora (150 runs; victories 150/150; results {"victory":150}; mean wipes/run 0.1; mean moon 5.1, empowered finale 97%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (9) | 0.0 | 12.6 | 0 | 3.0 | 0.2 | 0.9 | 0.2 | 98 (2.0) | 694 / 606 | 2.0 | 1.8/0.3/0.0 | 95 · 3.4 · 24.9 | 2230 | 35 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 8.4 | 12 | 0.5 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 1272 / 770 | 4.0 | 2.0/0.5/0.0 | 0 · 0.0 · 0.0 | 277 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 12.9 | 18 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2589 / 2525 | 3.0 | 2.3/1.0/0.1 | 3 · 0.0 · 0.1 | 469 | 19 |
| B4 | 7.0 (7) | 7.9 (8) | 100 / 100 | – | 0.0 (1) | 0.0 | 12.5 | 9 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3544 / 120 | 3.0 | 2.0/1.1/0.3 | 62 · 1.2 · 5.1 | 719 | 23 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.6 | 7 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4047 / 0 | 3.0 | 1.6/1.4/0.5 | 0 · 0.0 · 0.0 | 218 | 17 |

## Party: rush (150 runs; victories 149/150; results {"victory":149,"stuck on B1":1}; mean wipes/run 0.3; mean moon 3.8, empowered finale 4%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (17) | 0.0 | 11.3 | 0 | 4.0 | 0.4 | 1.1 | 0.4 | 95 (1.9) | 533 / 408 | 0.5 | 1.6/0.2/0.0 | 99 · 8.4 · 25.9 | 1885 | 30 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 5.0 | 21 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (0.5) | 385 / 208 | 0.1 | 0.4/0.1/0.0 | 99 · 1.8 · 2.6 | 242 | 8 |
| B3 | 4.4 (5) | 5.1 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 14.2 | 18 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (2.3) | 2114 / 1629 | 0.8 | 1.6/0.7/0.1 | 99 · 9.9 · 30.2 | 2004 | 38 |
| B4 | 6.3 (7) | 7.0 (8) | 98 / 98 | – | 0.1 (5) | 0.0 | 11.4 | 14 | 1.1 | 0.1 | 0.0 | 0.0 | 98 (2.0) | 2468 / 917 | 0.8 | 1.2/0.7/0.2 | 99 · 7.2 · 23.6 | 1558 | 32 |
| B5 | 8.9 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 6.6 | 8 | 0.3 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 2251 / 30 | 0.0 | 0.9/0.7/0.3 | 0 · 0.0 · 0.0 | 110 | 12 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | elite | direWolfx1 | 623 | 6.4 | 0.97 | 0.16 | 0.58 | 21 | 4.6 | 1.1 | 1 |
| B1 | random | wolfx2 | 515 | 2.5 | 0.41 | 0.04 | 0.07 | 11 | 2.1 | 1.0 | 1 |
| B1 | elite | giantWolfSpiderx1+giantRatx2 | 605 | 2.5 | 0.46 | 0.06 | 0.13 | 17 | 3.2 | 1.1 | 1 |
| B1 | fixed | wolfx2 | 1110 | 1.3 | 0.44 | 0.02 | 0.07 | 10 | 2.1 | 1.0 | 1 |
| B1 | fixed | giantFrogx2+giantRatx2 | 572 | 1.2 | 0.39 | 0.03 | 0.01 | 16 | 3.1 | 1.0 | 1 |
| B1 | random | giantRatx2 | 254 | 1.2 | 0.07 | 0.01 | 0.00 | 6 | 1.4 | 1.0 | 1 |
| B4 | elite | hellHoundx2 | 530 | 1.1 | 0.30 | 0.03 | 0.00 | 33 | 3.9 | 6.9 | 5 |
| B1 | random | giantFrogx2 | 269 | 1.1 | 0.14 | 0.01 | 0.00 | 7 | 2.5 | 1.0 | 1 |
| B1 | random | giantRatx3 | 233 | 0.9 | 0.26 | 0.01 | 0.01 | 10 | 2.1 | 1.1 | 1 |
| B1 | random | giantRatx1+giantWolfSpiderx1 | 502 | 0.8 | 0.31 | 0.01 | 0.08 | 8 | 2.1 | 1.0 | 1 |
| B4 | boss | brakkx1+cindermawx1 | 603 | 0.7 | 0.13 | 0.00 | 0.00 | 24 | 2.6 | 7.6 | 7 |
| B2 | elite | giantToadx1+giantCrabx2 | 457 | 0.7 | 0.33 | 0.04 | 0.00 | 9 | 4.2 | 3.0 | 2 |
| B1 | random | giantWolfSpiderx1 | 497 | 0.6 | 0.13 | 0.00 | 0.05 | 4 | 1.5 | 1.0 | 1 |
| B1 | random | giantPoisonousSnakex1 | 503 | 0.6 | 0.26 | 0.03 | 0.14 | 5 | 1.2 | 1.0 | 1 |
| B1 | fixed | cultistx3 | 172 | 0.6 | 0.37 | 0.08 | 0.01 | 4 | 2.5 | 1.0 | 1 |
| B1 | random | giantFrogx1 | 269 | 0.4 | 0.06 | 0.00 | 0.00 | 3 | 1.4 | 1.1 | 1 |
| B2 | lieutenant | sisterVeyx1+cultistx2 | 468 | 0.2 | 0.20 | 0.01 | 0.00 | 14 | 2.9 | 3.0 | 3 |
| B2 | fixed | direWolfx1+wolfx1 | 599 | 0.2 | 0.07 | 0.00 | 0.00 | 8 | 2.5 | 3.0 | 1 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|
| B5 | random | animatedArmorx3 | 113 | 1 | 0.00 | 81 | 9.0 | 3 |
| B4 | random | magminx3 | 217 | 1 | 0.00 | 86 | 6.8 | 2 |
| B3 | elite | violetFungusx2+shriekerx1 | 568 | 1 | 0.00 | 0 | 4.9 | 1 |
| B5 | random | animatedArmorx4 | 112 | 1 | 0.00 | 85 | 9.0 | 3 |
| B3 | fixed | violetFungusx3+shriekerx2 | 513 | 1 | 0.00 | 0 | 4.9 | 1 |
| B3 | random | violetFungusx3+shriekerx1 | 352 | 1 | 0.00 | 90 | 4.8 | 1 |
| B5 | elite | animatedArmorx3 | 599 | 2 | 0.00 | 0 | 9.0 | 3 |
| B2 | random | giantCrabx2 | 72 | 2 | 0.00 | 85 | 3.1 | 1 |
| B4 | elite | animatedArmorx2 | 599 | 2 | 0.00 | 0 | 6.8 | 2 |
| B4 | random | gargoylex3 | 358 | 2 | 0.00 | 0 | 6.8 | 5 |
| B2 | random | cultistx3 | 103 | 2 | 0.00 | 74 | 3.1 | 1 |
| B5 | random | minotaurSkeletonx2+animatedArmorx1 | 114 | 2 | 0.00 | 88 | 9.0 | 5 |
| B3 | random | darkmantlex3 | 161 | 2 | 0.00 | 76 | 4.8 | 2 |
| B5 | random | cultFanaticx4 | 120 | 3 | 0.00 | 0 | 9.0 | 5 |

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 362 · B1 giantWolfSpider: 141 · B1 wolf: 109 · B1 giantPoisonousSnake: 68 · B2 ankylosaurus: 15 · B1 giantFrog: 8 · B1 giantRat: 7 · B1 cultist: 4 · B2 giantToad: 3 · B2 giantWasp: 2 · B1 giantSpider: 2 · B5 tyrannosaurus: 2 · B3 gelatinousCube: 1 · B2 direWolf: 1

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B1 direWolf: 69 · B1 wolf: 56 · B1 giantWolfSpider: 37 · B1 giantPoisonousSnake: 11 · B1 giantFrog: 7 · B2 giantToad: 7 · B5 tyrannosaurus: 4 · B1 cultist: 4 · B1 giantRat: 2 · B4 cindermaw: 1 · B4 hellHound: 1 · B2 ankylosaurus: 1 · B4 minotaurSkeleton: 1 · B4 brakk: 1
