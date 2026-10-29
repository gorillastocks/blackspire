# Blackspire balance sim — ranks-after-nogrind

1200 seeded campaigns (300 per party × standard / nohealer / liora / rush), difficulty normal, grinding off, seeds 1…300. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 134s.

## All parties (1200 runs; victories 979/1200; results {"victory":979,"stuck on B5":28,"stuck on B2":106,"stuck on B4":16,"stuck on B3":71}; mean wipes/run 3.0; mean moon 6.4, empowered finale 89%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.5 (3) | 99 / 99 | – | 0.1 (12) | 0.0 | 8.3 | 1 | 3.1 | 0.3 | 0.9 | 0.2 | 96 (1.8) | 534 / 433 | 1.5 | 1.6/0.3/0.0 | 0 · 0.0 · 0.0 | 234 | 10 |
| B2 | 3.0 (3) | 3.7 (4) | 78 / 50 | – | 1.1 (28) | 0.9 | 8.3 | 8 | 6.3 | 0.7 | 0.2 | 0.1 | 96 (1.6) | 1082 / 636 | 3.0 | 1.4/0.4/0.0 | 0 · 0.0 · 0.0 | 286 | 13 |
| B3 | 4.8 (5) | 5.8 (6) | 85 / 61 | – | 0.8 (23) | 0.6 | 12.4 | 13 | 4.6 | 0.5 | 0.1 | 0.1 | 96 (2.5) | 2444 / 1783 | 2.4 | 1.8/0.8/0.1 | 0 · 0.0 · 0.0 | 491 | 20 |
| B4 | 6.8 (7) | 7.6 (8) | 87 / 83 | – | 0.4 (22) | 0.2 | 10.9 | 4 | 3.7 | 0.3 | 0.1 | 0.0 | 94 (2.8) | 3247 / 350 | 2.5 | 1.8/1.0/0.3 | 0 · 0.0 · 0.0 | 375 | 18 |
| B5 | 8.8 (9) | 9.0 (9) | 74 / 67 | 92 / 91 | 0.8 (37) | 0.6 | 10.0 | 5 | 10.7 | 0.4 | 0.2 | 0.2 | 96 (3.0) | 4296 / 430 | 2.5 | 1.7/1.1/0.5 | 0 · 0.0 · 0.0 | 305 | 19 |

## Party: standard (300 runs; victories 292/300; results {"victory":292,"stuck on B3":6,"stuck on B2":1,"stuck on B4":1}; mean wipes/run 1.0; mean moon 6.4, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (11) | 0.0 | 9.6 | 1 | 3.2 | 0.2 | 1.0 | 0.2 | 96 (2.1) | 630 / 540 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 284 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 91 / 88 | – | 0.2 (15) | 0.1 | 8.8 | 8 | 3.3 | 0.3 | 0.1 | 0.1 | 98 (2.0) | 1365 / 693 | 4.0 | 1.9/0.5/0.1 | 0 · 0.0 · 0.0 | 280 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 92 / 85 | – | 0.3 (15) | 0.2 | 13.7 | 13 | 3.3 | 0.4 | 0.1 | 0.1 | 97 (3.1) | 2914 / 1916 | 3.0 | 2.1/1.0/0.2 | 0 · 0.0 · 0.0 | 475 | 20 |
| B4 | 7.0 (7) | 8.0 (8) | 90 / 89 | – | 0.2 (16) | 0.1 | 11.9 | 5 | 3.1 | 0.2 | 0.1 | 0.1 | 97 (3.1) | 3680 / 152 | 3.0 | 2.0/1.1/0.3 | 0 · 0.0 · 0.0 | 417 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 91 / 92 | 96 / 96 | 0.2 (17) | 0.1 | 10.0 | 5 | 5.5 | 0.2 | 0.1 | 0.2 | 99 (3.0) | 4667 / 84 | 3.0 | 1.9/1.2/0.4 | 0 · 0.0 · 0.0 | 246 | 18 |

## Party: nohealer (300 runs; victories 252/300; results {"victory":252,"stuck on B5":3,"stuck on B2":22,"stuck on B4":7,"stuck on B3":16}; mean wipes/run 3.4; mean moon 7.3, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (23) | 0.0 | 9.5 | 1 | 4.8 | 0.6 | 1.4 | 0.4 | 93 (2.1) | 622 / 525 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 288 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 77 / 55 | – | 1.1 (36) | 0.8 | 9.5 | 8 | 7.7 | 1.4 | 0.1 | 0.1 | 92 (2.2) | 1345 / 861 | 4.0 | 1.9/0.5/0.0 | 0 · 0.0 · 0.0 | 330 | 14 |
| B3 | 4.9 (5) | 5.9 (6) | 76 / 58 | – | 1.0 (37) | 0.7 | 14.1 | 12 | 6.0 | 0.9 | 0.1 | 0.1 | 94 (3.2) | 2849 / 1830 | 3.0 | 2.3/0.8/0.2 | 0 · 0.0 · 0.0 | 530 | 22 |
| B4 | 6.9 (7) | 7.8 (8) | 91 / 91 | – | 0.6 (29) | 0.1 | 12.0 | 4 | 4.8 | 0.7 | 0.1 | 0.0 | 88 (3.3) | 3625 / 703 | 2.9 | 2.1/1.0/0.3 | 0 · 0.0 · 0.0 | 408 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 67 / 66 | 92 / 92 | 0.8 (47) | 0.6 | 10.5 | 5 | 12.9 | 0.7 | 0.1 | 0.2 | 97 (3.1) | 4626 / 650 | 3.0 | 1.8/1.2/0.5 | 0 · 0.0 · 0.0 | 322 | 20 |

## Party: liora (300 runs; victories 294/300; results {"victory":294,"stuck on B3":3,"stuck on B2":3}; mean wipes/run 0.9; mean moon 6.6, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (8) | 0.0 | 9.6 | 1 | 2.6 | 0.2 | 0.8 | 0.2 | 98 (2.0) | 629 / 559 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 283 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 89 / 83 | – | 0.2 (14) | 0.2 | 8.7 | 9 | 3.2 | 0.3 | 0.0 | 0.1 | 99 (2.0) | 1365 / 807 | 4.0 | 1.8/0.5/0.0 | 0 · 0.0 · 0.0 | 286 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 97 / 90 | – | 0.2 (9) | 0.1 | 13.4 | 13 | 2.5 | 0.3 | 0.0 | 0.0 | 98 (3.1) | 2901 / 2536 | 3.0 | 2.3/1.0/0.1 | 0 · 0.0 · 0.0 | 469 | 20 |
| B4 | 7.0 (7) | 8.0 (8) | 97 / 96 | – | 0.1 (8) | 0.0 | 11.9 | 4 | 1.6 | 0.1 | 0.0 | 0.0 | 99 (3.0) | 3756 / 180 | 3.0 | 2.0/1.1/0.3 | 0 · 0.0 · 0.0 | 415 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 77 / 79 | 98 / 98 | 0.3 (27) | 0.3 | 10.1 | 5 | 7.4 | 0.1 | 0.1 | 0.2 | 100 (3.0) | 4683 / 42 | 3.0 | 1.8/1.3/0.5 | 0 · 0.0 · 0.0 | 243 | 18 |

## Party: rush (300 runs; victories 141/300; results {"victory":141,"stuck on B2":80,"stuck on B5":25,"stuck on B3":46,"stuck on B4":8}; mean wipes/run 6.5; mean moon 5.1, empowered finale 55%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 1.0 (3) | 95 / 95 | – | 0.1 (5) | 0.1 | 4.7 | 0 | 1.7 | 0.1 | 0.6 | 0.1 | 100 (1.0) | 253 / 108 | 0.0 | 0.8/0.1/0.0 | 0 · 0.0 · 0.0 | 79 | 6 |
| B2 | 3.0 (3) | 3.0 (4) | 55 / 22 | – | 2.8 (45) | 2.6 | 6.3 | 8 | 11.0 | 0.7 | 0.6 | 0.2 | – (0.0) | 253 / 183 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 247 | 13 |
| B3 | 4.0 (5) | 5.0 (6) | 69 / 32 | – | 2.1 (34) | 1.7 | 7.1 | 13 | 7.5 | 0.7 | 0.2 | 0.3 | – (0.0) | 677 / 524 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 495 | 16 |
| B4 | 6.0 (7) | 6.0 (8) | 57 / 54 | – | 1.2 (47) | 0.8 | 5.8 | 7 | 6.6 | 0.3 | 0.5 | 0.1 | 80 (1.2) | 1089 / 437 | 0.0 | 0.5/0.3/0.1 | 0 · 0.0 · 0.0 | 187 | 11 |
| B5 | 7.9 (9) | 8.8 (9) | 45 / 36 | 74 / 70 | 2.7 (73) | 1.9 | 9.2 | 3 | 22.0 | 0.7 | 0.6 | 0.4 | 76 (2.5) | 2452 / 1388 | 0.0 | 0.9/0.7/0.3 | 0 · 0.0 · 0.0 | 495 | 22 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B2 | boss | ankylosaurusx1+giantWaspx3 | 2200 | 50.3 | 2.41 | 0.19 | 0.10 | 68 | 5.7 | 3.5 | 4 |
| B3 | boss | glasshidex1+gargoylex2+darkmantlex2 | 1670 | 38.7 | 1.62 | 0.19 | 0.07 | 52 | 6.9 | 5.6 | 5 |
| B5 | boss | malthraxx1+gargoylex2+animatedArmorx2 | 1473 | 33.3 | 4.23 | 0.07 | 0.11 | 60 | 7.3 | 9.0 | 8 |
| B4 | boss | brakkx1+cindermawx1 | 1217 | 17.3 | 1.39 | 0.06 | 0.10 | 48 | 3.2 | 7.4 | 7 |
| B3 | random | ochreJellyx2+darkmantlex2+giantCentipedex2+shriekerx1 | 219 | 12.3 | 0.86 | 0.11 | 0.01 | 27 | 4.9 | 5.0 | 5 |
| B4 | elite | animatedArmorx3 | 1135 | 10.9 | 0.52 | 0.08 | 0.00 | 27 | 7.1 | 6.8 | 3 |
| B5 | elite | triceratopsx1+allosaurusx2 | 1112 | 10.4 | 0.84 | 0.12 | 0.00 | 29 | 8.2 | 8.8 | 6 |
| B5 | phase2 | tyrannosaurusx1 | 1079 | 9.3 | 2.33 | 0.03 | 0.01 | 14 | 5.8 | 9.0 | 5 |
| B2 | random | direWolfx1+flyingSwordx2+cultistx2 | 364 | 7.1 | 0.63 | 0.07 | 0.00 | 24 | 5.0 | 3.1 | 2 |
| B4 | random | gargoylex3+magminx2+cultFanaticx2 | 148 | 6.8 | 0.45 | 0.05 | 0.00 | 24 | 5.3 | 6.9 | 7 |
| B3 | random | ochreJellyx2+darkmantlex2+giantCentipedex1+shriekerx1 | 228 | 6.6 | 0.63 | 0.13 | 0.00 | 24 | 4.6 | 5.0 | 5 |
| B3 | random | giantCentipedex3+violetFungusx2+shriekerx1 | 127 | 6.3 | 0.23 | 0.04 | 0.00 | 12 | 2.6 | 4.9 | 2 |
| B1 | elite | direWolfx1 | 957 | 6.0 | 0.84 | 0.13 | 0.53 | 22 | 4.4 | 1.1 | 1 |
| B2 | elite | giantToadx1+giantCrabx3 | 952 | 5.6 | 0.70 | 0.19 | 0.01 | 22 | 7.3 | 3.1 | 2 |
| B4 | random | gargoylex3+magminx3+cultFanaticx2 | 170 | 5.3 | 0.42 | 0.04 | 0.00 | 22 | 5.3 | 6.9 | 7 |
| B5 | random | animatedArmorx3+minotaurSkeletonx1+cultFanaticx2 | 176 | 5.1 | 0.39 | 0.06 | 0.00 | 20 | 4.9 | 8.9 | 5 |
| B2 | random | giantCrabx2+giantWaspx2 | 161 | 5.0 | 0.34 | 0.02 | 0.04 | 14 | 3.5 | 3.1 | 2 |
| B3 | elite | ochreJellyx2 | 914 | 4.8 | 0.45 | 0.12 | 0.00 | 24 | 6.6 | 5.0 | 3 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 509 · B1 giantWolfSpider: 242 · B2 ankylosaurus: 185 · B1 wolf: 178 · B5 malthrax: 166 · B3 glasshide: 112 · B4 cindermaw: 85 · B1 giantSpider: 75 · B1 giantPoisonousSnake: 73 · B2 giantWasp: 40 · B4 brakk: 35 · B1 giantFrog: 19 · B1 skarn: 17 · B2 giantToad: 15

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B5 malthrax: 210 · B3 glasshide: 105 · B1 wolf: 104 · B1 direWolf: 83 · B2 ankylosaurus: 55 · B1 giantWolfSpider: 41 · B2 giantToad: 35 · B5 tyrannosaurus: 27 · B1 giantSpider: 18 · B4 brakk: 17 · B4 cultFanatic: 15 · B4 cindermaw: 15 · B1 giantPoisonousSnake: 14 · B5 triceratops: 8
