# Blackspire balance sim — ranks-after-grind

1200 seeded campaigns (300 per party × standard / nohealer / liora / rush), difficulty normal, grinding on, seeds 1…300. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 355s.

## All parties (1200 runs; victories 1143/1200; results {"victory":1143,"stuck on B3":28,"stuck on B5":7,"stuck on B2":17,"stuck on B4":4,"stuck on B1":1}; mean wipes/run 2.0; mean moon 6.8, empowered finale 98%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (19) | 0.0 | 12.1 | 0 | 4.3 | 0.4 | 1.2 | 0.4 | 95 (2.1) | 650 / 540 | 1.6 | 1.7/0.3/0.0 | 91 · 4.3 · 23.0 | 1984 | 32 |
| B2 | 3.0 (3) | 4.0 (4) | 86 / 78 | – | 0.4 (21) | 0.3 | 8.7 | 12 | 4.3 | 0.5 | 0.1 | 0.1 | 95 (1.7) | 1172 / 653 | 3.1 | 1.5/0.4/0.1 | 35 · 1.1 · 5.8 | 687 | 17 |
| B3 | 4.9 (5) | 5.9 (6) | 88 / 81 | – | 0.5 (28) | 0.2 | 14.4 | 16 | 4.6 | 0.6 | 0.1 | 0.1 | 94 (3.0) | 2787 / 1999 | 2.4 | 2.1/0.8/0.2 | 42 · 3.1 · 13.2 | 1308 | 30 |
| B4 | 6.9 (7) | 7.8 (8) | 89 / 88 | – | 0.3 (20) | 0.1 | 12.3 | 6 | 3.5 | 0.3 | 0.1 | 0.0 | 97 (2.9) | 3584 / 533 | 2.5 | 1.9/1.0/0.3 | 41 · 2.3 · 9.3 | 949 | 26 |
| B5 | 9.0 (9) | 9.0 (9) | 72 / 68 | 93 / 93 | 0.6 (38) | 0.5 | 11.3 | 6 | 10.4 | 0.4 | 0.2 | 0.2 | 98 (2.9) | 4643 / 324 | 2.5 | 1.7/1.2/0.4 | 35 · 1.6 · 12.9 | 1188 | 31 |

## Party: standard (300 runs; victories 294/300; results {"victory":294,"stuck on B3":2,"stuck on B2":4}; mean wipes/run 1.0; mean moon 6.6, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (13) | 0.0 | 12.3 | 0 | 3.9 | 0.3 | 1.2 | 0.3 | 96 (2.1) | 688 / 596 | 2.0 | 1.8/0.3/0.0 | 89 · 2.8 · 21.9 | 2011 | 33 |
| B2 | 3.0 (3) | 4.0 (4) | 88 / 82 | – | 0.3 (17) | 0.2 | 9.3 | 11 | 3.6 | 0.3 | 0.1 | 0.1 | 97 (2.1) | 1375 / 631 | 4.0 | 1.9/0.4/0.1 | 12 · 0.4 · 4.0 | 602 | 16 |
| B3 | 5.0 (5) | 6.0 (6) | 93 / 90 | – | 0.2 (13) | 0.1 | 13.8 | 15 | 3.1 | 0.3 | 0.1 | 0.1 | 98 (3.1) | 2915 / 2010 | 3.0 | 2.4/0.8/0.2 | 12 · 0.3 · 3.5 | 738 | 23 |
| B4 | 7.0 (7) | 8.0 (8) | 90 / 90 | – | 0.2 (14) | 0.1 | 12.2 | 5 | 3.0 | 0.2 | 0.1 | 0.0 | 99 (3.0) | 3766 / 112 | 3.0 | 2.1/1.0/0.3 | 18 · 0.5 · 3.4 | 662 | 23 |
| B5 | 9.0 (9) | 9.0 (9) | 91 / 92 | 93 / 94 | 0.2 (20) | 0.2 | 10.4 | 6 | 6.5 | 0.2 | 0.1 | 0.2 | 99 (3.0) | 4774 / 106 | 3.0 | 1.9/1.2/0.5 | 16 · 0.5 · 3.8 | 523 | 22 |

## Party: nohealer (300 runs; victories 267/300; results {"victory":267,"stuck on B2":12,"stuck on B4":2,"stuck on B5":3,"stuck on B3":16}; mean wipes/run 3.2; mean moon 7.6, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.3 (28) | 0.0 | 12.2 | 0 | 5.8 | 0.6 | 1.6 | 0.5 | 93 (2.1) | 679 / 560 | 2.0 | 1.8/0.3/0.0 | 81 · 2.7 · 21.4 | 1975 | 32 |
| B2 | 3.0 (3) | 4.0 (4) | 78 / 61 | – | 0.9 (36) | 0.6 | 10.4 | 11 | 7.6 | 1.3 | 0.1 | 0.1 | 91 (2.2) | 1397 / 860 | 4.0 | 1.9/0.5/0.0 | 22 · 1.0 · 10.8 | 1184 | 24 |
| B3 | 4.9 (5) | 5.9 (6) | 75 / 62 | – | 1.0 (39) | 0.6 | 15.5 | 16 | 6.0 | 1.0 | 0.1 | 0.1 | 91 (3.2) | 2969 / 1841 | 3.0 | 2.3/0.8/0.2 | 44 · 1.4 · 17.0 | 1864 | 38 |
| B4 | 6.9 (7) | 7.9 (8) | 93 / 92 | – | 0.4 (29) | 0.1 | 12.8 | 5 | 4.7 | 0.7 | 0.1 | 0.1 | 93 (3.2) | 3878 / 707 | 3.0 | 2.1/1.2/0.2 | 35 · 0.8 · 5.6 | 820 | 25 |
| B5 | 9.0 (9) | 9.0 (9) | 68 / 68 | 89 / 90 | 0.8 (49) | 0.6 | 11.9 | 6 | 13.3 | 0.7 | 0.1 | 0.2 | 95 (3.1) | 4990 / 757 | 3.0 | 1.9/1.2/0.4 | 41 · 1.4 · 12.8 | 1289 | 33 |

## Party: liora (300 runs; victories 297/300; results {"victory":297,"stuck on B2":1,"stuck on B4":1,"stuck on B3":1}; mean wipes/run 0.9; mean moon 6.8, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (10) | 0.0 | 12.6 | 0 | 3.1 | 0.2 | 0.9 | 0.2 | 98 (2.0) | 694 / 611 | 2.0 | 1.8/0.3/0.0 | 93 · 3.1 · 24.4 | 2209 | 35 |
| B2 | 3.0 (3) | 4.0 (4) | 90 / 88 | – | 0.2 (15) | 0.1 | 9.1 | 11 | 3.2 | 0.3 | 0.0 | 0.0 | 97 (2.1) | 1374 / 842 | 4.0 | 1.9/0.4/0.1 | 9 · 0.3 · 2.1 | 447 | 14 |
| B3 | 5.0 (5) | 6.0 (6) | 95 / 92 | – | 0.2 (12) | 0.1 | 13.9 | 15 | 2.4 | 0.3 | 0.0 | 0.0 | 98 (3.1) | 2934 / 2551 | 3.0 | 2.4/0.9/0.2 | 11 · 0.3 · 3.0 | 699 | 23 |
| B4 | 7.0 (7) | 8.0 (8) | 95 / 95 | – | 0.1 (9) | 0.1 | 12.0 | 5 | 1.6 | 0.2 | 0.0 | 0.0 | 97 (3.1) | 3740 / 177 | 3.0 | 2.0/1.2/0.3 | 12 · 0.3 · 2.1 | 564 | 21 |
| B5 | 9.0 (9) | 9.0 (9) | 79 / 78 | 99 / 99 | 0.3 (25) | 0.3 | 10.9 | 7 | 6.8 | 0.2 | 0.1 | 0.2 | 100 (3.0) | 4825 / 70 | 3.0 | 1.8/1.3/0.5 | 22 · 0.7 · 6.8 | 750 | 25 |

## Party: rush (300 runs; victories 285/300; results {"victory":285,"stuck on B5":4,"stuck on B3":9,"stuck on B1":1,"stuck on B4":1}; mean wipes/run 3.0; mean moon 6.1, empowered finale 92%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.3 (27) | 0.0 | 11.3 | 0 | 4.4 | 0.5 | 1.1 | 0.4 | 94 (1.9) | 539 / 395 | 0.6 | 1.6/0.3/0.0 | 99 · 8.5 · 24.2 | 1739 | 29 |
| B2 | 3.0 (3) | 4.0 (4) | 86 / 85 | – | 0.2 (15) | 0.2 | 5.9 | 17 | 2.6 | 0.2 | 0.1 | 0.0 | 98 (0.7) | 539 / 278 | 0.2 | 0.5/0.2/0.0 | 98 · 2.6 · 6.2 | 515 | 12 |
| B3 | 4.6 (5) | 5.6 (6) | 86 / 85 | – | 0.8 (47) | 0.2 | 14.6 | 19 | 7.1 | 0.8 | 0.1 | 0.1 | 86 (2.6) | 2338 / 1588 | 0.6 | 1.5/0.7/0.1 | 100 · 10.2 · 29.5 | 1943 | 38 |
| B4 | 6.7 (7) | 7.3 (8) | 77 / 77 | – | 0.4 (30) | 0.3 | 12.2 | 8 | 4.6 | 0.3 | 0.1 | 0.1 | 97 (2.2) | 2965 / 1163 | 0.8 | 1.2/0.8/0.2 | 99 · 7.6 · 26.2 | 1756 | 36 |
| B5 | 9.0 (9) | 9.0 (9) | 47 / 49 | 89 / 90 | 1.3 (60) | 1.1 | 11.9 | 7 | 15.3 | 0.4 | 0.6 | 0.4 | 96 (2.6) | 3999 / 401 | 0.8 | 1.3/1.0/0.4 | 61 · 4.0 · 28.7 | 2222 | 45 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B5 | boss | malthraxx1+gargoylex2+animatedArmorx2 | 1673 | 31.7 | 4.29 | 0.09 | 0.14 | 59 | 7.4 | 9.0 | 8 |
| B2 | boss | ankylosaurusx1+giantWaspx3 | 1521 | 22.3 | 1.79 | 0.16 | 0.04 | 54 | 6.1 | 4.0 | 4 |
| B3 | boss | glasshidex1+gargoylex2+darkmantlex2 | 1433 | 19.5 | 1.35 | 0.18 | 0.06 | 39 | 7.4 | 5.9 | 5 |
| B4 | boss | brakkx1+cindermawx1 | 1306 | 11.9 | 1.22 | 0.05 | 0.06 | 46 | 3.2 | 7.8 | 7 |
| B3 | random | ochreJellyx2+darkmantlex2+giantCentipedex2+shriekerx1 | 306 | 10.5 | 0.86 | 0.17 | 0.00 | 28 | 5.0 | 5.0 | 5 |
| B3 | random | ochreJellyx2+darkmantlex2+giantCentipedex1+shriekerx1 | 316 | 9.8 | 0.80 | 0.11 | 0.00 | 27 | 4.9 | 5.0 | 5 |
| B3 | elite | ochreJellyx2 | 1199 | 8.2 | 0.59 | 0.12 | 0.01 | 26 | 7.0 | 5.0 | 3 |
| B1 | elite | direWolfx1 | 1255 | 6.9 | 0.94 | 0.15 | 0.54 | 22 | 4.5 | 1.1 | 1 |
| B2 | elite | giantToadx1+giantCrabx3 | 999 | 6.9 | 0.71 | 0.17 | 0.01 | 22 | 7.2 | 3.1 | 2 |
| B5 | phase2 | tyrannosaurusx1 | 1227 | 6.8 | 2.26 | 0.02 | 0.00 | 13 | 6.0 | 9.0 | 5 |
| B3 | elite | violetFungusx4+shriekerx2 | 1186 | 6.6 | 0.44 | 0.04 | 0.00 | 21 | 4.3 | 5.0 | 2 |
| B4 | random | gargoylex3+magminx3+cultFanaticx2 | 264 | 4.9 | 0.49 | 0.07 | 0.00 | 21 | 5.3 | 7.0 | 7 |
| B5 | elite | triceratopsx1+allosaurusx2 | 1204 | 4.9 | 0.59 | 0.10 | 0.00 | 24 | 8.1 | 9.0 | 6 |
| B3 | elite | darkmantlex4 | 1142 | 4.5 | 0.49 | 0.07 | 0.00 | 28 | 5.1 | 5.0 | 2 |
| B4 | random | gargoylex3+magminx2+cultFanaticx2 | 268 | 4.1 | 0.47 | 0.07 | 0.00 | 21 | 5.3 | 6.9 | 7 |
| B4 | elite | hellHoundx2 | 1055 | 4.1 | 0.50 | 0.08 | 0.00 | 40 | 7.0 | 7.0 | 5 |
| B4 | elite | animatedArmorx3 | 1197 | 3.8 | 0.38 | 0.07 | 0.00 | 21 | 7.0 | 6.9 | 3 |
| B2 | random | direWolfx1+flyingSwordx2+cultistx2 | 434 | 3.0 | 0.47 | 0.06 | 0.00 | 19 | 4.8 | 3.3 | 2 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|
| B2 | random | cultistx3 | 182 | 2 | 0.00 | 76 | 3.3 | 1 |

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 676 · B1 giantWolfSpider: 315 · B5 malthrax: 240 · B1 wolf: 231 · B1 giantPoisonousSnake: 129 · B3 glasshide: 91 · B2 ankylosaurus: 59 · B4 cindermaw: 55 · B1 giantFrog: 27 · B4 brakk: 24 · B1 giantRat: 16 · B2 giantWasp: 16 · B1 cultist: 14 · B2 giantToad: 14

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B5 malthrax: 238 · B1 direWolf: 143 · B1 wolf: 142 · B1 giantWolfSpider: 70 · B3 glasshide: 61 · B1 giantPoisonousSnake: 43 · B2 giantToad: 37 · B5 tyrannosaurus: 24 · B4 cultFanatic: 21 · B1 giantRat: 16 · B3 ochreJelly: 15 · B1 cultist: 14 · B2 ankylosaurus: 13 · B4 brakk: 13
