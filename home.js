/* ===== Home: the hero (together counter, special dates, weather, love letters),
   the next 3 days, a memory photo, to-dos, activity, music and lists.
   Loaded before app.js; only declares things. ===== */

let heroTab = null; // 'today' | 'letters'; null = choose by itself (letters when one is waiting for you)
const LETTERS = () => (S.letters ||= []);
const partner = () => 1 - I();
const letterOf = (from, day) => LETTERS().find(l => l.from === from && l.date === day);
const unreadLetter = () => LETTERS().filter(l => l.from === partner() && !l.readAt).sort((a, b) => b.at - a.at)[0];
const photoCap = p => { const e = S.events.find(x => x.date === p.date); return `${e ? esc(e.title) + ' · ' : ''}${fmtShort(p.date)}`; };
/* days together: from the date in Settings */
const togetherDays = () => S.since ? Math.round((today0() - parse(S.since)) / 864e5) : null;

function home() {
  const t = iso(new Date()), t0 = today0();
  const dayIn = n => iso(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + n));
  const end = dayIn(3); // today + the next 2 days
  const dayName = k => k === t ? 'Today' : k === dayIn(1) ? 'Tomorrow' : parse(k).toLocaleDateString(undefined, { weekday: 'long' });
  /* ---- coming up: events and special dates in the next 3 days ---- */
  const toMin = hhmm => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5), nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const ev = S.events.filter(e => e.date >= t && e.date < end && !(e.date === t && e.time && toMin(e.time) < nowMin - 120)) // today's events that ended a while ago drop off
    .map(e => ({ date: e.date, time: e.time || '', title: e.title, sub: e.location, w: e.who, id: e.id }));
  const msIn = [0, 1, 2].flatMap(n => S.milestones.filter(m => onDay(m, dayIn(n))).map(m => ({ date: dayIn(n), time: '', title: '♥ ' + m.title, w: 2, ms: true })));
  const due = S.tasks.filter(x => !x.done && x.due && x.due >= t && x.due < end).map(x => ({ date: x.due, time: '', title: x.text, sub: 'to-do due', w: x.owner, todo: true }));
  const coming = [...msIn, ...ev, ...due].sort((a, b) => (a.date + (a.ms ? '0' : a.time || '1')).localeCompare(b.date + (b.ms ? '0' : b.time || '1')));
  const byDay = [0, 1, 2].map(dayIn).map(k => [k, coming.filter(x => x.date === k)]);
  const comingHtml = coming.length ? byDay.filter(([, l]) => l.length).map(([k, l]) => `<div class="cday"><h4>${dayName(k)}</h4>${l.map(x => `<div class="crow${x.ms ? ' cms' : ''}" data-w="${x.w}"><span class="ctime">${x.time ? esc(x.time) : x.todo ? '☐' : x.ms ? '🎉' : '·'}</span><span class="grow">${esc(x.title)}${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span></div>`).join('')}</div>`).join('')
    : '<p class="muted">Nothing planned for the next 3 days.</p>';
  /* ---- to-dos: open ones, overdue and soonest first ---- */
  const open = S.tasks.filter(x => !x.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  /* ---- photo ---- */
  if (!S.photos.find(p => p.id === homePhotoId)) homePhotoId = S.photos.length ? S.photos[Math.floor(Math.random() * S.photos.length)].id : null;
  const hp = S.photos.find(p => p.id === homePhotoId);
  /* ---- music: pinned playlist first ---- */
  if (!S.songs.find(s => s.id === songId)) songId = (S.songs.find(s => s.pin) || S.songs[0])?.id ?? null;
  const song = S.songs.find(s => s.id === songId);
  const spLink = song?.sid ? `https://open.spotify.com/${song.kind}/${song.sid}` : '';
  /* ---- activity: goals today + sport this week + steps, per person ---- */
  const wk = iso(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() - ((t0.getDay() + 6) % 7)));
  const actRow = w => {
    const sp = S.sports.filter(s => s.date >= wk && (s.who == w || s.who == 2)), m = sp.reduce((a, s) => a + mins(s), 0);
    const gs = S.goals.filter(g => people(g).includes(w)), sc = dayScore(w, t);
    const steps = typeof stepsOn === 'function' ? stepsOn(w, t) : 0;
    return `<a class="arow" href="#goals" data-w="${w}">${donut(sc, 54, 7, Math.round(sc * 100) + '%')}
      <span class="grow"><b>${esc(S.names[w])}</b><span class="agoals">${gs.map(g => `<i class="${amt(g, w, t) >= g.target ? 'ok' : ''}" title="${esc(g.name)}: ${nfmt(amt(g, w, t))} / ${nfmt(g.target)} ${esc(g.unit)}">${esc(g.icon)}</i>`).join('')}</span></span>
      <span class="astat"><b>${m ? hm(m) : '–'}</b><small>sport this week</small></span>${steps ? `<span class="astat"><b>${(steps / 1000).toFixed(1)}k</b><small>steps today</small></span>` : ''}</a>`;
  };
  const head = (title, href, extra = '') => `<div class="chead"><h3>${title}</h3><span class="cright">${extra}${href ? `<a href="#${href}">Open</a>` : ''}</span></div>`;
  const hello = (h => h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')(new Date().getHours());
  const lst = S.lists.map(l => ({ l, n: l.items.filter(i => !i.done).length })).filter(x => x.n).slice(0, 6);
  return `<div class="homehead"><h2>${hello}, ${esc(S.names[I()])}</h2><span class="muted hdate">${fmt(t)}</span></div>
  <div class="home2">
    ${hero(t)}
    <section class="card h-come">${head('Next 3 days', 'calendar')}${comingHtml}</section>
    <section class="card h-photo memo">${hp && sb
      ? `<button class="memophoto" onclick="openViewer('${hp.id}')" aria-label="Open photo"><img data-photo="${esc(hp.path)}" alt="Memory from ${fmt(hp.date)}"></button><div class="memocap"><span>${photoCap(hp)}</span><button class="ghost" onclick="event.stopPropagation();shufflePhoto()" aria-label="Another photo">⟳</button></div>`
      : `<div class="memoempty"><h3>Memories</h3><p class="muted">Add photos to a day in the Calendar. They show here and turn into collectible cards.</p></div>`}</section>
    <section class="card h-todo">${head('To-dos', 'tasks', `<span class="muted">${open.length} open</span>`)}${open.length ? `<ul class="items evlist">${open.slice(0, 6).map(x => `<li data-w="${x.owner}"><input type="checkbox" data-act="toggleTask" data-id="${x.id}" aria-label="Done"><div class="grow"><div class="evt">${esc(x.text)}</div>${x.due ? `<div class="evm">${overdue(x) ? '<span class="warnt">overdue · </span>' : ''}due ${fmtShort(x.due)}</div>` : ''}</div><span class="wdot" title="${esc(owner(x.owner))}"></span></li>`).join('')}</ul>${open.length > 6 ? `<a class="more" href="#tasks">+ ${open.length - 6} more</a>` : ''}` : '<p class="muted">All done 🎉</p>'}</section>
    <section class="card h-act">${head('Today’s activity', 'sports')}${S.goals.length || S.sports.length ? [0, 1].map(actRow).join('') : '<p class="muted">Add goals or log a sport to see it here.</p>'}</section>
    <section class="card h-music music">${head(song?.pin ? esc(song.title || 'Our playlist') : 'Our music', '', `<span class="mbtns">${S.songs.length > 1 ? '<button class="ghost" onclick="nextSong()" aria-label="Next song or playlist">⇄</button>' : ''}${spLink ? `<a class="ghost" href="${spLink}" target="_blank" rel="noopener" aria-label="Open in Spotify">↗</a>` : ''}<button class="ghost" onclick="songAdd=!songAdd;render()" aria-label="${songAdd ? 'Close' : 'Add music'}">${songAdd ? '✕' : '+'}</button></span>`)}
      ${!song ? '<p class="muted">Tap + and paste a Spotify link to a song, album or playlist.</p>'
        : song.sid ? `<iframe class="spot" src="https://open.spotify.com/embed/${song.kind}/${song.sid}?theme=0" height="152" allow="encrypted-media; clipboard-write; autoplay; fullscreen; picture-in-picture" loading="lazy" title="Spotify player"></iframe>`
        : `<div class="songt">${esc(song.title)}</div>`}
      ${songAdd ? `<form class="row" data-form="addSong" style="margin:.6rem 0 0"><input type="text" name="url" placeholder="Paste a Spotify link" required aria-label="Spotify link"><button class="primary">Add</button></form>${song ? `<button class="ghost" data-act="delSong" data-id="${song.id}">Remove this one</button>` : ''}` : ''}</section>
    <section class="card h-lists">${head('Lists', 'lists')}<div class="lchips">${lst.length ? lst.map(({ l, n }) => `<a class="lchip" href="#lists/${l.id}" data-w="${l.owner ?? 2}"><b>${esc(l.name)}</b><span>${n}</span><small>${esc(l.items.filter(i => !i.done).slice(0, 3).map(i => i.text).join(', '))}</small></a>`).join('') : '<p class="muted">Nothing left on any list.</p>'}</div></section>
  </div>`;
}

/* The big card on top: two small tabs, "Today" (together counter, special dates, weather) and "Letters". */
function hero(t) {
  const un = unreadLetter(), tab = heroTab || (un ? 'letters' : 'today');
  const ms = S.milestones.map(m => ({ ...m, n: daysTo(m) })).filter(m => m.n >= 0).sort((a, b) => a.n - b.n).slice(0, 3);
  const [next, ...more] = ms, td = togetherDays();
  const tabs = `<div class="herotabs" role="tablist"><button role="tab" aria-selected="${tab === 'today'}" class="${tab === 'today' ? 'on' : ''}" data-act="htab" data-id="today">Today</button><button role="tab" aria-selected="${tab === 'letters'}" class="${tab === 'letters' ? 'on' : ''}" data-act="htab" data-id="letters">💌 Letters${un ? '<i class="dotnew" aria-label="new"></i>' : ''}</button></div>`;
  const today = `<div class="herogrid">
    <div class="msbox">
      ${td != null ? `<div class="together"><span class="big">${td.toLocaleString()}</span><span>days together<small>since ${fmt(S.since)}</small></span></div>` : `<a class="msall" href="#settings">♥ Set the day you got together →</a>`}
      ${next ? `<div class="msnext"><div class="mnum">${next.n === 0 ? '🎉' : next.n}</div><div><p class="mst">${next.n === 0 ? 'Today: ' : next.n === 1 ? 'day until ' : 'days until '}<b>${esc(next.title)}</b></p><p class="msd">${fmtShort(iso(nextOcc(next)))}</p></div></div>
        ${more.length ? `<ul class="mslist">${more.map(m => `<li><span class="grow">${esc(m.title)}</span><span class="msd">${fmtShort(iso(nextOcc(m)))}</span><b>${m.n === 0 ? 'today' : m.n + ' d'}</b></li>`).join('')}</ul>` : ''}`
        : `<p class="muted">Add an anniversary or birthday under <a href="#dates">Special dates</a>.</p>`}
      <a class="msall" href="#dates">All dates →</a></div>
    <div class="wxpanel" id="wxbox" aria-live="polite">${lastWx || '<p class="muted">Loading weather…</p>'}</div></div>`;
  return `<section class="card hero h-hero">${tabs}${tab === 'today' ? today : lettersPanel(t)}</section>`;
}

/* ---- love letters: one a day each, typed or written by hand ---- */
function lettersPanel(t) {
  const p = partner(), fromThem = letterOf(p, t), mineToday = letterOf(I(), t);
  const past = LETTERS().filter(l => l.date !== t).sort((a, b) => b.at - a.at).slice(0, 12);
  const theirs = fromThem ? (fromThem.readAt ? `<div class="paper" data-hl="${fromThem.id}">${letterBody(fromThem)}</div>`
      : `<button class="envelope" data-act="openLetter" data-id="${fromThem.id}" aria-label="Open the letter from ${esc(S.names[p])}"><span class="flap"></span><span class="seal">♥</span><span class="envto">for ${esc(S.names[I()])}</span></button>`)
    : `<div class="noletter"><span>✉️</span><p>${esc(S.names[p])} hasn't written today yet.</p></div>`;
  return `<div class="lgrid">
    <div class="lcol"><h3>From ${esc(S.names[p])}, today</h3>${theirs}</div>
    <div class="lcol"><h3>Your letter</h3>${mineToday ? `<div class="paper mine">${letterBody(mineToday)}</div><p class="muted lsent">${mineToday.readAt ? `❤️ ${esc(S.names[p])} read it` : 'Sent, not opened yet'} · <button class="ghost" onclick="writeLetter('${mineToday.id}')">Change</button></p>`
      : `<button class="primary bigbtn" onclick="writeLetter()">✍️ Write today's letter</button><p class="muted">Type it or write it by hand with your finger.</p>`}</div>
    ${past.length ? `<div class="lcol lpast"><h3>Earlier</h3><div class="lold">${past.map(l => `<button class="lmini" data-w="${l.from}" onclick="readLetter('${l.id}')"><span>${l.ink ? '✍️' : '💌'}</span><b>${esc(S.names[l.from])}</b><small>${fmtShort(l.date)}</small></button>`).join('')}</div></div>` : ''}
  </div>`;
}
const letterBody = l => `${l.text ? `<p class="hand">${esc(l.text)}</p>` : ''}${l.ink ? `<img class="ink" data-photo="${esc(l.ink)}" alt="Handwritten letter">` : ''}<p class="lsig">— ${esc(S.names[l.from])}, ${fmtShort(l.date)}</p>`;
function readLetter(id) {
  const l = LETTERS().find(x => x.id === id); if (!l) return;
  if (l.from === partner() && !l.readAt) { l.readAt = Date.now(); save(); }
  modal(`<div class="paper big">${letterBody(l)}</div>`, 'Letter');
}

/* A simple dialog. Returns the box; closes on Esc, the ✕ or a tap outside. */
function modal(html, label, onClose) {
  const back = document.activeElement, box = document.createElement('div');
  box.className = 'modal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', label);
  box.innerHTML = `<div class="mbox"><button class="ghost mclose" aria-label="Close">✕</button>${html}</div>`;
  document.body.append(box);
  const close = () => { box.remove(); document.removeEventListener('keydown', keys); back?.focus?.(); onClose?.(); };
  const keys = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', keys);
  box.addEventListener('click', e => { if (e.target === box || e.target.closest('.mclose')) close(); });
  box.close = close;
  hydrateIn(box);
  box.querySelector('.mclose').focus();
  return box;
}
async function hydrateIn(el) {
  const els = [...el.querySelectorAll('[data-photo]')]; if (!els.length || !sb) return;
  await urls(els.map(e => e.dataset.photo));
  els.forEach(e => { const u = urlCache[e.dataset.photo]?.url; if (u) e.src = u; });
}

/* Writing: a "Type" tab and a "Draw" tab (a canvas you write on with a finger, mouse or pen). */
function writeLetter(id) {
  const old = id ? LETTERS().find(l => l.id === id) : null;
  const box = modal(`<h3>Letter for ${esc(S.names[partner()])}</h3>
    <div class="seg wtabs" role="tablist"><button class="on" data-wt="type">⌨️ Type</button><button data-wt="draw">✍️ Write by hand</button></div>
    <div class="wpane" data-p="type"><textarea class="hand" maxlength="2000" placeholder="My love…" aria-label="Letter">${esc(old?.text || '')}</textarea></div>
    <div class="wpane" data-p="draw" hidden><canvas class="pad" aria-label="Writing area"></canvas>
      <div class="padbar">${['#2b1a4a', '#c2185b', '#1565c0', '#2e7d32'].map((c, i) => `<button class="pen${i ? '' : ' on'}" data-c="${c}" style="--c:${c}" aria-label="Pen colour"></button>`).join('')}
        <button class="ghost" data-w2="2">thin</button><button class="ghost on" data-w2="3.5">medium</button><button class="ghost" data-w2="6">thick</button>
        <button class="ghost" data-undo>↶ Undo</button><button class="ghost" data-clear>Clear</button></div>
      ${old?.ink ? '<p class="muted">Writing by hand replaces the old drawing.</p>' : ''}</div>
    <p><button class="primary" data-send>💌 Send</button> <span class="muted wmsg" role="status"></span></p>`, 'Write a letter');
  const cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  let strokes = [], cur = null, color = '#2b1a4a', width = 3.5, sized = false;
  const size = () => { const r = cv.getBoundingClientRect(), k = devicePixelRatio || 1; cv.width = r.width * k; cv.height = r.height * k; ctx.setTransform(k, 0, 0, k, 0, 0); sized = true; redraw(); };
  const redraw = () => { ctx.clearRect(0, 0, cv.width, cv.height); for (const s of strokes) { ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); s.p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (s.p.length === 1) ctx.lineTo(s.p[0][0] + .1, s.p[0][1]); ctx.stroke(); } };
  const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); cur = { c: color, w: width * (e.pointerType === 'pen' ? .6 + e.pressure : 1), p: [pt(e)] }; strokes.push(cur); redraw(); });
  cv.addEventListener('pointermove', e => { if (!cur) return; cur.p.push(pt(e)); redraw(); });
  ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { cur = null; }));
  box.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.wt) { box.querySelectorAll('[data-wt]').forEach(x => x.classList.toggle('on', x === b)); box.querySelectorAll('.wpane').forEach(p => p.hidden = p.dataset.p !== b.dataset.wt); if (b.dataset.wt === 'draw' && !sized) size(); }
    if (b.dataset.c) { color = b.dataset.c; box.querySelectorAll('.pen').forEach(x => x.classList.toggle('on', x === b)); }
    if (b.dataset.w2) { width = +b.dataset.w2; box.querySelectorAll('[data-w2]').forEach(x => x.classList.toggle('on', x === b)); }
    if (b.hasAttribute('data-undo')) { strokes.pop(); redraw(); }
    if (b.hasAttribute('data-clear')) { strokes = []; redraw(); }
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
      save(); box.close(); heroTab = 'letters'; render(); toast('💌 Sent');
    }
  });
}

const HOME_ACTS = {
  htab: id => { heroTab = id; },
  openLetter: id => {
    const l = LETTERS().find(x => x.id === id); if (!l) return;
    l.readAt = Date.now(); heroTab = 'letters';
  }
};
/* going to another page closes any open dialog */
addEventListener('hashchange', () => document.querySelectorAll('.modal').forEach(m => m.close ? m.close() : m.remove()));
