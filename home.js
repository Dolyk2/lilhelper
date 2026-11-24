/* ===== Home: weather + countdown on top, then letters, the next 7 days, a memory photo,
   to-dos, activity, music and lists. Loaded before app.js; only declares things. ===== */

const LETTERS = () => (S.letters ||= []);
const partner = () => 1 - I();
const letterOf = (from, day) => LETTERS().find(l => l.from === from && l.date === day);
const unreadLetter = () => LETTERS().filter(l => l.from === partner() && !l.readAt).sort((a, b) => b.at - a.at)[0];
const togetherDays = () => S.since ? Math.round((today0() - parse(S.since)) / 864e5) : null;
const photoCap = p => { const e = S.events.find(x => x.date === p.date); return `${e ? esc(e.title) + ' · ' : ''}${fmtShort(p.date)}`; };
/* Spotify's own made-for-you playlists (Blend, Daily Mix, Discover…) can't play inside other sites. */
const spotifyEmbeddable = s => s?.sid && !(s.kind === 'playlist' && /^37i9dQZF1E/.test(s.sid));
const toMin = hhmm => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);
const head = (title, href, extra = '') => `<div class="chead"><h3>${title}</h3><span class="cright">${extra}${href ? `<a href="#${href}">Open</a>` : ''}</span></div>`;

function home() {
  const t = iso(new Date()), t0 = today0();
  const dayIn = n => iso(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + n));
  const DAYS = 7, end = dayIn(DAYS);
  const dayName = k => k === t ? 'Today' : k === dayIn(1) ? 'Tomorrow' : parse(k).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  /* ---- next 7 days: events, special dates, to-dos with a due date ---- */
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const ev = S.events.filter(e => e.date >= t && e.date < end && !(e.date === t && e.time && toMin(e.time) < nowMin - 120))
    .map(e => ({ date: e.date, time: e.time || '', title: e.title, sub: e.location, w: e.who }));
  const msIn = Array.from({ length: DAYS }, (_, n) => dayIn(n)).flatMap(k => S.milestones.filter(m => onDay(m, k)).map(m => ({ date: k, time: '', title: '♥ ' + m.title, w: 2, ms: true })));
  const due = S.tasks.filter(x => !x.done && x.due && x.due >= t && x.due < end).map(x => ({ date: x.due, time: '', title: x.text, sub: 'to-do', w: x.owner, todo: true }));
  const coming = [...msIn, ...ev, ...due].sort((a, b) => (a.date + (a.ms ? '0' : a.time || '1')).localeCompare(b.date + (b.ms ? '0' : b.time || '1')));
  const days = [...new Set(coming.map(x => x.date))];
  const comingHtml = coming.length ? days.map(k => `<div class="cday"><h4>${dayName(k)}</h4>${coming.filter(x => x.date === k).map(x => `<div class="crow${x.ms ? ' cms' : ''}" data-w="${x.w}"><span class="ctime">${x.time ? esc(x.time) : x.todo ? '☐' : x.ms ? '🎉' : ''}</span><span class="grow">${esc(x.title)}${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span></div>`).join('')}</div>`).join('')
    : '<p class="muted">Nothing planned this week.</p>';
  const open = S.tasks.filter(x => !x.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  if (!S.photos.find(p => p.id === homePhotoId)) homePhotoId = S.photos.length ? S.photos[Math.floor(Math.random() * S.photos.length)].id : null;
  const hp = S.photos.find(p => p.id === homePhotoId);
  if (!S.songs.find(s => s.id === songId)) songId = (S.songs.find(s => s.pin) || S.songs[0])?.id ?? null;
  const song = S.songs.find(s => s.id === songId), spLink = song?.sid ? `https://open.spotify.com/${song.kind}/${song.sid}` : '';
  const wk = iso(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() - ((t0.getDay() + 6) % 7)));
  const actRow = w => {
    const m = S.sports.filter(s => s.date >= wk && (s.who == w || s.who == 2)).reduce((a, s) => a + mins(s), 0);
    const gs = S.goals.filter(g => people(g).includes(w)), sc = dayScore(w, t), steps = typeof stepsOn === 'function' ? stepsOn(w, t) : 0;
    return `<a class="arow" href="#goals" data-w="${w}">${donut(sc, 50, 6, Math.round(sc * 100) + '%')}
      <span class="grow"><b>${esc(S.names[w])}</b><span class="agoals">${gs.map(g => `<i class="${amt(g, w, t) >= g.target ? 'ok' : ''}">${esc(g.icon)}</i>`).join('')}</span></span>
      <span class="astat"><b>${m ? hm(m) : '–'}</b><small>sport / week</small></span>${steps ? `<span class="astat"><b>${(steps / 1000).toFixed(1)}k</b><small>steps</small></span>` : ''}</a>`;
  };
  const hello = (h => h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')(new Date().getHours());
  const lst = S.lists.map(l => ({ l, n: l.items.filter(i => !i.done).length })).filter(x => x.n);
  const card = {
    letter: letterCard(t),
    come: `<section class="card h-come">${head('Next 7 days', 'calendar')}${comingHtml}</section>`,
    photo: `<section class="card h-photo memo">${hp && sb
      ? `<button class="memophoto" onclick="openViewer('${hp.id}')" aria-label="Open photo"><img data-photo="${esc(hp.path)}" alt=""></button><div class="memocap"><span>${photoCap(hp)}</span><button class="ghost" onclick="shufflePhoto()" aria-label="Another photo">⟳</button></div>`
      : `<div class="memoempty"><h3>Memories</h3><p class="muted">Add photos to a day in the Calendar. Each one also becomes a card.</p></div>`}</section>`,
    todo: `<section class="card h-todo">${head('To-dos', 'tasks', `<span class="muted">${open.length} open</span>`)}${open.length ? `<ul class="items evlist">${open.slice(0, 6).map(x => `<li data-w="${x.owner}"><input type="checkbox" data-act="toggleTask" data-id="${x.id}" aria-label="Done"><div class="grow"><div class="evt">${esc(x.text)}</div>${x.due ? `<div class="evm">${overdue(x) ? '<span class="warnt">overdue · </span>' : ''}due ${fmtShort(x.due)}</div>` : ''}</div><span class="wdot"></span></li>`).join('')}</ul>${open.length > 6 ? `<a class="more" href="#tasks">+ ${open.length - 6} more</a>` : ''}` : '<p class="muted">All done 🎉</p>'}</section>`,
    act: `<section class="card h-act">${head('Today’s activity', 'goals')}${S.goals.length || S.sports.length ? [0, 1].map(actRow).join('') : '<p class="muted">Add goals or log a sport.</p>'}</section>`,
    music: `<section class="card h-music">${head(song?.pin ? esc(song.title || 'Our playlist') : 'Our music', '', `${S.songs.length > 1 ? '<button class="ghost" onclick="nextSong()" aria-label="Next">⇄</button>' : ''}<button class="ghost" onclick="songAdd=!songAdd;render()" aria-label="${songAdd ? 'Close' : 'Add music'}">${songAdd ? '✕' : '+'}</button>`)}
      ${!song ? '<p class="muted">Tap + and paste a Spotify link.</p>'
        : spotifyEmbeddable(song) ? `<iframe class="spot" src="https://open.spotify.com/embed/${song.kind}/${song.sid}?theme=0" height="152" allow="encrypted-media; clipboard-write; autoplay" loading="lazy" title="Spotify player"></iframe>`
        : `<a class="spbig" href="${spLink}" target="_blank" rel="noopener"><span class="spico">♫</span><span><b>${esc(song.title || 'Our playlist')}</b><small>Opens in the Spotify app</small></span><span class="spplay">▶</span></a>`}
      ${songAdd ? `<form class="row" data-form="addSong" style="margin:.6rem 0 0"><input type="text" name="url" placeholder="Paste a Spotify link" required aria-label="Spotify link"><button class="primary">Add</button></form>${song ? `<button class="ghost" data-act="delSong" data-id="${song.id}">Remove this one</button>` : ''}` : ''}</section>`,
    lists: `<section class="card h-lists">${head('Lists', 'lists')}<div class="lchips">${lst.length ? lst.map(({ l, n }) => `<a class="lchip" href="#lists/${l.id}" data-w="${l.owner ?? 2}"><b>${esc(l.name)}</b><span>${n}</span></a>`).join('') : '<p class="muted">Nothing left on any list.</p>'}</div></section>`
  };
  /* two columns on a computer (each card only as tall as its content), one column on a phone */
  return `<div class="homehead"><h2>${hello}, ${esc(S.names[I()])}</h2></div>
  ${heroHtml()}
  <div class="home3"><div class="hcol">${card.letter}${card.come}${card.todo}</div><div class="hcol">${card.photo}${card.act}${card.music}${card.lists}</div></div>`;
}

/* ---------- top card: weather for today (where you are, or where your plans are) + countdown ---------- */
let heroCache = '';
function heroHtml() {
  const ms = S.milestones.map(m => ({ ...m, n: daysTo(m) })).filter(m => m.n >= 0).sort((a, b) => a.n - b.n);
  const [next, ...more] = ms, td = togetherDays();
  const count = `<div class="cd">${next ? `<div class="cdmain"><div class="cdnum">${next.n === 0 ? '🎉' : next.n}</div><div class="cdtxt"><small>${next.n === 0 ? 'today' : next.n === 1 ? 'day until' : 'days until'}</small><b>${esc(next.title)}</b><small>${fmtShort(iso(nextOcc(next)))}</small></div></div>` : '<a href="#dates" class="cdadd">+ Add a special date</a>'}
    <div class="cdmore">${td != null ? `<span class="cdchip tog">♥ <b>${td.toLocaleString()}</b> days together</span>` : `<a class="cdchip" href="#settings">♥ set your day</a>`}${more.slice(0, 3).map(m => `<span class="cdchip"><b>${m.n}</b> d · ${esc(m.title)}</span>`).join('')}</div></div>`;
  return `<section class="hero2"><div class="wx" id="wx">${heroCache || '<div class="wxload">Loading weather…</div>'}</div>${count}</section>`;
}
/* Where you are (asked once, kept 30 minutes), else home. */
const LOC_KEY = 'us-helper-v1-loc'; // this device's last known position (not synced)
function hereCoords() {
  const c = ls.get(LOC_KEY);
  if ('geolocation' in navigator && (!c || Date.now() - c.t > 30 * 60e3))
    navigator.geolocation.getCurrentPosition(p => { ls.set(LOC_KEY, { lat: p.coords.latitude, lon: p.coords.longitude, t: Date.now() }); if (!c) fillHero(); }, () => {}, { maximumAge: 30 * 60e3, timeout: 8000 });
  return c;
}
async function placeName(lat, lon) {
  const k = 'pn' + lat.toFixed(2) + lon.toFixed(2); if (WX[k]) return WX[k];
  try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lon}`); const j = await r.json(); return (WX[k] = j.address?.city || j.address?.town || j.address?.village || j.address?.municipality || 'Here'); }
  catch { return 'Here'; }
}
const wxMood = (c, day) => !day ? 'night' : c <= 1 ? 'sun' : c <= 3 ? 'cloud' : c <= 48 ? 'fog' : c <= 67 || (c >= 80 && c <= 82) ? 'rain' : c <= 86 ? 'snow' : 'storm';
let heroBusy = false;
async function fillHero() {
  if (heroBusy || !document.getElementById('wx')) return; heroBusy = true;
  const t = iso(new Date()), nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const plans = S.events.filter(e => e.date === t && (!e.time || toMin(e.time) >= nowMin - 60)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  const away = plans.find(e => e.lat != null);
  const here = hereCoords();
  const [lat, lon, src] = here ? [here.lat, here.lon, 'here'] : [HOME_PLACES[0][1], HOME_PLACES[0][2], 'home'];
  try {
    const d = await wx(lat, lon), c = d.current, di = d.daily.time.indexOf(t);
    const name = src === 'here' ? await placeName(lat, lon) : HOME_PLACES[0][0];
    const nowH = d.hourly.time.indexOf(c.time.slice(0, 13) + ':00');
    const hours = Array.from({ length: 12 }, (_, i) => nowH + i).filter(i => nowH >= 0 && i < d.hourly.time.length);
    /* today's plans: shown in the hourly strip at their hour, with the weather where they are */
    const pw = await Promise.all(plans.slice(0, 4).map(e => eventWx(e).then(w => [e, w]).catch(() => [e, null])));
    const at = h => pw.filter(([e]) => e.time && +e.time.slice(0, 2) === +d.hourly.time[h].slice(11, 13));
    const rain = Math.max(di >= 0 ? d.daily.precipitation_probability_max[di] : 0, ...pw.map(([, w]) => w?.rain || 0));
    const low = Math.min(di >= 0 ? d.daily.temperature_2m_min[di] : 99, ...pw.map(([, w]) => w?.min ?? 99));
    const tip = rain >= 50 ? '☂️ Take an umbrella' : low <= 0 ? '🧣 Freezing, wrap up warm' : c.wind_speed_10m >= 35 ? '💨 Very windy today' : di >= 0 && d.daily.temperature_2m_max[di] >= 28 ? '🧴 Hot, take water' : c.weather_code <= 2 && c.is_day ? '😎 Nice day to go out' : '';
    const awayW = away && pw.find(([e]) => e === away)?.[1];
    heroCache = `<div class="wxbg ${wxMood(c.weather_code, c.is_day)}"></div>
      <div class="wxhead"><span class="wxloc">📍 ${esc(name)}</span><span class="wxdate">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
      <div class="wxnow"><span class="wxt">${deg(c.temperature_2m)}</span><span class="wxi">${wxIcon(c.weather_code, c.is_day)}</span>
        <div class="wxd"><b>${wxText(c.weather_code)}</b><span>${di >= 0 ? `↑${deg(d.daily.temperature_2m_max[di])} ↓${deg(d.daily.temperature_2m_min[di])} · ` : ''}feels ${deg(c.apparent_temperature)}</span>${di >= 0 && d.daily.precipitation_probability_max[di] >= 10 ? `<span>💧 ${d.daily.precipitation_probability_max[di]}% rain</span>` : ''}</div></div>
      ${tip || awayW ? `<div class="wxtip">${tip}${tip && awayW ? ' · ' : ''}${awayW ? `${esc(away.location)} at ${esc(away.time || 'today')}: ${wxIcon(awayW.code, awayW.day)} ${awayW.temp}` : ''}</div>` : ''}
      <div class="wxstrip">${hours.map((h, k) => { const p = at(h); return `<div class="${p.length ? 'hasp' : ''}"><small>${k ? d.hourly.time[h].slice(11, 13) : 'Now'}</small><span>${wxIcon(d.hourly.weather_code[h], d.hourly.is_day[h])}</span><b>${deg(d.hourly.temperature_2m[h])}</b>${d.hourly.precipitation_probability[h] >= 30 ? `<i>${d.hourly.precipitation_probability[h]}%</i>` : ''}${p.map(([e]) => `<em data-w="${e.who}">${esc(e.title)}</em>`).join('')}</div>`; }).join('')}</div>`;
    const cur = document.getElementById('wx'); if (cur) cur.innerHTML = heroCache;
  } catch { const b = document.getElementById('wx'); if (b && !heroCache) b.innerHTML = '<div class="wxload">Weather is not available right now.</div>'; }
  heroBusy = false;
}

/* ---------- love letters ---------- */
function letterCard(t) {
  const p = partner(), fromThem = letterOf(p, t), mineToday = letterOf(I(), t), un = unreadLetter();
  const past = LETTERS().filter(l => l !== fromThem && l !== mineToday).sort((a, b) => b.at - a.at).slice(0, 8);
  const theirs = un ? `<button class="envelope" data-act="openLetter" data-id="${un.id}" aria-label="Open the letter from ${esc(S.names[p])}"><span class="flap"></span><span class="seal">♥</span><span class="envto">from ${esc(S.names[p])}</span></button>`
    : fromThem ? `<button class="paper small" onclick="readLetter('${fromThem.id}')">${letterBody(fromThem, true)}</button>` : '';
  return `<section class="card h-letter">${head('💌 Letters')}
    ${theirs || `<p class="muted lnone">${esc(S.names[p])} hasn't written today yet.</p>`}
    <div class="lme">${mineToday ? `<span>✓ You wrote today${mineToday.readAt ? `, ${esc(S.names[p])} read it ❤️` : ''}</span><button class="ghost" onclick="writeLetter('${mineToday.id}')">Change</button>`
      : `<button class="primary" onclick="writeLetter()">✍️ Write to ${esc(S.names[p])}</button>`}</div>
    ${past.length ? `<div class="lold">${past.map(l => `<button class="lmini" data-w="${l.from}" onclick="readLetter('${l.id}')">${l.ink ? '✍️' : '💌'} <small>${fmtShort(l.date)}</small></button>`).join('')}</div>` : ''}</section>`;
}
const letterBody = (l, short) => `${l.text ? `<p class="hand">${esc(short && l.text.length > 140 ? l.text.slice(0, 140) + '…' : l.text)}</p>` : ''}${l.ink ? `<img class="ink" data-photo="${esc(l.ink)}" alt="Handwritten letter">` : ''}<p class="lsig">— ${esc(S.names[l.from])}, ${fmtShort(l.date)}</p>`;
function readLetter(id) {
  const l = LETTERS().find(x => x.id === id); if (!l) return;
  if (l.from === partner() && !l.readAt) { l.readAt = Date.now(); save(); render(); }
  modal(`<div class="paper big">${letterBody(l)}</div>`, 'Letter');
}

/* A dialog that works on phones: sized to the visible screen, close button always visible,
   swipe down or tap outside to close. */
function modal(html, label, onClose) {
  const back = document.activeElement, box = document.createElement('div');
  box.className = 'modal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', label);
  box.innerHTML = `<div class="mbox">${html}</div><button class="mclose" aria-label="Close">✕</button>`;
  document.body.append(box); document.body.classList.add('noscroll');
  let closed = false;
  const close = () => { if (closed) return; closed = true; box.remove(); document.body.classList.toggle('noscroll', !!document.querySelector('.modal,.lightbox')); document.removeEventListener('keydown', keys); back?.focus?.({ preventScroll: true }); onClose?.(); };
  const keys = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', keys);
  box.querySelector('.mclose').addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box) close(); });
  swipeClose(box, box.querySelector('.mbox'), close);
  box.close = close;
  hydrateIn(box);
  return box;
}
/* swipe down to close (the iPhone habit) */
function swipeClose(box, panel, close) {
  let y0 = null;
  box.addEventListener('touchstart', e => { y0 = (panel.scrollTop || 0) <= 0 && !e.target.closest('canvas,textarea') ? e.touches[0].clientY : null; }, { passive: true });
  box.addEventListener('touchmove', e => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) panel.style.transform = `translateY(${dy}px)`; }, { passive: true });
  box.addEventListener('touchend', e => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; y0 = null; if (dy > 110) close(); else panel.style.transform = ''; });
}
async function hydrateIn(el) {
  const els = [...el.querySelectorAll('[data-photo]')]; if (!els.length || !sb) return;
  await urls(els.map(e => e.dataset.photo));
  els.forEach(e => { const u = urlCache[e.dataset.photo]?.url; if (u) e.src = u; });
}

/* Writing: "Type" or "By hand" (a canvas for a finger, mouse or pen). */
function writeLetter(id) {
  const old = id ? LETTERS().find(l => l.id === id) : null;
  const box = modal(`<h3>Letter for ${esc(S.names[partner()])}</h3>
    <div class="seg wtabs"><button class="on" data-wt="type">⌨️ Type</button><button data-wt="draw">✍️ By hand</button></div>
    <div class="wpane" data-p="type"><textarea class="hand" maxlength="2000" placeholder="My love…" aria-label="Letter">${esc(old?.text || '')}</textarea></div>
    <div class="wpane" data-p="draw" hidden><canvas class="pad" aria-label="Writing area"></canvas>
      <div class="padbar">${['#2b1a4a', '#c2185b', '#1565c0', '#2e7d32'].map((c, i) => `<button class="pen${i ? '' : ' on'}" data-c="${c}" style="--c:${c}" aria-label="Pen colour"></button>`).join('')}
        <button class="ghost" data-w2="2">thin</button><button class="ghost on" data-w2="3.5">medium</button><button class="ghost" data-w2="6">thick</button>
        <button class="ghost" data-undo aria-label="Undo">↶</button><button class="ghost" data-clear>Clear</button></div></div>
    <p><button class="primary" data-send>💌 Send</button> <span class="muted wmsg" role="status"></span></p>`, 'Write a letter');
  const cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  let strokes = [], cur = null, color = '#2b1a4a', width = 3.5, sized = false, raf = 0;
  const size = () => { const r = cv.getBoundingClientRect(), k = devicePixelRatio || 1; cv.width = r.width * k; cv.height = r.height * k; ctx.setTransform(k, 0, 0, k, 0, 0); sized = true; redraw(); };
  const redraw = () => { raf = 0; ctx.clearRect(0, 0, cv.width, cv.height); for (const s of strokes) { ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); s.p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (s.p.length === 1) ctx.lineTo(s.p[0][0] + .1, s.p[0][1]); ctx.stroke(); } };
  const ask = () => { if (!raf) raf = requestAnimationFrame(redraw); };
  const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); cur = { c: color, w: width * (e.pointerType === 'pen' ? .6 + e.pressure : 1), p: [pt(e)] }; strokes.push(cur); ask(); });
  cv.addEventListener('pointermove', e => { if (!cur) return; cur.p.push(pt(e)); ask(); });
  ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { cur = null; }));
  box.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.wt) { box.querySelectorAll('[data-wt]').forEach(x => x.classList.toggle('on', x === b)); box.querySelectorAll('.wpane').forEach(p => p.hidden = p.dataset.p !== b.dataset.wt); if (b.dataset.wt === 'draw' && !sized) size(); }
    if (b.dataset.c) { color = b.dataset.c; box.querySelectorAll('.pen').forEach(x => x.classList.toggle('on', x === b)); }
    if (b.dataset.w2) { width = +b.dataset.w2; box.querySelectorAll('[data-w2]').forEach(x => x.classList.toggle('on', x === b)); }
    if (b.hasAttribute('data-undo')) { strokes.pop(); ask(); }
    if (b.hasAttribute('data-clear')) { strokes = []; ask(); }
    if (b.hasAttribute('data-send')) {
      const text = box.querySelector('textarea').value.trim(), msg = box.querySelector('.wmsg');
      if (!text && !strokes.length) { msg.textContent = 'Write something first ♥'; return; }
      b.disabled = true; msg.textContent = 'Sending…';
      let ink = strokes.length ? null : old?.ink || null;
      if (strokes.length) {
        try {
          const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
          const path = `letters/${uid()}${Date.now().toString(36)}.png`;
          const { error } = await sb.storage.from('memories').upload(path, blob, { contentType: 'image/png' });
          if (error) throw error;
          ink = path;
        } catch (err) { msg.textContent = 'Could not upload the drawing: ' + (err.message || err); b.disabled = false; return; }
      }
      const t = iso(new Date());
      if (old) Object.assign(old, { text, ink, at: Date.now(), readAt: null });
      else LETTERS().push({ id: uid(), from: I(), date: t, text, ink, at: Date.now(), readAt: null });
      earnPack(I(), 'letter:' + t, 'writing a love letter');
      save(); box.close(); render(); toast('💌 Sent');
    }
  });
}

const HOME_ACTS = {
  openLetter: id => { if (LETTERS().some(x => x.id === id)) setTimeout(() => readLetter(id)); return 'keep'; }
};
/* going to another page closes any open dialog */
addEventListener('hashchange', () => document.querySelectorAll('.modal,.lightbox').forEach(m => m.close ? m.close() : m.remove()));
