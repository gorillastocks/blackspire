# Blackspire balance sim — ranks-before-grind

1200 seeded campaigns (300 per party × standard / nohealer / liora / rush), difficulty normal, grinding on, seeds 1…300. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 316s.

## All parties (1200 runs; victories 1110/1200; results {"victory":1110,"stuck on B3":34,"stuck on B5":17,"stuck on B2":20,"stuck on B4":18,"stuck on B1":1}; mean wipes/run 2.5; mean moon 7.1, empowered finale 98%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (16) | 0.0 | 12.0 | 0 | 4.0 | 0.4 | 1.2 | 0.3 | 96 (2.0) | 650 / 545 | 1.6 | 1.7/0.3/0.0 | 91 · 4.3 · 23.4 | 2020 | 32 |
| B2 | 3.0 (3) | 4.0 (4) | 85 / 76 | – | 0.4 (20) | 0.3 | 8.7 | 16 | 4.5 | 0.5 | 0.1 | 0.1 | 96 (1.7) | 1152 / 639 | 3.1 | 1.5/0.4/0.0 | 36 · 1.1 · 6.1 | 710 | 17 |
| B3 | 4.9 (5) | 5.9 (6) | 88 / 81 | – | 0.6 (31) | 0.2 | 14.3 | 16 | 5.7 | 0.7 | 0.1 | 0.1 | 91 (3.1) | 2709 / 1966 | 2.4 | 2.1/0.8/0.2 | 40 · 3.1 · 13.7 | 1359 | 31 |
| B4 | 6.9 (7) | 7.7 (8) | 86 / 86 | – | 0.5 (30) | 0.2 | 12.3 | 7 | 4.9 | 0.4 | 0.1 | 0.1 | 91 (3.0) | 3394 / 617 | 2.5 | 1.9/1.0/0.3 | 43 · 2.3 · 10.1 | 1014 | 27 |
| B5 | 9.0 (9) | 9.0 (9) | 69 / 65 | 88 / 89 | 0.9 (45) | 0.6 | 11.6 | 8 | 12.9 | 0.5 | 0.3 | 0.3 | 95 (3.0) | 4589 / 427 | 2.5 | 1.7/1.2/0.4 | 39 · 1.9 · 15.0 | 1357 | 34 |

## Party: standard (300 runs; victories 297/300; results {"victory":297,"stuck on B4":2,"stuck on B5":1}; mean wipes/run 1.1; mean moon 6.8, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (13) | 0.0 | 12.3 | 0 | 3.4 | 0.3 | 1.1 | 0.3 | 96 (2.1) | 692 / 597 | 2.0 | 1.8/0.3/0.0 | 89 · 3.0 · 23.3 | 2122 | 34 |
| B2 | 3.0 (3) | 4.0 (4) | 87 / 86 | – | 0.2 (16) | 0.2 | 9.2 | 16 | 3.6 | 0.3 | 0.1 | 0.1 | 98 (2.0) | 1348 / 591 | 4.0 | 1.9/0.4/0.0 | 13 · 0.4 · 2.9 | 504 | 15 |
| B3 | 5.0 (5) | 6.0 (6) | 93 / 92 | – | 0.2 (16) | 0.1 | 13.6 | 16 | 3.7 | 0.4 | 0.1 | 0.1 | 97 (3.1) | 2873 / 2050 | 3.0 | 2.4/0.8/0.2 | 10 · 0.3 · 2.9 | 690 | 22 |
| B4 | 7.0 (7) | 8.0 (8) | 86 / 87 | – | 0.4 (27) | 0.1 | 12.4 | 6 | 4.4 | 0.3 | 0.1 | 0.1 | 94 (3.2) | 3664 / 192 | 3.0 | 2.1/1.1/0.3 | 26 · 0.7 · 5.2 | 792 | 24 |
| B5 | 9.0 (9) | 9.0 (9) | 94 / 93 | 93 / 94 | 0.2 (18) | 0.1 | 10.2 | 7 | 7.5 | 0.3 | 0.1 | 0.2 | 98 (3.1) | 4632 / 124 | 3.0 | 1.8/1.2/0.5 | 12 · 0.3 · 3.3 | 501 | 21 |

## Party: nohealer (300 runs; victories 257/300; results {"victory":257,"stuck on B3":17,"stuck on B5":5,"stuck on B2":15,"stuck on B4":6}; mean wipes/run 3.8; mean moon 8.0, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (24) | 0.0 | 12.1 | 0 | 5.5 | 0.7 | 1.6 | 0.4 | 94 (2.1) | 681 / 566 | 2.0 | 1.8/0.3/0.0 | 83 · 2.7 · 21.1 | 1948 | 32 |
| B2 | 3.0 (3) | 4.0 (4) | 76 / 57 | – | 1.0 (37) | 0.7 | 10.4 | 15 | 8.0 | 1.3 | 0.2 | 0.1 | 92 (2.2) | 1361 / 869 | 4.0 | 1.8/0.5/0.1 | 25 · 1.0 · 11.4 | 1240 | 25 |
| B3 | 4.9 (5) | 5.9 (6) | 81 / 66 | – | 0.9 (35) | 0.5 | 15.2 | 15 | 6.5 | 1.1 | 0.2 | 0.1 | 90 (3.3) | 2904 / 1803 | 3.0 | 2.2/0.9/0.2 | 35 · 1.3 · 15.8 | 1772 | 37 |
| B4 | 6.9 (7) | 7.8 (8) | 91 / 91 | – | 0.7 (43) | 0.1 | 12.9 | 6 | 6.3 | 0.9 | 0.1 | 0.1 | 86 (3.4) | 3612 / 875 | 3.0 | 2.0/1.1/0.3 | 37 · 0.9 · 6.5 | 890 | 26 |
| B5 | 9.0 (9) | 9.0 (9) | 67 / 68 | 75 / 80 | 1.1 (59) | 0.7 | 12.4 | 8 | 15.6 | 0.9 | 0.2 | 0.3 | 93 (3.2) | 4889 / 947 | 3.0 | 1.9/1.2/0.5 | 50 · 1.8 · 16.3 | 1559 | 37 |

## Party: liora (300 runs; victories 293/300; results {"victory":293,"stuck on B2":2,"stuck on B4":4,"stuck on B3":1}; mean wipes/run 1.3; mean moon 7.2, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (10) | 0.0 | 12.5 | 0 | 3.0 | 0.2 | 0.9 | 0.2 | 98 (2.0) | 691 / 610 | 2.0 | 1.8/0.3/0.0 | 93 · 3.2 · 24.7 | 2229 | 35 |
| B2 | 3.0 (3) | 4.0 (4) | 92 / 87 | – | 0.2 (12) | 0.1 | 9.0 | 13 | 3.4 | 0.3 | 0.1 | 0.1 | 99 (2.0) | 1355 / 802 | 4.0 | 1.9/0.5/0.0 | 8 · 0.3 · 2.7 | 501 | 15 |
| B3 | 5.0 (5) | 6.0 (6) | 92 / 89 | – | 0.2 (17) | 0.1 | 13.7 | 15 | 3.9 | 0.5 | 0.1 | 0.1 | 97 (3.1) | 2869 / 2570 | 3.0 | 2.3/0.9/0.2 | 14 · 0.4 · 4.7 | 844 | 24 |
| B4 | 7.0 (7) | 7.9 (8) | 95 / 95 | – | 0.2 (12) | 0.0 | 11.9 | 6 | 2.5 | 0.2 | 0.0 | 0.0 | 94 (3.1) | 3595 / 238 | 3.0 | 2.1/1.1/0.3 | 15 · 0.4 · 2.6 | 598 | 21 |
| B5 | 9.0 (9) | 9.0 (9) | 72 / 73 | 95 / 95 | 0.5 (38) | 0.4 | 11.2 | 8 | 10.2 | 0.3 | 0.2 | 0.2 | 98 (3.0) | 4792 / 172 | 3.0 | 1.9/1.2/0.4 | 31 · 1.0 · 9.4 | 960 | 28 |

## Party: rush (300 runs; victories 263/300; results {"victory":263,"stuck on B5":11,"stuck on B3":16,"stuck on B2":3,"stuck on B4":6,"stuck on B1":1}; mean wipes/run 3.9; mean moon 6.3, empowered finale 93%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.8 (3) | 100 / 100 | – | 0.2 (18) | 0.0 | 11.2 | 0 | 4.0 | 0.4 | 1.1 | 0.4 | 94 (1.9) | 536 / 406 | 0.5 | 1.6/0.3/0.0 | 99 · 8.3 · 24.6 | 1782 | 29 |
| B2 | 3.0 (3) | 4.0 (4) | 84 / 81 | – | 0.3 (16) | 0.2 | 6.3 | 23 | 3.0 | 0.2 | 0.1 | 0.0 | 92 (0.7) | 542 / 292 | 0.3 | 0.5/0.1/0.0 | 100 · 2.9 · 7.3 | 592 | 14 |
| B3 | 4.6 (5) | 5.6 (6) | 86 / 79 | – | 1.2 (55) | 0.3 | 14.7 | 19 | 8.9 | 0.9 | 0.2 | 0.2 | 76 (2.8) | 2194 / 1428 | 0.6 | 1.4/0.6/0.2 | 100 · 10.3 · 31.9 | 2157 | 41 |
| B4 | 6.8 (7) | 7.1 (8) | 72 / 73 | – | 0.7 (38) | 0.4 | 12.2 | 10 | 6.4 | 0.5 | 0.3 | 0.1 | 89 (2.3) | 2683 / 1230 | 0.9 | 1.3/0.7/0.2 | 97 · 7.5 · 26.8 | 1812 | 36 |
| B5 | 8.9 (9) | 9.0 (9) | 40 / 44 | 86 / 88 | 1.7 (69) | 1.4 | 12.7 | 10 | 18.9 | 0.6 | 0.9 | 0.5 | 92 (2.8) | 4040 / 532 | 0.9 | 1.3/1.1/0.3 | 68 · 4.5 · 32.6 | 2518 | 49 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B5 | boss | malthraxx1+gargoylex2+animatedArmorx2 | 1699 | 34.6 | 4.22 | 0.09 | 0.20 | 61 | 6.7 | 9.0 | 8 |
| B2 | boss | ankylosaurusx1+giantWaspx3 | 1550 | 23.9 | 1.91 | 0.17 | 0.05 | 56 | 6.2 | 4.0 | 4 |
| B3 | boss | glasshidex1+gargoylex2+darkmantlex2 | 1421 | 19.4 | 1.32 | 0.19 | 0.04 | 41 | 7.0 | 5.9 | 5 |
| B4 | boss | brakkx1+cindermawx1 | 1316 | 14.4 | 1.37 | 0.05 | 0.08 | 48 | 3.3 | 7.7 | 7 |
| B4 | elite | animatedArmorx3 | 1317 | 14.2 | 0.79 | 0.11 | 0.00 | 31 | 7.2 | 6.9 | 3 |
| B3 | elite | ochreJellyx2 | 1224 | 11.2 | 0.96 | 0.21 | 0.02 | 32 | 7.3 | 5.0 | 3 |
| B5 | phase2 | tyrannosaurusx1 | 1245 | 10.8 | 3.06 | 0.05 | 0.01 | 17 | 6.2 | 9.0 | 5 |
| B3 | elite | darkmantlex4 | 1188 | 9.4 | 0.75 | 0.07 | 0.01 | 34 | 5.3 | 5.0 | 2 |
| B4 | elite | hellHoundx2 | 1089 | 9.2 | 0.90 | 0.14 | 0.00 | 48 | 7.2 | 7.0 | 5 |
| B5 | elite | triceratopsx1+allosaurusx2 | 1221 | 8.3 | 1.01 | 0.12 | 0.01 | 28 | 7.0 | 9.0 | 6 |
| B3 | elite | violetFungusx4+shriekerx2 | 1193 | 7.5 | 0.53 | 0.05 | 0.01 | 25 | 4.0 | 5.0 | 2 |
| B1 | elite | direWolfx1 | 1246 | 6.3 | 0.94 | 0.16 | 0.54 | 21 | 4.6 | 1.1 | 1 |
| B2 | elite | giantToadx1+giantCrabx3 | 995 | 5.8 | 0.76 | 0.17 | 0.01 | 20 | 6.5 | 3.1 | 2 |
| B5 | elite | allosaurusx3 | 1038 | 3.9 | 0.47 | 0.07 | 0.00 | 23 | 5.5 | 9.0 | 5 |
| B3 | random | darkmantlex3+giantCentipedex2 | 413 | 3.6 | 0.26 | 0.01 | 0.00 | 16 | 2.7 | 5.0 | 2 |
| B2 | elite | flyingSwordx4 | 1091 | 3.2 | 0.46 | 0.06 | 0.01 | 19 | 5.4 | 3.0 | 1 |
| B3 | random | darkmantlex4 | 414 | 2.9 | 0.35 | 0.03 | 0.00 | 18 | 3.1 | 5.0 | 2 |
| B4 | random | cultFanaticx3+cultistx2 | 696 | 2.7 | 0.33 | 0.03 | 0.01 | 17 | 3.4 | 7.0 | 5 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 675 · B5 malthrax: 345 · B1 giantWolfSpider: 285 · B1 wolf: 252 · B1 giantPoisonousSnake: 134 · B4 cindermaw: 81 · B2 ankylosaurus: 69 · B3 glasshide: 60 · B3 ochreJelly: 43 · B4 cultFanatic: 39 · B4 brakk: 28 · B2 giantWasp: 22 · B1 giantFrog: 22 · B2 giantToad: 18

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B5 malthrax: 243 · B1 direWolf: 133 · B1 wolf: 112 · B1 giantWolfSpider: 78 · B5 tyrannosaurus: 63 · B3 glasshide: 50 · B3 ochreJelly: 48 · B2 giantToad: 47 · B4 cultFanatic: 47 · B1 giantPoisonousSnake: 36 · B5 triceratops: 27 · B3 darkmantle: 23 · B4 brakk: 16 · B2 ankylosaurus: 14
