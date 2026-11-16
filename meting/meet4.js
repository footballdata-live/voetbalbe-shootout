// meet4.js — meet de pool (pool4.json) met alle schotsoorten. Zelfde methode als meet3.js/meet_tut.js:
// rooster over richting, hoogte en kracht, keeperuitkomsten via seeds, vier precisieprofielen.
//   node meet4.js deel <i> <n>   meet elke configuratie met index % n == i  ->  uit/deel-<i>.jsonl (hervatbaar)
//   node meet4.js bench [k]      meet de eerste k configuraties en toont de tijd
// Per configuratie: grof rooster voor 11 opties (normaal; fader -1/-0,5/0,5/1; plat 0/0,5/-0,5; lob 0/0,5/-0,5),
// daarna fijn rooster + profielen voor de 3 opties met de beste grove score. De kans per profiel = beste van die opties.
const { Worker, isMainThread, parentPort } = require('worker_threads');
const P = require('./physics.js');
const fs = require('fs'), GW = 3.66, DT = 1 / 240, KG = 3, KF = 6;
const zaad = s => (Math.imul(s, 2654435761) >>> 0) % 2147483646 + 1; // goed gespreide seeds
function kpOf(kq) { return { react: +Math.max(.08, .22 - .12 * kq).toFixed(4), skill: +Math.min(1, .35 + .65 * kq).toFixed(4), sigma: +Math.max(.02, .45 - .35 * kq).toFixed(4), tD: .45 } }
function shotP(sc, phi, gy, pw, curl, soort, K, dt) {
  let g = 0; const gx = sc.D * Math.tan(phi * Math.PI / 180) / GW;
  for (let s = 1; s <= K; s++) {
    const x0 = ((s * 37) % 100 / 100 - .5) * .44;
    const S = P.create(sc, { gx, gy }, pw, curl, P.seeded(zaad(s * 7919 + 13)), x0, soort);
    while (!S.result && S.t < 8) P.step(S, dt); if (S.result === 'goal') g++;
  }
  return g / K;
}
if (!isMainThread) {
  parentPort.on('message', m => {
    const out = new Float32Array(m.pts.length / 3);
    for (let n = 0; n < out.length; n++) out[n] = shotP(m.sc, m.pts[3 * n], m.pts[3 * n + 1], m.pts[3 * n + 2], m.curl, m.soort, m.K, m.dt);
    parentPort.postMessage({ tid: m.tid, out });
  });
} else {
  const NW = Math.max(1, require('os').cpus().length); let tid = 0; const pend = new Map();
  const workers = Array.from({ length: NW }, () => { const w = new Worker(__filename); w.on('message', m => { pend.get(m.tid)(m.out); pend.delete(m.tid) }); return w });
  function calc(sc, curl, soort, pts, K) {
    const n = pts.length / 3, chunk = Math.ceil(n / NW);
    return Promise.all(workers.map((w, i) => {
      const a = pts.slice(3 * i * chunk, 3 * Math.min(n, (i + 1) * chunk)); if (!a.length) return Promise.resolve(new Float32Array(0));
      return new Promise(res => { const t = ++tid; pend.set(t, res); w.postMessage({ tid: t, sc, curl, soort, pts: a, K, dt: DT }); });
    })).then(parts => { const r = new Float32Array(n); let o = 0; for (const p of parts) { r.set(p, o); o += p.length } return r; });
  }
  const gauss = (() => { let s = 12345; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; return () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) } })();
  const PROFILES = [['zeer precies', .5, 30], ['goed', 1, 60], ['gemiddeld', 2, 120], ['slordig', 4, 200]];
  const GYall = [], PW = []; for (let g = 0; g <= 1.201; g += .1) GYall.push(+g.toFixed(2)); for (let w = 0; w <= 1.001; w += .1) PW.push(+w.toFixed(2));
  const OPTIES = [[0, P.NORMAAL], [-1, P.NORMAAL], [-.5, P.NORMAAL], [.5, P.NORMAAL], [1, P.NORMAAL], [0, P.PLAT], [.5, P.PLAT], [-.5, P.PLAT], [0, P.LOB], [.5, P.LOB], [-.5, P.LOB]];
  const SOORT = ['normaal', 'plat', 'lob'];
  if (process.env.ENKEL) { const want = process.env.ENKEL.split(','); for (let i = OPTIES.length - 1; i >= 0; i--) if (!want.includes(SOORT[OPTIES[i][1]] + ':' + OPTIES[i][0])) OPTIES.splice(i, 1); } // bv. ENKEL=lob:0 of normaal:0,normaal:-1
  function phiGrid(c) {
    const D = c.D, xs = c.xs || 0, deg = a => a * 180 / Math.PI, L = deg(Math.atan((-GW - xs) / D)), R = deg(Math.atan((GW - xs) / D));
    const m = 3 + (c.wind ? deg(.5 * c.wind * Math.pow(D / 12, 2) / D) : 0), a = [];
    for (let x = Math.floor((L - m) * 2) / 2; x <= Math.ceil((R + m) * 2) / 2 + .001; x += .5) a.push(+x.toFixed(2)); return a;
  }
  const interp = (g, nj, pi, gi, wi) => {
    const cl = (v, n) => Math.max(0, Math.min(n - 1.000001, v)); pi = cl(pi, g.length); gi = nj > 1 ? cl(gi, nj) : 0; wi = cl(wi, PW.length);
    const i0 = pi | 0, j0 = gi | 0, k0 = wi | 0, fi = pi - i0, fj = gi - j0, fk = wi - k0; let s = 0;
    for (let a = 0; a < 2; a++) for (let b = 0; b < (nj > 1 ? 2 : 1); b++) for (let c = 0; c < 2; c++) s += (a ? fi : 1 - fi) * (nj > 1 ? (b ? fj : 1 - fj) : 1) * (c ? fk : 1 - fk) * g[i0 + a][j0 + b][k0 + c]; return s;
  };
  const scOf = c => ({ D: c.D, xs: c.xs || 0, wall: !!c.wall, wallJump: c.wall ? (c.wallJump === 0 ? 0 : 1) : undefined, wallLie: c.wall ? (c.wallLie ? 1 : 0) : 0, extras: c.extras || [], wind: c.wind || 0, acc: c.acc || 0, kPos: c.kPos || 0, kz: c.kz || .25, kp: kpOf(c.kq) });
  async function grof(c, curl, soort) {
    const sc = scOf(c), PHI = phiGrid(c), GY = soort === P.PLAT ? [0] : GYall, nj = GY.length, nk = PW.length, pts = [], ids = [];
    for (let i = 0; i < PHI.length; i += 2) for (let j = 0; j < nj; j += 2) for (let k = 0; k < nk; k += 2) { pts.push(PHI[i], GY[j], PW[k]); ids.push([i, j, k]); }
    const co = await calc(sc, curl, soort, pts, KG); let sum = 0; for (const v of co) sum += v;
    return { curl, soort, sc, PHI, GY, ids, co, sum };
  }
  async function fijn(c, g) {
    const { sc, PHI, GY, ids, co, curl, soort } = g, nj = GY.length, nk = PW.length, hit = new Set();
    ids.forEach(([i, j, k], n) => { if (co[n] > 0) for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) for (let dk = -2; dk <= 2; dk++) { const ii = i + di, jj = j + dj, kk = k + dk; if (ii >= 0 && ii < PHI.length && jj >= 0 && jj < nj && kk >= 0 && kk < nk) hit.add((ii * nj + jj) * nk + kk); } });
    const keys = [...hit], fp = []; for (const key of keys) { const k = key % nk, j = ((key - k) / nk) % nj, i = ((key - k) / nk - j) / nj; fp.push(PHI[i], GY[j], PW[k]); }
    const fv = await calc(sc, curl, soort, fp, KF), grid = PHI.map(() => GY.map(() => new Float64Array(nk)));
    keys.forEach((key, n) => { const k = key % nk, j = ((key - k) / nk) % nj, i = ((key - k) / nk - j) / nj; grid[i][j][k] = fv[n]; });
    let best = { p: -1 }; for (let i = 0; i < PHI.length; i++) for (let j = 0; j < nj; j++) for (let k = 0; k < nk; k++) if (grid[i][j][k] > best.p) best = { p: grid[i][j][k], i, j, k };
    const acc = sc.acc, p = {};
    for (const [name, sa, st] of PROFILES) {
      const spw = st / 1000 / c.half; let top = 0;
      for (let i = 0; i < PHI.length; i++) for (let j = 0; j < nj; j++) for (let k = 0; k < nk; k++) {
        if (grid[i][j][k] < Math.max(.05, .25 * best.p)) continue; let s = 0; const N = 80;
        const q2 = PW[k] * PW[k], ea = acc * P.ACC_A * q2, eh = acc * P.ACC_H * q2, sA = Math.sqrt(sa * sa + ea * ea), sH = Math.sqrt(.06 * .06 + eh * eh);
        for (let n = 0; n < N; n++) s += interp(grid, nj, i + gauss() * sA / .5, j + gauss() * sH / .1, k + gauss() * spw / .1);
        s /= N; if (s > top) top = s;
      }
      p[name] = +top.toFixed(3);
    }
    return { effect: curl, soort: SOORT[soort], pmax: +best.p.toFixed(3), p, beste: { hoek: PHI[best.i], hoogte_m: +(GY[best.j] * 2.44).toFixed(2), kracht: PW[best.k] } };
  }
  async function meetConfig(c) {
    const gs = []; for (const [cu, so] of OPTIES) gs.push(await grof(c, cu, so));
    const grofSom = Object.fromEntries(gs.map(g => [SOORT[g.soort] + ':' + g.curl, +g.sum.toFixed(2)]));
    const top = gs.filter(g => g.sum > 0).sort((a, b) => b.sum - a.sum).slice(0, 3);
    const zero = Object.fromEntries(PROFILES.map(([n]) => [n, 0]));
    if (!top.length) return { ...c, pmax: 0, p: zero, beste: null, opties: [], grof: grofSom };
    const opties = []; for (const g of top) opties.push(await fijn(c, g));
    const p = {}; for (const [n] of PROFILES) p[n] = Math.max(...opties.map(o => o.p[n]));
    const b = opties.slice().sort((x, y) => y.p.goed - x.p.goed || y.p.gemiddeld - x.p.gemiddeld)[0];
    return { ...c, pmax: Math.max(...opties.map(o => o.pmax)), p, beste: { ...b.beste, effect: b.effect, soort: b.soort }, opties, grof: grofSom };
  }
  (async () => {
    const pool = JSON.parse(fs.readFileSync(process.env.POOL || (__dirname + '/pool4.json'), 'utf8')), mode = process.argv[2];
    if (mode === 'bench') {
      const k = +process.argv[3] || 3;
      for (const c of pool.slice(0, k)) { const t = Date.now(), r = await meetConfig(c); console.log(((Date.now() - t) / 1000).toFixed(1) + ' s', c.id, c.ch, 'D' + c.D, 'goed', r.p.goed, 'gem', r.p.gemiddeld, 'beste', r.beste && (r.beste.soort + ' ' + r.beste.effect)); if (process.env.DETAIL) { for (const o of r.opties) console.log('    ', o.soort, o.effect, JSON.stringify(o.p)); console.log('     grof', JSON.stringify(r.grof)); } }
      process.exit(0);
    }
    if (mode === 'deel') {
      const i = +process.argv[3], n = +process.argv[4]; fs.mkdirSync(__dirname + '/uit', { recursive: true });
      const f = __dirname + '/uit/deel-' + i + '.jsonl', klaar = new Set();
      if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)) klaar.add(JSON.parse(l).id);
      const mijn = pool.filter((c, x) => x % n === i && !klaar.has(c.id)); const t0 = Date.now();
      console.log('deel ' + i + '/' + n + ': ' + mijn.length + ' te meten, ' + klaar.size + ' al klaar, ' + NW + ' kernen');
      let d = 0; for (const c of mijn) { const t = Date.now(), r = await meetConfig(c); r.sec = +((Date.now() - t) / 1000).toFixed(1); fs.appendFileSync(f, JSON.stringify(r) + '\n'); d++;
        if (d % 5 === 0) console.log(new Date().toISOString().slice(11, 19) + ' ' + d + '/' + mijn.length + ' (' + ((Date.now() - t0) / 60000).toFixed(1) + ' min)'); }
      console.log('klaar in ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min'); process.exit(0);
    }
    console.log('gebruik: deel <i> <n> | bench [k]'); process.exit(0);
  })();
}
