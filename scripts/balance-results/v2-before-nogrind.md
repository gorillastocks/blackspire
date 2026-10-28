# Blackspire balance sim — v2-before-nogrind

1200 seeded campaigns (300 per party × standard / nohealer / liora / rush), difficulty normal, grinding off, seeds 1…300. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 103s.

## All parties (1200 runs; victories 1198/1200; results {"victory":1198,"stuck on B4":1,"stuck on B2":1}; mean wipes/run 0.2; mean moon 4.3, empowered finale 57%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.5 (3) | 99 / 99 | – | 0.1 (11) | 0.0 | 8.2 | 1 | 2.8 | 0.3 | 0.9 | 0.2 | 97 (1.8) | 533 / 437 | 1.5 | 1.5/0.3/0.0 | 0 · 0.0 · 0.0 | 234 | 9 |
| B2 | 3.0 (3) | 3.7 (4) | 100 / 99 | – | 0.0 (1) | 0.0 | 7.1 | 13 | 1.0 | 0.1 | 0.1 | 0.0 | 100 (1.5) | 1002 / 562 | 3.0 | 1.4/0.3/0.0 | 0 · 0.0 · 0.0 | 222 | 10 |
| B3 | 4.7 (5) | 5.7 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 10.9 | 18 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (2.3) | 2074 / 1663 | 2.3 | 1.8/0.7/0.1 | 0 · 0.0 · 0.0 | 409 | 16 |
| B4 | 6.7 (7) | 7.0 (8) | 98 / 97 | – | 0.0 (3) | 0.0 | 9.7 | 7 | 0.6 | 0.0 | 0.0 | 0.0 | 100 (2.5) | 2755 / 119 | 2.3 | 1.7/0.9/0.3 | 0 · 0.0 · 0.0 | 246 | 15 |
| B5 | 8.7 (9) | 8.8 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 8.9 | 7 | 0.3 | 0.0 | 0.0 | 0.0 | 100 (2.8) | 3605 / 46 | 2.3 | 1.6/1.2/0.4 | 0 · 0.0 · 0.0 | 196 | 16 |

## Party: standard (300 runs; victories 300/300; results {"victory":300}; mean wipes/run 0.1; mean moon 4.7, empowered finale 66%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (11) | 0.0 | 9.4 | 1 | 2.8 | 0.3 | 0.9 | 0.2 | 96 (2.1) | 630 / 552 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 285 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 8.4 | 13 | 0.6 | 0.0 | 0.1 | 0.0 | 100 (2.0) | 1272 / 499 | 4.0 | 1.9/0.4/0.1 | 0 · 0.0 · 0.0 | 277 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.0 | 18 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2584 / 2095 | 3.0 | 2.4/0.8/0.2 | 0 · 0.0 · 0.0 | 462 | 19 |
| B4 | 7.0 (7) | 7.3 (8) | 99 / 99 | – | 0.0 (1) | 0.0 | 11.4 | 6 | 0.7 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3344 / 2 | 3.0 | 2.1/1.1/0.3 | 0 · 0.0 · 0.0 | 288 | 17 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.6 | 7 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4041 / 0 | 3.0 | 1.8/1.3/0.4 | 0 · 0.0 · 0.0 | 221 | 17 |

## Party: nohealer (300 runs; victories 300/300; results {"victory":300}; mean wipes/run 0.2; mean moon 4.9, empowered finale 83%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (19) | 0.0 | 9.4 | 1 | 4.5 | 0.6 | 1.4 | 0.4 | 94 (2.1) | 623 / 528 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 287 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (2) | 0.0 | 8.5 | 12 | 2.2 | 0.3 | 0.1 | 0.1 | 100 (2.0) | 1269 / 812 | 4.0 | 1.9/0.4/0.1 | 0 · 0.0 · 0.0 | 277 | 11 |
| B3 | 5.0 (5) | 5.9 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 12.9 | 16 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2575 / 1514 | 3.0 | 2.4/0.9/0.2 | 0 · 0.0 · 0.0 | 459 | 19 |
| B4 | 7.0 (7) | 7.4 (8) | 99 / 99 | – | 0.0 (2) | 0.0 | 11.4 | 6 | 0.8 | 0.1 | 0.0 | 0.0 | 100 (3.0) | 3376 / 20 | 3.0 | 2.0/1.1/0.3 | 0 · 0.0 · 0.0 | 315 | 18 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.6 | 7 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4068 / 3 | 3.0 | 1.8/1.3/0.5 | 0 · 0.0 · 0.0 | 223 | 17 |

## Party: liora (300 runs; victories 300/300; results {"victory":300}; mean wipes/run 0.1; mean moon 4.9, empowered finale 79%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (8) | 0.0 | 9.4 | 1 | 2.5 | 0.2 | 0.7 | 0.2 | 98 (2.0) | 626 / 556 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 284 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (1) | 0.0 | 8.5 | 14 | 0.6 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 1267 / 742 | 4.0 | 1.8/0.5/0.1 | 0 · 0.0 · 0.0 | 277 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 12.9 | 18 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2572 / 2548 | 3.0 | 2.3/0.9/0.2 | 0 · 0.0 · 0.0 | 461 | 19 |
| B4 | 7.0 (7) | 7.3 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 11.4 | 6 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3370 / 130 | 3.0 | 1.9/1.1/0.3 | 0 · 0.0 · 0.0 | 292 | 17 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.7 | 8 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4077 / 0 | 3.0 | 1.8/1.3/0.5 | 0 · 0.0 · 0.0 | 218 | 17 |

## Party: rush (300 runs; victories 298/300; results {"victory":298,"stuck on B4":1,"stuck on B2":1}; mean wipes/run 0.2; mean moon 2.8, empowered finale 1%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 1.0 (3) | 96 / 96 | – | 0.0 (4) | 0.0 | 4.6 | 0 | 1.6 | 0.1 | 0.5 | 0.1 | 100 (1.0) | 255 / 109 | 0.0 | 0.8/0.2/0.0 | 0 · 0.0 · 0.0 | 79 | 6 |
| B2 | 3.0 (3) | 3.0 (4) | 99 / 97 | – | 0.0 (1) | 0.0 | 3.0 | 15 | 0.4 | 0.0 | 0.1 | 0.0 | – (0.0) | 199 / 195 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 55 | 5 |
| B3 | 4.0 (5) | 5.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 4.8 | 19 | 0.1 | 0.0 | 0.0 | 0.0 | – (0.0) | 557 / 491 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 253 | 9 |
| B4 | 6.0 (7) | 6.0 (8) | 94 / 92 | – | 0.1 (6) | 0.1 | 4.6 | 11 | 0.8 | 0.0 | 0.1 | 0.0 | 100 (1.0) | 922 / 323 | 0.0 | 0.5/0.3/0.1 | 0 · 0.0 · 0.0 | 89 | 8 |
| B5 | 8.0 (9) | 8.1 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 6.6 | 5 | 0.7 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 2226 / 183 | 0.0 | 0.9/0.8/0.3 | 0 · 0.0 · 0.0 | 121 | 12 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | elite | direWolfx1 | 953 | 5.6 | 0.84 | 0.15 | 0.54 | 21 | 4.5 | 1.1 | 1 |
| B4 | boss | brakkx1+cindermawx1 | 1230 | 2.6 | 0.32 | 0.01 | 0.01 | 28 | 2.8 | 7.0 | 7 |
| B1 | elite | giantWolfSpiderx1+giantRatx2 | 1215 | 1.6 | 0.38 | 0.04 | 0.12 | 16 | 3.1 | 1.1 | 1 |
| B1 | fixed | wolfx2 | 2100 | 1.3 | 0.43 | 0.02 | 0.07 | 10 | 2.1 | 1.0 | 1 |
| B1 | random | wolfx2 | 461 | 1.3 | 0.34 | 0.03 | 0.09 | 9 | 2.0 | 1.1 | 1 |
| B1 | boss | giantSpiderx1+skarnx1 | 1213 | 1.1 | 0.22 | 0.02 | 0.06 | 7 | 2.2 | 2.5 | 2 |
| B2 | boss | ankylosaurusx1+giantWaspx1 | 1209 | 0.8 | 0.20 | 0.01 | 0.05 | 15 | 3.2 | 3.7 | 3 |
| B1 | fixed | giantFrogx2+giantRatx2 | 900 | 0.7 | 0.34 | 0.03 | 0.02 | 15 | 3.1 | 1.0 | 1 |
| B1 | random | giantRatx1+giantWolfSpiderx1 | 468 | 0.6 | 0.23 | 0.00 | 0.08 | 8 | 2.0 | 1.1 | 1 |
| B4 | elite | hellHoundx2 | 905 | 0.6 | 0.20 | 0.02 | 0.00 | 33 | 3.8 | 7.0 | 5 |
| B1 | random | giantRatx3 | 213 | 0.5 | 0.18 | 0.01 | 0.01 | 10 | 2.0 | 1.1 | 1 |
| B1 | random | giantRatx2 | 219 | 0.5 | 0.09 | 0.00 | 0.00 | 6 | 1.4 | 1.1 | 1 |
| B2 | lieutenant | sisterVeyx1+cultistx2 | 904 | 0.4 | 0.21 | 0.01 | 0.00 | 14 | 3.0 | 3.0 | 3 |
| B1 | random | giantFrogx2 | 241 | 0.4 | 0.15 | 0.01 | 0.01 | 7 | 2.4 | 1.1 | 1 |
| B2 | fixed | direWolfx1+wolfx1 | 1200 | 0.3 | 0.06 | 0.00 | 0.00 | 9 | 2.5 | 3.0 | 1 |
| B1 | random | giantPoisonousSnakex1 | 442 | 0.2 | 0.25 | 0.03 | 0.13 | 5 | 1.2 | 1.1 | 1 |
| B2 | fixed | giantToadx2 | 900 | 0.1 | 0.21 | 0.02 | 0.01 | 7 | 2.8 | 3.0 | 2 |
| B4 | fixed | hellHoundx2 | 900 | 0.1 | 0.05 | 0.00 | 0.00 | 22 | 2.2 | 7.0 | 5 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|
| B5 | random | animatedArmorx3 | 225 | 1 | 0.00 | 80 | 8.9 | 3 |
| B3 | elite | violetFungusx2+shriekerx1 | 900 | 1 | 0.00 | 0 | 5.0 | 1 |
| B4 | random | magminx3 | 216 | 1 | 0.00 | 92 | 6.9 | 2 |
| B3 | fixed | violetFungusx3+shriekerx2 | 900 | 1 | 0.00 | 0 | 5.0 | 1 |
| B5 | random | animatedArmorx4 | 255 | 1 | 0.00 | 78 | 8.8 | 3 |
| B3 | random | violetFungusx3+shriekerx1 | 534 | 1 | 0.00 | 93 | 4.9 | 1 |
| B3 | random | gelatinousCubex1 | 533 | 1 | 0.00 | 84 | 5.0 | 2 |
| B2 | random | cultistx3 | 193 | 2 | 0.00 | 79 | 3.1 | 1 |
| B4 | poi | gargoylex2+magminx2 | 900 | 2 | 0.00 | 0 | 7.0 | 5 |
| B5 | elite | animatedArmorx3 | 1198 | 2 | 0.00 | 0 | 8.7 | 3 |
| B4 | random | animatedArmorx3 | 415 | 2 | 0.00 | 88 | 6.8 | 3 |
| B3 | guard | ochreJellyx1+darkmantlex2 | 900 | 3 | 0.00 | 0 | 5.0 | 3 |
| B5 | random | cultFanaticx3 | 242 | 3 | 0.00 | 0 | 8.8 | 5 |
| B4 | elite | animatedArmorx2 | 1199 | 3 | 0.00 | 0 | 6.7 | 2 |

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 511 · B1 giantWolfSpider: 208 · B1 wolf: 191 · B2 ankylosaurus: 62 · B1 giantSpider: 62 · B1 giantPoisonousSnake: 59 · B1 giantFrog: 18 · B4 cindermaw: 18 · B1 skarn: 16 · B2 giantToad: 15 · B1 giantRat: 7 · B1 cultist: 5 · B2 giantWasp: 4 · B5 tyrannosaurus: 4

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B1 wolf: 83 · B1 direWolf: 73 · B1 giantWolfSpider: 48 · B2 giantToad: 22 · B1 giantSpider: 17 · B1 giantPoisonousSnake: 14 · B5 tyrannosaurus: 12 · B4 cindermaw: 11 · B1 giantFrog: 8 · B2 ankylosaurus: 6 · B1 cultist: 5 · B1 skarn: 3 · B1 giantRat: 2 · B4 minotaurSkeleton: 1
