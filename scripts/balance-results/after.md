# Blackspire balance sim — after

800 seeded campaigns (200 per party × standard / nohealer / liora / rush), difficulty normal, grinding on, seeds 1…200. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 89s.

## All parties (800 runs; victories 799/800; results {"victory":799,"stuck on B1":1}; mean wipes/run 0.2; mean moon 4.7, empowered finale 69%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (16) | 0.0 | 12.1 | 0 | 4.0 | 0.4 | 1.2 | 0.3 | 96 (2.0) | 651 / 547 | 1.6 | 1.7/0.3/0.0 | 91 · 4.3 · 23.5 | 2024 | 33 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (1) | 0.0 | 7.5 | 13 | 0.9 | 0.1 | 0.0 | 0.0 | 100 (1.6) | 1042 / 562 | 3.0 | 1.5/0.4/0.0 | 25 · 0.4 · 0.6 | 268 | 11 |
| B3 | 4.8 (5) | 5.8 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.3 | 18 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (2.8) | 2457 / 1931 | 2.4 | 2.2/0.8/0.2 | 31 · 2.5 · 7.8 | 873 | 24 |
| B4 | 6.8 (7) | 7.6 (8) | 99 / 99 | – | 0.0 (1) | 0.0 | 12.2 | 10 | 0.5 | 0.0 | 0.0 | 0.0 | 100 (2.8) | 3263 / 269 | 2.4 | 1.9/1.0/0.3 | 75 · 2.6 · 9.9 | 946 | 26 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 8.8 | 7 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (2.8) | 3602 / 14 | 2.3 | 1.6/1.2/0.4 | 0 · 0.0 · 0.0 | 193 | 16 |

## Party: standard (200 runs; victories 200/200; results {"victory":200}; mean wipes/run 0.2; mean moon 4.9, empowered finale 86%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (15) | 0.0 | 12.3 | 0 | 3.4 | 0.3 | 1.0 | 0.2 | 96 (2.1) | 691 / 595 | 2.0 | 1.7/0.4/0.0 | 87 · 2.9 · 22.3 | 2044 | 33 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (1) | 0.0 | 8.4 | 13 | 0.5 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 1261 / 479 | 4.0 | 1.8/0.4/0.1 | 0 · 0.0 · 0.0 | 276 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.1 | 18 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2591 / 2126 | 3.0 | 2.3/0.9/0.2 | 1 · 0.0 · 0.1 | 467 | 19 |
| B4 | 7.0 (7) | 7.8 (8) | 100 / 100 | – | 0.0 (1) | 0.0 | 12.4 | 9 | 0.5 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3503 / 0 | 3.0 | 2.1/1.1/0.3 | 67 · 1.1 · 5.4 | 737 | 23 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.6 | 8 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4054 / 0 | 3.0 | 1.8/1.2/0.5 | 0 · 0.0 · 0.0 | 221 | 17 |

## Party: nohealer (200 runs; victories 200/200; results {"victory":200}; mean wipes/run 0.3; mean moon 5.0, empowered finale 90%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (22) | 0.0 | 12.2 | 0 | 5.6 | 0.6 | 1.6 | 0.4 | 95 (2.1) | 684 / 574 | 2.0 | 1.8/0.3/0.0 | 83 · 2.8 · 21.6 | 1987 | 32 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (3) | 0.0 | 8.3 | 11 | 2.3 | 0.3 | 0.1 | 0.1 | 99 (2.0) | 1255 / 802 | 4.0 | 1.9/0.4/0.1 | 0 · 0.0 · 0.0 | 278 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.3 | 19 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2611 / 1502 | 3.0 | 2.4/0.8/0.2 | 21 · 0.4 · 2.4 | 635 | 21 |
| B4 | 7.0 (7) | 7.8 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 12.7 | 8 | 0.5 | 0.1 | 0.0 | 0.0 | 100 (3.0) | 3581 / 3 | 3.0 | 2.1/1.1/0.3 | 74 · 1.3 · 6.8 | 849 | 25 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.6 | 6 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4060 / 5 | 3.0 | 1.9/1.3/0.4 | 0 · 0.0 · 0.0 | 219 | 17 |

## Party: liora (200 runs; victories 200/200; results {"victory":200}; mean wipes/run 0.1; mean moon 5.1, empowered finale 96%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (10) | 0.0 | 12.5 | 0 | 3.0 | 0.2 | 0.9 | 0.2 | 98 (2.0) | 691 / 607 | 2.0 | 1.8/0.3/0.0 | 94 · 3.2 · 24.3 | 2194 | 35 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 8.4 | 12 | 0.5 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 1270 / 758 | 4.0 | 1.9/0.5/0.0 | 0 · 0.0 · 0.0 | 277 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.0 | 18 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2592 / 2539 | 3.0 | 2.3/1.0/0.1 | 3 · 0.1 · 0.3 | 486 | 19 |
| B4 | 7.0 (7) | 7.9 (8) | 100 / 100 | – | 0.0 (1) | 0.0 | 12.5 | 8 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3541 / 113 | 3.0 | 2.0/1.1/0.3 | 62 · 1.1 · 4.7 | 692 | 23 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.5 | 7 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4040 / 0 | 3.0 | 1.6/1.4/0.5 | 0 · 0.0 · 0.0 | 218 | 17 |

## Party: rush (200 runs; victories 199/200; results {"victory":199,"stuck on B1":1}; mean wipes/run 0.2; mean moon 3.7, empowered finale 3%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (16) | 0.0 | 11.3 | 0 | 4.0 | 0.4 | 1.1 | 0.4 | 96 (1.9) | 537 / 411 | 0.5 | 1.6/0.2/0.0 | 99 · 8.5 · 25.8 | 1873 | 30 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 5.0 | 22 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (0.5) | 378 / 209 | 0.1 | 0.3/0.1/0.0 | 99 · 1.8 · 2.5 | 241 | 8 |
| B3 | 4.4 (5) | 5.1 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.7 | 18 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (2.2) | 2033 / 1554 | 0.7 | 1.6/0.6/0.1 | 99 · 9.5 · 28.6 | 1908 | 36 |
| B4 | 6.3 (7) | 7.0 (8) | 98 / 98 | – | 0.0 (5) | 0.0 | 11.2 | 14 | 1.0 | 0.1 | 0.0 | 0.0 | 99 (2.0) | 2423 / 964 | 0.8 | 1.2/0.7/0.2 | 98 · 7.0 · 22.8 | 1509 | 31 |
| B5 | 8.9 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 6.6 | 8 | 0.3 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 2246 / 50 | 0.0 | 0.9/0.7/0.3 | 0 · 0.0 · 0.0 | 114 | 12 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | elite | direWolfx1 | 826 | 5.9 | 0.95 | 0.16 | 0.55 | 21 | 4.6 | 1.1 | 1 |
| B1 | elite | giantWolfSpiderx1+giantRatx2 | 805 | 2.2 | 0.45 | 0.05 | 0.13 | 17 | 3.2 | 1.1 | 1 |
| B1 | random | wolfx2 | 713 | 2.1 | 0.40 | 0.03 | 0.07 | 11 | 2.1 | 1.0 | 1 |
| B1 | fixed | wolfx2 | 1482 | 1.4 | 0.44 | 0.02 | 0.07 | 10 | 2.1 | 1.0 | 1 |
| B1 | fixed | giantFrogx2+giantRatx2 | 762 | 1.3 | 0.39 | 0.03 | 0.01 | 16 | 3.1 | 1.0 | 1 |
| B1 | random | giantRatx3 | 327 | 0.9 | 0.25 | 0.01 | 0.01 | 10 | 2.1 | 1.1 | 1 |
| B1 | random | giantRatx2 | 335 | 0.9 | 0.08 | 0.01 | 0.00 | 5 | 1.5 | 1.0 | 1 |
| B4 | elite | hellHoundx2 | 703 | 0.9 | 0.28 | 0.03 | 0.00 | 32 | 3.9 | 6.9 | 5 |
| B1 | random | giantFrogx2 | 358 | 0.8 | 0.12 | 0.01 | 0.00 | 7 | 2.5 | 1.0 | 1 |
| B1 | random | giantRatx1+giantWolfSpiderx1 | 670 | 0.7 | 0.31 | 0.01 | 0.09 | 8 | 2.1 | 1.0 | 1 |
| B2 | elite | giantToadx1+giantCrabx2 | 610 | 0.7 | 0.34 | 0.04 | 0.00 | 9 | 4.2 | 3.0 | 2 |
| B4 | boss | brakkx1+cindermawx1 | 804 | 0.6 | 0.13 | 0.00 | 0.00 | 24 | 2.6 | 7.6 | 7 |
| B1 | random | giantPoisonousSnakex1 | 670 | 0.6 | 0.27 | 0.03 | 0.14 | 5 | 1.2 | 1.0 | 1 |
| B1 | random | giantWolfSpiderx1 | 649 | 0.5 | 0.13 | 0.00 | 0.05 | 4 | 1.5 | 1.0 | 1 |
| B1 | fixed | cultistx3 | 233 | 0.4 | 0.36 | 0.06 | 0.01 | 4 | 2.5 | 1.0 | 1 |
| B1 | random | giantFrogx1 | 351 | 0.3 | 0.06 | 0.00 | 0.00 | 3 | 1.4 | 1.0 | 1 |
| B2 | lieutenant | sisterVeyx1+cultistx2 | 624 | 0.2 | 0.21 | 0.01 | 0.00 | 14 | 2.9 | 3.0 | 3 |
| B2 | fixed | direWolfx1+wolfx1 | 799 | 0.1 | 0.08 | 0.00 | 0.00 | 8 | 2.5 | 3.0 | 1 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|
| B5 | random | animatedArmorx3 | 151 | 1 | 0.00 | 82 | 9.0 | 3 |
| B4 | random | magminx3 | 287 | 1 | 0.00 | 87 | 6.8 | 2 |
| B5 | random | animatedArmorx4 | 149 | 1 | 0.00 | 82 | 9.0 | 3 |
| B3 | fixed | violetFungusx3+shriekerx2 | 675 | 1 | 0.00 | 0 | 4.9 | 1 |
| B3 | elite | violetFungusx2+shriekerx1 | 750 | 1 | 0.00 | 0 | 4.9 | 1 |
| B3 | random | violetFungusx3+shriekerx1 | 463 | 1 | 0.00 | 89 | 4.8 | 1 |
| B5 | elite | animatedArmorx3 | 799 | 2 | 0.00 | 0 | 9.0 | 3 |
| B2 | random | cultistx3 | 133 | 2 | 0.00 | 74 | 3.1 | 1 |
| B2 | random | giantCrabx2 | 94 | 2 | 0.00 | 85 | 3.1 | 1 |
| B4 | elite | animatedArmorx2 | 799 | 2 | 0.00 | 0 | 6.8 | 2 |
| B4 | random | gargoylex3 | 492 | 2 | 0.00 | 0 | 6.8 | 5 |
| B5 | random | minotaurSkeletonx2+animatedArmorx1 | 141 | 2 | 0.00 | 88 | 9.0 | 5 |
| B3 | random | darkmantlex3 | 234 | 3 | 0.00 | 74 | 4.8 | 2 |
| B5 | random | cultFanaticx4 | 160 | 4 | 0.00 | 0 | 9.0 | 5 |

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 453 · B1 giantWolfSpider: 187 · B1 wolf: 159 · B1 giantPoisonousSnake: 93 · B2 ankylosaurus: 21 · B1 giantRat: 12 · B1 giantFrog: 10 · B1 cultist: 8 · B2 giantToad: 5 · B2 giantWasp: 3 · B5 tyrannosaurus: 3 · B1 giantSpider: 2 · B2 direWolf: 1 · B4 cindermaw: 1

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B1 direWolf: 89 · B1 wolf: 74 · B1 giantWolfSpider: 55 · B1 giantPoisonousSnake: 19 · B2 giantToad: 9 · B1 giantFrog: 8 · B5 tyrannosaurus: 6 · B1 giantRat: 4 · B1 cultist: 4 · B2 ankylosaurus: 2 · B4 cindermaw: 1 · B4 minotaurSkeleton: 1 · B4 brakk: 1 · B3 ochreJelly: 1
