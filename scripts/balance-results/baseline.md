# Blackspire balance sim — baseline

799 seeded campaigns (200 per party × standard / nohealer / liora / rush), difficulty normal, grinding on, seeds 1…200. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 127s.

## All parties (799 runs; victories 798/799; results {"victory":798,"stuck on B1":1}; mean wipes/run 0.3; mean moon 4.6, empowered finale 64%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.3 (28) | 0.0 | 11.8 | 0 | 4.4 | 0.6 | 1.3 | 0.4 | 90 (2.1) | 651 / 525 | 1.6 | 1.7/0.3/0.0 | 83 · 4.0 · 20.8 | 1815 | 30 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (1) | 0.0 | 7.6 | 14 | 0.8 | 0.1 | 0.0 | 0.0 | 100 (1.6) | 1054 / 564 | 3.0 | 1.5/0.4/0.0 | 25 · 0.5 · 0.8 | 278 | 11 |
| B3 | 4.9 (5) | 5.8 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.4 | 19 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (2.8) | 2488 / 1992 | 2.4 | 2.2/0.9/0.1 | 30 · 2.6 · 8.2 | 896 | 24 |
| B4 | 6.8 (7) | 7.6 (8) | 100 / 100 | – | 0.0 (1) | 0.0 | 12.1 | 10 | 0.4 | 0.0 | 0.0 | 0.0 | 100 (2.7) | 3252 / 233 | 2.4 | 1.8/1.0/0.3 | 78 · 2.6 · 10.1 | 959 | 26 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 8.9 | 8 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (2.8) | 3634 / 11 | 2.3 | 1.6/1.1/0.4 | 0 · 0.0 · 0.0 | 194 | 16 |

## Party: standard (200 runs; victories 200/200; results {"victory":200}; mean wipes/run 0.2; mean moon 4.8, empowered finale 77%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.2 (21) | 0.0 | 12.2 | 0 | 3.7 | 0.4 | 1.1 | 0.2 | 93 (2.1) | 693 / 580 | 2.0 | 1.8/0.3/0.0 | 83 · 2.8 · 21.6 | 1988 | 32 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (1) | 0.0 | 8.4 | 12 | 0.5 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 1266 / 489 | 4.0 | 1.9/0.4/0.1 | 0 · 0.0 · 0.0 | 278 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.1 | 19 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2599 / 2111 | 3.0 | 2.4/0.8/0.2 | 2 · 0.0 · 0.1 | 468 | 19 |
| B4 | 7.0 (7) | 7.8 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 12.5 | 7 | 0.3 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3561 / 0 | 3.0 | 2.0/1.1/0.3 | 73 · 1.3 · 5.3 | 718 | 23 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.7 | 8 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4094 / 0 | 3.0 | 2.0/1.2/0.4 | 1 · 0.0 · 0.0 | 222 | 17 |

## Party: nohealer (200 runs; victories 200/200; results {"victory":200}; mean wipes/run 0.4; mean moon 5.0, empowered finale 87%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.3 (34) | 0.0 | 12.1 | 1 | 5.8 | 0.9 | 1.7 | 0.5 | 89 (2.2) | 697 / 570 | 2.0 | 1.8/0.4/0.0 | 70 · 2.6 · 19.0 | 1778 | 30 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (2) | 0.0 | 8.3 | 12 | 2.1 | 0.3 | 0.1 | 0.0 | 100 (2.0) | 1260 / 818 | 4.0 | 1.9/0.5/0.0 | 0 · 0.0 · 0.0 | 277 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.2 | 19 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2603 / 1502 | 3.0 | 2.2/1.0/0.1 | 18 · 0.3 · 1.9 | 592 | 21 |
| B4 | 7.0 (7) | 7.8 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 12.9 | 9 | 0.4 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3571 / 6 | 3.0 | 2.0/1.1/0.3 | 75 · 1.6 · 8.3 | 951 | 27 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.7 | 8 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4097 / 0 | 3.0 | 1.8/1.3/0.5 | 0 · 0.0 · 0.0 | 219 | 17 |

## Party: liora (200 runs; victories 200/200; results {"victory":200}; mean wipes/run 0.2; mean moon 5.0, empowered finale 90%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.2 (22) | 0.0 | 12.3 | 0 | 3.8 | 0.4 | 1.1 | 0.3 | 92 (2.2) | 703 / 590 | 2.0 | 1.9/0.3/0.0 | 82 · 2.8 · 21.1 | 1942 | 32 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 8.4 | 14 | 0.5 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 1283 / 717 | 4.0 | 1.9/0.5/0.1 | 0 · 0.0 · 0.0 | 278 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.0 | 19 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2604 / 2651 | 3.0 | 2.4/1.0/0.1 | 3 · 0.0 · 0.3 | 486 | 19 |
| B4 | 7.0 (7) | 7.8 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 12.5 | 10 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3520 / 45 | 3.0 | 2.1/1.2/0.3 | 68 · 1.2 · 6.0 | 782 | 24 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.7 | 7 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4084 / 0 | 3.0 | 1.9/1.2/0.6 | 0 · 0.0 · 0.0 | 217 | 17 |

## Party: rush (199 runs; victories 198/199; results {"victory":198,"stuck on B1":1}; mean wipes/run 0.5; mean moon 3.6, empowered finale 1%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.8 (3) | 100 / 100 | – | 0.4 (35) | 0.0 | 10.8 | 0 | 4.5 | 0.5 | 1.3 | 0.5 | 83 (2.0) | 509 / 359 | 0.4 | 1.4/0.3/0.0 | 99 · 7.9 · 21.7 | 1549 | 26 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 5.1 | 21 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (0.5) | 403 / 230 | 0.1 | 0.4/0.1/0.0 | 99 · 2.0 · 3.2 | 278 | 9 |
| B3 | 4.4 (5) | 5.2 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 14.1 | 19 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (2.4) | 2141 / 1702 | 0.8 | 1.6/0.7/0.1 | 99 · 9.9 · 30.7 | 2048 | 38 |
| B4 | 6.3 (7) | 7.0 (8) | 99 / 99 | – | 0.0 (3) | 0.0 | 10.6 | 13 | 0.8 | 0.0 | 0.0 | 0.0 | 99 (2.0) | 2346 / 889 | 0.7 | 1.2/0.7/0.2 | 95 · 6.5 · 21.0 | 1389 | 29 |
| B5 | 8.9 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 6.6 | 8 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 2247 / 45 | 0.0 | 0.8/0.8/0.4 | 1 · 0.0 · 0.1 | 118 | 12 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | elite | direWolfx1+wolfx1 | 900 | 16.2 | 1.38 | 0.31 | 0.69 | 32 | 5.6 | 1.2 | 1 |
| B1 | elite | giantWolfSpiderx1+giantRatx2 | 808 | 4.1 | 0.44 | 0.05 | 0.10 | 18 | 3.1 | 1.2 | 1 |
| B1 | fixed | giantFrogx2+giantRatx2 | 745 | 1.3 | 0.38 | 0.04 | 0.01 | 16 | 3.1 | 1.0 | 1 |
| B1 | random | wolfx2 | 689 | 1.3 | 0.36 | 0.02 | 0.07 | 10 | 2.1 | 1.1 | 1 |
| B1 | random | giantRatx3 | 308 | 1.3 | 0.26 | 0.01 | 0.01 | 10 | 2.1 | 1.1 | 1 |
| B1 | fixed | wolfx2 | 1482 | 1.3 | 0.43 | 0.02 | 0.07 | 10 | 2.1 | 1.0 | 1 |
| B1 | random | cultistx3 | 305 | 1.0 | 0.15 | 0.01 | 0.01 | 8 | 2.4 | 1.1 | 1 |
| B1 | fixed | cultistx3 | 235 | 0.9 | 0.35 | 0.03 | 0.01 | 4 | 2.5 | 1.0 | 1 |
| B1 | random | giantRatx1+giantWolfSpiderx1 | 622 | 0.8 | 0.28 | 0.01 | 0.08 | 8 | 2.1 | 1.0 | 1 |
| B1 | random | giantRatx2 | 313 | 0.6 | 0.09 | 0.00 | 0.00 | 6 | 1.5 | 1.1 | 1 |
| B1 | random | giantFrogx1 | 338 | 0.6 | 0.08 | 0.00 | 0.00 | 3 | 1.4 | 1.1 | 1 |
| B4 | elite | hellHoundx2 | 689 | 0.6 | 0.15 | 0.01 | 0.00 | 26 | 2.9 | 6.9 | 5 |
| B1 | random | giantPoisonousSnakex1 | 621 | 0.5 | 0.26 | 0.03 | 0.15 | 5 | 1.3 | 1.1 | 1 |
| B2 | lieutenant | sisterVeyx1+cultistx2 | 631 | 0.3 | 0.23 | 0.02 | 0.00 | 16 | 3.0 | 3.0 | 3 |
| B1 | random | giantFrogx2 | 333 | 0.3 | 0.12 | 0.01 | 0.00 | 6 | 2.5 | 1.1 | 1 |
| B2 | elite | giantToadx1+giantCrabx2 | 610 | 0.2 | 0.31 | 0.05 | 0.01 | 7 | 3.9 | 3.0 | 2 |
| B2 | fixed | giantToadx2 | 611 | 0.2 | 0.20 | 0.02 | 0.01 | 8 | 2.8 | 3.0 | 2 |
| B1 | random | giantWolfSpiderx1 | 649 | 0.2 | 0.15 | 0.01 | 0.05 | 5 | 1.5 | 1.1 | 1 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|
| B3 | fixed | violetFungusx3+shriekerx2 | 671 | 1 | 0.00 | 0 | 4.9 | 1 |
| B3 | elite | violetFungusx2+shriekerx1 | 761 | 1 | 0.00 | 0 | 4.9 | 1 |
| B5 | random | animatedArmorx4 | 145 | 1 | 0.00 | 87 | 9.0 | 3 |
| B4 | random | magminx3 | 249 | 1 | 0.00 | 86 | 6.8 | 2 |
| B5 | elite | animatedArmorx3 | 798 | 1 | 0.00 | 0 | 9.0 | 3 |
| B3 | random | violetFungusx3+shriekerx1 | 481 | 1 | 0.00 | 92 | 4.8 | 1 |
| B2 | random | giantCrabx2 | 83 | 2 | 0.00 | 86 | 3.1 | 1 |
| B4 | random | magminx4 | 266 | 2 | 0.00 | 88 | 6.8 | 2 |
| B4 | elite | animatedArmorx2 | 798 | 2 | 0.00 | 0 | 6.8 | 2 |
| B2 | random | flyingSwordx2 | 137 | 2 | 0.00 | 77 | 3.1 | 1 |
| B4 | random | gargoylex3 | 509 | 2 | 0.00 | 0 | 6.8 | 5 |
| B5 | random | allosaurusx2 | 161 | 3 | 0.00 | 89 | 9.0 | 3 |
| B3 | random | giantCentipedex3 | 167 | 3 | 0.00 | 87 | 4.9 | 1 |
| B5 | random | cultFanaticx3 | 156 | 3 | 0.00 | 0 | 9.0 | 5 |

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 570 · B1 wolf: 197 · B1 giantWolfSpider: 164 · B1 giantPoisonousSnake: 92 · B2 ankylosaurus: 19 · B1 giantFrog: 10 · B2 giantToad: 10 · B2 giantWasp: 5 · B1 cultist: 5 · B1 giantRat: 4 · B4 cindermaw: 2

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B1 direWolf: 121 · B1 wolf: 77 · B1 giantWolfSpider: 57 · B1 giantPoisonousSnake: 18 · B1 giantFrog: 12 · B2 giantToad: 7 · B1 giantRat: 4 · B2 giantWasp: 4 · B4 minotaurSkeleton: 3 · B1 cultist: 3 · B2 direWolf: 2 · B2 ankylosaurus: 2 · B2 sisterVey: 1 · B1 giantSpider: 1
