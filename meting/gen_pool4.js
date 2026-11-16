// gen_pool4.js — maakt pool4.json: de configuraties die gemeten worden (zelfde hoofdstukken als meet3.js, met muurvarianten en een uitkomende keeper)
const fs = require('fs');
const rnd = (() => { let s = 20261116; return () => (s = (s * 16807) % 2147483647) / 2147483647 })();
const U = (a, b) => a + (b - a) * rnd(), R = (a, b, st) => +(Math.round(U(a, b) / st) * st).toFixed(3), pick = a => a[Math.floor(rnd() * a.length)];
const E = [[], [{ f: .6, off: -1.6 }], [{ f: .6, off: -1.6 }, { f: .6, off: 1.6 }]];
const rij = (D, n, w, f, off0) => [...Array(n)].map((_, i) => ({ f, off: +(off0 + (i - (n - 1) / 2) * (.5 + w)).toFixed(3), h: 2 }));
const muur = () => ({ wallJump: rnd() < .7 ? 1 : 0, wallLie: rnd() < .35 ? 1 : 0 }); // soms springt de muur, soms niet; soms ligt er iemand achter
const CH = {
  C1: () => ({ D: 11, xs: 0, wall: 0, extras: [], wind: pick([0, 0, 0, 1]), kq: R(.3, .9, .05), kPos: 0, kz: .25, half: R(.55, .85, .05), acc: pick([0, .5, 1]) }),
  C2: () => { const D = pick([11, 11, 12, 13, 14, 15, 16, 17]); return { D, xs: pick([0, 0, 2, 4]), wall: 0, extras: [], wind: pick([0, 0, 1, 1.5]), kq: R(.5, 1.3, .05), kPos: pick([0, 0, .5, 1]), kz: pick([.25, .25, 1]), half: R(.45, .9, .05), acc: pick([0, 0, .5, 1]) } },
  C3: () => ({ D: R(14, 26, .5), xs: pick([0, 0, 3, 6, 9]), wall: 1, ...muur(), extras: pick(E), wind: pick([0, 0, 1, 2]), kq: R(.3, 1.3, .05), kPos: pick([0, .5, 1]), kz: pick([.25, .25, 1]), half: R(.4, .8, .05), acc: pick([0, .5, 1]) }),
  C4: () => { const D = R(13, 24, .5); return { D, xs: pick([0, 0, 4, 8]), wall: 0, extras: pick([[], [], E[1], E[2]]), wind: pick([0, 1, 2, 3]), kq: R(1, 1.3, .05), kPos: pick([.5, 1]), kz: pick([.25, 1]), half: R(.3, .55, .05), acc: pick([1, 1.5, 2]) } },
  C5: () => { const D = R(13, 22, .5), n = pick([3, 4, 5, 6]), w = R(.28, 1, .02), f = R(.45, .7, .05), off0 = R(-.6, .6, .1); return { D, xs: pick([0, 0, 3, 6]), wall: 0, extras: rij(D, n, w, f, off0), wind: pick([0, 0, 1]), kq: R(.4, 1.3, .05), kPos: pick([0, .5, 1]), kz: .25, half: R(.35, .8, .05), acc: pick([0, .5, 1, 2]), gap: w } },
  C6: () => { const D = R(13, 18, .5), n = pick([4, 5, 6]), w = R(.26, .42, .02), f = R(.45, .65, .05), off0 = R(-.4, .4, .1); return { D, xs: pick([0, 0, 3]), wall: 0, extras: rij(D, n, w, f, off0), wind: 0, kq: R(1, 1.3, .05), kPos: pick([.5, 1]), kz: .25, half: R(.3, .5, .05), acc: pick([1, 1.5, 2]), gap: w } },
  C7: () => { const B = rnd() < .5; return B ? { D: R(13, 17.5, .5), xs: pick([0, 0, 0, 2]), wall: 0, extras: [], wind: 0, kq: R(.9, 1.3, .05), kPos: pick([.5, 1]), kz: pick([.25, .25, .25, 1]), half: R(.3, .5, .05), acc: pick([1, 1.5, 2]) } : { D: R(11, 18, .5), xs: pick([0, 0, 0, 2]), wall: 0, extras: [], wind: 0, kq: R(.5, 1.3, .05), kPos: pick([0, .5, 1]), kz: pick([.25, .25, .25, 1]), half: R(.4, .9, .05), acc: pick([0, .5, 1, 2]) } },
  C8: () => ({ D: R(14, 24, .5), xs: pick([0, 0, 2, 4]), wall: 0, extras: pick([[], [], E[1]]), wind: pick([0, 0, 1]), kq: R(.3, 1.2, .05), kPos: pick([0, .5]), kz: R(2, 6, .5), half: R(.4, .8, .05), acc: pick([0, .5, 1]) }) // keeper komt ver uit zijn doel: lobsituaties
};
const N = { C1: 80, C2: 170, C3: 260, C4: 200, C5: 200, C6: 140, C7: 350, C8: 180 };
const per = {}; for (const k in CH) { per[k] = []; for (let n = 0; n < N[k]; n++) { const c = CH[k](); c.ch = k; per[k].push(c); } }
const lijst = []; for (let n = 0; n < 400; n++) for (const k of Object.keys(CH)) if (per[k][n]) lijst.push(per[k][n]);
lijst.forEach((c, i) => c.id = 'p' + String(i).padStart(4, '0'));
fs.writeFileSync('pool4.json', JSON.stringify(lijst));
console.log(lijst.length + ' configuraties', JSON.stringify(N));
