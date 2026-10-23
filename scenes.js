/* Canvas scenes for the parts of time before the Earth has oceans.
   Scenes.draw(ctx, w, h, view) paints the scene(s) for view.u, crossfading at the borders.
   view = { u, sec, ago, t (seconds, for animation), stage: {x, y, w, h}, focus, legendY } */
const Scenes = (() => {
  "use strict";
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const frac = (x) => x - Math.floor(x);
  const YEAR = 3.156e7;

  /* ---------- shared starfield ---------- */
  const STARS = (() => { const r = rng(7); return Array.from({ length: 420 }, () => ({ x: r(), y: r(), s: r() ** 3 * 1.8 + .3, a: .25 + r() * .75, tw: r() * TAU })); })();
  function starfield(ctx, W, H, t, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    for (const s of STARS) {
      const tw = .7 + .3 * Math.sin(t * 1.3 + s.tw);
      ctx.globalAlpha = alpha * s.a * tw; ctx.fillStyle = "#fff";
      ctx.fillRect(s.x * W, s.y * H, s.s, s.s);
    }
    ctx.restore();
  }
  const glow = (ctx, x, y, r, inner, outer = "rgba(0,0,0,0)") => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, inner); g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  function legend(ctx, view, items) {
    const x = view.stage.x + 18; let y = view.legendY;
    ctx.save(); ctx.font = "700 14px Nunito, system-ui, sans-serif"; ctx.textBaseline = "middle";
    for (let i = items.length - 1; i >= 0; i--) {
      const [col, label, draw] = items[i];
      ctx.globalAlpha = .9; ctx.fillStyle = "rgba(10,14,34,.55)";
      const w = ctx.measureText(label).width + 40; roundRect(ctx, x - 6, y - 13, w, 26, 13); ctx.fill();
      if (draw) draw(ctx, x + 9, y); else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 9, y, 6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = "#f3f1ff"; ctx.fillText(label, x + 24, y);
      y -= 32;
    }
    ctx.restore();
  }
  const roundRect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const center = (v) => [v.stage.x + v.stage.w / 2, v.stage.y + v.stage.h / 2];

  /* ---------- 1. quark soup: the first millionth of a second ---------- */
  const QUARKS = (() => { const r = rng(11); const C = ["#ff4d5e", "#4dff7a", "#4d8bff"]; return Array.from({ length: 520 }, () => ({ x: r(), y: r(), vx: (r() - .5) * .9, vy: (r() - .5) * .9, c: C[Math.floor(r() * 3)], s: 1.6 + r() * 2.4, ph: r() * TAU })); })();
  function plasma(ctx, W, H, p, v) {
    const [cx, cy] = center(v), heat = 1 - p * .45;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .8);
    g.addColorStop(0, `hsl(42,100%,${lerp(86, 70, p)}%)`); g.addColorStop(.45, `hsl(${lerp(28, 18, p)},100%,${lerp(62, 46, p)}%)`); g.addColorStop(1, `hsl(355,80%,${lerp(26, 14, p)}%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const sp = .07 * heat;
    for (const q of QUARKS) {
      const x = frac(q.x + q.vx * v.t * sp + .01 * Math.sin(v.t * 9 + q.ph)) * W, y = frac(q.y + q.vy * v.t * sp + .01 * Math.cos(v.t * 8 + q.ph)) * H;
      ctx.strokeStyle = q.c; ctx.globalAlpha = .55; ctx.lineWidth = q.s; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - q.vx * 16 * heat, y - q.vy * 16 * heat); ctx.stroke();
      ctx.globalAlpha = .95; ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(x, y, q.s, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // inflation: the first instant is a white flash that swells out of a point
    const f = 1 - smooth(0, .16, p);
    if (f > 0) {
      const r = lerp(4, Math.hypot(W, H), smooth(0, .16, p));
      ctx.save(); ctx.globalAlpha = f * .72; ctx.fillStyle = "#fffdf5"; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1; ctx.strokeStyle = `rgba(255,255,255,${f})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r * .5, 0, TAU); ctx.stroke(); ctx.restore();
    }
    if (p > .1) legend(ctx, v, [["#ff4d5e", "кварки — най-малките частици"], ["#4d8bff", "всичко е горещо като звезда"]]);
  }

  /* ---------- 2. protons and neutrons join into helium ---------- */
  const NUC = (() => {
    const r = rng(23), out = [];
    for (let k = 0; k < 34; k++) { const cx = .08 + r() * .84, cy = .1 + r() * .8, join = .2 + r() * .55; [[1, -1, -1], [1, 1, 1], [0, 1, -1], [0, -1, 1]].forEach(([pr, ox, oy]) => out.push({ x: r(), y: r(), vx: r() - .5, vy: r() - .5, pr, cx, cy, ox, oy, join })); }
    for (let k = 0; k < 110; k++) out.push({ x: r(), y: r(), vx: r() - .5, vy: r() - .5, pr: 1, join: 2 });
    return out;
  })();
  function nuclei(ctx, W, H, p, v) {
    p = clamp((Math.log10(Math.max(v.sec, 1e-6)) - .6) / 2.6, 0, 1);
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .75);
    g.addColorStop(0, `hsl(28,90%,${lerp(46, 30, p)}%)`); g.addColorStop(1, `hsl(8,70%,${lerp(16, 9, p)}%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const R = clamp(Math.min(W, H) / 120, 4, 8);
    for (const n of NUC) {
      const wx = frac(n.x + n.vx * v.t * .02) * W, wy = frac(n.y + n.vy * v.t * .02) * H;
      const k = smooth(n.join, n.join + .1, p);
      const tx = n.cx * W + n.ox * R * .95 + Math.sin(v.t * 3 + n.cx * 9) * 2, ty = n.cy * H + n.oy * R * .95;
      const x = n.join > 1 ? wx : lerp(wx, tx, k), y = n.join > 1 ? wy : lerp(wy, ty, k);
      ctx.fillStyle = n.pr ? "#ff5d50" : "#d9d2c6";
      ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(x - R * .3, y - R * .3, R * .35, 0, TAU); ctx.fill();
    }
    legend(ctx, v, [["#ff5d50", "протон"], ["#d9d2c6", "неутрон"], [null, "хелий: 2 протона и 2 неутрона", (c, x, y) => { [[-1, -1, 1], [1, 1, 1], [1, -1, 0], [-1, 1, 0]].forEach(([a, b, pr]) => { c.fillStyle = pr ? "#ff5d50" : "#d9d2c6"; c.beginPath(); c.arc(x + a * 3.2, y + b * 3.2, 3.6, 0, TAU); c.fill(); }); }]]);
  }

  /* ---------- 3. a foggy glow, then atoms: light escapes (380 000 years) ---------- */
  const FREE = (() => { const r = rng(31); return Array.from({ length: 150 }, () => ({ x: r(), y: r(), vx: r() - .5, vy: r() - .5, ph: r() * TAU, orb: .6 + r() * .8 })); })();
  const PHOT = (() => { const r = rng(37); return Array.from({ length: 70 }, () => ({ x: r(), y: r(), a: r() * TAU, ph: r() })); })();
  function atoms(ctx, W, H, p, v) {
    const rec = smooth(Math.log10(380000 * YEAR) - .25, Math.log10(380000 * YEAR) + .12, Math.log10(Math.max(v.sec, 1)));
    ctx.fillStyle = "#06060f"; ctx.fillRect(0, 0, W, H);
    // fog before recombination: everything glows orange and light cannot travel
    ctx.save(); ctx.globalAlpha = 1 - rec * .92;
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .8); g.addColorStop(0, "#ffa24a"); g.addColorStop(1, "#a53a17");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (rec > .3) { ctx.save(); ctx.globalAlpha = (rec - .3) * .5; glow(ctx, W / 2, H / 2, Math.max(W, H) * .7, "rgba(255,110,60,.35)"); ctx.restore(); }
    const R = clamp(Math.min(W, H) / 110, 4, 8);
    for (const a of FREE) {
      const x = frac(a.x + a.vx * v.t * .012) * W, y = frac(a.y + a.vy * v.t * .012) * H;
      ctx.fillStyle = "#ff5d50"; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      if (rec > .05) { // the electron settles into an orbit around its nucleus
        const ro = R * 3.4 * a.orb, ang = v.t * 2.2 * (1.2 - a.orb * .4) + a.ph;
        ctx.globalAlpha = rec * .45; ctx.strokeStyle = "#8fd0ff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, ro, ro * .55, a.ph, 0, TAU); ctx.stroke();
        ctx.globalAlpha = rec; ctx.fillStyle = "#7fc8ff"; ctx.beginPath(); ctx.arc(x + Math.cos(ang) * ro * Math.cos(a.ph) - Math.sin(ang) * ro * .55 * Math.sin(a.ph), y + Math.cos(ang) * ro * Math.sin(a.ph) + Math.sin(ang) * ro * .55 * Math.cos(a.ph), 2.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
      if (rec < .95) { const ex = frac(a.x + .3 + Math.sin(v.t * 2 + a.ph) * .03) * W, ey = frac(a.y + .2 + Math.cos(v.t * 2.3 + a.ph) * .03) * H; ctx.globalAlpha = 1 - rec; ctx.fillStyle = "#7fc8ff"; ctx.beginPath(); ctx.arc(ex, ey, 2.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    }
    // photons: bounce around in the fog, fly straight out after recombination
    ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 2;
    for (const f of PHOT) {
      let x, y;
      if (rec < .5) { x = frac(f.x + Math.sin(v.t * 1.7 + f.ph * 9) * .04) * W; y = frac(f.y + Math.cos(v.t * 1.3 + f.ph * 7) * .04) * H; }
      else { const d = frac(f.ph + v.t * .08); x = W / 2 + Math.cos(f.a) * d * Math.hypot(W, H) * .6; y = H / 2 + Math.sin(f.a) * d * Math.hypot(W, H) * .6; }
      ctx.globalAlpha = .9; ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const ox = Math.cos(f.a) * i * 2.2, oy = Math.sin(f.a) * i * 2.2, w = Math.sin(i * 1.6 + v.t * 12) * 2.4; ctx.lineTo(x + ox - Math.sin(f.a) * w, y + oy + Math.cos(f.a) * w); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    legend(ctx, v, rec < .5 ? [["#ff5d50", "ядра"], ["#7fc8ff", "електрони"], ["#ffe27a", "светлина, която не може да излезе"]] : [[null, "атом: ядро и електрон", (c, x, y) => { c.fillStyle = "#ff5d50"; c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill(); c.strokeStyle = "#8fd0ff"; c.beginPath(); c.ellipse(x, y, 8, 5, 0, 0, TAU); c.stroke(); }], ["#ffe27a", "светлината вече лети свободно"]]);
  }

  /* ---------- 4. the dark ages: gas slowly clumps ---------- */
  const CLOUDS = (() => { const r = rng(41); return Array.from({ length: 16 }, () => ({ x: r(), y: r(), s: .12 + r() * .25, h: 230 + r() * 60, ph: r() * TAU })); })();
  function dark(ctx, W, H, p, v) {
    ctx.fillStyle = "#03040a"; ctx.fillRect(0, 0, W, H);
    for (const c of CLOUDS) {
      const s = lerp(c.s, c.s * .45, p) * Math.max(W, H), x = (c.x + Math.sin(v.t * .05 + c.ph) * .02) * W, y = (c.y + Math.cos(v.t * .04 + c.ph) * .02) * H;
      glow(ctx, x, y, s, `hsla(${c.h},60%,${lerp(28, 40, p)}%,${lerp(.18, .32, p)})`);
    }
    legend(ctx, v, [["#6c6fb8", "газ, който бавно се събира на облаци"]]);
  }

  /* ---------- 5. first stars light up ---------- */
  const FIRST = (() => { const r = rng(53); return Array.from({ length: 240 }, () => ({ x: r(), y: r(), on: r() ** .7, big: r() < .15, sn: r() < .08 ? .3 + r() * .65 : 9 })); })();
  function stars(ctx, W, H, p, v) {
    ctx.fillStyle = "#020309"; ctx.fillRect(0, 0, W, H);
    for (const c of CLOUDS) glow(ctx, c.x * W, c.y * H, c.s * .4 * Math.max(W, H), `hsla(${c.h},60%,40%,.22)`);
    // reionisation: blue bubbles of light grow around the stars
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const s of FIRST) {
      const q = p * .75 + .25; // some stars already shine when the first event of this scene comes
      if (q < s.on) continue;
      const age = clamp((q - s.on) / .2, 0, 1), x = s.x * W, y = s.y * H;
      glow(ctx, x, y, (s.big ? 60 : 26) * age * (1 + p), `rgba(110,160,255,${.05 + .08 * age})`);
      const flash = Math.exp(-((p - s.sn) ** 2) / .0006);
      if (flash > .02) glow(ctx, x, y, 90 * flash, `rgba(255,240,200,${.9 * flash})`);
      ctx.fillStyle = s.big ? "#cfe0ff" : "#fff"; const r = (s.big ? 2.4 : 1.3) * (.6 + .4 * Math.sin(v.t * 2 + s.x * 30)) + .6;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
    legend(ctx, v, [["#cfe0ff", "първите звезди — огромни и сини"], ["#ffe9b8", "избухваща звезда прави нови вещества"]]);
  }

  /* ---------- 6. galaxies form and merge ---------- */
  const GAL = (() => {
    const r = rng(67);
    return Array.from({ length: 38 }, (_, i) => {
      const arms = 2 + Math.floor(r() * 2), pts = [];
      for (let k = 0; k < 150; k++) { const arm = k % arms, d = r() ** .7, a = arm * TAU / arms + d * 4.2 + (r() - .5) * .5; pts.push([Math.cos(a) * d, Math.sin(a) * d, d]); }
      return { x: r(), y: r(), s: .02 + r() * .05, tilt: .35 + r() * .6, rot: r() * TAU, spin: (r() < .5 ? 1 : -1) * (.05 + r() * .1), ell: r() < .3, hue: 200 + r() * 50, pts, pair: i % 7 === 0 ? i + 1 : -1 };
    });
  })();
  function galaxies(ctx, W, H, p, v) {
    ctx.fillStyle = "#02030a"; ctx.fillRect(0, 0, W, H);
    starfield(ctx, W, H, v.t, .35);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    GAL.forEach((g, i) => {
      let gx = g.x, gy = g.y;
      const partner = GAL[g.pair];
      if (partner) { const m = smooth(.3, .9, p); gx = lerp(g.x, (g.x + partner.x) / 2, m * .9); gy = lerp(g.y, (g.y + partner.y) / 2, m * .9); }
      if (GAL.some((o) => o.pair === i)) { const o = GAL.find((q) => q.pair === i), m = smooth(.3, .9, p); gx = lerp(g.x, (g.x + o.x) / 2, m * 1.1); gy = lerp(g.y, (g.y + o.y) / 2, m * 1.1); }
      const s = g.s * lerp(.6, 1.5, p) * Math.min(W, H), x = gx * W, y = gy * H, a = g.rot + v.t * g.spin;
      glow(ctx, x, y, s * .6, `hsla(45,100%,80%,.35)`);
      for (const [px, py, d] of g.pts) {
        const rx = px * Math.cos(a) - py * Math.sin(a), ry = (px * Math.sin(a) + py * Math.cos(a)) * (g.ell ? .7 : g.tilt);
        ctx.fillStyle = `hsla(${d < .25 ? 45 : g.hue},90%,${lerp(85, 70, d)}%,${.7 - d * .4})`;
        ctx.fillRect(x + rx * s, y + ry * s, 1.6, 1.6);
      }
    });
    ctx.restore();
    legend(ctx, v, [["#bcd3ff", "галактики — острови от милиарди звезди"]]);
  }

  /* ---------- 7. the Milky Way ---------- */
  const MW = (() => {
    const r = rng(79), pts = [];
    for (let k = 0; k < 4200; k++) {
      if (k < 900) { const d = r() ** 2 * .22, a = r() * TAU; pts.push([Math.cos(a) * d, Math.sin(a) * d, d, 1]); continue; }
      const arm = k % 4, d = .12 + r() ** .8 * .88, a = arm * TAU / 4 + Math.log(d) * 2.6 + (r() - .5) * .45;
      pts.push([Math.cos(a) * d, Math.sin(a) * d, d, 0]);
    }
    return pts;
  })();
  function milkyway(ctx, W, H, p, v) {
    ctx.fillStyle = "#02030a"; ctx.fillRect(0, 0, W, H);
    starfield(ctx, W, H, v.t, .5);
    const [cx, cy] = center(v), R = Math.min(v.stage.w, v.stage.h) * .48 * lerp(.7, 1, p), a = v.t * .03, tilt = .55;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    glow(ctx, cx, cy, R * .45, "rgba(255,225,160,.55)");
    for (const [px, py, d, core] of MW) {
      const rx = px * Math.cos(a) - py * Math.sin(a), ry = (px * Math.sin(a) + py * Math.cos(a)) * tilt;
      ctx.fillStyle = core ? "rgba(255,230,180,.55)" : `hsla(${d < .4 ? 40 : 215},80%,${lerp(85, 72, d)}%,${.55 - d * .3})`;
      ctx.fillRect(cx + rx * R, cy + ry * R, core ? 1.8 : 1.5, core ? 1.8 : 1.5);
    }
    ctx.restore();
    // where the Sun will be born: about two thirds out from the centre
    const sa = a + 2.1, sx = cx + Math.cos(sa) * R * .62, sy = cy + Math.sin(sa) * R * .62 * tilt, pulse = (v.t % 1.6) / 1.6;
    ctx.strokeStyle = `rgba(255,210,90,${1 - pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 6 + pulse * 18, 0, TAU); ctx.stroke();
    ctx.fillStyle = "#ffd25a"; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, TAU); ctx.fill();
    ctx.font = "800 15px Nunito, system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(10,14,34,.6)"; const label = v.ago > 4.6e9 ? "тук ще се роди Слънцето" : "тук се ражда Слънцето"; const lw = ctx.measureText(label).width + 20;
    roundRect(ctx, sx + 16, sy - 13, lw, 26, 13); ctx.fill(); ctx.fillStyle = "#ffe7a6"; ctx.fillText(label, sx + 26, sy);
    legend(ctx, v, [["#bcd3ff", "нашата галактика — Млечният път"]]);
  }

  /* ---------- 8. the Solar System: a dusty disk becomes planets ---------- */
  const DISK = (() => { const r = rng(97); return Array.from({ length: 1700 }, () => ({ d: .12 + r() ** .8 * .88, a: r() * TAU, s: .6 + r() * 1.4 })); })();
  const PLANETS = [["Меркурий", .16, 3, "#b8a99a"], ["Венера", .23, 5, "#e8c27a"], ["Земя", .31, 5.4, "#4fa3ff"], ["Марс", .39, 4, "#e0663d"], ["Юпитер", .55, 11, "#d9a77a"], ["Сатурн", .69, 9, "#e8d08a"], ["Уран", .82, 7, "#9fe0e8"], ["Нептун", .94, 7, "#5a7cff"]];
  function solar(ctx, W, H, p, v) {
    ctx.fillStyle = "#02030a"; ctx.fillRect(0, 0, W, H);
    starfield(ctx, W, H, v.t, .7);
    const [cx, cy] = center(v), R = Math.min(v.stage.w * .5, v.stage.h * 1.05) * .92, tilt = .38;
    const sun = lerp(.35, 1, smooth(0, .25, p)), disk = 1 - smooth(.35, .85, p), pl = smooth(.35, .85, p);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    glow(ctx, cx, cy, R * .35 * sun, "rgba(255,190,90,.6)");
    if (disk > 0) for (const q of DISK) {
      const a = q.a + v.t * .9 / Math.pow(q.d, 1.5) * .15, x = cx + Math.cos(a) * q.d * R, y = cy + Math.sin(a) * q.d * R * tilt;
      ctx.fillStyle = `rgba(${q.d < .4 ? "255,200,140" : "200,170,150"},${.5 * disk})`; ctx.fillRect(x, y, q.s, q.s);
    }
    ctx.restore();
    ctx.fillStyle = "#fff3c4"; ctx.beginPath(); ctx.arc(cx, cy, 12 * sun, 0, TAU); ctx.fill();
    if (pl > 0) {
      ctx.font = "800 13px Nunito, system-ui, sans-serif"; ctx.textAlign = "center";
      PLANETS.forEach(([name, d, size, col], i) => {
        ctx.globalAlpha = pl * .35; ctx.strokeStyle = "#9fb4ff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, d * R, d * R * tilt, 0, 0, TAU); ctx.stroke();
        const a = v.t * .5 / Math.pow(d, 1.5) * .12 + i * 1.7, x = cx + Math.cos(a) * d * R, y = cy + Math.sin(a) * d * R * tilt;
        ctx.globalAlpha = pl; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
        if (name === "Сатурн") { ctx.strokeStyle = "#f3e3b0"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y, size * 1.9, size * .6, -.3, 0, TAU); ctx.stroke(); }
        if (name === "Земя") { ctx.strokeStyle = "#cfe6ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, size + 5, 0, TAU); ctx.stroke(); }
        ctx.fillStyle = name === "Земя" ? "#cfe6ff" : "rgba(230,235,255,.85)"; ctx.fillText(name, x, y - size - 8);
      });
      ctx.globalAlpha = 1;
    }
    legend(ctx, v, disk > .5 ? [["#ffc98c", "диск от прах и газ около младото Слънце"]] : [["#4fa3ff", "осемте планети"]]);
  }

  /* ---------- 9. young Earth: lava, the giant impact and the Moon ---------- */
  let lava = null;
  function lavaTex() {
    if (lava) return lava;
    const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d"), r = rng(113);
    x.fillStyle = "#2a0a05"; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 260; i++) { x.strokeStyle = `hsla(${20 + r() * 25},100%,${45 + r() * 20}%,${.35 + r() * .5})`; x.lineWidth = .8 + r() * 2.4; x.beginPath(); let px = r() * 512, py = r() * 256; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - .5) * 60; py += (r() - .5) * 30; x.lineTo(px, py); } x.stroke(); }
    for (let i = 0; i < 70; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 20); const px = r() * 512, py = r() * 256; x.save(); x.translate(px, py); g.addColorStop(0, "rgba(255,170,60,.6)"); g.addColorStop(1, "rgba(255,90,20,0)"); x.fillStyle = g; x.fillRect(-20, -20, 40, 40); x.restore(); }
    return (lava = c);
  }
  function youngEarth(ctx, W, H, p, v) {
    ctx.fillStyle = "#02030a"; ctx.fillRect(0, 0, W, H);
    starfield(ctx, W, H, v.t, .8);
    const [cx, cy] = center(v), R = Math.min(v.stage.w, v.stage.h) * .3;
    p = clamp((4.545e9 - v.ago) / (4.545e9 - 4.4e9), 0, 1);
    const hit = (4.545e9 - 4.51e9) / (4.545e9 - 4.4e9), cool = smooth(.35, 1, p);
    // Theia flies in, then the debris ring gathers into the Moon
    if (p < hit) { const k = p / hit, tx = lerp(cx + R * 3.2, cx + R * .9, k * k), ty = lerp(cy - R * 2.2, cy - R * .5, k * k); glow(ctx, tx, ty, R * .7, "rgba(255,140,80,.25)"); ctx.fillStyle = "#8a6a55"; ctx.beginPath(); ctx.arc(tx, ty, R * .45, 0, TAU); ctx.fill(); }
    glow(ctx, cx, cy, R * 1.5, `rgba(255,${lerp(110, 150, cool)},60,${lerp(.45, .12, cool)})`);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    const tex = lavaTex(), off = (v.t * 12) % (R * 4);
    ctx.drawImage(tex, cx - R - off, cy - R, R * 4, R * 2); ctx.drawImage(tex, cx - R - off + R * 4, cy - R, R * 4, R * 2);
    ctx.fillStyle = `rgba(40,30,30,${cool * .75})`; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); // the crust darkens as it cools
    const sh = ctx.createRadialGradient(cx - R * .4, cy - R * .4, R * .2, cx, cy, R * 1.05); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.7)"); ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
    const after = p - hit;
    if (after > 0) {
      const flash = Math.exp(-after * after / .0008); if (flash > .02) { ctx.save(); ctx.globalCompositeOperation = "lighter"; glow(ctx, cx + R * .8, cy - R * .45, R * 2.2 * flash + 10, `rgba(255,240,200,${flash})`); ctx.restore(); }
      const ring = 1 - smooth(.05, .45, after), moon = smooth(.1, .5, after), ma = v.t * .25;
      if (ring > 0) { const r = rng(5); ctx.fillStyle = `rgba(220,160,110,${.6 * ring})`; for (let i = 0; i < 400; i++) { const a = r() * TAU + v.t * .4, d = R * (1.5 + r() * .7); ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .35, 1.8, 1.8); } }
      if (moon > 0) { const mx = cx + Math.cos(ma) * R * 1.9, my = cy + Math.sin(ma) * R * .5; ctx.globalAlpha = moon; ctx.fillStyle = "#c9c4bd"; ctx.beginPath(); ctx.arc(mx, my, R * .27, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.arc(mx + R * .07, my + R * .05, R * .25, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    }
    legend(ctx, v, after > .1 ? [["#c9c4bd", "Луната се ражда от отломките"], ["#ff7a3c", "Земята е море от лава"]] : [["#ff7a3c", "Земята е море от лава"], ["#8a6a55", "планетата Тея лети към Земята"]]);
  }

  /* ---------- which scene when ---------- */
  // ranges are set by the app in slider units (u), because the slider is logarithmic
  let RANGES = [];
  const DRAW = { plasma, nuclei, atoms, dark, stars, galaxies, milkyway, solar, youngEarth };
  function setRanges(r) { RANGES = r; }
  function draw(ctx, W, H, view, extra) {
    const fade = .006;
    let drew = false;
    for (const r of RANGES) {
      // the next scene is fully in by the time its first event is reached
      const f = r.f != null ? r.f : Math.min(fade, (r.b - r.a) * .5);
      const fo = r.fo != null ? r.fo : f;
      const wIn = r.first ? 1 : smooth(r.a - f, r.a, view.u), wOut = r.last ? 1 : 1 - smooth(r.b - fo, r.b, view.u);
      const w = wIn * wOut;
      if (w <= 0) continue;
      // among the first moments progress follows the powers of ten
      const p = r.la != null ? clamp((Math.log10(Math.max(view.u, 1e-62)) - r.la) / (r.lb - r.la), 0, 1) : clamp((view.u - r.a) / (r.b - r.a), 0, 1);
      ctx.save(); ctx.globalAlpha = drew ? w : 1; // the first scene paints the ground, the next one fades in over it
      if (r.name === "globe") extra.globe(ctx, W, H, view);
      else DRAW[r.name](ctx, W, H, p, view);
      ctx.restore();
      drew = true;
    }
  }
  return { draw, setRanges, starfield, glow, legend };
})();
