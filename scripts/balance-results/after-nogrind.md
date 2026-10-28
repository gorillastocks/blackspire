# Blackspire balance sim — after-nogrind

400 seeded campaigns (100 per party × standard / nohealer / liora / rush), difficulty normal, grinding off, seeds 1…100. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 15s.

## All parties (400 runs; victories 399/400; results {"victory":399,"stuck on B4":1}; mean wipes/run 0.2; mean moon 4.3, empowered finale 56%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.5 (3) | 100 / 100 | – | 0.1 (11) | 0.0 | 8.2 | 1 | 2.8 | 0.3 | 0.9 | 0.2 | 96 (1.8) | 534 / 436 | 1.5 | 1.5/0.3/0.0 | 0 · 0.0 · 0.0 | 233 | 9 |
| B2 | 3.0 (3) | 3.7 (4) | 100 / 100 | – | 0.0 (1) | 0.0 | 7.0 | 12 | 1.0 | 0.1 | 0.1 | 0.0 | 100 (1.5) | 996 / 560 | 3.0 | 1.4/0.3/0.0 | 0 · 0.0 · 0.0 | 221 | 10 |
| B3 | 4.7 (5) | 5.7 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 10.9 | 18 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (2.3) | 2065 / 1666 | 2.3 | 1.7/0.7/0.1 | 0 · 0.0 · 0.0 | 409 | 16 |
| B4 | 6.7 (7) | 7.0 (8) | 97 / 95 | – | 0.1 (4) | 0.1 | 9.7 | 7 | 0.6 | 0.0 | 0.0 | 0.0 | 100 (2.5) | 2743 / 110 | 2.3 | 1.6/0.9/0.3 | 0 · 0.0 · 0.0 | 250 | 15 |
| B5 | 8.7 (9) | 8.8 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 8.8 | 7 | 0.3 | 0.0 | 0.0 | 0.0 | 100 (2.8) | 3591 / 36 | 2.3 | 1.6/1.2/0.4 | 0 · 0.0 · 0.0 | 195 | 16 |

## Party: standard (100 runs; victories 100/100; results {"victory":100}; mean wipes/run 0.2; mean moon 4.7, empowered finale 65%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (15) | 0.0 | 9.4 | 1 | 2.7 | 0.3 | 0.9 | 0.1 | 96 (2.1) | 631 / 546 | 2.0 | 1.7/0.4/0.0 | 0 · 0.0 · 0.0 | 286 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (1) | 0.0 | 8.4 | 13 | 0.6 | 0.0 | 0.1 | 0.0 | 100 (2.0) | 1268 / 468 | 4.0 | 2.0/0.4/0.1 | 0 · 0.0 · 0.0 | 278 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.2 | 18 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2579 / 2160 | 3.0 | 2.4/0.8/0.2 | 0 · 0.0 · 0.0 | 462 | 19 |
| B4 | 7.0 (7) | 7.3 (8) | 100 / 100 | – | 0.0 (1) | 0.0 | 11.4 | 5 | 0.5 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3335 / 0 | 3.0 | 2.1/1.1/0.3 | 0 · 0.0 · 0.0 | 293 | 17 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.5 | 7 | 0.1 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3988 / 0 | 3.0 | 1.8/1.4/0.5 | 0 · 0.0 · 0.0 | 220 | 17 |

## Party: nohealer (100 runs; victories 100/100; results {"victory":100}; mean wipes/run 0.3; mean moon 4.9, empowered finale 79%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 2.9 (3) | 100 / 100 | – | 0.2 (21) | 0.0 | 9.5 | 0 | 4.6 | 0.7 | 1.4 | 0.4 | 93 (2.1) | 624 / 535 | 2.0 | 1.8/0.4/0.0 | 0 · 0.0 · 0.0 | 287 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (2) | 0.0 | 8.3 | 11 | 2.4 | 0.3 | 0.1 | 0.0 | 100 (2.0) | 1252 / 842 | 4.0 | 1.9/0.4/0.1 | 0 · 0.0 · 0.0 | 277 | 11 |
| B3 | 5.0 (5) | 5.9 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 12.7 | 17 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2552 / 1494 | 3.0 | 2.2/0.9/0.2 | 0 · 0.0 · 0.0 | 458 | 19 |
| B4 | 7.0 (7) | 7.3 (8) | 99 / 99 | – | 0.0 (1) | 0.0 | 11.3 | 6 | 0.7 | 0.1 | 0.0 | 0.0 | 100 (3.0) | 3344 / 20 | 3.0 | 2.1/1.1/0.2 | 0 · 0.0 · 0.0 | 309 | 17 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.5 | 6 | 0.3 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4067 / 0 | 3.0 | 1.9/1.3/0.6 | 0 · 0.0 · 0.0 | 224 | 17 |

## Party: liora (100 runs; victories 100/100; results {"victory":100}; mean wipes/run 0.1; mean moon 4.9, empowered finale 80%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (6) | 0.0 | 9.3 | 1 | 2.5 | 0.3 | 0.8 | 0.2 | 98 (2.0) | 623 / 556 | 2.0 | 1.9/0.3/0.0 | 0 · 0.0 · 0.0 | 283 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (1) | 0.0 | 8.4 | 13 | 0.6 | 0.1 | 0.0 | 0.0 | 100 (2.0) | 1262 / 729 | 4.0 | 1.9/0.4/0.1 | 0 · 0.0 · 0.0 | 278 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 12.9 | 17 | 0.0 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2581 / 2520 | 3.0 | 2.3/0.9/0.1 | 0 · 0.0 · 0.0 | 462 | 19 |
| B4 | 7.0 (7) | 7.3 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 11.4 | 7 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3380 / 105 | 3.0 | 1.9/1.3/0.3 | 0 · 0.0 · 0.0 | 295 | 17 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.7 | 8 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4110 / 0 | 3.0 | 1.8/1.3/0.4 | 0 · 0.0 · 0.0 | 218 | 17 |

## Party: rush (100 runs; victories 99/100; results {"victory":99,"stuck on B4":1}; mean wipes/run 0.2; mean moon 2.8, empowered finale 1%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 1.0 (3) | 98 / 98 | – | 0.0 (2) | 0.0 | 4.6 | 0 | 1.4 | 0.1 | 0.4 | 0.2 | 100 (1.0) | 258 / 108 | 0.0 | 0.8/0.2/0.0 | 0 · 0.0 · 0.0 | 78 | 6 |
| B2 | 3.0 (3) | 3.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 3.0 | 15 | 0.4 | 0.0 | 0.1 | 0.0 | – (0.0) | 201 / 204 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 50 | 5 |
| B3 | 4.0 (5) | 5.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 4.9 | 19 | 0.1 | 0.0 | 0.0 | 0.0 | – (0.0) | 550 / 490 | 0.0 | 0.0/0.0/0.0 | 0 · 0.0 · 0.0 | 253 | 9 |
| B4 | 6.0 (7) | 6.0 (8) | 88 / 83 | – | 0.2 (12) | 0.2 | 4.7 | 11 | 1.1 | 0.1 | 0.1 | 0.1 | 100 (1.0) | 915 / 316 | 0.0 | 0.5/0.3/0.2 | 0 · 0.0 · 0.0 | 100 | 8 |
| B5 | 8.0 (9) | 8.1 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 6.5 | 5 | 0.6 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 2183 / 145 | 0.0 | 0.9/0.8/0.3 | 0 · 0.0 · 0.0 | 117 | 12 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | elite | direWolfx1 | 317 | 5.4 | 0.83 | 0.18 | 0.53 | 19 | 4.6 | 1.1 | 1 |
| B4 | boss | brakkx1+cindermawx1 | 420 | 5.0 | 0.35 | 0.01 | 0.01 | 30 | 2.8 | 7.0 | 7 |
| B1 | elite | giantWolfSpiderx1+giantRatx2 | 411 | 2.7 | 0.37 | 0.04 | 0.10 | 17 | 3.1 | 1.1 | 1 |
| B1 | random | giantRatx3 | 69 | 1.4 | 0.23 | 0.01 | 0.00 | 9 | 1.8 | 1.2 | 1 |
| B1 | fixed | wolfx2 | 700 | 1.3 | 0.42 | 0.02 | 0.06 | 10 | 2.1 | 1.0 | 1 |
| B1 | fixed | giantFrogx2+giantRatx2 | 300 | 1.0 | 0.36 | 0.03 | 0.01 | 15 | 3.1 | 1.0 | 1 |
| B2 | lieutenant | sisterVeyx1+cultistx2 | 302 | 0.7 | 0.21 | 0.01 | 0.00 | 14 | 2.9 | 3.0 | 3 |
| B1 | random | giantRatx1+giantWolfSpiderx1 | 155 | 0.6 | 0.25 | 0.00 | 0.08 | 7 | 1.9 | 1.1 | 1 |
| B1 | random | giantPoisonousSnakex1 | 156 | 0.6 | 0.28 | 0.05 | 0.15 | 5 | 1.2 | 1.1 | 1 |
| B1 | random | wolfx2 | 165 | 0.6 | 0.29 | 0.01 | 0.10 | 9 | 1.9 | 1.1 | 1 |
| B1 | boss | giantSpiderx1+skarnx1 | 402 | 0.5 | 0.17 | 0.01 | 0.06 | 7 | 2.1 | 2.5 | 2 |
| B2 | fixed | giantToadx2 | 300 | 0.3 | 0.27 | 0.02 | 0.01 | 8 | 2.9 | 3.0 | 2 |
| B4 | elite | hellHoundx2 | 301 | 0.3 | 0.22 | 0.03 | 0.00 | 34 | 3.8 | 7.0 | 5 |
| B2 | fixed | direWolfx1+wolfx1 | 400 | 0.3 | 0.08 | 0.01 | 0.00 | 9 | 2.6 | 3.0 | 1 |
| B1 | fixed | cultistx3 | 84 | 0.0 | 0.46 | 0.08 | 0.01 | 4 | 2.7 | 1.0 | 1 |
| B2 | elite | giantToadx1+giantCrabx2 | 300 | 0.0 | 0.37 | 0.08 | 0.01 | 8 | 4.4 | 3.0 | 2 |
| B2 | boss | ankylosaurusx1+giantWaspx1 | 400 | 0.0 | 0.18 | 0.01 | 0.05 | 14 | 3.1 | 3.7 | 3 |
| B1 | random | giantWolfSpiderx1 | 152 | 0.0 | 0.15 | 0.01 | 0.08 | 6 | 1.5 | 1.0 | 1 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|
| B3 | elite | violetFungusx2+shriekerx1 | 300 | 1 | 0.00 | 0 | 5.0 | 1 |
| B5 | random | animatedArmorx3 | 75 | 1 | 0.00 | 83 | 8.8 | 3 |
| B3 | fixed | violetFungusx3+shriekerx2 | 300 | 1 | 0.00 | 0 | 5.0 | 1 |
| B4 | random | magminx3 | 80 | 1 | 0.00 | 90 | 6.8 | 2 |
| B2 | random | giantCrabx2 | 45 | 1 | 0.00 | 80 | 3.1 | 1 |
| B5 | random | animatedArmorx4 | 87 | 1 | 0.00 | 78 | 8.8 | 3 |
| B3 | random | gelatinousCubex1 | 175 | 1 | 0.00 | 81 | 4.9 | 2 |
| B3 | random | violetFungusx3+shriekerx1 | 181 | 1 | 0.00 | 93 | 4.9 | 1 |
| B2 | random | giantCrabx3 | 27 | 1 | 0.00 | 89 | 3.0 | 1 |
| B2 | random | cultistx3 | 56 | 2 | 0.00 | 71 | 3.1 | 1 |
| B4 | poi | gargoylex2+magminx2 | 300 | 2 | 0.00 | 0 | 7.0 | 5 |
| B5 | elite | animatedArmorx3 | 399 | 2 | 0.00 | 0 | 8.7 | 3 |
| B4 | random | animatedArmorx3 | 142 | 2 | 0.00 | 89 | 6.8 | 3 |
| B4 | random | magminx4 | 68 | 2 | 0.00 | 82 | 6.8 | 2 |

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 168 · B1 giantWolfSpider: 63 · B1 wolf: 61 · B1 giantPoisonousSnake: 23 · B1 giantSpider: 21 · B2 ankylosaurus: 20 · B2 giantToad: 8 · B4 cindermaw: 6 · B1 skarn: 5 · B1 giantFrog: 3 · B1 cultist: 2 · B5 tyrannosaurus: 1 · B1 giantRat: 1

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B1 wolf: 30 · B1 direWolf: 24 · B1 giantWolfSpider: 19 · B1 giantSpider: 7 · B2 giantToad: 6 · B4 cindermaw: 6 · B5 tyrannosaurus: 4 · B1 giantPoisonousSnake: 3 · B1 giantFrog: 3 · B2 ankylosaurus: 2 · B4 minotaurSkeleton: 1
