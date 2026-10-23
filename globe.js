/* The rotating Earth from the first oceans to today.
   Coastlines: coasts/<Ma>.json, reconstructed with the Merdith et al. (2021) plate model (0–980 Ma).
   Older than that the continents are drawn as the 980 Ma ones shrunk toward their centres:
   continents grew over time, but nobody knows their exact shapes that far back. */
const Globe = (() => {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const TAU = Math.PI * 2;

  let TIMES = [];
  const cache = new Map(), loading = new Map();
  fetch("coasts/index.json").then((r) => r.json()).then((t) => { TIMES = t; }).catch(() => {});

  // rings arrive as flat [lon,lat,...] arrays; d3 needs each ring wound the way that encloses the small side
  function toGeo(rings, shrink = 1) {
    const polys = [];
    for (const flat of rings) {
      // points exactly on a pole or on the date line make d3 fill the whole map instead of the land
      let ring = []; for (let i = 0; i < flat.length; i += 2) ring.push([clamp(flat[i], -179.99, 179.99), clamp(flat[i + 1], -89.99, 89.99)]);
      if (shrink < 1) {
        let cx = 0, cy = 0; ring.forEach(([x, y]) => { cx += x; cy += y; }); cx /= ring.length; cy /= ring.length;
        ring = ring.map(([x, y]) => [cx + (x - cx) * shrink, cy + (y - cy) * shrink]);
      }
      if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]);
      let g = { type: "Polygon", coordinates: [ring] };
      if (d3.geoArea(g) > TAU) g = { type: "Polygon", coordinates: [ring.slice().reverse()] };
      polys.push(g.coordinates);
    }
    return { type: "MultiPolygon", coordinates: polys };
  }
  function frame(ma) {
    if (cache.has(ma)) return cache.get(ma);
    if (!loading.has(ma)) loading.set(ma, fetch(`coasts/${ma}.json`).then((r) => r.json()).then((rings) => { cache.set(ma, { rings, geo: toGeo(rings), shrunk: new Map() }); }).catch(() => {}));
    return null;
  }
  function shrunk(f, s) {
    const k = Math.round(s * 40) / 40;
    if (!f.shrunk.has(k)) f.shrunk.set(k, toGeo(f.rings, Math.max(.05, k)));
    return f.shrunk.get(k);
  }
  // the two stored frames around a time, and how far between them we are
  function around(ma) {
    if (!TIMES.length) return null;
    if (ma <= TIMES[0]) return [TIMES[0], TIMES[0], 0];
    const last = TIMES[TIMES.length - 1];
    if (ma >= last) return [last, last, 0];
    for (let i = 0; i < TIMES.length - 1; i++) if (ma >= TIMES[i] && ma <= TIMES[i + 1]) return [TIMES[i], TIMES[i + 1], (ma - TIMES[i]) / (TIMES[i + 1] - TIMES[i])];
    return null;
  }

  /* ---------- how the planet looks at a time (years ago) ---------- */
  const mixHex = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); return `rgb(${[16, 8, 0].map((s) => Math.round(lerp((A >> s) & 255, (B >> s) & 255, t))).join(",")})`; };
  function look(ago) {
    const goe = smooth(2.5e9, 2.2e9, ago);           // the air fills with oxygen
    const plants = smooth(480e6, 380e6, ago);        // land turns green
    const snowball = Math.max(smooth(725e6, 715e6, ago) * (1 - smooth(640e6, 630e6, ago)), smooth(2.45e9, 2.4e9, ago) * (1 - smooth(2.25e9, 2.2e9, ago)) * .85);
    let north = 0, south = 0;                          // ice caps in degrees from the pole
    if (ago < 34e6) south = 18;
    if (ago < 3e6) north = 12;
    if (ago < 2.6e6 && ago > 11700) { north = 30; south = 24; }
    if (ago <= 11700) { north = 14; south = 22; }
    if (ago > 290e6 && ago < 340e6) south = 28;      // the late Paleozoic ice age
    return {
      ocean: ago > 2.5e9 ? mixHex("#2e6a5c", "#1f5f8f", goe) : mixHex("#1f5f8f", "#1d63a8", smooth(1e9, 300e6, ago)),
      deep: ago > 2.5e9 ? "#163a34" : "#0d2e57",
      land: ago > 4.0e9 ? "#5a3b2a" : mixHex("#a4825d", "#6b9a4b", plants),
      coast: ago > 4.0e9 ? "#3a2418" : mixHex("#7c5f3d", "#4e7a36", plants),
      air: mixHex("#ffb56b", "#8fc6ff", ago > 2.4e9 ? goe : 1),
      snowball, north, south,
      hot: 1 - smooth(4.4e9, 4.1e9, ago),             // the first oceans are still steaming
    };
  }

  /* ---------- drawing ---------- */
  // two separate projections; around a billion years ago the globe fades out and the flat map fades in
  const globeProj = d3.geoOrthographic().clipAngle(90).precision(.6);
  const mapProj = d3.geoNaturalEarth1().precision(.6);
  const grat = d3.geoGraticule10(), SPHERE = { type: "Sphere" };
  const FLAT_W = 2 * 2.7, FLAT_H = 2 * 1.42;                 // size of the Natural Earth map at scale 1
  const mapness = (ago) => smooth(1.2e9, 1.02e9, ago);     // the plate model has real continents from about a billion years ago
  let rot = [-20, -15], lastT = 0;

  /* ---------- who lived where (life.js + life-paths.js) ---------- */
  const imgs = new Map();
  const image = (src) => { if (!imgs.has(src)) { const im = new Image(); im.src = src; imgs.set(src, im); } return imgs.get(src); };
  const LIFE_COL = { sea: "#4fd1ff", dino: "#ff8a4a", land: "#d9b36a", air: "#b48cff", human: "#ffd25a", place: "#ffe9a8" };
  // a find site drifts with its continent: interpolate its reconstructed positions [Ma, lon, lat]
  function lifeAt(path, ma) {
    if (ma >= path[0][0]) return [path[0][1], path[0][2]];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      if (ma <= a[0] && ma >= b[0]) { const f = (a[0] - ma) / (a[0] - b[0] || 1), d = ((b[1] - a[1] + 540) % 360) - 180; return [a[1] + d * f, a[2] + (b[2] - a[2]) * f]; }
    }
    const z = path[path.length - 1]; return [z[1], z[2]];
  }
  function drawLife(ctx, view, proj, globe, center) {
    if (typeof LIFE === "undefined" || typeof LIFE_PATHS === "undefined") return 0;
    const ago = view.ago, ma = ago / 1e6, R = clamp(Math.min(view.stage.w, view.stage.h) / 36, 13, 19);
    // 1) everything alive now, at the place its find site had then
    const items = [];
    for (const c of LIFE) {
      if (ago > c.from || ago < c.to) continue;
      const paths = LIFE_PATHS[c.id]; if (!paths) continue;
      c.sites.forEach((site, k) => {
        const end = site[2] != null ? site[2] : c.to;
        if (ago < end || !paths[k]) return;
        const ll = lifeAt(paths[k], ma);
        if (globe && d3.geoDistance(ll, center) > Math.PI / 2 - .08) return;
        const p = proj(ll); if (!p) return;
        // fade in and out only at the very start and end of its time on Earth
        const life = c.from - end, pos = life > 0 ? (c.from - ago) / life : .5;
        const fade = clamp(Math.min(pos / .08, end > 0 ? (1 - pos) / .08 : 1, 1), 0, 1);
        if (fade > .02) items.push({ c, p, x: p[0], y: p[1], fade, first: !items.some((q) => q.c === c) });
      });
    }
    // 2) icons that would cover each other step aside around the spot, with a thin line back to it
    const gap = 2 * R + 6;
    items.forEach((it, i) => {
      for (let k = 0; k < 24 && items.slice(0, i).some((q) => Math.hypot(q.x - it.x, q.y - it.y) < gap); k++) {
        const a = k * 2.4, d = gap * (1 + Math.floor(k / 6) * .9); it.x = it.p[0] + Math.cos(a) * d; it.y = it.p[1] + Math.sin(a) * d;
      }
    });
    ctx.save(); ctx.font = "800 12px Nunito, system-ui, sans-serif"; ctx.textBaseline = "middle";
    const boxes = [];
    for (const it of items) {
      const { c, x, y } = it, col = LIFE_COL[c.kind] || "#fff";
      ctx.globalAlpha = it.fade;
      if (x !== it.p[0] || y !== it.p[1]) { ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(it.p[0], it.p[1]); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(it.p[0], it.p[1], 3, 0, TAU); ctx.fill(); }
      // a light round badge so the coloured icon stands out, ringed in the colour of its group
      ctx.fillStyle = "rgba(255,251,240,.95)"; ctx.beginPath(); ctx.arc(x, y, R + 1, 0, TAU); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
      if (c.e) { ctx.save(); ctx.font = `${Math.round(R * 1.2)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(c.e, x, y + 1); ctx.restore(); }
      if (!it.first) continue;
      const w = ctx.measureText(c.n).width + 14, bx = x + R + 5, by = y - 10;
      if (boxes.some((b) => bx < b[0] + b[2] && bx + w > b[0] && by < b[1] + b[3] && by + 20 > b[1])) continue;
      boxes.push([bx, by, w, 20]);
      ctx.fillStyle = "rgba(5,8,30,.75)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, w, 20, 10) : ctx.rect(bx, by, w, 20); ctx.fill();
      ctx.fillStyle = col; ctx.fillText(c.n, bx + 7, y);
    }
    ctx.restore();
    return items.length;
  }

  // an ice cap with a wavy edge, r degrees from the pole (pole = 1 north, -1 south)
  const capCache = new Map();
  function icecap(pole, r) {
    const key = pole + ":" + Math.round(r);
    if (capCache.has(key)) return capCache.get(key);
    const ring = [];
    for (let lon = -180; lon <= 180; lon += 4) { const wave = 3 * Math.sin(lon * Math.PI / 60) + 2 * Math.sin(lon * Math.PI / 25 + 1); ring.push([lon, pole * (90 - Math.max(2, r + wave))]); }
    ring.push(ring[0]);
    let g = { type: "Polygon", coordinates: [ring] };
    if (d3.geoArea(g) > TAU) g = { type: "Polygon", coordinates: [ring.slice().reverse()] };
    capCache.set(key, g); return g;
  }

  // one picture of the planet with a given projection: ocean, land, ice, grid, life, the event pin
  function paint(ctx, W, H, view, proj, globe, L, at, center) {
    const path = d3.geoPath(proj, ctx), ago = view.ago, ma = ago / 1e6;
    const [cx, cy] = proj.translate(), S = proj.scale();
    const og = globe ? ctx.createRadialGradient(cx - S * .35, cy - S * .35, S * .1, cx, cy, S) : ctx.createLinearGradient(0, cy - S * 1.4, 0, cy + S * 1.4);
    og.addColorStop(0, L.ocean); og.addColorStop(1, L.deep);
    ctx.beginPath(); path(SPHERE); ctx.fillStyle = og; ctx.fill();
    ctx.save(); ctx.beginPath(); path(SPHERE); ctx.clip();
    // land: one sharp reconstruction at a time; the next one takes over quickly halfway between them
    const ar = around(Math.min(ma, 980));
    let landGeo = null;
    if (ar) {
      const [a, b, f] = ar, A = frame(a), B = frame(b);
      const s = ma > 980 ? Math.pow(clamp((4.0e3 - ma) / (4.0e3 - 980), 0, 1), .9) : 1;
      // only the nearest reconstruction is drawn: two sets of continents must never show at once
      const F = (f < .5 ? A : B) || A || B;
      if (F && s > .03) {
        landGeo = s < 1 ? shrunk(F, s) : F.geo;
        ctx.fillStyle = L.land; ctx.beginPath(); path(landGeo); ctx.fill(); // one fill: the pieces of a continent never show seams
      }
      if (TIMES.length) { const i = TIMES.indexOf(a); [TIMES[i - 1], TIMES[i + 2]].forEach((m) => m != null && frame(m)); }
    }
    // ice: thick sheets on the land near the poles, only a thin haze of sea ice on the ocean
    const caps = [];
    if (L.north) caps.push([1, L.north]);
    if (L.south) caps.push([-1, L.south]);
    if (caps.length) {
      ctx.fillStyle = "rgba(235,245,255,.18)";
      for (const [pole, r] of caps) { ctx.beginPath(); path(icecap(pole, Math.min(14, r * .5))); ctx.fill(); }
      if (landGeo) {
        ctx.save(); ctx.beginPath(); path(landGeo); ctx.clip();
        ctx.fillStyle = "rgba(242,248,255,.92)";
        for (const [pole, r] of caps) { ctx.beginPath(); path(icecap(pole, r)); ctx.fill(); }
        ctx.restore();
      }
    }
    if (L.snowball > 0) { ctx.fillStyle = `rgba(236,246,255,${.9 * L.snowball})`; ctx.fillRect(0, 0, W, H); }
    if (L.hot > 0) { ctx.fillStyle = `rgba(150,70,40,${.22 * L.hot})`; ctx.fillRect(0, 0, W, H); }
    ctx.beginPath(); path(grat); ctx.strokeStyle = globe ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.1)"; ctx.lineWidth = .8; ctx.stroke();
    if (globe) { // night side
      const sh = ctx.createRadialGradient(cx - S * .55, cy - S * .45, S * .25, cx - S * .1, cy, S * 1.35);
      sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(.7, "rgba(0,0,10,.35)"); sh.addColorStop(1, "rgba(0,0,10,.82)");
      ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    ctx.beginPath(); path(SPHERE); ctx.strokeStyle = L.air.replace("rgb", "rgba").replace(")", ",.6)"); ctx.lineWidth = 2; ctx.stroke();
    const shown = drawLife(ctx, view, proj, globe, center);
    if (at) {
      const p = proj(at), visible = !globe || d3.geoDistance(at, center) < Math.PI / 2 - .05;
      if (p && visible) {
        const pulse = (view.t % 1.5) / 1.5;
        ctx.strokeStyle = `rgba(255,214,90,${1 - pulse})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p[0], p[1], 8 + pulse * 26, 0, TAU); ctx.stroke();
        ctx.fillStyle = "#ffd65a"; ctx.strokeStyle = "#3a2a05"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
    return shown;
  }

  function draw(ctx, W, H, view) {
    const ago = view.ago, ma = ago / 1e6, L = look(ago);
    const st = view.stage, cx = st.x + st.w / 2, cy = st.y + st.h / 2;
    const dt = Math.min(.1, view.t - lastT || 0); lastT = view.t;
    const t = mapness(ago), R = Math.min(st.w, st.h) * .44;
    // the wide map sits below the date and era chips in the top-left corner
    const top = Math.max(st.y, (document.getElementById("eras")?.getBoundingClientRect().bottom || 0) + 12), mh = st.y + st.h - top;
    const M = Math.min((st.w - 16) / FLAT_W, mh / FLAT_H) * .97;

    // the globe turns toward the place of the current event, or spins slowly
    const at = view.focusAt;
    if (at) { const tl = -at[0], tp = clamp(-at[1], -50, 50); let d = ((tl - rot[0] + 540) % 360) - 180; rot[0] += d * Math.min(1, dt * 2.2); rot[1] += (tp - rot[1]) * Math.min(1, dt * 2.2); }
    else { rot[0] += dt * 8; rot[1] += (-15 - rot[1]) * Math.min(1, dt); }
    const lam = ((rot[0] + 540) % 360) - 180, center = [-lam, -rot[1]];

    ctx.fillStyle = "#02030a"; ctx.fillRect(0, 0, W, H);
    Scenes.starfield(ctx, W, H, view.t, .8);
    let shown = 0;
    // first the globe fades out completely, only then the map fades in: never both at once
    // one of the two is always on screen: the globe dims, then the map takes its place and brightens
    const gA = t < .5 ? 1 - .7 * smooth(.15, .5, t) : 0, mA = t >= .5 ? .3 + .7 * smooth(.5, .85, t) : 0;
    if (gA > 0) { // globe, growing a little as it goes
      ctx.save(); ctx.globalAlpha = gA;
      Scenes.glow(ctx, cx, cy, R * 1.25, L.air.replace("rgb", "rgba").replace(")", ",.45)"));
      globeProj.translate([cx, cy]).scale(R * (1 + t * .35)).rotate([lam, rot[1]]);
      shown = paint(ctx, W, H, view, globeProj, true, L, at, center);
      ctx.restore();
    }
    if (mA > 0) { // flat map, settling into place as it comes
      ctx.save(); ctx.globalAlpha = mA;
      mapProj.translate([cx, top + mh / 2]).scale(M * (.85 + t * .15)).rotate([0, 0]);
      shown = paint(ctx, W, H, view, mapProj, false, L, at, center);
      ctx.restore();
    }
    const items = [];
    if (L.snowball > .5) items.push(["#eef6ff", "Земята е замръзнала цялата"]);
    else if (L.north >= 25 || L.south >= 25) items.push(["#eef6ff", "ледникова епоха: лед по сушата близо до полюсите"]);
    if (ago > 2.4e9) items.push(["#ffb56b", "въздухът е без кислород"]);
    if (shown) items.push(["#ff8a4a", "кой е живял тогава и къде"]);
    if (ma > 980) items.push(["#a4825d", "континентите тогава — по предположение"]);
    else items.push([L.land, "суша — местата на континентите тогава"]);
    Scenes.legend(ctx, view, items);
  }
  // the globe is ready when the frame we need right now is in memory
  return { draw, look };
})();
