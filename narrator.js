/* AI учител: разказва таймлайна като урок с гласа на браузъра (Web Speech API).
   Говори с играта само през window.LESSON_HOST (или window.BGTT в играта за България):
   items, current, goTo, stage, dock, on. Затова може да се махне, без играта да разбере.
   Всичко свое — кълбо, балонче, снимка, стилове — създава сам.
   Един запис: { id, title, text, photo, era: { name, text, span? | from, to }, when? | year, pos? }. */
(() => {
"use strict";

const start = (app) => {
  if (!app || !(app.version >= 1)) return;

  /* ---------- styles ---------- */
  const css = `
.nar-orb{position:fixed;z-index:15;width:var(--nar-size,68px);height:var(--nar-size,68px);margin:0;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;touch-action:none;transition:opacity .35s,filter .35s,transform .25s;-webkit-tap-highlight-color:transparent}
.nar-orb:focus-visible{outline:3px solid #7a1e12;outline-offset:4px}
.nar-orb .core{position:absolute;inset:0;border-radius:50%;transition:transform .55s cubic-bezier(.3,1.35,.5,1)}
.nar-orb .glow,.nar-orb .swirl,.nar-orb .blobs{position:absolute;border-radius:50%;animation:narSpin 7s linear infinite;animation-play-state:paused}
.nar-orb .glow{inset:-5px;background:conic-gradient(from 20deg,#5b8cff,#9b5cff,#ff5ea8,#ffae4d,#3fd3c4,#5b8cff);filter:blur(10px);opacity:.55}
.nar-orb .swirl{inset:2px;background:conic-gradient(from 200deg,#4f7dff,#9b5cff,#ff5ea8,#ffae4d,#3fd3c4,#4f7dff)}
.nar-orb .blobs{inset:2px;animation-direction:reverse;animation-duration:5s;mix-blend-mode:screen;background:radial-gradient(circle at 30% 28%,rgba(255,255,255,.75),transparent 34%),radial-gradient(circle at 72% 70%,rgba(120,240,255,.7),transparent 38%),radial-gradient(circle at 75% 25%,rgba(255,120,200,.55),transparent 30%)}
.nar-orb .glass{position:absolute;inset:9px;border-radius:50%;background:radial-gradient(circle at 38% 30%,rgba(255,255,255,.42),rgba(255,255,255,.06) 55%,rgba(30,10,60,.28));box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55),inset 0 -6px 14px rgba(40,10,80,.35)}
.nar-orb > svg{position:absolute;left:50%;top:50%;width:46%;height:46%;transform:translate(-50%,-50%);color:#fff;filter:drop-shadow(0 1px 2px rgba(40,10,80,.45));transition:opacity .25s,transform .25s}
.nar-orb .i-play,.nar-orb .i-pause{opacity:0;transform:translate(-50%,-50%) scale(.6)}
.nar-orb[data-state=dormant]{opacity:.55;filter:saturate(.1) brightness(1.06)}
.nar-orb[data-state=dormant]:hover,.nar-orb[data-state=dormant]:focus-visible{opacity:.95;filter:saturate(.55)}
.nar-orb[data-state=dormant]:hover .i-person,.nar-orb[data-state=dormant]:focus-visible .i-person,.nar-orb[data-state=paused]:hover .i-person{opacity:0;transform:translate(-50%,-50%) scale(.6)}
.nar-orb[data-state=dormant]:hover .i-play,.nar-orb[data-state=dormant]:focus-visible .i-play,.nar-orb[data-state=paused]:hover .i-play{opacity:1;transform:translate(-50%,-50%) scale(1)}
.nar-orb[data-state=playing]:hover .i-person{opacity:0;transform:translate(-50%,-50%) scale(.6)}
.nar-orb[data-state=playing]:hover .i-pause{opacity:1;transform:translate(-50%,-50%) scale(1)}
.nar-orb[data-state=asking] .glow,.nar-orb[data-state=asking] .swirl,.nar-orb[data-state=asking] .blobs,.nar-orb[data-state=playing] .glow,.nar-orb[data-state=playing] .swirl,.nar-orb[data-state=playing] .blobs{animation-play-state:running}
.nar-orb[data-state=playing] .glow,.nar-orb[data-state=playing] .swirl{animation-duration:2.6s}
.nar-orb[data-state=playing] .glow{opacity:.85}
.nar-orb[data-state=paused]{filter:saturate(.75)}
.nar-orb.beat .glow{opacity:1}
.nar-orb.drag{cursor:grabbing;transform:scale(1.08)}
@keyframes narSpin{to{transform:rotate(360deg)}}
/* active: the orb lies down as a spinning disk, light rises from it and the monster stands on top */
.nar-orb:not([data-state=dormant]) .core{transform:translateY(20px) scale(1.5,.54)}
.nar-orb:not([data-state=dormant]) > svg{opacity:0!important}
.nar-orb:not([data-state=dormant]) .glow{inset:-9px;filter:blur(12px)}
.nar-orb .beam{position:absolute;left:50%;bottom:14px;width:93px;height:104px;margin-left:-46.5px;background:linear-gradient(to top,rgba(150,180,255,.8),rgba(255,130,210,.32) 45%,rgba(120,240,255,0));clip-path:polygon(10% 100%,90% 100%,100% 0,0 0);filter:blur(5px);mix-blend-mode:screen;opacity:0;transform:scaleY(.15);transform-origin:50% 100%;transition:opacity .5s,transform .6s;pointer-events:none}
.nar-orb:not([data-state=dormant]) .beam{opacity:.85;transform:none;animation:narBeam 2.4s ease-in-out infinite}
.nar-orb[data-state=paused] .beam{opacity:.35;animation:none}
.nar-orb .mon{position:absolute;left:50%;bottom:18px;width:82px;height:95px;margin-left:-41px;opacity:0;transform:translateY(26px) scale(.4);transform-origin:50% 100%;transition:opacity .4s,transform .65s cubic-bezier(.3,1.5,.5,1);pointer-events:none}
.nar-orb .mon svg{display:block;width:100%;height:100%;filter:drop-shadow(0 5px 7px rgba(120,150,255,.6))}
.nar-orb .mon::after{content:"";position:absolute;inset:35% -12% -8%;background:radial-gradient(ellipse at 50% 100%,rgba(140,200,255,.65),rgba(255,120,210,.22) 45%,transparent 70%);mix-blend-mode:screen;pointer-events:none}
.nar-orb:not([data-state=dormant]) .mon{opacity:1;transform:none}
.nar-orb[data-state=asking] .mon svg,.nar-orb[data-state=playing] .mon svg{animation:narBob 2.2s ease-in-out infinite}
.nar-orb .mouth{transform-box:fill-box;transform-origin:50% 8%}
.nar-orb.talk .mouth{animation:narTalk .18s ease-in-out infinite alternate}
@keyframes narTalk{from{transform:scaleY(.2)}to{transform:scaleY(1)}}
@keyframes narBob{50%{transform:translateY(-3px)}}
@keyframes narBeam{50%{opacity:.6}}
.nar-bubble{position:fixed;z-index:16;width:min(350px,calc(100vw - 32px));padding:14px 16px 12px;border-radius:18px;background:#fbf4e2;color:#3f2a14;border:1px solid #d8c39a;box-shadow:0 12px 34px rgba(60,40,15,.28),0 2px 6px rgba(60,40,15,.15);font:600 16px/1.45 Nunito,system-ui,sans-serif;animation:narIn .25s ease-out}
.nar-bubble[hidden]{display:none}
.nar-bubble .who{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-weight:900;font-size:13px;letter-spacing:.04em;color:#7a1e12;text-transform:uppercase}
.nar-bubble .who i{width:9px;height:9px;border-radius:50%;background:conic-gradient(#5b8cff,#9b5cff,#ff5ea8,#ffae4d,#3fd3c4,#5b8cff)}
.nar-bubble .who button{margin-left:auto;border:0;background:#efe0bc;color:#5b3d17;width:28px;height:28px;border-radius:50%;font:900 16px/1 Nunito,sans-serif;cursor:pointer}
.nar-bubble .say{margin:0;font-size:17px;min-height:1.45em}
.nar-bubble .say.dim{opacity:.55}
.nar-bubble .note{margin:8px 0 0;font-size:13.5px;color:#8a7352}
.nar-bubble .acts{display:flex;gap:8px;margin-top:12px}
.nar-bubble .acts button{flex:1;border:0;border-radius:12px;padding:10px 12px;font:900 15px Nunito,sans-serif;cursor:pointer;background:#efe0bc;color:#5b3d17}
.nar-bubble .acts button.yes{background:#c8402f;color:#fff}
.nar-bubble .acts button:focus-visible,.nar-bubble .who button:focus-visible{outline:3px solid #7a1e12;outline-offset:2px}
.nar-bubble .keys{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:10px;padding-top:8px;border-top:1px dashed #d8c39a;font-size:12.5px;color:#8a7352;font-weight:700}
.nar-bubble kbd{display:inline-block;min-width:22px;padding:1px 6px;border-radius:6px;border:1px solid #d1bb8f;border-bottom-width:2px;background:#fff8e8;font:800 12px Nunito,sans-serif;text-align:center;color:#5b3d17}
.nar-photo{position:fixed;z-index:14;margin:0;padding:10px 10px 8px;background:#fffdf6;border-radius:6px;box-shadow:0 18px 50px rgba(40,25,10,.4),0 3px 8px rgba(40,25,10,.25);opacity:0;transform:translateY(18px) rotate(-3deg) scale(.92);transition:opacity .45s ease,transform .55s cubic-bezier(.2,1.2,.4,1);pointer-events:none}
.nar-photo.show{opacity:1;transform:rotate(-1.2deg)}
.nar-photo img{display:block;max-width:100%;max-height:calc(var(--nar-ph,60vh) - 44px);border-radius:2px;margin:0 auto}
.nar-photo figcaption{margin-top:6px;font:400 17px/1.2 Kurale,Georgia,serif;color:#3f230f;text-align:center}
.nar-photo figcaption small{display:block;margin-top:2px;font:600 10.5px Nunito,sans-serif;color:#8a7352}
@keyframes narIn{from{opacity:0;transform:translateY(8px)}}
@media (max-width:760px){.nar-orb{--nar-size:58px}.nar-orb:not([data-state=dormant]) .core{transform:translateY(17px) scale(1.5,.54)}.nar-orb .mon{width:70px;height:81px;margin-left:-35px;bottom:15px}.nar-orb .beam{width:78px;height:88px;margin-left:-39px;bottom:12px}.nar-bubble{font-size:15px}.nar-bubble .say{font-size:15.5px}.nar-bubble .keys{display:none}}
@media (prefers-reduced-motion:reduce){.nar-orb .glow,.nar-orb .swirl,.nar-orb .blobs,.nar-orb .beam,.nar-orb .mon svg{animation:none!important}.nar-photo{transition:opacity .3s}}
`;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  /* ---------- DOM ---------- */
  const orb = document.createElement("button");
  orb.type = "button"; orb.className = "nar-orb"; orb.dataset.state = "dormant";
  orb.setAttribute("aria-label", "Учител: разкажи ми урока");
  orb.innerHTML = `<span class="core"><span class="glow"></span><span class="swirl"></span><span class="blobs"></span><span class="glass"></span></span><span class="beam"></span><span class="mon"></span>
<svg class="i-person" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7.4" r="4"/><path d="M4 21.5c0-4.6 3.6-7.6 8-7.6s8 3 8 7.6z"/></svg>
<svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 4.8v14.4L19.5 12z"/></svg>
<svg class="i-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.4" height="14" rx="1.3"/><rect x="13.6" y="5" width="4.4" height="14" rx="1.3"/></svg>`;
  const bubble = document.createElement("div"); bubble.className = "nar-bubble"; bubble.hidden = true; bubble.setAttribute("role", "status"); bubble.setAttribute("aria-live", "polite");
  const photo = document.createElement("figure"); photo.className = "nar-photo"; photo.setAttribute("aria-hidden", "true");
  document.body.append(photo, orb, bubble);
  // the monster is inline SVG so its mouth can move; it is a separate file to keep this one readable
  fetch("teacher.svg").then((r) => (r.ok ? r.text() : "")).then((t) => { if (t) orb.querySelector(".mon").innerHTML = t; }).catch(() => {});

  /* ---------- voice ---------- */
  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  let voice = null;
  const pickVoice = () => {
    if (!synth) return;
    const vs = synth.getVoices().filter((v) => /^bg/i.test(v.lang));
    // best first: Edge's neural "Online (Natural)" voices, then Apple's enhanced ones, then any Bulgarian voice
    voice = vs.find((v) => /natural|neural/i.test(v.name)) || vs.find((v) => /premium|enhanced/i.test(v.name)) || vs.find((v) => v.localService) || vs[0] || null;
  };
  if (synth) { pickVoice(); synth.addEventListener?.("voiceschanged", pickVoice); }

  let speakToken = 0;
  function stopSpeech() { speakToken++; orb.classList.remove("talk"); if (synth) synth.cancel(); }
  // resolves true when the sentence was read to the end, false when it was interrupted
  function speak(text) {
    const tok = ++speakToken;
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => { if (done) return; done = true; clearTimeout(guard); if (tok === speakToken) orb.classList.remove("talk"); resolve(ok && tok === speakToken); };
      const guard = setTimeout(() => finish(true), 4000 + text.length * 110); // some engines never fire "end"
      if (!synth || !voice) { setTimeout(() => finish(true), Math.min(9000, Math.max(1600, text.length * 62))); return; }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice; u.lang = voice.lang; u.rate = .95; u.pitch = 1.04;
      u.onboundary = () => { orb.classList.add("beat"); setTimeout(() => orb.classList.remove("beat"), 110); };
      u.onstart = () => { if (tok === speakToken) orb.classList.add("talk"); };
      u.onend = () => finish(true);
      u.onerror = (e) => finish(!(e.error === "interrupted" || e.error === "canceled"));
      speak.keep = u; // Chrome drops the callbacks of utterances that get garbage-collected
      synth.speak(u);
    });
  }

  /* ---------- turning the data into a teacher's words ---------- */
  const ROMAN = { I: "Първи", II: "Втори", III: "Трети", IV: "Четвърти", V: "Пети" };
  const spoken = (s) => s
    .replace(/(\d+)\s*[–-]\s*(\d+)\s*г\./g, "$1 до $2 година")
    .replace(/(\d+)\s*г\./g, "$1 година")
    .replace(/(\p{Lu}\p{Ll}+)\s+(IV|V|III|II|I)(?![\p{L}])/gu, (m, w, r) => `${w} ${ROMAN[r]}`)
    .replace(/(?<![\p{L}])ЕС(?![\p{L}])/gu, "Европейския съюз")
    .replace(/\s+—\s+/g, ", ");
  const sentences = (s) => spoken(s).split(/(?<=[.!?…])\s+(?=[„"(\p{Lu}\d])/u).filter(Boolean);
  const yearWord = (y) => `${y} година`;
  function eraLines(era, opening) {
    if (!era.name) return [];
    const span = era.span || `от ${era.from} ${era.to ? `до ${era.to} година` : "година до днес"}`;
    const head = opening ? `Сега сме в епохата „${era.name}“, ${span}.` : `Започва нова епоха: „${era.name}“, ${span}.`;
    return [head, ...sentences(era.text)];
  }
  function yearLine(it, prev, opening) {
    if (it.when) { // a ready phrase such as "преди 66 милиона години" or "3 минути след взрива"
      if (opening || !prev) return `Започваме ${it.when}.`;
      return [`Минаваме нататък: ${it.when}.`, `Да видим какво става ${it.when}.`, `А сега: ${it.when}.`][items.indexOf(it) % 3];
    }
    if (opening || !prev) return `Започваме през ${yearWord(it.year)}.`;
    const gap = it.year - prev.year;
    if (gap === 0) return `Пак през ${yearWord(it.year)}.`;
    if (gap >= 100) return `Прескачаме цели ${gap} години напред, до ${yearWord(it.year)}.`;
    return [`Минаваме към ${yearWord(it.year)}.`, `Да видим какво става през ${yearWord(it.year)}.`, `През ${yearWord(it.year)}.`][it.year % 3];
  }
  // one lesson step = a list of sentences; the photo shows with the title and hides halfway through the text
  function script(i, opening) {
    const it = items[i], prev = items[i - 1], out = [];
    if (opening || !prev || prev.era.name !== it.era.name) eraLines(it.era, opening).forEach((say) => out.push({ say: spoken(say) }));
    out.push({ say: yearLine(it, prev, opening) });
    out.push({ say: spoken(it.title) + ".", photo: it.photo ? "show" : null });
    const body = sentences(it.text), cut = Math.max(1, Math.ceil(body.length / 2));
    body.forEach((say, k) => out.push({ say, photo: k === cut && it.photo ? "hide" : null }));
    return out;
  }

  /* ---------- photo the teacher holds up ---------- */
  function showPhoto(it) {
    const st = app.stage(), p = it.photo;
    photo.innerHTML = `<img alt="" src="${p.src}"><figcaption>${esc(it.title)}<small>Снимка: ${esc(p.author)}, ${esc(p.license)}</small></figcaption>`;
    const w = Math.min(st.w * .72, 560), h = Math.min(st.h * .86, 520);
    photo.style.setProperty("--nar-ph", h + "px");
    photo.style.maxWidth = w + "px";
    const img = photo.querySelector("img");
    const place = () => { const r = photo.getBoundingClientRect(); photo.style.left = Math.round(st.x + (st.w - r.width) / 2) + "px"; photo.style.top = Math.round(st.y + (st.h - r.height) / 2) + "px"; photo.classList.add("show"); };
    (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(() => requestAnimationFrame(place));
  }
  const hidePhoto = () => photo.classList.remove("show");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- lesson state ---------- */
  const items = app.items();
  let mode = "dormant", idx = 0, seg = 0, segs = [], run = 0, moved = false, lastSay = "";
  const indexOf = (id) => items.findIndex((x) => x.id === id);
  const posOf = (x) => (x.pos != null ? x.pos : x.year);
  function indexFromTimeline() {
    const cur = app.current();
    if (cur.item) return indexOf(cur.item.id);
    const n = items.findIndex((x) => posOf(x) > posOf(cur));
    return n < 0 ? items.length - 1 : n;
  }
  function setMode(m) { mode = m; orb.dataset.state = m; orb.setAttribute("aria-label", { dormant: "Учител: разкажи ми урока", asking: "Учител", playing: "Пауза", paused: "Продължи урока" }[m]); render(); }

  function ask() {
    idx = indexFromTimeline();
    const cur = app.current();
    let q;
    if (cur.item && idx === items.length - 1) { idx = 0; q = "Здравей! Аз съм твоят учител по история. Стигнали сме до днес. Да ти разкажа ли урока от самото начало?"; }
    else if (items[idx].when) q = `Здравей! Аз съм твоят учител. Да ти разкажа ли урока, като започнем от „${items[idx].title}“ — ${items[idx].when}?`;
    else if (cur.item) q = `Здравей! Аз съм твоят учител по история. Да ти разкажа ли урока от ${yearWord(items[idx].year)} — „${items[idx].title}“?`;
    else q = `Здравей! Аз съм твоят учител по история. Да ти разкажа ли урока от ${yearWord(cur.year)} нататък?`;
    lastSay = q; setMode("asking");
    requestAnimationFrame(() => bubble.querySelector(".yes")?.focus({ preventScroll: true }));
  }
  function begin(i, opening) {
    run++; const r = run; stopSpeech(); hidePhoto();
    idx = i; seg = 0; segs = script(i, opening); moved = false; setMode("playing");
    app.goTo(items[i].id).then(() => { if (r === run && mode === "playing") step(r); });
  }
  function step(r) {
    if (r !== run || mode !== "playing") return;
    if (seg >= segs.length) {
      hidePhoto();
      setTimeout(() => {
        if (r !== run || mode !== "playing") return;
        if (idx + 1 >= items.length) finish(); else begin(idx + 1, false);
      }, 900);
      return;
    }
    const s = segs[seg];
    if (s.photo === "show") showPhoto(items[idx]);
    if (s.photo === "hide") hidePhoto();
    lastSay = s.say; render();
    speak(s.say).then((ok) => { if (ok && r === run && mode === "playing") { seg++; step(r); } });
  }
  function pause() { if (mode !== "playing") return; run++; stopSpeech(); setMode("paused"); }
  function resume() {
    if (mode !== "paused") return;
    if (moved) { begin(indexFromTimeline(), true); return; } // the viewer moved the timeline: continue from there
    run++; setMode("playing"); step(run);
  }
  const next = () => { if (idx + 1 < items.length) begin(idx + 1, false); };
  const prev = () => { if (idx > 0) begin(idx - 1, false); };
  function finish() {
    run++; const r = run; hidePhoto();
    lastSay = app.closing || "Това беше нашият урок. Браво, че слуша до края!"; render();
    speak(lastSay).then(() => { if (r === run) stop(); });
  }
  function stop() { run++; stopSpeech(); hidePhoto(); setMode("dormant"); }

  // the viewer took the timeline into their own hands: pause and continue from wherever they leave it
  app.on("input", () => { if (mode === "playing") { pause(); moved = true; } else if (mode === "paused") moved = true; });

  /* ---------- bubble ---------- */
  const KEYS = `<div class="keys"><span><kbd>Интервал</kbd> пауза</span><span><kbd>←</kbd> <kbd>→</kbd> назад / напред</span><span><kbd>Esc</kbd> край</span></div>`;
  function render() {
    if (mode === "dormant") { bubble.hidden = true; return; }
    const head = `<p class="who"><i></i>Учителят<button type="button" class="x" aria-label="Спри урока">×</button></p>`;
    if (mode === "asking") {
      const note = !synth || !voice ? `<p class="note">На това устройство няма български глас, затова ще пиша урока тук.</p>`
        : /natural|neural/i.test(voice.name) ? "" : `<p class="note">За по-хубав глас отвори играта в Microsoft Edge.</p>`;
      bubble.innerHTML = `${head}<p class="say">${esc(lastSay)}</p>${note}<div class="acts"><button type="button" class="yes">Да, разкажи</button><button type="button" class="no">Не сега</button></div>`;
    } else if (mode === "playing") {
      bubble.innerHTML = `${head}<p class="say">${esc(lastSay)}</p>${KEYS}`;
    } else {
      bubble.innerHTML = `${head}<p class="say dim">${esc(lastSay)}</p><p class="note">Пауза. Натисни интервал или кълбото, за да продължа${moved ? " оттам, докъдето стигна" : ""}.</p>`;
    }
    bubble.hidden = false; placeBubble();
  }
  bubble.addEventListener("click", (e) => {
    if (e.target.closest(".yes")) begin(idx, true);
    else if (e.target.closest(".no") || e.target.closest(".x")) stop();
  });
  function placeBubble() {
    const o = orb.getBoundingClientRect(), b = bubble.getBoundingClientRect(), W = innerWidth, H = innerHeight, m = 12;
    let left = o.left + o.width / 2 > W / 2 ? o.right - b.width : o.left;
    left = Math.max(16, Math.min(W - 16 - b.width, left));
    const lift = mode === "dormant" ? 0 : 44; // the monster stands above the orb
    let top = o.top - lift - b.height - m;
    if (top < 12) top = Math.min(H - b.height - 12, o.bottom + m);
    bubble.style.left = Math.round(left) + "px"; bubble.style.top = Math.round(top) + "px";
  }

  /* ---------- orb position: docked in the timeline slot, or wherever the viewer drags it ---------- */
  const KEY = "bgtt-narrator-pos";
  let custom = null;
  try { custom = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { custom = null; }
  function placeOrb() {
    const size = orb.offsetWidth || 68;
    let x, y;
    if (custom) { x = custom.x * innerWidth - size / 2; y = custom.y * innerHeight - size / 2; }
    else { const d = app.dock(); x = d.left + (d.width - size) / 2; y = d.bottom - size - 8; } // bottom of the slot: the monster needs the room above
    x = Math.max(8, Math.min(innerWidth - size - 8, x)); y = Math.max(8, Math.min(innerHeight - size - 8, y));
    orb.style.left = Math.round(x) + "px"; orb.style.top = Math.round(y) + "px";
    if (!bubble.hidden) placeBubble();
  }
  let drag = null, justDragged = false;
  orb.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, ox: orb.offsetLeft, oy: orb.offsetTop, on: false }; orb.setPointerCapture(e.pointerId); });
  orb.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on && Math.hypot(dx, dy) < 6) return;
    drag.on = true; orb.classList.add("drag");
    orb.style.left = drag.ox + dx + "px"; orb.style.top = drag.oy + dy + "px";
    if (!bubble.hidden) placeBubble();
  });
  const endDrag = () => {
    if (!drag) return;
    if (drag.on) {
      const size = orb.offsetWidth;
      custom = { x: (orb.offsetLeft + size / 2) / innerWidth, y: (orb.offsetTop + size / 2) / innerHeight };
      try { localStorage.setItem(KEY, JSON.stringify(custom)); } catch (e) {}
      justDragged = true; setTimeout(() => (justDragged = false), 0);
      placeOrb();
    }
    orb.classList.remove("drag"); drag = null;
  };
  orb.addEventListener("pointerup", endDrag); orb.addEventListener("pointercancel", endDrag);
  orb.addEventListener("dblclick", () => { custom = null; try { localStorage.removeItem(KEY); } catch (e) {} placeOrb(); });
  orb.addEventListener("click", () => {
    if (justDragged) return;
    if (mode === "dormant") ask();
    else if (mode === "asking") stop();
    else if (mode === "playing") pause();
    else resume();
  });
  addEventListener("resize", placeOrb);
  placeOrb(); requestAnimationFrame(placeOrb);

  /* ---------- keyboard: while the teacher is on, its keys win over the timeline's ---------- */
  addEventListener("keydown", (e) => {
    if (mode === "dormant" || e.altKey || e.ctrlKey || e.metaKey) return;
    let used = true;
    if (e.key === " " || e.key === "Spacebar") { if (mode === "asking") begin(idx, true); else if (mode === "playing") pause(); else resume(); }
    else if (e.key === "Enter" && mode === "asking" && !e.target.closest?.(".nar-bubble button")) begin(idx, true);
    else if (e.key === "ArrowRight" && mode !== "asking") next();
    else if (e.key === "ArrowLeft" && mode !== "asking") prev();
    else if (e.key === "Escape") stop();
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  // a page that loses visibility stops talking (speech keeps going in the background otherwise)
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
};

const host = () => window.LESSON_HOST || window.BGTT;
if (host()) start(host());
else { const go = () => host() && start(host()); addEventListener("lesson:ready", go, { once: true }); addEventListener("bgtt:ready", go, { once: true }); }
})();
