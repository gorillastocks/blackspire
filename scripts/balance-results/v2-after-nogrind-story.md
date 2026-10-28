# Blackspire balance sim — v2-after-nogrind-story

200 seeded campaigns (200 per party × standard), difficulty story, grinding off, seeds 1…200. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took 14s.

## All parties (200 runs; victories 200/200; results {"victory":200}; mean wipes/run 0.0; mean moon 5.0, empowered finale 93%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.0 (0) | 0.0 | 9.3 | 1 | 0.4 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 628 / 563 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 281 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 8.4 | 13 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 1332 / 688 | 4.0 | 1.8/0.5/0.1 | 0 · 0.0 · 0.0 | 277 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.0 | 17 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2842 / 1905 | 3.0 | 2.2/0.9/0.2 | 0 · 0.0 · 0.0 | 463 | 19 |
| B4 | 7.0 (7) | 8.0 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 11.5 | 6 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3613 / 0 | 3.0 | 2.2/1.0/0.3 | 0 · 0.0 · 0.0 | 414 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.6 | 7 | 0.3 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4567 / 0 | 3.0 | 1.8/1.2/0.5 | 0 · 0.0 · 0.0 | 222 | 17 |

## Party: standard (200 runs; victories 200/200; results {"victory":200}; mean wipes/run 0.0; mean moon 5.0, empowered finale 93%)

| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 1.0 (1) | 3.0 (3) | 100 / 100 | – | 0.0 (0) | 0.0 | 9.3 | 1 | 0.4 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 628 / 563 | 2.0 | 1.8/0.3/0.0 | 0 · 0.0 · 0.0 | 281 | 11 |
| B2 | 3.0 (3) | 4.0 (4) | 100 / 100 | – | 0.0 (0) | 0.0 | 8.4 | 13 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (2.0) | 1332 / 688 | 4.0 | 1.8/0.5/0.1 | 0 · 0.0 · 0.0 | 277 | 11 |
| B3 | 5.0 (5) | 6.0 (6) | 100 / 100 | – | 0.0 (0) | 0.0 | 13.0 | 17 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 2842 / 1905 | 3.0 | 2.2/0.9/0.2 | 0 · 0.0 · 0.0 | 463 | 19 |
| B4 | 7.0 (7) | 8.0 (8) | 100 / 100 | – | 0.0 (0) | 0.0 | 11.5 | 6 | 0.2 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 3613 / 0 | 3.0 | 2.2/1.0/0.3 | 0 · 0.0 · 0.0 | 414 | 19 |
| B5 | 9.0 (9) | 9.0 (9) | 100 / 100 | 100 / 100 | 0.0 (0) | 0.0 | 9.6 | 7 | 0.3 | 0.0 | 0.0 | 0.0 | 100 (3.0) | 4567 / 0 | 3.0 | 1.8/1.2/0.5 | 0 · 0.0 · 0.0 | 222 | 17 |

## Encounter hot-spots (n ≥ 6): highest loss / KO rate

| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | fixed | cultistx3 | 62 | 0.0 | 0.19 | 0.00 | 0.00 | 1 | 1.9 | 1.0 | 1 |
| B5 | boss | malthraxx1+gargoylex2+animatedArmorx2 | 200 | 0.0 | 0.13 | 0.00 | 0.00 | 18 | 4.1 | 9.0 | 8 |
| B1 | elite | direWolfx1 | 200 | 0.0 | 0.10 | 0.01 | 0.02 | 9 | 3.0 | 1.0 | 1 |
| B5 | phase2 | tyrannosaurusx1 | 200 | 0.0 | 0.10 | 0.00 | 0.00 | 8 | 3.5 | 9.0 | 5 |
| B1 | fixed | wolfx2 | 400 | 0.0 | 0.10 | 0.00 | 0.00 | 5 | 1.5 | 1.0 | 1 |
| B4 | boss | brakkx1+cindermawx1 | 200 | 0.0 | 0.09 | 0.01 | 0.00 | 25 | 2.5 | 8.0 | 7 |
| B2 | random | giantCrabx2+giantWaspx2 | 43 | 0.0 | 0.07 | 0.00 | 0.00 | 9 | 2.9 | 3.0 | 2 |
| B3 | elite | ochreJellyx2 | 200 | 0.0 | 0.06 | 0.01 | 0.00 | 11 | 4.9 | 5.0 | 3 |
| B3 | boss | glasshidex1+gargoylex2+darkmantlex2 | 200 | 0.0 | 0.06 | 0.00 | 0.00 | 14 | 4.3 | 6.0 | 5 |
| B3 | fixed | darkmantlex4 | 200 | 0.0 | 0.05 | 0.00 | 0.00 | 5 | 2.4 | 5.0 | 2 |
| B2 | elite | giantToadx1+giantCrabx3 | 200 | 0.0 | 0.04 | 0.01 | 0.00 | 5 | 4.0 | 3.0 | 2 |
| B5 | fixed | triceratopsx2+allosaurusx1 | 200 | 0.0 | 0.04 | 0.01 | 0.00 | 6 | 3.0 | 9.0 | 8 |
| B2 | boss | ankylosaurusx1+giantWaspx3 | 200 | 0.0 | 0.04 | 0.00 | 0.00 | 22 | 3.7 | 4.0 | 4 |
| B5 | random | triceratopsx2 | 86 | 0.0 | 0.03 | 0.00 | 0.00 | 5 | 2.3 | 9.0 | 6 |
| B3 | random | giantCentipedex5 | 31 | 0.0 | 0.03 | 0.00 | 0.00 | 4 | 1.5 | 5.2 | 2 |
| B2 | random | giantCrabx2+giantWaspx1 | 38 | 0.0 | 0.03 | 0.00 | 0.00 | 3 | 2.4 | 3.1 | 1 |
| B2 | random | giantToadx2 | 40 | 0.0 | 0.03 | 0.00 | 0.00 | 6 | 2.6 | 3.1 | 2 |
| B4 | elite | animatedArmorx3 | 200 | 0.0 | 0.03 | 0.01 | 0.00 | 9 | 4.2 | 7.0 | 3 |

## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)

| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |
|---|---|---|---|---|---|---|---|---|
| B4 | random | magminx3 | 35 | 1 | 0.00 | 86 | 7.0 | 2 |
| B2 | random | cultistx3 | 33 | 1 | 0.00 | 79 | 3.1 | 1 |
| B4 | random | magminx4 | 42 | 1 | 0.00 | 88 | 7.1 | 2 |
| B2 | random | cultistx4 | 24 | 1 | 0.00 | 79 | 3.1 | 1 |
| B1 | random | giantFrogx1 | 48 | 1 | 0.00 | 4 | 1.1 | 1 |
| B1 | random | cultistx2 | 32 | 2 | 0.00 | 3 | 1.1 | 1 |
| B3 | fixed | violetFungusx3+shriekerx2 | 200 | 2 | 0.00 | 0 | 5.0 | 1 |
| B2 | random | giantCrabx2 | 28 | 2 | 0.00 | 82 | 3.1 | 1 |
| B3 | random | gelatinousCubex1 | 104 | 2 | 0.00 | 92 | 5.1 | 2 |
| B4 | random | gargoylex3 | 83 | 2 | 0.00 | 0 | 7.1 | 5 |
| B4 | poi | gargoylex2+magminx2 | 200 | 2 | 0.00 | 0 | 7.0 | 5 |
| B3 | random | violetFungusx3+shriekerx1 | 88 | 2 | 0.00 | 93 | 5.1 | 1 |
| B1 | random | giantFrogx2 | 40 | 2 | 0.00 | 0 | 1.0 | 1 |
| B2 | random | giantToadx1 | 35 | 2 | 0.00 | 0 | 3.0 | 1 |

## One-shots (a hero at FULL HP dropped by one monster turn), by monster

B1 direWolf: 4 · B1 giantWolfSpider: 2 · B1 wolf: 1

## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster

B1 wolf: 1 · B3 glasshide: 1 · B5 malthrax: 1 · B1 direWolf: 1
