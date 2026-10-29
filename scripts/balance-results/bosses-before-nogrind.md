# Blackspire balance sim — bosses-before-nogrind

300 seeded campaigns (300 per party × standard), difficulty normal, grinding off, seeds 1…300. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 21s.

## All parties (300 runs; victories 292/300; results {"victory":292,"stuck on B3":6,"stuck on B2":1,"stuck on B4":1}; mean wipes/run 1.0; mean moon 6.4, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (11) | 0.0 | 9.6 | 1 | 3.2 | 0.2 | 1.0 | 0.2 | 96 (2.1) | 630 / 540 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 284 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 91 / 88 | – | 0.2 (15) | 0.1 | 8.8 | 8 | 3.3 | 0.3 | 0.1 | 0.1 | 98 (2.0) | 1365 / 693 | 4.0 | 1.9/0.5/0.1 | 0 · 0.0 · 0.0 | 280 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 92 / 85 | – | 0.3 (15) | 0.2 | 13.7 | 13 | 3.3 | 0.4 | 0.1 | 0.1 | 97 (3.1) | 2914 / 1916 | 3.0 | 2.1/1.0/0.2 | 0 · 0.0 · 0.0 | 475 | 20 |
| B4 | 7.0 (7) | 8.0 (8) | 90 / 89 | – | 0.2 (16) | 0.1 | 11.9 | 5 | 3.1 | 0.2 | 0.1 | 0.1 | 97 (3.1) | 3680 / 152 | 3.0 | 2.0/1.1/0.3 | 0 · 0.0 · 0.0 | 417 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 91 / 92 | 96 / 96 | 0.2 (17) | 0.1 | 10.0 | 5 | 5.5 | 0.2 | 0.1 | 0.2 | 99 (3.0) | 4667 / 84 | 3.0 | 1.9/1.2/0.4 | 0 · 0.0 · 0.0 | 246 | 18 |

## Party: standard (300 runs; victories 292/300; results {"victory":292,"stuck on B3":6,"stuck on B2":1,"stuck on B4":1}; mean wipes/run 1.0; mean moon 6.4, empowered finale 100%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.1 (11) | 0.0 | 9.6 | 1 | 3.2 | 0.2 | 1.0 | 0.2 | 96 (2.1) | 630 / 540 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 284 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 91 / 88 | – | 0.2 (15) | 0.1 | 8.8 | 8 | 3.3 | 0.3 | 0.1 | 0.1 | 98 (2.0) | 1365 / 693 | 4.0 | 1.9/0.5/0.1 | 0 · 0.0 · 0.0 | 280 | 12 |
| B3 | 5.0 (5) | 6.0 (6) | 92 / 85 | – | 0.3 (15) | 0.2 | 13.7 | 13 | 3.3 | 0.4 | 0.1 | 0.1 | 97 (3.1) | 2914 / 1916 | 3.0 | 2.1/1.0/0.2 | 0 · 0.0 · 0.0 | 475 | 20 |
| B4 | 7.0 (7) | 8.0 (8) | 90 / 89 | – | 0.2 (16) | 0.1 | 11.9 | 5 | 3.1 | 0.2 | 0.1 | 0.1 | 97 (3.1) | 3680 / 152 | 3.0 | 2.0/1.1/0.3 | 0 · 0.0 · 0.0 | 417 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 91 / 92 | 96 / 96 | 0.2 (17) | 0.1 | 10.0 | 5 | 5.5 | 0.2 | 0.1 | 0.2 | 99 (3.0) | 4667 / 84 | 3.0 | 1.9/1.2/0.4 | 0 · 0.0 · 0.0 | 246 | 18 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B3 | boss | glasshidex1+gargoylex2+darkmantlex2 | 346 | 15.3 | 1.18 | 0.14 | 0.05 | 34 | 7.1 | 6.0 | 5 |
| B2 | boss | ankylosaurusx1+giantWaspx3 | 340 | 12.1 | 1.57 | 0.08 | 0.03 | 45 | 6.0 | 4.0 | 4 |
| B4 | boss | brakkx1+cindermawx1 | 327 | 10.7 | 1.22 | 0.06 | 0.06 | 44 | 3.6 | 8.0 | 7 |
| B5 | boss | malthraxx1+gargoylex2+animatedArmorx2 | 319 | 8.5 | 2.40 | 0.03 | 0.07 | 38 | 7.0 | 9.0 | 8 |
| B3 | random | ochreJellyx2+darkmantlex2+giantCentipedex2+shriekerx1 | 67 | 6.0 | 0.61 | 0.15 | 0.00 | 22 | 4.7 | 5.1 | 5 |
| B1 | elite | direWolfx1 | 319 | 6.0 | 0.82 | 0.13 | 0.54 | 20 | 4.2 | 1.1 | 1 |
| B3 | elite | ochreJellyx2 | 315 | 5.7 | 0.41 | 0.09 | 0.00 | 24 | 6.6 | 5.0 | 3 |
| B5 | phase2 | tyrannosaurusx1 | 304 | 3.9 | 1.53 | 0.03 | 0.01 | 11 | 5.9 | 9.0 | 5 |
| B4 | elite | animatedArmorx3 | 304 | 3.9 | 0.27 | 0.02 | 0.00 | 16 | 6.1 | 7.0 | 3 |
| B2 | elite | giantToadx1+giantCrabx3 | 312 | 3.8 | 0.48 | 0.09 | 0.02 | 19 | 6.9 | 3.0 | 2 |
| B4 | random | minotaurSkeletonx2+magminx2+cultistx2+cultFanaticx1 | 81 | 3.7 | 0.36 | 0.04 | 0.00 | 15 | 4.6 | 7.0 | 5 |
| B5 | random | animatedArmorx3+minotaurSkeletonx1+cultFanaticx2 | 57 | 3.5 | 0.37 | 0.09 | 0.00 | 18 | 4.7 | 9.0 | 5 |
| B3 | random | darkmantlex2+giantCentipedex2 | 60 | 3.3 | 0.05 | 0.00 | 0.00 | 11 | 2.1 | 5.1 | 2 |
| B3 | random | giantCentipedex3+violetFungusx2+shriekerx1 | 32 | 3.1 | 0.13 | 0.00 | 0.00 | 7 | 2.3 | 5.0 | 2 |
| B2 | random | giantCrabx2+giantWaspx1 | 36 | 2.8 | 0.22 | 0.03 | 0.00 | 10 | 2.9 | 3.2 | 1 |
| B3 | random | darkmantlex3 | 76 | 2.6 | 0.13 | 0.00 | 0.00 | 9 | 2.3 | 5.0 | 2 |
| B3 | random | ochreJellyx2+darkmantlex2+giantCentipedex1+shriekerx1 | 77 | 2.6 | 0.60 | 0.13 | 0.00 | 22 | 4.7 | 5.1 | 5 |
| B4 | random | gargoylex3+magminx2+cultFanaticx2 | 40 | 2.5 | 0.28 | 0.05 | 0.00 | 17 | 4.6 | 7.0 | 7 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|
| B4 | random | magminx3 | 47 | 1 | 0.00 | 72 | 7.1 | 2 |
| B4 | random | magminx4 | 59 | 2 | 0.00 | 68 | 7.0 | 2 |
| B2 | random | cultistx3 | 32 | 2 | 0.00 | 78 | 3.1 | 1 |
| B2 | random | giantCrabx2 | 22 | 3 | 0.00 | 73 | 3.0 | 1 |
| B5 | random | allosaurusx2 | 63 | 3 | 0.00 | 83 | 9.0 | 3 |
| B3 | random | gelatinousCubex1 | 134 | 3 | 0.00 | 67 | 5.0 | 2 |
| B4 | poi | gargoylex2+magminx2 | 292 | 3 | 0.00 | 0 | 7.0 | 5 |
| B3 | random | giantCentipedex4 | 36 | 3 | 0.00 | 69 | 5.1 | 1 |
| B4 | random | gargoylex3 | 110 | 4 | 0.00 | 0 | 7.0 | 5 |
| B3 | random | giantCentipedex3 | 36 | 4 | 0.00 | 75 | 5.1 | 1 |
| B2 | random | cultistx4 | 41 | 4 | 0.00 | 80 | 3.1 | 1 |
| B3 | random | giantCentipedex3+violetFungusx1+shriekerx1 | 35 | 5 | 0.00 | 74 | 5.0 | 2 |

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 171 · B1 giantWolfSpider: 62 · B1 wolf: 49 · B5 malthrax: 22 · B3 glasshide: 18 · B4 cindermaw: 17 · B1 giantPoisonousSnake: 16 · B2 ankylosaurus: 11 · B2 giantToad: 8 · B1 giantFrog: 8 · B4 brakk: 4 · B2 flyingSword: 4 · B2 giantWasp: 3 · B4 cultFanatic: 3

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B5 malthrax: 38 · B1 direWolf: 28 · B1 wolf: 26 · B3 glasshide: 17 · B5 tyrannosaurus: 11 · B4 cultFanatic: 9 · B1 giantWolfSpider: 8 · B2 giantToad: 7 · B1 giantPoisonousSnake: 6 · B4 brakk: 4 · B2 sisterVey: 3 · B1 cultist: 3 · B2 giantWasp: 2 · B2 ankylosaurus: 2
