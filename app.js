/* От големия взрив до днес — timeline, scene loop, card and the lesson host for narrator.js.
   The slider is linear: u ∈ [0, 1] is the share of the 13,8 billion years that has passed.
   The first moments of the Universe are tiny values of u (doubles keep them apart), so the scenes
   and moves there work on the logarithm of u. */
(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- time ↔ slider ---------- */
const YEAR = 3.156e7, AGE = 13.8e9, AGE_S = AGE * YEAR, U_MIN = 1e-62;
const uSec = (sec) => clamp(sec / AGE_S, 0, 1);
const uAgo = (ago) => clamp(1 - ago / AGE, 0, 1);
const uOf = (x) => (x.sec != null && x.sec < 1e9 * YEAR ? uSec(x.sec) : uAgo(x.ago));
const timeAt = (u) => ({ sec: u * AGE_S, ago: AGE * (1 - u) });
const EARLY = 1e9 / AGE; // the first billion years are counted after the Big Bang, the rest before today

/* ---------- data ---------- */
const PH = typeof PHOTOS !== "undefined" ? PHOTOS : {};
const PALEO = typeof PALEO_AT !== "undefined" ? PALEO_AT : {};
const EV = EVENTS.map((e) => ({ ...e, u: uOf(e) })).sort((a, b) => a.u - b.u);
const ER = ERAS.map((e) => ({ ...e, a: e.fromSec != null ? uSec(e.fromSec) : uAgo(e.from), b: e.toSec != null ? uSec(e.toSec) : uAgo(e.to) })).filter((e) => e.b > e.a);
const KIND = {
  cosmos: { n: "Космос", c: "#9b8cff", i: '<path d="M12 2l2.2 6.6L21 9l-5.5 4 2 7-5.5-4.2L6.5 20l2-7L3 9l6.8-.4z" fill="currentColor"/>' },
  earth: { n: "Земята", c: "#4fb0ff", i: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M5 9c3 1 4-2 7-1s2 4 5 3M7 17c2-2 5-1 6-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' },
  life: { n: "Живот", c: "#5fd37a", i: '<path d="M5 19C5 10 11 5 20 4c-1 9-6 15-15 15z" fill="currentColor"/><path d="M5 19l8-8" stroke="#0a0e2c" stroke-width="2" stroke-linecap="round"/>' },
  dino: { n: "Динозаври", c: "#ff8a4a", i: '<path d="M3 18c3 0 4-5 8-5 2 0 3-4 6-6 1-1 4-1 4 1 0 1-2 1-2 2v4c0 3-3 5-7 5H8l-1 2H5l1-2c-2 0-3-1-3-1z" fill="currentColor"/>' },
  faith: { n: "Вяра", c: "#e7a6ff", i: '<path d="M12 2c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z" fill="currentColor"/><rect x="8" y="17" width="8" height="5" rx="1.5" fill="currentColor"/>' },
  human: { n: "Хора", c: "#ffd25a", i: '<circle cx="12" cy="6" r="3.2" fill="currentColor"/><path d="M6 21c0-6 2.5-9 6-9s6 3 6 9z" fill="currentColor"/>' },
};
const icon = (k) => `<svg viewBox="0 0 24 24" width="1em" height="1em" style="color:${KIND[k].c}">${KIND[k].i}</svg>`;

/* ---------- words for time ---------- */
const num = (v, d = 0) => v.toLocaleString("bg-BG", { minimumFractionDigits: 0, maximumFractionDigits: d }).replace(/ /g, " ");
const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
function agoParts(ago) {
  if (ago < 1.5) return { big: "днес", unit: "", rel: "" };
  if (ago >= .9995e9) { const v = ago / 1e9; return { big: num(v, v < 10 ? 2 : 1), unit: Math.round(v * 100) === 100 ? "милиард години" : "милиарда години", rel: "преди днес" }; }
  if (ago >= 1e6) { const v = ago / 1e6; return { big: num(v, v < 10 ? 1 : 0), unit: Math.round(v) === 1 && v < 1.05 ? "милион години" : "милиона години", rel: "преди днес" }; }
  if (ago >= 1e4) { const p = 10 ** (Math.floor(Math.log10(ago)) - 1); return { big: num(Math.round(ago / p) * p), unit: "години", rel: "преди днес" }; }
  if (ago >= 1000) return { big: num(Math.round(ago / 100) * 100), unit: "години", rel: "преди днес" };
  const yr = new Date().getFullYear() - Math.round(ago);
  return { big: num(Math.round(ago)), unit: Math.round(ago) === 1 ? "година" : "години", rel: `преди днес · ${yr} година` };
}
function secParts(sec) {
  if (sec < 1e-3) { const e = Math.floor(Math.log10(sec)); return { big: "10" + String(e).split("").map((c) => SUP[c]).join(""), unit: "от секундата", rel: "след големия взрив" }; }
  if (sec < 60) return { big: num(sec, sec < 1 ? 3 : 0), unit: "секунди", rel: "след големия взрив" };
  if (sec < 3600) return { big: num(sec / 60), unit: "минути", rel: "след големия взрив" };
  if (sec < 86400) return { big: num(sec / 3600), unit: "часа", rel: "след големия взрив" };
  if (sec < YEAR) return { big: num(sec / 86400), unit: "дни", rel: "след големия взрив" };
  const y = sec / YEAR;
  if (y < 1e6) { const p = y < 10 ? 1 : 10 ** (Math.floor(Math.log10(y)) - 1); return { big: num(Math.round(y / p) * p), unit: "години", rel: "след големия взрив" }; }
  return { big: num(y / 1e6, y < 1e7 ? 1 : 0), unit: "милиона години", rel: "след големия взрив" };
}
// the big number always counts forward from the Big Bang; "how long ago" is the small line under it
function sinceParts(years) { const v = years / 1e9; return { big: num(v, v >= 13.795 ? 1 : 2), unit: Math.round(v * 100) === 100 ? "милиард години" : "милиарда години", rel: "след големия взрив" }; }
const timeParts = (u) => { const t = timeAt(u); return u < EARLY ? secParts(Math.max(t.sec, 1e-43)) : sinceParts(AGE * u); };
function agoLine(u) { const a = agoParts(timeAt(u).ago); return a.big === "днес" ? "днес" : `преди ${a.big} ${a.unit}${a.rel.includes("·") ? " · " + a.rel.split("· ")[1] : ""}`; }
// "от 145 до 66 милиона години преди днес" — for the teacher
function spanWords(e) {
  if (e.fromSec != null && e.toSec != null) { const a = secParts(e.fromSec), b = secParts(e.toSec); return `от ${a.big} ${a.unit} до ${b.big} ${b.unit} след големия взрив`.replace(/10[⁻⁰-⁹]+ от секундата/g, "миг"); }
  const a = agoParts(e.from), b = agoParts(e.to);
  if (b.big === "днес") return `от ${a.big} ${a.unit} назад до днес`;
  return a.unit === b.unit ? `от ${a.big} до ${b.big} ${b.unit} преди днес` : `от ${a.big} ${a.unit} до ${b.big} ${b.unit} преди днес`;
}

/* ---------- scenes ---------- */
const cv = $("scene"), ctx = cv.getContext("2d");
const T = (sec) => uSec(sec), A = (ago) => uAgo(ago);
// each event names its scene; a scene lasts from its first event until the next event with another scene
const SCENE_NAME = { "young-earth": "youngEarth" };
const RANGES = [];
EV.forEach((e) => {
  const name = SCENE_NAME[e.scene] || e.scene, last = RANGES[RANGES.length - 1];
  if (last && last.name === name) return;
  if (last) last.b = e.u;
  RANGES.push({ name, a: RANGES.length ? e.u : 0, b: 1 });
});
if (RANGES.length) { RANGES[0].first = true; RANGES[RANGES.length - 1].last = true; }
// in the first moments time is counted in powers of ten, so scene progress follows log(u) there
RANGES.forEach((r) => { if (r.b < EARLY) { r.la = Math.log10(Math.max(r.a, EV[0].u, U_MIN)); r.lb = Math.log10(r.b); } });
// crossfades never reach past the neighbouring scenes: on the log slider some scenes are very short
RANGES.forEach((r, i) => {
  const before = [...EV].reverse().find((e) => e.u < r.a - 1e-12); // the last event that still shows the previous scene
  r.f = Math.min(.006, (r.b - r.a) * .5, i && before ? (r.a - before.u) * .5 : 1);
});
RANGES.forEach((r, i) => { r.fo = RANGES[i + 1] ? RANGES[i + 1].f : r.f; }); // fade out exactly as the next one fades in
Scenes.setRanges(RANGES);
let dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  buildTimeline(); vbDirty = true;
}
let vbDirty = true;
function freeRect() {
  const W = innerWidth, H = innerHeight, tl = $("tl").offsetHeight;
  if (W <= 760) { const ch = $("card").offsetHeight; return { x: 0, y: 100, w: W, h: Math.max(140, H - tl - ch - 106) }; }
  const cw = $("card").offsetWidth + 32;
  return { x: 0, y: 60, w: Math.max(240, W - cw), h: Math.max(220, H - tl - 70) };
}

/* ---------- state ---------- */
const state = { u: 0 };
let activeEv = null, tween = null;
const bus = new EventTarget();
const emit = (n, d) => bus.dispatchEvent(new CustomEvent(n, { detail: d }));
const userInput = () => emit("input", {});
// the event we went to stays active even when another event has exactly the same moment
let pinned = null;
function activeAt(u) {
  if (pinned && pinned.u === u) return pinned;
  let e = null; for (const q of EV) { if (q.u <= u) e = q; else break; }
  return e;
}
const eraAt = (u, level) => ER.filter((e) => e.level === level && u >= e.a && u < e.b).pop() || null;
const deepestEra = (u) => eraAt(u, 4) || eraAt(u, 3) || eraAt(u, 2) || eraAt(u, 1) || eraAt(u, 0);
function setU(u) {
  state.u = clamp(u, 0, 1);
  const act = activeAt(state.u);
  if (act !== activeEv) { activeEv = act; renderCard(); emit("focus", { item: act && lessonItem(act) }); }
  updateHUD(); follow(); placeKnob();
}
function goTo(u, ms = 900, done) {
  if (tween && tween.done) tween.done();
  const from = state.u, a = Math.max(from, U_MIN), b = Math.max(u, U_MIN);
  // among the first moments the move is made in powers of ten; later it is plain linear time
  const geo = Math.max(a, b) < EARLY && Math.max(a, b) / Math.min(a, b) > 10;
  tween = { from, to: u, la: Math.log10(a), lb: Math.log10(b), geo, t0: performance.now(), ms, done };
}
const tweenAt = (tw, k) => (k >= 1 ? tw.to : tw.geo ? 10 ** lerp(tw.la, tw.lb, k) : lerp(tw.from, tw.to, k));
const msFor = (du) => clamp(700 + Math.sqrt(Math.abs(du)) * 9000, 800, 3600);
function goToEvent(e, ms) { pinned = e; goTo(e.u, ms != null ? ms : msFor(e.u - state.u)); }

/* ---------- HUD ---------- */
// while time is moving the number shows every digit and spins like a counter, with the speed under it
let speed = 0, lastAgo = null, lastNow = 0;
function speedWords(v) {
  if (v >= 1e9) return `${num(v / 1e9, 1)} милиарда години в секунда`;
  if (v >= 1e6) return `${num(v / 1e6, v < 1e7 ? 1 : 0)} милиона години в секунда`;
  if (v >= 1e3) return `${num(Math.round(v / 100) * 100)} години в секунда`;
  return `${num(Math.max(1, Math.round(v)))} години в секунда`;
}
// the same moment written out with every digit, so the size of the number is visible
function fullWords(u) {
  const t = timeAt(u);
  if (u >= EARLY) return `${num(Math.round(AGE * u))} години`;
  const sec = Math.max(t.sec, 1e-43);
  if (sec < 1) { const e = -Math.floor(Math.log10(sec)); return `0,${"0".repeat(Math.max(0, e - 1))}1 от секундата`; }
  if (sec < YEAR) return `${num(Math.round(sec))} секунди`;
  return `${num(Math.round(sec / YEAR))} години`;
}
function updateHUD() {
  const moving = !!tween || dragging, p = timeParts(state.u), full = fullWords(state.u);
  // the speed floats in its own overlay at the top centre, so the date never jumps around
  const sp = $("speed"), fast = moving && speed > 50;
  sp.classList.toggle("show", fast);
  if (fast) sp.lastChild.textContent = speedWords(speed);
  $("when").classList.toggle("moving", moving);
  $("when").innerHTML = `${full ? `<em class="full">${esc(full)}</em>` : ""}<b>${esc(p.big)}</b>${p.unit ? `<span>${esc(p.unit)}</span>` : ""}<small>${esc(p.rel)} · <span class="ago">${esc(moving && state.u >= EARLY && timeAt(state.u).ago >= 1.5 ? `преди ${num(Math.round(timeAt(state.u).ago))} години` : agoLine(state.u))}</span></small>`;
  const chips = [eraAt(state.u, 1), eraAt(state.u, 2), eraAt(state.u, 4) || eraAt(state.u, 3)].filter(Boolean);
  $("eras").innerHTML = chips.map((e) => `<span><i style="background:${e.c}"></i>${esc(e.n)}</span>`).join("");
}

/* ---------- card ---------- */
const card = $("card");
const atIndex = () => (activeEv && activeEv.u === state.u ? EV.indexOf(activeEv) : -1);
const nextAfter = (u) => { const i = atIndex(); return EV.find((e, k) => e.u > u || (i >= 0 && k > i && e.u === u)); };
const prevBefore = (u) => { const i = atIndex(); for (let k = EV.length - 1; k >= 0; k--) { const e = EV[k]; if (e.u < u || (i >= 0 && k < i && e.u === u)) return e; } return null; };
let photoToken = 0;
function setPhoto(p, kind) {
  const ph = card.querySelector(".ph"), token = ++photoToken;
  ph.querySelector(".cr")?.remove();
  const put = (node) => {
    if (token !== photoToken) return;
    // the old picture goes away at once and the new one fades in on its own: two pictures never overlap
    ph.replaceChildren(node);
    if (p) ph.insertAdjacentHTML("beforeend", `<div class="cr">Снимка: <a href="${p.u}" target="_blank" rel="noopener">${esc(p.a)}</a>, ${esc(p.l)}</div>`);
  };
  if (p) { const im = new Image(); im.alt = ""; im.src = p.f; (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => put(im)); }
  else { const d = document.createElement("div"); d.className = "noimg"; d.innerHTML = icon(kind); put(d); }
}
function renderCard() {
  const body = card.querySelector(".body"), e = activeEv;
  card.classList.remove("open");
  if (e) {
    setPhoto(PH[e.id], e.kind);
    body.innerHTML = `<div class="meta"><span class="chip w">${esc(e.when)}</span><span class="chip">${icon(e.kind)}${KIND[e.kind].n}</span></div><h2>${esc(e.t)}</h2><p>${esc(e.d)}</p>`;
  } else {
    const era = deepestEra(state.u), nx = nextAfter(state.u);
    setPhoto(null, "cosmos");
    body.innerHTML = era ? `<div class="meta"><span class="chip">Епоха</span></div><h2>${esc(era.n)}</h2><p>${esc(era.d)}</p>${nx ? `<div class="next">Следва: ${esc(nx.t)}</div>` : ""}` : `<h2>Пътешествие във времето</h2><p>Дърпай слайдъра или натисни „Напред“.</p>`;
  }
  body.scrollTop = 0;
  $("prev").disabled = !prevBefore(state.u); $("next").disabled = !nextAfter(state.u);
}

/* ---------- timeline with zoom ---------- */
const track = $("track"), knob = $("knob"), tip = $("tip");
const view = { a: 0, b: 1 };
const xOf = (u) => ((u - view.a) / (view.b - view.a)) * track.clientWidth;
const uOfX = (x) => clamp(view.a + (x / track.clientWidth) * (view.b - view.a), 0, 1);
// tick marks: a round step in years that gives about seven labels across the visible part
function tickLabel(ago) {
  if (ago <= 0) return "днес";
  if (ago >= 1e9) return num(ago / 1e9, 2) + " млрд.";
  if (ago >= 1e6) return num(ago / 1e6, 2) + " млн.";
  if (ago >= 1e4) return num(ago);
  return num(ago) + " г.";
}
function sinceLabel(y) { return y <= 0 ? "взрив" : y >= 1e9 ? num(y / 1e9, 2) + " млрд." : y >= 1e6 ? num(y / 1e6, 2) + " млн." : num(y) + " г."; }
function ticksInView() {
  const W = track.clientWidth, agoA = AGE * (1 - view.a), agoB = AGE * (1 - view.b), span = agoA - agoB, out = [];
  const raw = span / Math.max(3, Math.floor(W / 110)), p10 = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 5, 10].map((m) => m * p10).find((v) => v >= raw);
  if (span >= 5e8) { // zoomed out: years since the Big Bang, growing to the right like the counter
    const yA = AGE * view.a, yB = AGE * view.b;
    for (let y = Math.ceil(yA / step) * step; y <= yB + 1e-6; y += step) out.push({ u: y / AGE, l: y >= AGE - 1 ? "днес" : sinceLabel(y) });
    if (view.b === 1) out.unshift({ u: 1, l: "днес" }); // listed first so it wins over a crowded neighbour
    return out;
  }
  // zoomed into recent times: the years since the Big Bang all look alike, so count back from today
  for (let ago = Math.floor(agoA / step) * step; ago >= agoB - 1e-6; ago -= step) if (ago <= AGE - 1) out.push({ u: uAgo(ago), l: ago <= 0 ? "днес" : "преди " + tickLabel(ago) });
  return out;
}
function buildTimeline() {
  const W = track.clientWidth;
  const inView = (a, b) => b > view.a && a < view.b;
  // three rows: the big chapters, eons and cosmic eras, then periods (or eras where there are no periods)
  const row2 = ER.filter((e) => e.level >= 3 || (e.level === 2 && !ER.some((q) => q.level === 3 && q.a < e.b && q.b > e.a)));
  [[$("bands0"), ER.filter((e) => e.level === 0)], [$("bands1"), ER.filter((e) => e.level === 1)], [$("bands2"), row2]].forEach(([box, list]) => {
    box.innerHTML = "";
    list.filter((e) => inView(e.a, e.b)).forEach((e) => {
      const x0 = Math.max(0, xOf(e.a)), x1 = Math.min(W, xOf(e.b));
      if (x1 - x0 < 1) return;
      const d = document.createElement("div");
      d.style.left = x0 + "px"; d.style.width = x1 - x0 + "px"; d.style.background = e.c; d.textContent = e.n; d.title = `${e.n} — щракни, за да приближиш`;
      d.addEventListener("pointerdown", (ev) => ev.stopPropagation());
      d.addEventListener("click", () => { userInput(); stopPlay(); zoomTo(e.a, e.b); const first = EV.find((q) => q.u >= e.a && q.u < e.b); if (first) goToEvent(first, 900); else goTo(e.a, 900); });
      box.appendChild(d);
    });
    requestAnimationFrame(() => [...box.children].forEach((d) => { d.style.color = d.scrollWidth > d.clientWidth + 1 ? "transparent" : ""; }));
  });
  const ticks = $("ticks"); ticks.innerHTML = "";
  const placed = [];
  ticksInView().forEach((t) => { if (t.u < view.a || t.u > view.b) return; const x = xOf(t.u); if (placed.some((p) => Math.abs(p - x) < 60)) return; placed.push(x); const s = document.createElement("span"); s.textContent = t.l; s.style.left = x + "px"; ticks.appendChild(s); });
  const dots = $("dots"); dots.innerHTML = "";
  EV.forEach((e) => { if (e.u < view.a || e.u > view.b) return; const d = document.createElement("div"); d.className = "dot"; d.dataset.id = e.id; d.style.left = xOf(e.u) + "px"; d.style.background = KIND[e.kind].c; d.title = `${e.when} — ${e.t}`; dots.appendChild(d); });
  const zoomed = view.b - view.a < .999;
  $("zoomNote").textContent = zoomed ? `увеличено ${num(1 / (view.b - view.a), 0)} пъти` : ""; $("zoomNote").classList.toggle("show", zoomed);
  placeKnob();
}
function placeKnob() {
  const x = xOf(state.u); knob.style.left = x + "px"; knob.classList.toggle("out", x < -2 || x > track.clientWidth + 2);
  [...$("dots").children].forEach((d) => d.classList.toggle("on", activeEv && d.dataset.id === activeEv.id));
}
function setView(a, b) {
  const w = clamp(b - a, 1e-11, 1); let c = (a + b) / 2; // deep enough to see single years
  c = clamp(c, w / 2, 1 - w / 2); view.a = c - w / 2; view.b = c + w / 2; buildTimeline();
}
function zoomAt(u, k) { const a = u - (u - view.a) * k, b = u + (view.b - u) * k; setView(a, b); }
const zoomTo = (a, b) => { const pad = (b - a) * .08; setView(a - pad, b + pad); };
function follow() { if (state.u < view.a || state.u > view.b) { const w = view.b - view.a; setView(state.u - w * .3, state.u + w * .7); } }
let dragging = false;
const uFromEvent = (e) => uOfX(e.clientX - track.getBoundingClientRect().left);
// two fingers on the timeline pinch-zoom it
const fingers = new Map(); let pinch = null;
const pinchState = () => { const [a, b] = [...fingers.values()], r = track.getBoundingClientRect(); return { d: Math.abs(a.x - b.x) || 1, mid: uOfX((a.x + b.x) / 2 - r.left) }; };
track.addEventListener("pointerdown", (e) => { fingers.set(e.pointerId, { x: e.clientX }); if (fingers.size === 2) { dragging = false; pinch = { ...pinchState(), a: view.a, b: view.b }; } }, true);
track.addEventListener("pointermove", (e) => {
  if (!fingers.has(e.pointerId)) return; fingers.get(e.pointerId).x = e.clientX;
  if (pinch && fingers.size === 2) { const now = pinchState(), k = pinch.d / now.d; setView(pinch.mid - (pinch.mid - pinch.a) * k, pinch.mid + (pinch.b - pinch.mid) * k); e.stopImmediatePropagation(); }
}, true);
const lift = (e) => { fingers.delete(e.pointerId); if (fingers.size < 2) pinch = null; };
track.addEventListener("pointerup", lift, true); track.addEventListener("pointercancel", lift, true);
track.addEventListener("pointerdown", (e) => {
  if (pinch) return;
  userInput(); stopPlay(); tween = null;
  const dot = e.target.closest(".dot");
  if (dot) { goToEvent(EV.find((q) => q.id === dot.dataset.id)); return; }
  pinned = null; dragging = true; track.setPointerCapture(e.pointerId); setU(uFromEvent(e)); showTip();
});
track.addEventListener("pointermove", (e) => {
  if (pinch) return;
  if (dragging) { setU(uFromEvent(e)); showTip(); return; }
  if (e.pointerType === "mouse") { const u = uFromEvent(e), near = nearestDot(u, 7), p = timeParts(u); tip.textContent = near ? `${near.when} — ${near.t}` : `${p.big} ${p.unit}`.trim(); tip.style.left = e.clientX - track.getBoundingClientRect().left + "px"; tip.classList.add("show"); }
});
const endDrag = () => { if (!dragging) return; dragging = false; tip.classList.remove("show"); const n = nearestDot(state.u, 12); if (n) goToEvent(n, 300); };
track.addEventListener("pointerup", endDrag); track.addEventListener("pointercancel", endDrag);
track.addEventListener("pointerleave", () => { if (!dragging) tip.classList.remove("show"); });
function nearestDot(u, px) { const k = track.clientWidth / (view.b - view.a); let best = null; EV.forEach((e) => { const d = Math.abs(e.u - u) * k; if (d < px && (!best || d < best.d)) best = { e, d }; }); return best && best.e; }
function showTip() { const p = timeParts(state.u); tip.textContent = `${p.big} ${p.unit}`.trim(); tip.style.left = xOf(state.u) + "px"; tip.classList.add("show"); }
// wheel over the timeline zooms around the pointer; sideways (or with Shift) it pans
track.addEventListener("wheel", (e) => {
  e.preventDefault();
  const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
  if (sideways) { const d = (e.deltaX || e.deltaY) / track.clientWidth * (view.b - view.a); setView(view.a + d, view.b + d); }
  else zoomAt(uFromEvent(e), Math.exp(e.deltaY * (e.ctrlKey ? .01 : .0025)));
}, { passive: false });
$("zIn").addEventListener("click", () => zoomAt(state.u, .5));
$("zOut").addEventListener("click", () => zoomAt(state.u, 2));
$("zFit").addEventListener("click", () => setView(0, 1));

/* ---------- play, steps, keys ---------- */
let playing = false, playTimer = null;
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.5" height="15" rx="1.2"/><rect x="13.5" y="4.5" width="4.5" height="15" rx="1.2"/></svg>';
function stopPlay() { playing = false; clearTimeout(playTimer); $("play").innerHTML = PLAY; $("play").setAttribute("aria-label", "Пусни"); }
function playStep() {
  if (!playing) return;
  const nx = nextAfter(state.u); if (!nx) { stopPlay(); return; }
  const ms = msFor(nx.u - state.u); goToEvent(nx, ms);
  playTimer = setTimeout(() => { playTimer = setTimeout(playStep, clamp(2600 + nx.d.length * 28, 4500, 9000)); }, ms);
}
$("play").addEventListener("click", () => { userInput(); if (playing) { stopPlay(); return; } if (state.u >= .999) setU(0); playing = true; $("play").innerHTML = PAUSE; $("play").setAttribute("aria-label", "Пауза"); playStep(); });
const stepNext = () => { userInput(); stopPlay(); const n = nextAfter(state.u); if (n) goToEvent(n); };
const stepPrev = () => { userInput(); stopPlay(); const p = prevBefore(state.u); if (p) goToEvent(p); };
$("next").addEventListener("click", stepNext); $("sNext").addEventListener("click", stepNext);
$("prev").addEventListener("click", stepPrev); $("sPrev").addEventListener("click", stepPrev);
$("more").addEventListener("click", () => { card.classList.toggle("open"); $("more").textContent = card.classList.contains("open") ? "По-малко" : "Още"; });
addEventListener("keydown", (e) => {
  const intro = $("intro");
  if (intro && !intro.classList.contains("leave")) { if (e.key === "Enter" || e.key === " ") start(); return; }
  if (e.key === "ArrowRight") { stepNext(); e.preventDefault(); }
  else if (e.key === "ArrowLeft") { stepPrev(); e.preventDefault(); }
  else if (e.key === " ") { $("play").click(); e.preventDefault(); }
  else if (e.key === "+" || e.key === "=") zoomAt(state.u, .5);
  else if (e.key === "-") zoomAt(state.u, 2);
  else if (e.key === "0") setView(0, 1);
});
// the wheel over the picture walks from one event to the next
let wheelAt = 0, wheelSum = 0;
cv.addEventListener("wheel", (e) => {
  e.preventDefault(); wheelSum += e.deltaY + e.deltaX;
  const now = performance.now();
  if (Math.abs(wheelSum) < 40 || now - wheelAt < 450) return;
  wheelAt = now; (wheelSum > 0 ? stepNext : stepPrev)(); wheelSum = 0;
}, { passive: false });

/* ---------- frame loop ---------- */
function tick(now) {
  const ago = timeAt(state.u).ago;
  if (lastAgo != null && now > lastNow) { const v = Math.abs(ago - lastAgo) / ((now - lastNow) / 1000); speed = speed * .8 + v * .2; }
  lastAgo = ago; lastNow = now;
  if (!tween && !dragging && speed > 0) { speed = 0; updateHUD(); }
  if (tween) {
    const t = clamp((now - tween.t0) / tween.ms, 0, 1);
    setU(tweenAt(tween, ease(t)));
    if (t >= 1) { const d = tween.done; tween = null; setU(state.u); if (d) d(); }
  }
  const W = innerWidth, H = innerHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const stage = freeRect(), t = timeAt(state.u);
  const focusAt = activeEv ? PALEO[activeEv.id] || activeEv.at || null : null;
  Scenes.draw(ctx, W, H, { u: state.u, sec: t.sec, ago: t.ago, t: now / 1000, stage, focusAt, legendY: stage.y + stage.h - 24 }, { globe: Globe.draw });
  requestAnimationFrame(tick);
}

/* ---------- intro ---------- */
function start() { $("intro").classList.add("leave"); setTimeout(() => $("intro")?.remove(), 700); }
$("go").addEventListener("click", start);
(function introStars() {
  const c = $("introStars"); c.width = innerWidth; c.height = innerHeight; const x = c.getContext("2d");
  Scenes.starfield(x, c.width, c.height, 0, 1);
})();

/* ---------- lesson host for narrator.js ----------
   items()  → every event in time order: { id, pos, when, title, text, kind, kindName, photo, era: { name, text, span } }
   current() → { item, pos, era }       goTo(id) → Promise, resolves when the move is done
   stage() / dock() → screen rects       on("focus" | "input", cb) → unsubscribe */
function eraInfo(u) { const e = deepestEra(u); return e ? { name: e.n, text: e.d, span: spanWords(e) } : { name: "", text: "", span: "" }; }
function lessonItem(e) {
  const p = PH[e.id];
  return { id: e.id, pos: e.u, when: e.when, title: e.t, text: e.d, kind: e.kind, kindName: KIND[e.kind].n,
    photo: p ? { src: p.f, author: p.a, license: p.l, url: p.u } : null, era: eraInfo(e.u) };
}
const LESSON = EV.map(lessonItem);
window.LESSON_HOST = {
  version: 2,
  items: () => LESSON.slice(),
  current: () => ({ item: activeEv && lessonItem(activeEv), pos: state.u, era: eraInfo(state.u) }),
  goTo: (id) => new Promise((resolve) => {
    const e = EV.find((q) => q.id === id); if (!e) { resolve(); return; }
    stopPlay();
    if (e.u === state.u) { pinned = e; setU(e.u); setTimeout(resolve, 150); return; }
    pinned = e; goTo(e.u, msFor(e.u - state.u), () => setTimeout(resolve, 300));
  }),
  stage: () => freeRect(),
  dock: () => $("dock").getBoundingClientRect(),
  on: (name, cb) => { const h = (ev) => cb(ev.detail); bus.addEventListener(name, h); return () => bus.removeEventListener(name, h); },
  setU: (u) => { stopPlay(); setU(u); },
  uOf: (x) => uOf(x),
};

addEventListener("resize", resize);
resize();
pinned = EV[0]; setU(EV[0].u); renderCard(); // start on the first event: the Big Bang
requestAnimationFrame(tick);
dispatchEvent(new Event("lesson:ready"));
})();
