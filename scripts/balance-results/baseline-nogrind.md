# Blackspire balance sim — baseline-nogrind

400 seeded campaigns (100 per party × standard / nohealer / liora / rush), difficulty normal, grinding off, seeds 1…100. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 20s.

## All parties (400 runs; victories 400/400; results {"victory":400}; mean wipes/run 0.2; mean moon 4.2, empowered finale 54%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.5 (3) | 100 / 100 | – | 0.2 (16) | 0.0 | 8.3 | 1 | 3.3 | 0.4 | 1.0 | 0.2 | 93 (1.9) | 544 / 433 | 1.5 | 1.5/0.3/0.0 | 0 · 0.0 · 0.0 | 235 | 9 |
| B2 | 3.0 (3) | 3.7 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 7.1 | 13 | 0.8 | 0.1 | 0.0 | 0.0 | 100 (1.5) | 1000 / 562 | 3.0 | 1.4/0.3/0.0 | 0 · 0.0 · 0.0 | 222 | 10 |
| B3 | 4.7 (5) | 5.7 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 11.0 | 18 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (2.3) | 2091 / 1648 | 2.3 | 1.7/0.6/0.1 | 0 · 0.0 · 0.0 | 409 | 16 |
| B4 | 6.8 (7) | 7.0 (8) | 99 / 99 | – | 0.0 (1) | 0.0 | 9.7 | 7 | 0.4 | 0.0 | 0.0 | 0.0 | 100 (2.5) | 2769 / 128 | 2.3 | 1.7/0.8/0.3 | 0 · 0.0 · 0.0 | 251 | 15 |
| B5 | 8.7 (9) | 8.8 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 8.9 | 8 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (2.8) | 3619 / 40 | 2.3 | 1.6/1.2/0.4 | 0 · 0.0 · 0.0 | 193 | 16 |

## Party: standard (100 runs; victories 100/100; results {"victory":100}; mean wipes/run 0.2; mean moon 4.6, empowered finale 64%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.2 (18) | 0.0 | 9.4 | 1 | 3.3 | 0.4 | 1.1 | 0.2 | 94 (2.1) | 637 / 545 | 2.0 | 1.7/0.4/0.0 | 0 · 0.0 · 0.0 | 288 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 8.5 | 13 | 0.6 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 1269 / 528 | 4.0 | 1.8/0.4/0.1 | 0 · 0.0 · 0.0 | 280 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.0 | 18 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2605 / 2070 | 3.0 | 2.4/0.9/0.2 | 0 · 0.0 · 0.0 | 463 | 19 |
| B4 | 7.0 (7) | 7.4 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 11.4 | 6 | 0.4 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3381 / 0 | 3.0 | 2.2/0.8/0.4 | 0 · 0.0 · 0.0 | 301 | 17 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.7 | 9 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4100 / 0 | 3.0 | 1.9/1.3/0.4 | 0 · 0.0 · 0.0 | 217 | 17 |

## Party: nohealer (100 runs; victories 100/100; results {"victory":100}; mean wipes/run 0.3; mean moon 4.8, empowered finale 74%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.3 (28) | 0.0 | 9.6 | 1 | 5.0 | 0.9 | 1.6 | 0.4 | 90 (2.2) | 639 / 535 | 2.0 | 1.8/0.4/0.0 | 0 · 0.0 · 0.0 | 290 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 8.3 | 11 | 1.9 | 0.2 | 0.0 | 0.1 | 100 (2.0) | 1268 / 798 | 4.0 | 1.9/0.4/0.0 | 0 · 0.0 · 0.0 | 279 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.1 | 17 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2589 / 1519 | 3.0 | 2.4/0.8/0.1 | 0 · 0.0 · 0.0 | 459 | 19 |
| B4 | 7.0 (7) | 7.4 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 11.4 | 5 | 0.6 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3369 / 1 | 3.0 | 2.2/1.1/0.3 | 0 · 0.0 · 0.0 | 329 | 18 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.7 | 9 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4093 / 0 | 3.0 | 1.9/1.2/0.5 | 0 · 0.0 · 0.0 | 222 | 17 |

## Party: liora (100 runs; victories 100/100; results {"victory":100}; mean wipes/run 0.2; mean moon 4.8, empowered finale 78%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.2 (17) | 0.0 | 9.4 | 1 | 3.4 | 0.3 | 1.0 | 0.2 | 93 (2.2) | 641 / 545 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 286 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 8.4 | 11 | 0.4 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 1263 / 725 | 4.0 | 1.9/0.4/0.1 | 0 · 0.0 · 0.0 | 279 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.1 | 19 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2605 / 2505 | 3.0 | 2.2/0.9/0.2 | 0 · 0.0 · 0.0 | 459 | 19 |
| B4 | 7.0 (7) | 7.3 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 11.4 | 7 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3407 / 195 | 3.0 | 2.1/1.1/0.3 | 0 · 0.0 · 0.0 | 294 | 17 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.6 | 8 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4057 / 0 | 3.0 | 1.8/1.2/0.5 | 0 · 0.0 · 0.0 | 217 | 17 |

## Party: rush (100 runs; victories 100/100; results {"victory":100}; mean wipes/run 0.1; mean moon 2.8, empowered finale 0%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 1.0 (3) | 98 / 98 | – | 0.0 (2) | 0.0 | 4.7 | 0 | 1.3 | 0.1 | 0.4 | 0.1 | 100 (1.0) | 259 / 109 | 0.0 | 0.8/0.2/0.0 | 0 · 0.0 · 0.0 | 78 | 6 |
| B2 | 3.0 (3) | 3.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 3.0 | 19 | 0.2 | 0.0 | 0.0 | 0.0 | – (0.0) | 199 / 199 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 49 | 5 |
| B3 | 4.0 (5) | 5.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 4.9 | 19 | 0.1 | 0.0 | 0.0 | 0.0 | – (0.0) | 564 / 497 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 253 | 9 |
| B4 | 6.0 (7) | 6.0 (8) | 96 / 96 | – | 0.0 (4) | 0.0 | 4.5 | 11 | 0.7 | 0.0 | 0.1 | 0.1 | 100 (1.0) | 920 / 318 | 0.0 | 0.5/0.3/0.1 | 0 · 0.0 · 0.0 | 82 | 7 |
| B5 | 8.0 (9) | 8.1 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 6.6 | 6 | 0.6 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 2225 / 159 | 0.0 | 0.9/0.9/0.3 | 0 · 0.0 · 0.0 | 117 | 12 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | elite | direWolfx1+wolfx1 | 334 | 10.2 | 1.31 | 0.28 | 0.70 | 31 | 5.6 | 1.2 | 1 |
| B1 | elite | giantWolfSpiderx1+giantRatx2 | 416 | 3.8 | 0.40 | 0.04 | 0.10 | 18 | 3.2 | 1.2 | 1 |
| B1 | random | giantRatx3 | 64 | 1.6 | 0.25 | 0.02 | 0.00 | 9 | 1.8 | 1.1 | 1 |
| B1 | fixed | wolfx2 | 700 | 1.3 | 0.42 | 0.02 | 0.06 | 10 | 2.1 | 1.0 | 1 |
| B1 | fixed | giantFrogx2+giantRatx2 | 300 | 1.0 | 0.36 | 0.03 | 0.01 | 15 | 3.1 | 1.0 | 1 |
| B4 | boss | brakkx1+cindermawx1 | 404 | 1.0 | 0.21 | 0.00 | 0.03 | 26 | 2.4 | 7.0 | 7 |
| B1 | random | giantRatx1+giantWolfSpiderx1 | 154 | 0.6 | 0.26 | 0.00 | 0.08 | 7 | 2.0 | 1.1 | 1 |
| B1 | random | wolfx2 | 164 | 0.6 | 0.30 | 0.01 | 0.10 | 9 | 1.9 | 1.1 | 1 |
| B1 | boss | giantSpiderx1+skarnx1 | 402 | 0.5 | 0.15 | 0.01 | 0.05 | 6 | 1.8 | 2.5 | 2 |
| B1 | fixed | cultistx3 | 84 | 0.0 | 0.46 | 0.08 | 0.01 | 4 | 2.7 | 1.0 | 1 |
| B2 | elite | giantToadx1+giantCrabx2 | 300 | 0.0 | 0.29 | 0.05 | 0.00 | 6 | 3.8 | 3.0 | 2 |
| B1 | random | giantPoisonousSnakex1 | 160 | 0.0 | 0.25 | 0.05 | 0.13 | 4 | 1.2 | 1.1 | 1 |
| B2 | lieutenant | sisterVeyx1+cultistx2 | 300 | 0.0 | 0.23 | 0.02 | 0.00 | 16 | 3.0 | 3.0 | 3 |
| B2 | fixed | giantToadx2 | 300 | 0.0 | 0.18 | 0.01 | 0.00 | 7 | 2.8 | 3.0 | 2 |
| B2 | random | giantCrabx2+giantWaspx2 | 60 | 0.0 | 0.15 | 0.00 | 0.00 | 10 | 3.0 | 3.1 | 2 |
| B1 | random | giantWolfSpiderx1 | 149 | 0.0 | 0.15 | 0.01 | 0.08 | 6 | 1.5 | 1.0 | 1 |
| B5 | random | hellHoundx3 | 159 | 0.0 | 0.14 | 0.01 | 0.00 | 21 | 2.6 | 8.8 | 5 |
| B4 | elite | hellHoundx2 | 300 | 0.0 | 0.12 | 0.00 | 0.00 | 28 | 2.8 | 7.0 | 5 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|
| B2 | random | giantCrabx2 | 49 | 1 | 0.00 | 86 | 3.1 | 1 |
| B3 | elite | violetFungusx2+shriekerx1 | 300 | 1 | 0.00 | 0 | 5.0 | 1 |
| B3 | fixed | violetFungusx3+shriekerx2 | 300 | 1 | 0.00 | 0 | 5.0 | 1 |
| B5 | random | animatedArmorx3 | 89 | 1 | 0.00 | 88 | 8.9 | 3 |
| B5 | random | animatedArmorx4 | 82 | 1 | 0.00 | 84 | 8.8 | 3 |
| B4 | random | magminx3 | 78 | 1 | 0.00 | 85 | 6.8 | 2 |
| B3 | random | violetFungusx3+shriekerx1 | 176 | 1 | 0.00 | 94 | 5.0 | 1 |
| B5 | elite | animatedArmorx3 | 400 | 1 | 0.00 | 0 | 8.7 | 3 |
| B3 | random | gelatinousCubex1 | 188 | 2 | 0.00 | 84 | 4.9 | 2 |
| B4 | random | animatedArmorx3 | 148 | 2 | 0.00 | 85 | 6.9 | 3 |
| B4 | poi | gargoylex2+magminx2 | 300 | 2 | 0.00 | 0 | 7.0 | 5 |
| B4 | elite | animatedArmorx2 | 400 | 2 | 0.00 | 0 | 6.8 | 2 |
| B4 | random | magminx4 | 82 | 2 | 0.00 | 91 | 6.8 | 2 |
| B3 | random | giantCentipedex3 | 65 | 2 | 0.00 | 97 | 5.0 | 1 |

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 216 · B1 wolf: 77 · B1 giantWolfSpider: 67 · B1 giantPoisonousSnake: 21 · B1 giantSpider: 13 · B4 cindermaw: 11 · B2 ankylosaurus: 11 · B1 skarn: 6 · B1 giantFrog: 4 · B1 cultist: 2

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B1 direWolf: 36 · B1 wolf: 30 · B1 giantWolfSpider: 19 · B4 cindermaw: 6 · B2 giantToad: 6 · B1 giantSpider: 4 · B5 tyrannosaurus: 4 · B1 giantPoisonousSnake: 3 · B2 direWolf: 3 · B1 giantFrog: 3 · B2 ankylosaurus: 2 · B5 triceratops: 1 · B2 giantWasp: 1
