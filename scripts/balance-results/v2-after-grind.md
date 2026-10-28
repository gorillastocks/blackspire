# Blackspire balance sim — v2-after-grind

600 seeded campaigns (150 per party × standard / nohealer / liora / rush), difficulty normal, grinding on, seeds 1…150. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 583s.

## All parties (600 runs; victories 559/600; results {"victory":559,"stuck on B2":8,"stuck on B3":21,"stuck on B4":8,"stuck on B5":3,"stuck on B1":1}; mean wipes/run 2.3; mean moon 6.8, empowered finale 99%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (17) | 0.0 | 12.1 | 0 | 4.0 | 0.4 | 1.2 | 0.3 | 96 (2.0) | 651 / 545 | 1.6 | 1.7/0.3/0.0 | 90 · 4.4 · 23.6 | 2029 | 33 |
| B2 | 3.0 (3) | 4.0 (4) | 88 / 81 | – | 0.4 (18) | 0.2 | 8.5 | 15 | 4.1 | 0.5 | 0.1 | 0.1 | 95 (1.7) | 1142 / 639 | 3.1 | 1.5/0.4/0.0 | 34 · 1.0 · 4.4 | 568 | 15 |
| B3 | 4.9 (5) | 5.9 (6) | 88 / 82 | – | 0.7 (30) | 0.2 | 14.3 | 16 | 5.7 | 0.7 | 0.1 | 0.1 | 90 (3.1) | 2696 / 1935 | 2.4 | 2.0/0.8/0.2 | 39 · 3.1 · 13.0 | 1294 | 30 |
| B4 | 6.9 (7) | 7.7 (8) | 88 / 86 | – | 0.5 (28) | 0.2 | 12.3 | 7 | 4.4 | 0.4 | 0.1 | 0.1 | 92 (3.0) | 3405 / 598 | 2.5 | 1.8/1.0/0.3 | 42 · 2.2 · 9.3 | 949 | 26 |
| B5 | 9.0 (9) | 9.0 (9) | 71 / 70 | 90 / 91 | 0.7 (41) | 0.5 | 11.2 | 8 | 11.3 | 0.4 | 0.3 | 0.2 | 97 (3.0) | 4549 / 377 | 2.5 | 1.7/1.2/0.4 | 37 · 1.6 · 12.1 | 1117 | 30 |

## Party: standard (150 runs; victories 149/150; results {"victory":149,"stuck on B4":1}; mean wipes/run 0.8; mean moon 6.5, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.2 (16) | 0.0 | 12.2 | 0 | 3.5 | 0.3 | 1.0 | 0.2 | 96 (2.1) | 692 / 595 | 2.0 | 1.7/0.4/0.0 | 86 · 3.0 · 21.9 | 2003 | 32 |
| B2 | 3.0 (3) | 4.0 (4) | 90 / 91 | – | 0.2 (14) | 0.1 | 9.0 | 14 | 3.3 | 0.3 | 0.1 | 0.1 | 97 (2.1) | 1343 / 599 | 4.0 | 1.9/0.4/0.0 | 10 · 0.2 · 1.7 | 405 | 13 |
| B3 | 5.0 (5) | 6.0 (6) | 95 / 94 | – | 0.1 (10) | 0.1 | 13.5 | 16 | 3.1 | 0.3 | 0.1 | 0.0 | 99 (3.0) | 2855 / 2071 | 3.0 | 2.2/0.9/0.2 | 11 · 0.3 · 3.1 | 704 | 22 |
| B4 | 7.0 (7) | 8.0 (8) | 93 / 94 | – | 0.2 (19) | 0.1 | 12.1 | 6 | 3.5 | 0.3 | 0.1 | 0.1 | 95 (3.1) | 3628 / 142 | 3.0 | 2.0/1.1/0.3 | 19 · 0.5 · 2.9 | 619 | 22 |
| B5 | 9.0 (9) | 9.0 (9) | 95 / 95 | 98 / 98 | 0.1 (11) | 0.1 | 10.1 | 7 | 5.5 | 0.2 | 0.1 | 0.1 | 99 (3.0) | 4621 / 98 | 3.0 | 1.8/1.3/0.5 | 7 · 0.2 · 2.0 | 381 | 20 |

## Party: nohealer (150 runs; victories 130/150; results {"victory":130,"stuck on B2":7,"stuck on B3":8,"stuck on B5":2,"stuck on B4":3}; mean wipes/run 3.8; mean moon 7.9, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.3 (24) | 0.0 | 12.3 | 0 | 5.6 | 0.7 | 1.6 | 0.4 | 94 (2.1) | 685 / 571 | 2.0 | 1.8/0.4/0.0 | 81 · 2.8 · 21.7 | 1996 | 32 |
| B2 | 3.0 (3) | 4.0 (4) | 77 / 62 | – | 1.0 (37) | 0.6 | 10.2 | 14 | 8.0 | 1.3 | 0.2 | 0.1 | 89 (2.2) | 1358 / 864 | 4.0 | 1.8/0.4/0.1 | 23 · 0.9 · 8.9 | 1022 | 22 |
| B3 | 4.9 (5) | 5.9 (6) | 78 / 66 | – | 1.0 (41) | 0.5 | 15.3 | 15 | 7.0 | 1.2 | 0.2 | 0.1 | 88 (3.4) | 2924 / 1786 | 3.0 | 2.3/0.9/0.2 | 38 · 1.3 · 17.1 | 1882 | 38 |
| B4 | 6.9 (7) | 7.8 (8) | 89 / 89 | – | 0.8 (46) | 0.1 | 12.8 | 6 | 6.2 | 0.8 | 0.1 | 0.1 | 85 (3.5) | 3607 / 876 | 3.0 | 2.0/1.2/0.3 | 37 · 0.9 · 6.7 | 903 | 26 |
| B5 | 9.0 (9) | 9.0 (9) | 70 / 73 | 73 / 79 | 1.0 (58) | 0.6 | 12.2 | 8 | 15.2 | 0.9 | 0.2 | 0.2 | 92 (3.2) | 4841 / 913 | 3.0 | 1.8/1.3/0.4 | 48 · 1.5 · 13.4 | 1331 | 34 |

## Party: liora (150 runs; victories 149/150; results {"victory":149,"stuck on B4":1}; mean wipes/run 0.9; mean moon 6.9, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (9) | 0.0 | 12.6 | 0 | 3.0 | 0.2 | 0.9 | 0.2 | 98 (2.0) | 694 / 606 | 2.0 | 1.8/0.3/0.0 | 95 · 3.4 · 24.9 | 2230 | 35 |
| B2 | 3.0 (3) | 4.0 (4) | 97 / 96 | – | 0.1 (7) | 0.0 | 8.8 | 14 | 2.6 | 0.2 | 0.0 | 0.1 | 99 (2.0) | 1347 / 816 | 4.0 | 1.9/0.5/0.0 | 3 · 0.1 · 1.1 | 363 | 13 |
| B3 | 5.0 (5) | 6.0 (6) | 97 / 97 | – | 0.1 (13) | 0.0 | 13.5 | 15 | 3.1 | 0.3 | 0.0 | 0.1 | 97 (3.1) | 2862 / 2495 | 3.0 | 2.3/0.8/0.3 | 10 · 0.3 · 2.2 | 632 | 21 |
| B4 | 7.0 (7) | 8.0 (8) | 94 / 94 | – | 0.2 (11) | 0.1 | 11.9 | 7 | 2.1 | 0.2 | 0.0 | 0.0 | 97 (3.1) | 3621 / 226 | 3.0 | 2.1/1.0/0.4 | 17 · 0.5 · 3.1 | 632 | 22 |
| B5 | 9.0 (9) | 9.0 (9) | 72 / 74 | 99 / 99 | 0.4 (34) | 0.4 | 11.1 | 8 | 9.1 | 0.3 | 0.2 | 0.2 | 98 (3.0) | 4811 / 133 | 3.0 | 1.9/1.2/0.5 | 30 · 0.9 · 8.3 | 869 | 27 |

## Party: rush (150 runs; victories 131/150; results {"stuck on B2":1,"victory":131,"stuck on B3":13,"stuck on B4":3,"stuck on B1":1,"stuck on B5":1}; mean wipes/run 3.6; mean moon 6.0, empowered finale 94%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (17) | 0.0 | 11.3 | 0 | 4.0 | 0.4 | 1.1 | 0.4 | 95 (1.9) | 533 / 408 | 0.5 | 1.6/0.2/0.0 | 99 · 8.4 · 25.9 | 1885 | 30 |
| B2 | 3.0 (3) | 3.9 (4) | 87 / 85 | – | 0.3 (13) | 0.2 | 6.0 | 21 | 2.6 | 0.2 | 0.1 | 0.0 | 93 (0.6) | 514 / 273 | 0.3 | 0.5/0.1/0.0 | 100 · 2.6 · 5.9 | 481 | 12 |
| B3 | 4.5 (5) | 5.5 (6) | 80 / 77 | – | 1.4 (59) | 0.3 | 14.9 | 18 | 9.7 | 1.1 | 0.2 | 0.3 | 72 (2.8) | 2149 / 1373 | 0.6 | 1.4/0.6/0.1 | 99 · 10.3 · 30.1 | 1996 | 39 |
| B4 | 6.7 (7) | 7.1 (8) | 73 / 71 | – | 0.7 (38) | 0.4 | 12.3 | 11 | 6.2 | 0.4 | 0.3 | 0.1 | 90 (2.3) | 2713 / 1240 | 0.9 | 1.2/0.8/0.2 | 98 · 7.6 · 25.8 | 1714 | 35 |
| B5 | 8.9 (9) | 9.0 (9) | 44 / 51 | 89 / 90 | 1.2 (65) | 1.1 | 11.7 | 9 | 16.4 | 0.4 | 0.8 | 0.4 | 97 (2.6) | 3879 / 433 | 0.8 | 1.3/1.1/0.3 | 68 · 4.0 · 26.4 | 2013 | 42 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B5 | boss | malthraxx1+gargoylex2+animatedArmorx2 | 796 | 29.8 | 4.03 | 0.09 | 0.20 | 58 | 6.5 | 9.0 | 8 |
| B2 | boss | ankylosaurusx1+giantWaspx3 | 726 | 18.6 | 1.70 | 0.16 | 0.05 | 52 | 6.0 | 4.0 | 4 |
| B3 | boss | glasshidex1+gargoylex2+darkmantlex2 | 695 | 18.0 | 1.25 | 0.20 | 0.04 | 39 | 6.7 | 5.9 | 5 |
| B4 | boss | brakkx1+cindermawx1 | 652 | 13.8 | 1.25 | 0.06 | 0.07 | 46 | 3.0 | 7.7 | 7 |
| B4 | elite | animatedArmorx3 | 651 | 13.5 | 0.73 | 0.11 | 0.00 | 30 | 6.8 | 6.9 | 3 |
| B3 | elite | ochreJellyx2 | 616 | 13.3 | 0.97 | 0.21 | 0.02 | 32 | 7.0 | 5.0 | 3 |
| B5 | phase2 | tyrannosaurusx1 | 614 | 9.0 | 2.67 | 0.03 | 0.02 | 16 | 5.7 | 9.0 | 5 |
| B3 | elite | darkmantlex4 | 592 | 9.0 | 0.68 | 0.06 | 0.01 | 34 | 5.0 | 5.0 | 2 |
| B3 | elite | violetFungusx4+shriekerx2 | 609 | 8.9 | 0.55 | 0.05 | 0.01 | 25 | 4.0 | 5.0 | 2 |
| B5 | elite | triceratopsx1+allosaurusx2 | 604 | 7.5 | 0.88 | 0.11 | 0.00 | 25 | 6.4 | 9.0 | 6 |
| B4 | elite | hellHoundx2 | 533 | 7.1 | 0.71 | 0.10 | 0.00 | 44 | 6.5 | 7.0 | 5 |
| B2 | elite | giantToadx1+giantCrabx3 | 502 | 6.6 | 0.78 | 0.18 | 0.01 | 20 | 6.4 | 3.1 | 2 |
| B1 | elite | direWolfx1 | 623 | 6.4 | 0.97 | 0.16 | 0.58 | 21 | 4.6 | 1.1 | 1 |
| B3 | random | darkmantlex3+giantCentipedex2 | 212 | 5.2 | 0.34 | 0.01 | 0.00 | 17 | 2.8 | 5.0 | 2 |
| B2 | random | flyingSwordx3 | 124 | 4.0 | 0.14 | 0.02 | 0.00 | 14 | 3.7 | 3.3 | 1 |
| B2 | elite | flyingSwordx4 | 539 | 3.9 | 0.47 | 0.07 | 0.00 | 19 | 5.2 | 3.0 | 1 |
| B4 | random | cultFanaticx3+cultistx2 | 341 | 3.8 | 0.39 | 0.04 | 0.02 | 16 | 3.3 | 6.9 | 5 |
| B3 | random | ochreJellyx2 | 414 | 3.1 | 0.34 | 0.04 | 0.02 | 15 | 3.3 | 5.0 | 3 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 362 · B5 malthrax: 160 · B1 giantWolfSpider: 141 · B1 wolf: 109 · B1 giantPoisonousSnake: 68 · B4 cindermaw: 37 · B2 ankylosaurus: 31 · B3 glasshide: 28 · B3 ochreJelly: 25 · B4 cultFanatic: 23 · B2 giantWasp: 16 · B4 brakk: 10 · B5 tyrannosaurus: 10 · B3 darkmantle: 9

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B5 malthrax: 94 · B1 direWolf: 69 · B1 wolf: 56 · B1 giantWolfSpider: 37 · B4 cultFanatic: 29 · B3 glasshide: 29 · B3 ochreJelly: 25 · B5 tyrannosaurus: 21 · B2 giantToad: 20 · B3 darkmantle: 17 · B5 triceratops: 11 · B1 giantPoisonousSnake: 11 · B3 violetFungus: 8 · B4 brakk: 8
