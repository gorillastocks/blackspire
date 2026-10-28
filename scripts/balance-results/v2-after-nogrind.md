# Blackspire balance sim — v2-after-nogrind

1200 seeded campaigns (300 per party × standard / nohealer / liora / rush), difficulty normal, grinding off, seeds 1…300. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 106s.

## All parties (1200 runs; victories 965/1200; results {"victory":965,"stuck on B4":35,"stuck on B2":109,"stuck on B3":50,"stuck on B5":41}; mean wipes/run 3.2; mean moon 6.5, empowered finale 91%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.5 (3) | 99 / 99 | – | 0.1 (11) | 0.0 | 8.2 | 1 | 2.8 | 0.3 | 0.9 | 0.2 | 97 (1.8) | 533 / 437 | 1.5 | 1.5/0.3/0.0 | 0 · 0.0 · 0.0 | 234 | 9 |
| B2 | 3.0 (3) | 3.7 (4) | 76 / 47 | – | 1.1 (29) | 1.0 | 8.4 | 12 | 7.0 | 0.6 | 0.3 | 0.1 | 96 (1.6) | 1055 / 600 | 3.0 | 1.4/0.4/0.0 | 0 · 0.0 · 0.0 | 289 | 13 |
| B3 | 4.8 (5) | 5.8 (6) | 86 / 68 | – | 0.6 (22) | 0.4 | 12.1 | 14 | 4.7 | 0.5 | 0.1 | 0.1 | 96 (2.5) | 2416 / 1814 | 2.4 | 1.8/0.7/0.1 | 0 · 0.0 · 0.0 | 475 | 19 |
| B4 | 6.8 (7) | 7.6 (8) | 88 / 80 | – | 0.7 (26) | 0.2 | 10.9 | 5 | 4.8 | 0.4 | 0.2 | 0.1 | 88 (2.9) | 3099 / 371 | 2.4 | 1.8/0.9/0.3 | 0 · 0.0 · 0.0 | 387 | 18 |
| B5 | 8.8 (9) | 9.0 (9) | 75 / 68 | 87 / 88 | 1.0 (42) | 0.6 | 10.0 | 6 | 11.7 | 0.4 | 0.3 | 0.2 | 90 (3.1) | 4186 / 448 | 2.5 | 1.7/1.2/0.4 | 0 · 0.0 · 0.0 | 298 | 19 |

## Party: standard (300 runs; victories 297/300; results {"victory":297,"stuck on B4":1,"stuck on B3":2}; mean wipes/run 0.8; mean moon 6.4, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (11) | 0.0 | 9.4 | 1 | 2.8 | 0.3 | 0.9 | 0.2 | 96 (2.1) | 630 / 552 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 285 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 92 / 91 | – | 0.2 (13) | 0.1 | 8.6 | 13 | 3.1 | 0.2 | 0.1 | 0.1 | 98 (2.0) | 1330 / 583 | 4.0 | 1.9/0.5/0.0 | 0 · 0.0 · 0.0 | 278 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 94 / 90 | – | 0.2 (10) | 0.1 | 13.2 | 15 | 3.0 | 0.3 | 0.1 | 0.1 | 99 (3.0) | 2835 / 2023 | 3.0 | 2.3/0.9/0.2 | 0 · 0.0 · 0.0 | 469 | 19 |
| B4 | 7.0 (7) | 8.0 (8) | 95 / 95 | – | 0.2 (12) | 0.1 | 11.7 | 5 | 3.1 | 0.2 | 0.1 | 0.1 | 98 (3.0) | 3598 / 127 | 3.0 | 2.1/1.0/0.3 | 0 · 0.0 · 0.0 | 415 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 94 / 94 | 93 / 93 | 0.2 (18) | 0.1 | 9.9 | 7 | 6.6 | 0.2 | 0.1 | 0.2 | 99 (3.0) | 4601 / 92 | 3.0 | 1.9/1.2/0.5 | 0 · 0.0 · 0.0 | 238 | 18 |

## Party: nohealer (300 runs; victories 247/300; results {"victory":247,"stuck on B4":11,"stuck on B2":21,"stuck on B5":5,"stuck on B3":16}; mean wipes/run 3.6; mean moon 7.5, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (19) | 0.0 | 9.4 | 1 | 4.5 | 0.6 | 1.4 | 0.4 | 94 (2.1) | 623 / 528 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 287 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 79 / 54 | – | 1.0 (35) | 0.8 | 9.5 | 11 | 8.2 | 1.2 | 0.2 | 0.1 | 92 (2.2) | 1324 / 849 | 4.0 | 1.8/0.5/0.1 | 0 · 0.0 · 0.0 | 327 | 14 |
| B3 | 4.9 (5) | 5.9 (6) | 79 / 61 | – | 0.9 (35) | 0.6 | 13.9 | 12 | 6.4 | 0.9 | 0.2 | 0.1 | 92 (3.2) | 2830 / 1780 | 3.0 | 2.3/0.9/0.2 | 0 · 0.0 · 0.0 | 526 | 21 |
| B4 | 6.9 (7) | 7.8 (8) | 91 / 89 | – | 0.8 (40) | 0.1 | 12.1 | 5 | 6.4 | 0.9 | 0.2 | 0.1 | 83 (3.5) | 3485 / 793 | 2.9 | 2.1/1.0/0.2 | 0 · 0.0 · 0.0 | 416 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 76 / 75 | 77 / 82 | 0.9 (58) | 0.5 | 10.3 | 5 | 13.9 | 0.8 | 0.1 | 0.2 | 91 (3.2) | 4480 / 732 | 3.0 | 1.8/1.2/0.5 | 0 · 0.0 · 0.0 | 313 | 20 |

## Party: liora (300 runs; victories 294/300; results {"victory":294,"stuck on B4":1,"stuck on B3":4,"stuck on B2":1}; mean wipes/run 1.1; mean moon 6.8, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (8) | 0.0 | 9.4 | 1 | 2.5 | 0.2 | 0.7 | 0.2 | 98 (2.0) | 626 / 556 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 284 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 91 / 88 | – | 0.2 (13) | 0.1 | 8.7 | 13 | 3.1 | 0.3 | 0.1 | 0.1 | 99 (2.0) | 1332 / 809 | 4.0 | 1.8/0.4/0.0 | 0 · 0.0 · 0.0 | 281 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 95 / 88 | – | 0.3 (14) | 0.1 | 13.4 | 14 | 3.4 | 0.4 | 0.0 | 0.1 | 97 (3.1) | 2850 / 2542 | 3.0 | 2.3/0.9/0.2 | 0 · 0.0 · 0.0 | 474 | 20 |
| B4 | 7.0 (7) | 7.9 (8) | 97 / 96 | – | 0.2 (8) | 0.0 | 11.6 | 6 | 1.9 | 0.2 | 0.0 | 0.0 | 97 (3.1) | 3575 / 228 | 3.0 | 2.0/1.2/0.4 | 0 · 0.0 · 0.0 | 416 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 74 / 77 | 95 / 95 | 0.4 (34) | 0.4 | 10.1 | 6 | 8.7 | 0.2 | 0.2 | 0.2 | 99 (3.0) | 4570 / 102 | 3.0 | 1.8/1.4/0.4 | 0 · 0.0 · 0.0 | 249 | 18 |

## Party: rush (300 runs; victories 127/300; results {"stuck on B2":87,"victory":127,"stuck on B3":28,"stuck on B5":36,"stuck on B4":22}; mean wipes/run 7.4; mean moon 5.3, empowered finale 62%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 1.0 (3) | 96 / 96 | – | 0.0 (4) | 0.0 | 4.6 | 0 | 1.6 | 0.1 | 0.5 | 0.1 | 100 (1.0) | 255 / 109 | 0.0 | 0.8/0.2/0.0 | 0 · 0.0 · 0.0 | 79 | 6 |
| B2 | 3.0 (3) | 3.0 (4) | 45 / 19 | – | 3.1 (55) | 3.0 | 6.8 | 11 | 13.7 | 0.7 | 0.9 | 0.3 | – (0.0) | 234 / 158 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 269 | 15 |
| B3 | 4.0 (5) | 5.0 (6) | 73 / 43 | – | 1.4 (31) | 1.2 | 6.4 | 14 | 6.4 | 0.6 | 0.2 | 0.2 | 100 (0.0) | 673 / 541 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 416 | 14 |
| B4 | 6.0 (7) | 6.0 (8) | 55 / 45 | – | 2.2 (57) | 1.1 | 6.8 | 6 | 9.7 | 0.5 | 0.7 | 0.2 | 52 (1.8) | 986 / 392 | 0.0 | 0.6/0.3/0.1 | 0 · 0.0 · 0.0 | 252 | 13 |
| B5 | 8.0 (9) | 8.8 (9) | 40 / 33 | 75 / 73 | 3.5 (78) | 1.9 | 9.6 | 4 | 22.9 | 0.7 | 1.0 | 0.4 | 59 (3.1) | 2281 / 1282 | 0.0 | 0.9/0.7/0.3 | 0 · 0.0 · 0.0 | 475 | 22 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B2 | boss | ankylosaurusx1+giantWaspx3 | 2317 | 52.9 | 2.65 | 0.17 | 0.12 | 70 | 5.7 | 3.5 | 4 |
| B3 | boss | glasshidex1+gargoylex2+darkmantlex2 | 1530 | 32.0 | 1.48 | 0.18 | 0.05 | 49 | 6.4 | 5.7 | 5 |
| B5 | boss | malthraxx1+gargoylex2+animatedArmorx2 | 1421 | 31.9 | 3.66 | 0.07 | 0.17 | 59 | 6.3 | 8.9 | 8 |
| B4 | elite | animatedArmorx3 | 1293 | 21.6 | 0.93 | 0.13 | 0.00 | 37 | 6.8 | 6.7 | 3 |
| B4 | boss | brakkx1+cindermawx1 | 1260 | 20.2 | 1.43 | 0.04 | 0.13 | 50 | 3.0 | 7.4 | 7 |
| B5 | elite | triceratopsx1+allosaurusx2 | 1213 | 19.1 | 1.20 | 0.11 | 0.00 | 36 | 6.5 | 8.7 | 6 |
| B5 | phase2 | tyrannosaurusx1 | 1102 | 12.4 | 3.01 | 0.05 | 0.01 | 18 | 5.7 | 9.0 | 5 |
| B3 | elite | violetFungusx4+shriekerx2 | 930 | 5.8 | 0.40 | 0.03 | 0.00 | 22 | 3.8 | 5.0 | 2 |
| B2 | elite | giantToadx1+giantCrabx3 | 952 | 5.6 | 0.77 | 0.16 | 0.01 | 21 | 6.5 | 3.1 | 2 |
| B1 | elite | direWolfx1 | 953 | 5.6 | 0.84 | 0.15 | 0.54 | 21 | 4.5 | 1.1 | 1 |
| B4 | elite | hellHoundx2 | 893 | 5.4 | 0.64 | 0.11 | 0.00 | 45 | 6.4 | 7.0 | 5 |
| B4 | random | animatedArmorx3 | 459 | 5.2 | 0.24 | 0.02 | 0.00 | 14 | 3.2 | 6.9 | 3 |
| B3 | elite | ochreJellyx2 | 926 | 5.2 | 0.71 | 0.15 | 0.01 | 27 | 6.7 | 5.0 | 3 |
| B4 | random | cultFanaticx3+cultistx2 | 440 | 4.5 | 0.34 | 0.02 | 0.02 | 20 | 3.3 | 6.8 | 5 |
| B5 | elite | animatedArmorx4 | 1043 | 3.9 | 0.16 | 0.01 | 0.00 | 23 | 4.8 | 8.8 | 3 |
| B4 | random | minotaurSkeletonx2+magminx2 | 433 | 3.5 | 0.20 | 0.02 | 0.00 | 13 | 3.6 | 6.9 | 5 |
| B4 | elite | cultFanaticx2+cultistx2 | 873 | 3.3 | 0.24 | 0.04 | 0.01 | 26 | 5.8 | 7.0 | 4 |
| B5 | random | cultFanaticx4 | 212 | 3.3 | 0.24 | 0.01 | 0.00 | 14 | 3.0 | 8.9 | 5 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 511 · B5 malthrax: 244 · B1 giantWolfSpider: 208 · B2 ankylosaurus: 201 · B1 wolf: 191 · B4 cindermaw: 113 · B2 giantWasp: 103 · B3 glasshide: 68 · B1 giantSpider: 62 · B1 giantPoisonousSnake: 59 · B4 brakk: 52 · B4 cultFanatic: 36 · B2 giantToad: 21 · B3 ochreJelly: 20

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B5 malthrax: 153 · B1 wolf: 83 · B1 direWolf: 73 · B2 ankylosaurus: 70 · B3 glasshide: 67 · B1 giantWolfSpider: 48 · B2 giantToad: 45 · B5 tyrannosaurus: 40 · B4 cultFanatic: 35 · B4 brakk: 27 · B3 ochreJelly: 24 · B2 giantWasp: 24 · B4 cindermaw: 20 · B5 triceratops: 18
