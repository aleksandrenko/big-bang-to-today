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
      let ring = []; for (let i = 0; i < flat.length; i += 2) ring.push([flat[i], flat[i + 1]]);
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
  const projection = d3.geoOrthographic().clipAngle(90).precision(.6);
  const path = d3.geoPath(projection);
  const grat = d3.geoGraticule10();
  let rot = [-20, -15], lastT = 0;

  function draw(ctx, W, H, view, alpha) {
    const ago = view.ago, ma = ago / 1e6, L = look(ago);
    const st = view.stage, R = Math.min(st.w, st.h) * .44, cx = st.x + st.w / 2, cy = st.y + st.h / 2;
    const dt = Math.min(.1, view.t - lastT || 0); lastT = view.t;

    // turn toward the place of the current event, otherwise spin slowly
    const at = view.focusAt;
    if (at) { const tl = -at[0], tp = clamp(-at[1], -50, 50); let d = ((tl - rot[0] + 540) % 360) - 180; rot[0] += d * Math.min(1, dt * 2.2); rot[1] += (tp - rot[1]) * Math.min(1, dt * 2.2); }
    else { rot[0] += dt * 8; rot[1] += (-15 - rot[1]) * Math.min(1, dt); }
    projection.translate([cx, cy]).scale(R).rotate(rot);

    ctx.fillStyle = "#02030a"; ctx.fillRect(0, 0, W, H);
    Scenes.starfield(ctx, W, H, view.t, .8);
    Scenes.glow(ctx, cx, cy, R * 1.25, L.air.replace("rgb", "rgba").replace(")", ",.45)"));

    // ocean
    const og = ctx.createRadialGradient(cx - R * .35, cy - R * .35, R * .1, cx, cy, R);
    og.addColorStop(0, L.ocean); og.addColorStop(1, L.deep);
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();

    // land: the two neighbouring reconstructions crossfade
    const ar = around(Math.min(ma, 980));
    if (ar) {
      const [a, b, f] = ar, A = frame(a), B = frame(b);
      const s = ma > 980 ? Math.pow(clamp((4.0e3 - ma) / (4.0e3 - 980), 0, 1), .9) : 1;
      const layers = [[A, 1 - f], [B, f]];
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
      for (const [F, w] of layers) {
        if (!F || w <= .01 || s <= .03) continue;
        const geo = s < 1 ? shrunk(F, s) : F.geo;
        ctx.globalAlpha = w === 1 ? 1 : w;
        ctx.beginPath(); path.context(ctx)(geo); ctx.fillStyle = L.land; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = L.coast; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // ice caps and Snowball Earth
      const caps = [];
      if (L.north) caps.push(d3.geoCircle().center([0, 90]).radius(L.north)());
      if (L.south) caps.push(d3.geoCircle().center([0, -90]).radius(L.south)());
      ctx.fillStyle = "rgba(240,248,255,.88)";
      for (const c of caps) { ctx.beginPath(); path.context(ctx)(c); ctx.fill(); }
      if (L.snowball > 0) { ctx.fillStyle = `rgba(236,246,255,${.9 * L.snowball})`; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); }
      if (L.hot > 0) { ctx.fillStyle = `rgba(150,70,40,${.22 * L.hot})`; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); }
      // faint grid so the turning is visible
      ctx.beginPath(); path.context(ctx)(grat); ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = .8; ctx.stroke();
      // night side
      const sh = ctx.createRadialGradient(cx - R * .55, cy - R * .45, R * .25, cx - R * .1, cy, R * 1.35);
      sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(.7, "rgba(0,0,10,.35)"); sh.addColorStop(1, "rgba(0,0,10,.82)");
      ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.restore();
      // prefetch neighbours so dragging is smooth
      if (TIMES.length) { const i = TIMES.indexOf(a); [TIMES[i - 1], TIMES[i + 2]].forEach((m) => m != null && frame(m)); }
    }
    ctx.strokeStyle = L.air.replace("rgb", "rgba").replace(")", ",.6)"); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, TAU); ctx.stroke();

    // the place of the current event
    if (at) {
      const p = projection(at), visible = d3.geoDistance(at, projection.invert([cx, cy])) < Math.PI / 2 - .05;
      if (p && visible) {
        const pulse = (view.t % 1.5) / 1.5;
        ctx.strokeStyle = `rgba(255,214,90,${1 - pulse})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p[0], p[1], 8 + pulse * 26, 0, TAU); ctx.stroke();
        ctx.fillStyle = "#ffd65a"; ctx.strokeStyle = "#3a2a05"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
    const items = [];
    if (L.snowball > .5) items.push(["#eef6ff", "Земята е замръзнала цялата"]);
    else if (L.north >= 25) items.push(["#eef6ff", "ледникова епоха"]);
    if (ago > 2.4e9) items.push(["#ffb56b", "въздухът е без кислород"]);
    if (ma > 980) items.push(["#a4825d", "континентите тогава — по предположение"]);
    else items.push([L.land, "суша — местата на континентите тогава"]);
    Scenes.legend(ctx, view, items);
  }
  // the globe is ready when the frame we need right now is in memory
  return { draw, look };
})();
