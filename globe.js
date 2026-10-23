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
  // one projection that morphs from a globe (t = 0) into a flat world map (t = 1)
  const ORTHO = d3.geoOrthographicRaw, FLAT = d3.geoNaturalEarth1Raw;
  const mutate = d3.geoProjectionMutator((t) => (x, y) => { const a = ORTHO(x, y), b = FLAT(x, y); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; });
  const projection = mutate(0).precision(.6);
  const path = d3.geoPath(projection);
  const grat = d3.geoGraticule10(), SPHERE = { type: "Sphere" };
  const FLAT_W = 2 * 2.7, FLAT_H = 2 * 1.42;                 // size of the Natural Earth map at scale 1
  // the globe opens into a map when the plate model has real continents (about a billion years ago)
  const mapness = (ago) => smooth(1.15e9, .95e9, ago);
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
  function drawLife(ctx, view, t, center) {
    if (typeof LIFE === "undefined" || typeof LIFE_PATHS === "undefined") return 0;
    const ago = view.ago, ma = ago / 1e6, R = clamp(Math.min(view.stage.w, view.stage.h) / 44, 11, 17), boxes = [];
    let shown = 0;
    ctx.save(); ctx.font = "800 12px Nunito, system-ui, sans-serif"; ctx.textBaseline = "middle";
    for (const c of LIFE) {
      if (ago > c.from || ago < c.to) continue;
      const paths = LIFE_PATHS[c.id]; if (!paths) continue;
      let labelled = false;
      c.sites.forEach((site, k) => {
        const end = site[2] != null ? site[2] : c.to;
        if (ago < end || !paths[k]) return;
        const ll = lifeAt(paths[k], ma);
        if (t < .5 && d3.geoDistance(ll, center) > Math.PI / 2 - .08) return;
        const p = projection(ll); if (!p) return;
        // fade in when the animal appears and out when it disappears (on the log clock)
        const fade = clamp(Math.min(Math.log10(c.from / Math.max(ago, 1)), end > 0 ? Math.log10(ago / end) : 9) * 10, 0, 1);
        if (fade <= .02) return;
        ctx.globalAlpha = fade; shown++;
        const col = LIFE_COL[c.kind] || "#fff", ph = c.ph && typeof PHOTOS !== "undefined" && PHOTOS[c.ph];
        ctx.fillStyle = "rgba(5,8,30,.75)"; ctx.beginPath(); ctx.arc(p[0], p[1], R + 2.5, 0, TAU); ctx.fill();
        const im = ph && image(ph.f);
        if (im && im.complete && im.naturalWidth) {
          ctx.save(); ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, TAU); ctx.clip();
          const k2 = Math.max(2 * R / im.naturalWidth, 2 * R / im.naturalHeight);
          ctx.drawImage(im, p[0] - im.naturalWidth * k2 / 2, p[1] - im.naturalHeight * k2 / 2, im.naturalWidth * k2, im.naturalHeight * k2);
          ctx.restore();
        } else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], R * .55, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p[0], p[1], R + 1, 0, TAU); ctx.stroke();
        if (labelled) return;
        const w = ctx.measureText(c.n).width + 14, bx = p[0] + R + 4, by = p[1] - 10, box = [bx, by, w, 20];
        if (boxes.some((b) => bx < b[0] + b[2] && bx + w > b[0] && by < b[1] + b[3] && by + 20 > b[1])) return;
        boxes.push(box); labelled = true;
        ctx.fillStyle = "rgba(5,8,30,.72)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, w, 20, 10) : ctx.rect(bx, by, w, 20); ctx.fill();
        ctx.fillStyle = col; ctx.fillText(c.n, bx + 7, p[1]);
      });
    }
    ctx.restore();
    return shown;
  }

  function draw(ctx, W, H, view) {
    const ago = view.ago, ma = ago / 1e6, L = look(ago);
    const st = view.stage, cx = st.x + st.w / 2; let cy = st.y + st.h / 2;
    const dt = Math.min(.1, view.t - lastT || 0); lastT = view.t;
    const t = mapness(ago), R = Math.min(st.w, st.h) * .44;
    // the wide map sits below the date and era chips in the top-left corner
    const top = Math.max(st.y, (document.getElementById("eras")?.getBoundingClientRect().bottom || 0) + 12), mh = st.y + st.h - top;
    const M = Math.min((st.w - 16) / FLAT_W, mh / FLAT_H) * .97;
    const cyMap = top + mh / 2; cy = lerp(cy, cyMap, t);

    // the globe turns toward the place of the current event, or spins slowly; the map stays put
    const at = view.focusAt;
    if (at) { const tl = -at[0], tp = clamp(-at[1], -50, 50); let d = ((tl - rot[0] + 540) % 360) - 180; rot[0] += d * Math.min(1, dt * 2.2); rot[1] += (tp - rot[1]) * Math.min(1, dt * 2.2); }
    else { rot[0] += dt * 8 * (1 - t); rot[1] += (-15 - rot[1]) * Math.min(1, dt); }
    const lam = ((rot[0] + 540) % 360) - 180;
    mutate(t);
    projection.translate([cx, cy]).scale(lerp(R, M, t)).rotate([lam * (1 - t), rot[1] * (1 - t)]).clipAngle(t < .001 ? 90 : t > .97 ? null : Math.min(170, 90 + t * 90)); // a full map cuts at the date line instead

    ctx.fillStyle = "#02030a"; ctx.fillRect(0, 0, W, H);
    Scenes.starfield(ctx, W, H, view.t, .8);
    if (t < 1) { ctx.save(); ctx.globalAlpha = 1 - t; Scenes.glow(ctx, cx, cy, R * 1.25, L.air.replace("rgb", "rgba").replace(")", ",.45)")); ctx.restore(); }

    // ocean
    const og = ctx.createRadialGradient(cx - R * .35, cy - R * .35, R * .1, cx, cy, lerp(R, M * 2.7, t));
    og.addColorStop(0, L.ocean); og.addColorStop(1, L.deep);
    ctx.beginPath(); path.context(ctx)(SPHERE); ctx.fillStyle = og; ctx.fill();

    ctx.save(); ctx.beginPath(); path.context(ctx)(SPHERE); ctx.clip();
    // land: one sharp reconstruction at a time; the next one takes over quickly halfway between them
    const ar = around(Math.min(ma, 980));
    if (ar) {
      const [a, b, f] = ar, A = frame(a), B = frame(b);
      const s = ma > 980 ? Math.pow(clamp((4.0e3 - ma) / (4.0e3 - 980), 0, 1), .9) : 1;
      const wB = smooth(.42, .58, f);
      ctx.fillStyle = L.land;
      for (const [F, w] of [[A, 1], [B, wB]]) {
        if (!F || w <= .01 || s <= .03 || (F === A && wB >= .99 && B)) continue;
        ctx.globalAlpha = w;
        ctx.beginPath(); path.context(ctx)(s < 1 ? shrunk(F, s) : F.geo); ctx.fill(); // one fill: the pieces of a continent never show seams
      }
      ctx.globalAlpha = 1;
      if (TIMES.length) { const i = TIMES.indexOf(a); [TIMES[i - 1], TIMES[i + 2]].forEach((m) => m != null && frame(m)); }
    }
    // ice caps and Snowball Earth
    ctx.fillStyle = "rgba(240,248,255,.88)";
    if (L.north) { ctx.beginPath(); path.context(ctx)(d3.geoCircle().center([0, 90]).radius(L.north)()); ctx.fill(); }
    if (L.south) { ctx.beginPath(); path.context(ctx)(d3.geoCircle().center([0, -90]).radius(L.south)()); ctx.fill(); }
    if (L.snowball > 0) { ctx.fillStyle = `rgba(236,246,255,${.9 * L.snowball})`; ctx.fillRect(0, 0, W, H); }
    if (L.hot > 0) { ctx.fillStyle = `rgba(150,70,40,${.22 * L.hot})`; ctx.fillRect(0, 0, W, H); }
    ctx.beginPath(); path.context(ctx)(grat); ctx.strokeStyle = `rgba(255,255,255,${lerp(.07, .1, t)})`; ctx.lineWidth = .8; ctx.stroke();
    // night side, only while it is a globe
    if (t < 1) {
      const sh = ctx.createRadialGradient(cx - R * .55, cy - R * .45, R * .25, cx - R * .1, cy, R * 1.35);
      sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(.7, "rgba(0,0,10,.35)"); sh.addColorStop(1, "rgba(0,0,10,.82)");
      ctx.globalAlpha = 1 - t; ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.beginPath(); path.context(ctx)(SPHERE); ctx.strokeStyle = L.air.replace("rgb", "rgba").replace(")", ",.6)"); ctx.lineWidth = 2; ctx.stroke();

    const lifeShown = drawLife(ctx, view, t, [-lam, -rot[1] * (1 - t)]);

    // the place of the current event
    if (at) {
      const p = projection(at), visible = t > .5 || d3.geoDistance(at, [-lam, -rot[1]]) < Math.PI / 2 - .05; // the morphing projection has no invert
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
    if (lifeShown) items.push(["#ff8a4a", "кой е живял тогава и къде"]);
    if (ma > 980) items.push(["#a4825d", "континентите тогава — по предположение"]);
    else items.push([L.land, "суша — местата на континентите тогава"]);
    Scenes.legend(ctx, view, items);
  }
  // the globe is ready when the frame we need right now is in memory
  return { draw, look };
})();
