/* Us – relationship helper. Each feature is a module in MODS: add one object
   {id,title,render} and it appears in the menu. All data lives in S and goes
   through store.load/save, so later you can swap localStorage for a server. */

const APP_VERSION = '1.7', APP_DATE = '10 Nov 2026'; // bump this (and ?v= in index.html) with every change
const KEY = 'us-helper-v1', BASE_KEY = KEY + '-base', DIRTY_KEY = KEY + '-dirty';
const DEFAULTS = {
  names: ['Me', 'Her'], events: [], tasks: [], notes: [], photos: [], sports: [], goals: [], songs: [], calToken: '',
  lists: [{ id: 'l1', name: 'Shopping', items: [] }], milestones: [],
  health: { profiles: {}, food: [], weights: [], myFoods: [], days: {} }, money: { tx: [], budgets: {}, saveGoal: 0, rules: [] }
};
const clone = o => typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
/* Always start from a fresh copy of DEFAULTS, so pushing into S.events never changes DEFAULTS itself. */
const withDefaults = o => ({ ...clone(DEFAULTS), ...(isObj(o) ? o : {}) });
const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('Could not save', e); } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
};
const store = { load: () => withDefaults(ls.get(KEY)), save: s => ls.set(KEY, s) };
let S = store.load();
/* Saving: always keep a local copy; when online mode is on, also push to Supabase. */
const save = () => {
  store.save(S);
  if (sb && authed) { ver++; setDirty(true); clearTimeout(pushTimer); pushTimer = setTimeout(push, 400); }
};

/* ---------- helpers ---------- */
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today0 = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const fmt = s => parse(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
/* shorter date: no year when it is this year */
const fmtShort = s => { const d = parse(s); return d.toLocaleDateString(undefined, d.getFullYear() === new Date().getFullYear() ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }); };
const owner = i => i == 2 ? 'Both' : S.names[i];
const ownerOpts = (sel = 2) => [0, 1, 2].map(i => `<option value="${i}" ${i == sel ? 'selected' : ''}>${esc(owner(i))}</option>`).join('');
/* Same day and month in a given year; 29 Feb becomes 28 Feb in non-leap years. */
const inYear = (d, y) => { const o = new Date(y, d.getMonth(), d.getDate()); if (o.getMonth() !== d.getMonth()) o.setDate(0); return o; };
const nextOcc = m => {
  const d = parse(m.date), t = today0();
  if (!m.repeat) return d;
  let o = inYear(d, t.getFullYear()); if (o < t) o = inYear(d, t.getFullYear() + 1);
  return o < d ? d : o; // a repeating date set in the future starts counting from that date
};
const daysTo = m => Math.round((nextOcc(m) - today0()) / 864e5);
const yearsAt = m => nextOcc(m).getFullYear() - parse(m.date).getFullYear(); // e.g. 3 = third anniversary
const onDay = (m, k) => m.date === k || (m.repeat && k > m.date && iso(inYear(parse(m.date), +k.slice(0, 4))) === k);
const daysLabel = n => n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 0 ? `in ${n} days` : n === -1 ? 'yesterday' : `${-n} days ago`;
const mins = s => +s.mins || 0, kms = s => +s.km || 0;

/* ---------- modules ---------- */
const cal = { y: new Date().getFullYear(), m: new Date().getMonth(), sel: iso(new Date()) };
let listTab = null, noteWho = 'all', taskWho = 'all';
let songAdd = false, songId = null, rotTimer = null, homePhotoId = null, sportRange = 'month', sportWho = 'all';
const legend = () => `<p class="legend">${[0, 1, 2].map(i => `<span class="tag who" data-w="${i}">${esc(owner(i))}</span>`).join(' ')}</p>`;
const copyText = t => navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast('Copied'), () => toast('Could not copy. Select the text and copy it by hand.')) : toast('Copying is not supported here. Select the text and copy it by hand.');
const spotifyId = u => (u || '').trim().match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?|^spotify:)(track|album|playlist|artist|episode|show)[/:]([A-Za-z0-9]+)/);
const overdue = x => !x.done && x.due && x.due < iso(new Date());
const nextSong = () => { const i = S.songs.findIndex(x => x.id === songId); songId = S.songs[(i + 1) % S.songs.length]?.id ?? null; render(); };
const hm = m => `${Math.floor(m / 60)}h ${m % 60}m`;
function shufflePhoto() { homePhotoId = null; render(); }
let editing = null; // id of the item currently being edited
const goTo = k => { const d = parse(k); cal.sel = k; cal.y = d.getFullYear(); cal.m = d.getMonth(); };
const editBtn = id => `<button class="ghost" data-act="edit" data-id="${id}" aria-label="Edit">Edit</button>`;
const formBtns = `<button class="primary">Save</button><button type="button" data-act="cancel">Cancel</button>`;
const hid = id => `<input type="hidden" name="id" value="${id}">`;

function home() {
  const t = iso(new Date()), t0 = today0();
  const byTime = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));
  const when = k => { const n = Math.round((parse(k) - t0) / 864e5); return n === 1 ? 'Tomorrow' : n < 7 ? parse(k).toLocaleDateString(undefined, { weekday: 'long' }) : fmtShort(k); };
  const coming = S.events.filter(e => e.date > t).sort(byTime).slice(0, 5);
  const open = S.tasks.filter(x => !x.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 6);
  const ms = S.milestones.map(m => ({ ...m, n: daysTo(m) })).filter(m => m.n >= 0).sort((a, b) => a.n - b.n).slice(0, 4);
  const lst = S.lists.slice(0, 4).map(l => ({ name: l.name, owner: l.owner ?? 2, open: l.items.filter(i => !i.done) }));
  /* music: your pinned playlist first; Shuffle goes through the others */
  if (!S.songs.find(s => s.id === songId)) songId = (S.songs.find(s => s.pin) || S.songs[0])?.id ?? null;
  const song = S.songs.find(s => s.id === songId);
  if (!S.photos.find(p => p.id === homePhotoId)) homePhotoId = S.photos.length ? S.photos[Math.floor(Math.random() * S.photos.length)].id : null;
  const hp = S.photos.find(p => p.id === homePhotoId);
  const mon = S.sports.filter(s => s.date.startsWith(t.slice(0, 7)));
  const wkStart = iso(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() - ((t0.getDay() + 6) % 7)));
  const tm = i => mon.filter(s => s.who == i || s.who == 2).reduce((a, s) => a + mins(s), 0);
  const kmTot = mon.reduce((a, s) => a + kms(s), 0), mx = Math.max(tm(0), tm(1), 1);
  const byT = {}; mon.forEach(s => byT[s.type] = (byT[s.type] || 0) + mins(s));
  const topT = Object.entries(byT).sort((a, b) => b[1] - a[1])[0];
  const head = (title, id) => `<div class="chead"><h3>${title}</h3><a href="#${id}">Open</a></div>`;
  const hello = (h => h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')(new Date().getHours());
  const player = !song ? `<p class="muted">Tap “+ Add” and paste a Spotify link to a song, album or playlist.</p>`
    : song.sid ? `<iframe class="spot" src="https://open.spotify.com/embed/${song.kind}/${song.sid}?theme=0" height="152" allow="encrypted-media; clipboard-write; autoplay" loading="lazy" title="Spotify player"></iframe>`
    : `<div class="songt">${esc(song.title)}</div><p class="muted">${esc(song.artist)}</p><a class="btn" href="https://open.spotify.com/search/${encodeURIComponent(song.title + ' ' + song.artist)}" target="_blank" rel="noopener">Find on Spotify</a>`;
  const [next, ...more] = ms;
  const msDate = m => fmtShort(iso(nextOcc(m)));
  return `<div class="homehead"><h2>${hello}, ${esc(S.names[0])} & ${esc(S.names[1])}</h2><span class="muted hdate">${fmt(t)}</span></div>
  <div class="home">
    <section class="card span hero"><div class="herogrid">
      <div class="msbox"><h3>Special dates</h3>${next
        ? `<div class="msnext"><div class="big">${next.n === 0 ? 'Today' : next.n}</div><div><p class="mst">${next.n === 0 ? '🎉 ' : next.n === 1 ? 'day until ' : 'days until '}<b>${esc(next.title)}</b></p><p class="msd">${msDate(next)}</p></div></div>
          ${more.length ? `<ul class="mslist">${more.map(m => `<li><span class="grow">${esc(m.title)}</span><span class="msd">${msDate(m)}</span><b>${m.n === 0 ? 'today' : m.n + ' d'}</b></li>`).join('')}</ul>` : ''}
          <a class="msall" href="#dates">All dates →</a>`
        : `<p class="muted">Add an anniversary or birthday under <a href="#dates">Special dates</a>.</p>`}</div>
      <div class="wxpanel" id="wxbox" aria-live="polite">${lastWx || '<h3>Weather</h3><p class="muted">Loading weather…</p>'}</div>
    </div></section>
    <section class="card">${head('Coming up', 'calendar')}${coming.length ? `<ul class="items evlist">${coming.map(e => `<li data-w="${e.who}"><div class="grow"><div class="evt">${esc(e.title)}</div><div class="evm">${when(e.date)}${e.time ? ' · ' + esc(e.time) : ''}${e.location ? ' · ' + esc(e.location) : ''}</div></div></li>`).join('')}</ul>` : `<p class="muted">No upcoming events.</p>`}</section>
    <section class="card">${head('To-dos', 'tasks')}${open.length ? `<ul class="items evlist">${open.map(x => `<li data-w="${x.owner}"><div class="grow"><div class="evt">${esc(x.text)}</div>${x.due ? `<div class="evm">due ${fmtShort(x.due)}</div>` : ''}</div>${overdue(x) ? '<span class="tag warn">overdue</span>' : ''}</li>`).join('')}</ul>` : `<p class="muted">All done.</p>`}</section>
    <section class="card memo">${hp && sb
      ? `<button class="memophoto" onclick="openViewer('${hp.id}')" aria-label="Open photo"><img data-photo="${esc(hp.path)}" alt="Memory from ${fmt(hp.date)}"></button><div class="memocap"><span>${fmt(hp.date)}</span></div>`
      : `<div class="memoempty"><h3>Memory</h3><p class="muted">Add photos to a day in the Calendar. They show here and change every few seconds.</p></div>`}</section>
    <section class="card music" data-hl="${song?.id || ''}"><div class="chead"><h3>${song?.pin ? esc(song.title || 'Our playlist') : 'Our music'}</h3>${S.songs.length > 1 ? `<span class="muted">${S.songs.findIndex(x => x.id === songId) + 1} / ${S.songs.length}</span>` : ''}</div>${player}
      <div class="mbtns">${S.songs.length > 1 ? '<button class="ghost" onclick="nextSong()" aria-label="Next song or playlist">⇄ Next</button>' : ''}<button class="ghost" onclick="songAdd=!songAdd;render()">${songAdd ? 'Close' : '+ Add music'}</button></div>
      ${songAdd ? `<form class="row" data-form="addSong" style="margin:.6rem 0 0"><input type="text" name="url" placeholder="Paste a Spotify link" required aria-label="Spotify link"><button class="primary">Add</button></form>` : ''}
      ${song && songAdd ? `<button class="ghost" data-act="delSong" data-id="${song.id}">Remove this one</button>` : ''}</section>
    <section class="card">${head('Sports this month', 'sports')}${mon.length
      ? `<div class="sportrow"><div class="big">${hm(tm(0) + tm(1))}</div><span class="muted">combined</span></div>
        ${[0, 1].map(i => `<div class="bar" data-w="${i}"><span>${esc(S.names[i])}</span><div><i style="width:${Math.round(tm(i) / mx * 100)}%"></i></div><b>${hm(tm(i))}</b></div>`).join('')}
        <div class="chips"><span class="chip"><b>${mon.length}</b> activities</span><span class="chip"><b>${S.sports.filter(s => s.date >= wkStart).length}</b> this week</span>${kmTot ? `<span class="chip"><b>${kmTot.toFixed(0)}</b> km</span>` : ''}${topT ? `<span class="chip">top <b>${esc(topT[0])}</b></span>` : ''}</div>`
      : `<p class="muted">Nothing logged this month.</p>`}</section>
    <section class="card">${head('Goals today', 'goals')}${S.goals.length
      ? `<div class="hgoals">${[0, 1].map(w => `<a href="#goals" class="hgoal" data-w="${w}">${donut(dayScore(w, t), 92, 10, Math.round(dayScore(w, t) * 100) + '%')}<span>${esc(S.names[w])}</span></a>`).join('')}</div>
        <p class="muted hgl">${S.goals.map(g => esc(g.icon)).join(' ')} ${S.goals.length} daily goals</p>`
      : `<p class="muted">No goals yet.</p>`}</section>
    <section class="card span2">${head('Lists', 'lists')}<div class="listgrid">${lst.length ? lst.map(l => `<a class="mini" href="#lists" data-w="${l.owner}"><strong>${esc(l.name)}</strong> <span class="tag who">${l.open.length || '✓'}</span><div class="muted">${l.open.length ? esc(l.open.slice(0, 3).map(i => i.text).join(', ')) + (l.open.length > 3 ? '…' : '') : 'All done'}</div></a>`).join('') : `<p class="muted">No lists yet.</p>`}</div></section>
  </div>`;
}

function calendar() {
  const first = new Date(cal.y, cal.m, 1), off = (first.getDay() + 6) % 7, n = new Date(cal.y, cal.m + 1, 0).getDate();
  const t = iso(new Date());
  let cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="dow">${d}</div>`).join('');
  cells += '<div class="blank"></div>'.repeat(off);
  for (let d = 1; d <= n; d++) {
    const k = `${cal.y}-${pad(cal.m + 1)}-${pad(d)}`;
    const cls = [k === t && 'today', k === cal.sel && 'sel', S.events.some(e => e.date === k) && 'has'].filter(Boolean).join(' ');
    const ws = [...new Set(S.events.filter(e => e.date === k).map(e => e.who))];
    const dots = ws.length ? `<em class="dots">${ws.map(w => `<b data-w="${w}"></b>`).join('')}</em>` : '';
    const p1 = S.photos.find(p => p.date === k);
    const special = S.milestones.some(m => onDay(m, k));
    cells += `<button class="${cls}${p1 ? ' pic' : ''}" ${p1 ? `data-photo="${esc(p1.thumb)}"` : ''} data-act="pick" data-id="${k}" aria-label="${fmt(k)}${p1 ? ', has photos' : ''}${special ? ', special date' : ''}"><span>${d}</span>${special ? '<em class="msmark" aria-hidden="true">♥</em>' : ''}${dots}</button>`;
  }
  const evs = S.events.filter(e => e.date === cal.sel).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const evLi = e => editing === e.id
    ? `<li><form class="row editing" data-form="saveEvent">${hid(e.id)}<input type="text" name="title" value="${esc(e.title)}" required aria-label="Event title"><input type="date" name="date" value="${e.date}" required aria-label="Date"><input type="time" name="time" value="${esc(e.time || '')}" aria-label="Time"><input type="text" name="location" value="${esc(e.location || '')}" placeholder="Place" aria-label="Place"><select name="who" aria-label="Who">${ownerOpts(e.who)}</select>${formBtns}</form></li>`
    : `<li data-w="${e.who}" data-hl="${e.id}"><span class="grow">${esc(e.title)}${e.location ? ` <span class="muted">at ${esc(e.location)}</span>` : ''}</span><span class="muted">${esc(e.time || 'all day')}</span><span class="tag who">${esc(owner(e.who))}</span>${editBtn(e.id)}<button class="ghost" data-act="delEvent" data-id="${e.id}" aria-label="Delete event">✕</button></li>`;
  const ph = S.photos.filter(p => p.date === cal.sel).sort((a, b) => a.at - b.at);
  const dayMs = S.milestones.filter(m => onDay(m, cal.sel));
  const memories = `<div class="card"><h3>Memories</h3>${sb
    ? `<div class="thumbs">${ph.map(p => `<button class="thumb" data-hl="${p.id}" onclick="openViewer('${p.id}')" aria-label="Open photo"><img data-photo="${p.thumb}" alt="Memory from ${fmt(cal.sel)}"></button>`).join('')}</div>
      <button class="primary" onclick="this.nextElementSibling.click()">Add photos</button><input type="file" accept="image/*" multiple hidden onchange="addPhotos(this)">`
    : '<p class="muted">Photos need the online mode (Supabase login).</p>'}</div>`;
  return `<h2>Calendar</h2>${legend()}
  <div class="calwrap"><div class="card"><div class="calhead"><button data-act="prev" aria-label="Previous month">‹</button><h3>${title}</h3><button data-act="next" aria-label="Next month">›</button></div><div class="cal">${cells}</div></div>
  <div class="daypanel"><div class="card"><h3>${fmt(cal.sel)}</h3>
    ${dayMs.length ? `<p>${dayMs.map(m => `<span class="tag">♥ ${esc(m.title)}</span>`).join(' ')}</p>` : ''}
    <ul class="items">${evs.map(evLi).join('') || '<li class="muted">No events this day.</li>'}</ul>
    <form class="row addev" data-form="addEvent"><input type="text" name="title" placeholder="Add an event on this day…" required aria-label="Event title">
      <input type="time" name="time" aria-label="Time"><input type="text" name="location" placeholder="Place (for weather)" aria-label="Place">
      <select name="who" aria-label="Who">${ownerOpts()}</select><input type="hidden" name="date" value="${cal.sel}"><button class="primary">Add</button></form></div>${memories}</div></div>`;
}

function tasks() {
  const li = x => editing === x.id
    ? `<li><form class="row editing" data-form="saveTask">${hid(x.id)}<input type="text" name="text" value="${esc(x.text)}" required aria-label="To-do"><select name="owner" aria-label="Who">${ownerOpts(x.owner)}</select><input type="date" name="due" value="${x.due || ''}" aria-label="Due date">${formBtns}</form></li>`
    : `<li data-w="${x.owner}" data-hl="${x.id}" class="${x.done ? 'done' : ''}"><input type="checkbox" ${x.done ? 'checked' : ''} data-act="toggleTask" data-id="${x.id}" aria-label="Done">
    <span class="grow">${esc(x.text)} ${x.due ? `<span class="muted">due ${fmt(x.due)}</span>` : ''}</span>${overdue(x) ? '<span class="tag warn">overdue</span>' : ''}${editBtn(x.id)}<button class="ghost" data-act="delTask" data-id="${x.id}" aria-label="Delete to-do">✕</button></li>`;
  const byDue = (a, b) => (a.done - b.done) || (a.due || '9').localeCompare(b.due || '9');
  /* one coloured group per person; a person's filter also shows the shared ("Both") to-dos */
  const ws = taskWho === 'all' ? [0, 1, 2] : [+taskWho, 2];
  const groups = ws.map(w => [w, S.tasks.filter(x => +x.owner === w).sort(byDue)]).filter(([, l]) => l.length);
  const tab = (id, txt, w) => `<button class="${taskWho === id ? 'on' : ''}" data-act="twho" data-id="${id}"${w != null ? ` data-w="${w}"` : ''}>${txt}</button>`;
  const count = w => S.tasks.filter(x => !x.done && (w === 'all' || +x.owner === +w || +x.owner === 2)).length;
  return `<h2>To-do</h2>
  <form class="card row" data-form="addTask"><h3 style="flex-basis:100%;margin:0">New to-do</h3>
    <input type="text" name="text" placeholder="What needs doing?" required aria-label="To-do">
    <select name="owner" aria-label="For whom">${ownerOpts(2)}</select>
    <input type="date" name="due" aria-label="Due date">
    <button class="primary">Add to-do</button></form>
  <div class="tabs">${tab('all', `Everyone <small>${count('all')}</small>`)}${tab('0', `${esc(S.names[0])} <small>${count(0)}</small>`, 0)}${tab('1', `${esc(S.names[1])} <small>${count(1)}</small>`, 1)}</div>
  ${groups.map(([w, l]) => `<div class="card tgroup" data-w="${w}"><div class="chead"><h3><i class="wdot"></i>${esc(owner(w))}</h3><span class="muted">${l.filter(x => !x.done).length} open${l.some(x => x.done) ? `, ${l.filter(x => x.done).length} done` : ''}</span></div>
    <ul class="items">${l.map(li).join('')}</ul></div>`).join('') || '<div class="card"><p class="muted">Nothing here yet.</p></div>'}
  ${S.tasks.some(x => x.done) ? '<p><button data-act="clearDone">Clear all done</button></p>' : ''}`;
}

function notes() {
  const own = n => n.owner ?? 2; // notes made before owners existed belong to both
  const sorted = [...S.notes].filter(n => noteWho === 'all' || own(n) == noteWho || own(n) == 2).sort((a, b) => (b.pin - a.pin) || b.at - a.at);
  const card = n => editing === n.id
    ? `<form class="card editing" data-form="saveNote">${hid(n.id)}<div class="row" style="display:flex;gap:.55rem;margin-bottom:.5rem"><input type="text" name="title" value="${esc(n.title)}" placeholder="Title (optional)" aria-label="Title"><select name="owner" aria-label="Whose note">${ownerOpts(own(n))}</select></div><textarea name="body" required aria-label="Note">${esc(n.body)}</textarea><p>${formBtns}</p></form>`
    : `<article class="card note ${n.pin ? 'pin' : ''}" data-w="${own(n)}" data-hl="${n.id}"><div class="chead"><h3>${n.pin ? '📌 ' : ''}${esc(n.title || 'Untitled')}</h3><span class="tag who">${esc(owner(own(n)))}</span></div><div>${esc(n.body)}</div>
    <p class="muted">${new Date(n.at).toLocaleDateString()} ${editBtn(n.id)}<button class="ghost" data-act="pinNote" data-id="${n.id}">${n.pin ? 'Unpin' : 'Pin'}</button><button class="ghost" data-act="delNote" data-id="${n.id}">Delete</button></p></article>`;
  const tab = (id, txt) => `<button class="${noteWho === id ? 'on' : ''}" data-act="nwho" data-id="${id}">${txt}</button>`;
  return `<h2>Notes</h2>
  <form class="card" data-form="addNote"><div style="display:flex;gap:.55rem;margin-bottom:.5rem;flex-wrap:wrap"><input type="text" name="title" placeholder="Title (optional)" aria-label="Title"><select name="owner" aria-label="Whose note">${ownerOpts(2)}</select></div>
    <textarea name="body" placeholder="Gift ideas, things she said she likes, places to try…" required aria-label="Note"></textarea><p><button class="primary">Save note</button></p></form>
  ${S.notes.length ? `<div class="tabs">${tab('all', 'Everyone')}${tab('0', esc(S.names[0]))}${tab('1', esc(S.names[1]))}</div>` : ''}
  ${sorted.map(card).join('') || (S.notes.length ? '<p class="muted">No notes for this person.</p>' : '')}`;
}

function lists() {
  if (!S.lists.find(l => l.id === listTab)) listTab = S.lists[0]?.id;
  const cur = S.lists.find(l => l.id === listTab);
  const item = i => editing === i.id
    ? `<li><form class="row editing" data-form="saveItem">${hid(i.id)}<input type="text" name="text" value="${esc(i.text)}" required aria-label="Item">${formBtns}</form></li>`
    : `<li data-hl="${i.id}" class="${i.done ? 'done' : ''}"><input type="checkbox" ${i.done ? 'checked' : ''} data-act="toggleItem" data-id="${i.id}" aria-label="Done"><span class="grow">${esc(i.text)}</span>${editBtn(i.id)}<button class="ghost" data-act="delItem" data-id="${i.id}" aria-label="Delete item">✕</button></li>`;
  const foot = cur && (editing === cur.id
    ? `<form class="row editing" data-form="saveList">${hid(cur.id)}<input type="text" name="name" value="${esc(cur.name)}" required aria-label="List name"><select name="owner" aria-label="Whose list">${ownerOpts(cur.owner ?? 2)}</select>${formBtns}</form>`
    : `<p>${editBtn(cur.id).replace('>Edit<', '>Rename list<')}<button class="ghost" data-act="delList" data-id="${cur.id}">Delete this list</button></p>`);
  return `<h2>Lists</h2><p class="muted">Shopping, movies to watch, places to visit, bucket list.</p>
  <div class="tabs">${S.lists.map(l => `<button class="${l.id === listTab ? 'on' : ''}" data-act="tab" data-id="${l.id}" data-w="${l.owner ?? 2}">${esc(l.name)}</button>`).join('')}</div>
  <form class="row" data-form="addList"><input type="text" name="name" placeholder="New list name" required aria-label="List name"><select name="owner" aria-label="Whose list">${ownerOpts(2)}</select><button>Create list</button></form>
  ${cur ? `<div class="card"><form class="row" data-form="addItem"><input type="text" name="text" placeholder="Add to ${esc(cur.name)}" required aria-label="Item"><button class="primary">Add</button></form>
    <ul class="items">${cur.items.map(item).join('') || '<li class="muted">Empty list.</li>'}</ul>${foot}</div>` : ''}`;
}

function dates() {
  // upcoming first (soonest on top), then past one-off dates (most recent on top)
  const ms = S.milestones.map(m => ({ ...m, n: daysTo(m), y: m.repeat ? yearsAt(m) : 0 })).sort((a, b) => (a.n < 0) - (b.n < 0) || (a.n < 0 ? b.n - a.n : a.n - b.n));
  const li = m => editing === m.id
    ? `<li><form class="row editing" data-form="saveMs">${hid(m.id)}<input type="text" name="title" value="${esc(m.title)}" required aria-label="Title"><input type="date" name="date" value="${m.date}" required aria-label="Date"><label class="muted"><input type="checkbox" name="repeat" ${m.repeat ? 'checked' : ''}> every year</label>${formBtns}</form></li>`
    : `<li data-hl="${m.id}" class="${m.n < 0 ? 'past' : ''}"><div class="grow"><div class="evt">${esc(m.title)}</div><div class="evm">${fmtShort(iso(nextOcc(m)))}${m.repeat ? ' · every year' : ''}${m.y > 0 ? ` · ${m.y} year${m.y > 1 ? 's' : ''}` : ''}</div></div><span class="tag ${m.n < 0 ? '' : 'teal'}">${daysLabel(m.n)}</span>${editBtn(m.id)}<button class="ghost" data-act="delMs" data-id="${m.id}" aria-label="Delete date">✕</button></li>`;
  return `<h2>Special dates</h2>
  <form class="row" data-form="addMs"><input type="text" name="title" placeholder="Anniversary, birthday, trip…" required aria-label="Title"><input type="date" name="date" required aria-label="Date">
    <label class="muted"><input type="checkbox" name="repeat" checked> every year</label><button class="primary">Add date</button></form>
  <div class="card"><ul class="items">${ms.map(li).join('') || '<li class="muted">No dates yet.</li>'}</ul></div>`;
}

const calCode = v => { v = (v || '').trim(); const m = v.match(/[?&]token=([^&\s]+)/); return m ? decodeURIComponent(m[1]) : v; }; // accepts the code or a whole link
const calLink = () => `${CFG.SUPABASE_URL}/functions/v1/calendar?token=${encodeURIComponent(calCode(S.calToken))}`;
function settings() {
  return `<h2>Settings</h2>
  <form class="card" data-form="names"><h3>Names</h3><div class="row"><input type="text" name="a" value="${esc(S.names[0])}" aria-label="Your name"><input type="text" name="b" value="${esc(S.names[1])}" aria-label="Partner's name"><button class="primary">Save names</button></div></form>
  ${sb ? `<div class="card"><h3>Phone calendar</h3><p class="muted">Keep your secret code here instead of a note. Both of you can see it after logging in.</p>
    <form class="row" data-form="saveToken"><input type="text" name="token" value="${esc(calCode(S.calToken))}" placeholder="Calendar code (CAL_TOKEN)" aria-label="Calendar code"><button class="primary">Save</button></form>
    ${S.calToken ? `<p class="muted" style="word-break:break-all">${esc(calLink())}</p><button onclick="copyText(this.dataset.t)" data-t="${esc(calLink())}">Copy link</button> <button onclick="copyText(this.dataset.t)" data-t="${esc(calLink().replace('https://', 'webcal://'))}">Copy webcal link</button>` : ''}</div>` : ''}
  ${sb ? `<div class="card"><h3>Account</h3><p class="muted">You are logged in. Changes reach your partner within about 15 seconds.</p><p class="muted" role="status">${esc(syncInfo)}${dirty ? ' · some changes are not saved online yet' : ''}</p><button onclick="syncNow()">Sync now</button> <button data-act="logout">Log out</button>
    <details class="pwbox"><summary>Change password</summary><form data-form="changePassword">${pwFields()}<p><button class="primary">Change password</button> <span class="pwmsg muted" role="status"></span></p></form></details></div>` : ''}
  ${notifyCard()}
  <div class="card"><h3>Backup</h3><p class="muted">${sb ? 'Your data is saved online. A backup file is still a good safety net.' : 'Data is stored in this browser only. Export a copy now and then.'}</p>
    <button data-act="export">Export backup</button> <label><button type="button" onclick="this.nextElementSibling.click()">Import backup</button><input type="file" id="imp" accept=".json" hidden></label></div>
  <p class="muted version">Version ${APP_VERSION} · ${APP_DATE}</p>`;
}

const MODS = [
  { id: 'home', title: 'Home', render: home },
  { id: 'calendar', title: 'Calendar', render: calendar },
  { id: 'tasks', title: 'To-do', render: tasks },
  { id: 'notes', title: 'Notes', render: notes },
  { id: 'lists', title: 'Lists', render: lists },
  { id: 'goals', title: 'Goals', render: goals },
  { id: 'sports', title: 'Sports', render: sports },
  { id: 'health', title: 'Weight', render: health },
  { id: 'money', title: 'Money', render: moneyPage },
  { id: 'dates', title: 'Special dates', short: 'Dates', render: dates },
  { id: 'settings', title: 'Settings', render: settings }
];

/* ---------- actions (buttons/checkboxes) and forms ---------- */
const A = {
  ...HEALTH_ACTS, ...MONEY_ACTS,
  edit: id => { editing = id; },
  cancel: () => { editing = null; },
  pick: id => { cal.sel = id; setTimeout(() => { if (innerWidth <= 1000) view.querySelector('.daypanel')?.scrollIntoView({ behavior: 'smooth' }); }, 60); },
  prev: () => { cal.m--; if (cal.m < 0) { cal.m = 11; cal.y--; } },
  next: () => { cal.m++; if (cal.m > 11) { cal.m = 0; cal.y++; } },
  delEvent: id => { S.events = S.events.filter(e => e.id !== id); },
  toggleTask: id => { const t = S.tasks.find(x => x.id === id); if (t) t.done = !t.done; },
  delTask: id => { S.tasks = S.tasks.filter(x => x.id !== id); },
  clearDone: () => { const n = S.tasks.filter(x => x.done).length; if (confirm(`Remove ${n} finished to-do${n > 1 ? 's' : ''}?`)) S.tasks = S.tasks.filter(x => !x.done); },
  pinNote: id => { const n = S.notes.find(x => x.id === id); if (n) n.pin = !n.pin; },
  delNote: id => { if (confirm('Delete this note?')) S.notes = S.notes.filter(x => x.id !== id); },
  tab: id => { listTab = id; editing = null; },
  toggleItem: id => { const i = curList()?.items.find(x => x.id === id); if (i) i.done = !i.done; },
  delItem: id => { const l = curList(); if (l) l.items = l.items.filter(x => x.id !== id); },
  delList: id => { const l = S.lists.find(x => x.id === id); if (l && confirm(`Delete the list "${l.name}" and its ${l.items.length} item(s)?`)) S.lists = S.lists.filter(x => x.id !== id); },
  delMs: id => { S.milestones = S.milestones.filter(m => m.id !== id); },
  srange: id => { sportRange = id; },
  swho: id => { sportWho = id; },
  nwho: id => { noteWho = id; },
  twho: id => { taskWho = id; },
  delSong: id => { const x = S.songs.find(s => s.id === id); if (x && confirm('Remove this from your music?')) { S.songs = S.songs.filter(s => s.id !== id); songId = null; } },
  delGoal: id => { const g = S.goals.find(x => x.id === id); if (g && confirm(`Delete "${g.name}" and its history?`)) S.goals = S.goals.filter(x => x.id !== id); },
  gstep: k => { const [id, w, dir] = k.split('|'), g = S.goals.find(x => x.id === id); if (!g) return; const t = iso(new Date()), L = (g.log[w] ||= {}); const v = Math.max(0, Math.round(((L[t] || 0) + (+dir) * g.step) * 100) / 100); if (v) L[t] = v; else delete L[t]; },
  grange: n => { goalDays = +n; },
  delSport: id => { S.sports = S.sports.filter(s => s.id !== id); },
  logout: () => { logout(); },
  more: () => { moreOpen = !moreOpen; },
  authMode: m => { authMode = m; },
  notifyOn: () => { notifyOn(); },
  notifyOff: () => { notifyOff(); },
  notifyTest: () => { notifyTest(); },
  export: () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
    a.download = `us-backup-${iso(new Date())}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
};
const curList = () => S.lists.find(l => l.id === listTab);
const F = {
  ...HEALTH_FORMS, ...MONEY_FORMS,
  addEvent: d => { const e = { id: uid(), date: d.date, title: d.title.trim(), time: d.time, who: +d.who, location: (d.location || '').trim() }; S.events.push(e); goTo(d.date); geocodeEvent(e); },
  addTask: d => S.tasks.push({ id: uid(), text: d.text.trim(), owner: +d.owner, due: d.due, done: false }),
  addNote: d => S.notes.push({ id: uid(), title: d.title.trim(), body: d.body.trim(), owner: +d.owner, pin: false, at: Date.now() }),
  addList: d => { const l = { id: uid(), name: d.name.trim(), owner: +d.owner, items: [] }; S.lists.push(l); listTab = l.id; },
  addItem: d => curList()?.items.push({ id: uid(), text: d.text.trim(), done: false }),
  addMs: d => S.milestones.push({ id: uid(), title: d.title.trim(), date: d.date, repeat: !!d.repeat }),
  saveEvent: d => { const e = S.events.find(x => x.id === d.id); Object.assign(e, { title: d.title.trim(), date: d.date, time: d.time, who: +d.who }); const loc = (d.location || '').trim(); if (loc !== (e.location || '')) { e.location = loc; e.lat = e.lon = null; geocodeEvent(e); } goTo(d.date); },
  saveTask: d => Object.assign(S.tasks.find(x => x.id === d.id), { text: d.text.trim(), owner: +d.owner, due: d.due }),
  saveNote: d => Object.assign(S.notes.find(x => x.id === d.id), { title: d.title.trim(), body: d.body.trim(), owner: +d.owner }),
  saveItem: d => { const i = curList()?.items.find(x => x.id === d.id); if (i) i.text = d.text.trim(); },
  saveList: d => { Object.assign(S.lists.find(l => l.id === d.id), { name: d.name.trim(), owner: +d.owner }); },
  saveMs: d => Object.assign(S.milestones.find(x => x.id === d.id), { title: d.title.trim(), date: d.date, repeat: !!d.repeat }),
  addSport: d => S.sports.push({ id: uid(), ...sportData(d) }),
  saveSport: d => Object.assign(S.sports.find(x => x.id === d.id), sportData(d)),
  addGoal: d => S.goals.push(newGoal({ name: d.name.trim(), icon: (d.icon || '').trim() || '⭐', unit: d.unit.trim(), target: +d.target, step: +d.step || 1, owner: +d.owner }, uid())),
  saveGoal: d => Object.assign(S.goals.find(x => x.id === d.id), { name: d.name.trim(), icon: (d.icon || '').trim() || '⭐', unit: d.unit.trim(), target: Math.max(+d.target || 1, 0.01), step: +d.step || 1, owner: +d.owner }),
  addSong: d => { const m = spotifyId(d.url); if (!m) { toast('That does not look like a Spotify link.'); return; } const id = uid(); S.songs.push({ id, kind: m[1], sid: m[2] }); songAdd = false; songId = id; },
  saveToken: d => { S.calToken = calCode(d.token); },
  names: d => { S.names = [d.a.trim() || 'Me', d.b.trim() || 'Her']; }
};

const ICONS = {
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  sports: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  tasks: '<path d="M4 12l5 5L20 6"/>',
  notes: '<path d="M5 3h10l4 4v14H5z"/><path d="M9 12h6M9 16h6"/>',
  lists: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  health: '<path d="M4 20h16l-2-14H6z"/><path d="M9 10a3 3 0 0 1 6 0M12 10l1.5-2"/>',
  money: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 15h2"/>',
  dates: '<path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'
};

/* ---------- cloud sync (Supabase) ---------- */
const CFG = window.CONFIG || {};
/* Arriving from a "reset password" email: the link carries type=recovery (or an error if it expired). Read it before Supabase tidies the address. */
const AUTH_HASH = new URLSearchParams(location.hash.slice(1));
let recovering = AUTH_HASH.get('type') === 'recovery', authMode = 'login';
const authLinkError = AUTH_HASH.get('error_description');
const sb = (CFG.SUPABASE_URL && CFG.SUPABASE_KEY && window.supabase) ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY) : null;
/* How syncing works: "base" is the last version both this device and the server agreed on.
   When saving, if the server changed since then (your partner saved something), the two sets of
   changes are merged item by item (by id) instead of one overwriting the other. "dirty" means
   there are local changes not yet online; it survives a reload, so offline edits are not lost. */
let authed = !sb, dirty = !!ls.get(DIRTY_KEY), pushTimer = null, syncInfo = '', ver = 0, pushing = null;
let base = ls.get(BASE_KEY) || { data: null, at: null };
const canon = o => JSON.stringify(o, (k, v) => isObj(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : 1)) : v);
const same = (a, b) => canon(a) === canon(b);
const setDirty = v => { dirty = v; v ? ls.set(DIRTY_KEY, 1) : ls.del(DIRTY_KEY); };
const setBase = (data, at) => { base = { data: clone(data), at }; ls.set(BASE_KEY, base); };
const busy = () => editing || document.activeElement?.matches('input,textarea,select');
const byIdArr = v => Array.isArray(v) && v.every(x => isObj(x) && x.id != null);
/* Three-way merge: b = common base, l = this device, r = server. */
function merge3(b, l, r) {
  if (same(l, r)) return l;
  if (same(l, b)) return r;
  if (same(r, b)) return l;
  if (byIdArr(l) && byIdArr(r) && (b == null || byIdArr(b))) {
    const B = new Map((b || []).map(x => [x.id, x])), L = new Map(l.map(x => [x.id, x])), R = new Set(r.map(x => x.id));
    const out = [];
    for (const x of r) {
      if (L.has(x.id)) out.push(merge3(B.get(x.id), L.get(x.id), x)); // on both sides: merge fields
      else if (!B.has(x.id)) out.push(x);                              // new on the server
      /* else: deleted on this device */
    }
    for (const x of l) if (!R.has(x.id) && !B.has(x.id)) out.push(x);  // new on this device
    return out;
  }
  if (isObj(l) && isObj(r)) {
    const bo = isObj(b) ? b : {}, out = {};
    for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
      if (k in l && k in r) out[k] = merge3(bo[k], l[k], r[k]);
      else if (k in l) { if (!(k in bo) || !same(l[k], bo[k])) out[k] = l[k]; }
      else if (!(k in bo) || !same(r[k], bo[k])) out[k] = r[k];
    }
    return out;
  }
  return l; // both changed the very same value: this device wins
}
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 4000); }
const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function push() { // only one save at a time; a save requested meanwhile runs right after
  clearTimeout(pushTimer);
  if (pushing) return pushing.then(() => dirty && push());
  pushing = doPush().catch(e => { toast('Could not save online: ' + (e.message || e)); }).finally(() => { pushing = null; });
  return pushing;
}
async function doPush() {
  for (let tries = 0; tries < 4; tries++) {
    const sentVer = ver;
    const cur = await sb.from('shared_data').select('data,updated_at').eq('id', 1).maybeSingle();
    if (cur.error) throw cur.error;
    if (!cur.data) { toast('Not saved online: the shared row is missing or blocked. Check the Supabase setup.'); return; }
    const remote = cur.data.data || {}, at = cur.data.updated_at;
    if (at !== base.at && Object.keys(remote).length) { // partner saved since we last synced: merge
      const merged = withDefaults(merge3(base.data, S, remote));
      if (!same(merged, S)) { S = merged; store.save(S); if (!busy()) render(); }
    }
    const payload = clone(S);
    let q = sb.from('shared_data').update({ data: payload, updated_at: new Date().toISOString() }).eq('id', 1);
    q = at == null ? q.is('updated_at', null) : q.eq('updated_at', at); // only if nobody saved in between
    const { data, error } = await q.select('updated_at');
    if (error) throw error;
    if (data.length) {
      tellPartner(remote, payload);
      setBase(payload, data[0].updated_at);
      if (ver === sentVer) setDirty(false);
      syncInfo = 'Last saved online at ' + stamp();
      return;
    }
    /* someone saved in the meantime: go round again and merge their change too */
  }
  toast('Not saved online yet, will retry shortly.');
}
async function pull(first) {
  if (dirty) return push(); // local changes first; push also brings in the partner's changes
  if (!first && base.at) { // cheap check first: download everything only if something changed
    const h = await sb.from('shared_data').select('updated_at').eq('id', 1).maybeSingle();
    if (!h.error && h.data?.updated_at === base.at) { syncInfo = 'Last checked online at ' + stamp(); return; }
  }
  const { data, error } = await sb.from('shared_data').select('data,updated_at').eq('id', 1).maybeSingle();
  if (error || !data) { if (first) toast('Could not load online data: ' + (error ? error.message : 'the shared row is missing')); return; }
  syncInfo = 'Last checked online at ' + stamp();
  const remote = data.data || {};
  if (!Object.keys(remote).length) { if (first) { setDirty(true); return push(); } return; } // online copy empty: upload this device's data
  if (dirty || pushing || (!first && busy())) return;
  setBase(remote, data.updated_at);
  const merged = withDefaults(remote);
  if (same(merged, S)) return;
  S = merged; store.save(S); render();
}
async function syncNow() { await pull(true); render(); toast(dirty ? 'Some changes are still not online.' : 'Up to date'); }
async function login(fd) {
  const msg = document.getElementById('loginmsg'); msg.textContent = 'Signing in…';
  const { error } = await sb.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
  if (error) { msg.textContent = /invalid/i.test(error.message) ? 'Wrong email or password.' : 'Could not log in: ' + error.message; return; }
  authed = true; await pull(true); render();
}
async function logout() {
  if (dirty) await push();
  if (dirty && !confirm('Some changes are not saved online yet and would be lost. Log out anyway?')) return;
  await sb.auth.signOut();
  /* forget this device's copy, so the next person using this browser cannot see your data */
  [KEY, BASE_KEY, DIRTY_KEY].forEach(ls.del);
  S = withDefaults(); base = { data: null, at: null }; dirty = false; authed = false; editing = null;
  render();
}
const loginView = () => authMode === 'forgot'
  ? `<form class="card login" data-form="forgot"><img class="loginlogo" src="us-cutout.png" alt=""><h2>Forgot your password?</h2><p class="muted">Type your email and we'll send you a link to choose a new password. Open the link on this phone or computer.</p>
  <p><input type="email" name="email" placeholder="Email" required autocomplete="username" aria-label="Email" style="width:100%"></p>
  <p><button class="primary">Send link</button> <button type="button" data-act="authMode" data-id="login">Back to log in</button></p><p id="loginmsg" class="muted" role="status"></p></form>`
  : `<form class="card login" data-form="login"><img class="loginlogo" src="us-cutout.png" alt=""><h2>Welcome back</h2><p class="muted">Log in to open your shared space.</p>
  ${authLinkError ? `<p class="loginerr" role="alert">That password link didn't work (${esc(authLinkError.replace(/\+/g, ' '))}). Links work once and expire after an hour, so ask for a new one below.</p>` : ''}
  <p><input type="email" name="email" placeholder="Email" required autocomplete="username" aria-label="Email" style="width:100%"></p>
  <p><input type="password" name="password" placeholder="Password" required autocomplete="current-password" aria-label="Password" style="width:100%"></p>
  <p><button class="primary">Log in</button> <button type="button" class="ghost" data-act="authMode" data-id="forgot">Forgot password?</button></p><p id="loginmsg" class="muted" role="status"></p></form>`;
const pwFields = (first = 'New password') => `<p><input type="password" name="pw" placeholder="${first}" required minlength="8" autocomplete="new-password" aria-label="${first}" style="width:100%"></p>
  <p><input type="password" name="pw2" placeholder="Repeat it" required minlength="8" autocomplete="new-password" aria-label="Repeat the new password" style="width:100%"></p>`;
const recoverView = () => `<form class="card login" data-form="newPassword"><img class="loginlogo" src="us-cutout.png" alt=""><h2>Choose a new password</h2><p class="muted">At least 8 characters. Use something you don't use anywhere else.</p>
  ${pwFields()}<p><button class="primary">Save new password</button></p><p id="loginmsg" class="muted" role="status"></p></form>`;
async function sendReset(fd) {
  const msg = document.getElementById('loginmsg'); msg.textContent = 'Sending…';
  const { error } = await sb.auth.resetPasswordForEmail(String(fd.get('email')).trim(), { redirectTo: location.origin + location.pathname });
  msg.textContent = error && /rate|too many|seconds/i.test(error.message) ? 'Too many tries. Wait a few minutes and try again.'
    : error ? 'Could not send the email: ' + error.message
    : 'Done. If this email has an account, a link is on its way. Check your inbox (and spam).';
}
/* used by both the "reset" link page and Settings → Change password */
async function setPassword(fd, msgEl) {
  const pw = String(fd.get('pw')), pw2 = String(fd.get('pw2'));
  if (pw.length < 8) { msgEl.textContent = 'Use at least 8 characters.'; return false; }
  if (pw !== pw2) { msgEl.textContent = "The two passwords don't match."; return false; }
  msgEl.textContent = 'Saving…';
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) {
    msgEl.textContent = /same|different from the old/i.test(error.message) ? 'That is your current password. Pick a new one.'
      : /reauth|recent/i.test(error.message) ? 'For safety, log out and log in again, then change it right away.'
      : /weak|short|pwned|leaked/i.test(error.message) ? 'That password is too weak or has appeared in a data leak. Pick a different one.'
      : 'Could not change it: ' + error.message;
    return false;
  }
  return true;
}
async function boot() {
  if (sb) {
    const { data } = await sb.auth.getSession();
    authed = !!data.session;
    if (authed) await pull(true);
    await checkPush();
    setInterval(() => { if (authed && !document.hidden) pull(); }, 15000);
    /* coming back to the tab: fetch news; leaving it (e.g. locking the phone): save right away */
    document.addEventListener('visibilitychange', () => { if (authed) document.hidden ? dirty && push() : pull(); });
    addEventListener('online', () => { if (authed) pull(); });
    addEventListener('beforeunload', e => { if (authed && dirty) { push(); e.preventDefault(); e.returnValue = ''; } });
    /* session ended elsewhere (expired or logged out in another tab): show the login again */
    sb.auth.onAuthStateChange(ev => {
      if (ev === 'SIGNED_OUT' && authed) { authed = false; editing = null; render(); }
      if (ev === 'PASSWORD_RECOVERY') { recovering = true; authed = true; setTimeout(render); }
    });
    if (authLinkError) history.replaceState(null, '', location.pathname); // tidy the address; the message is shown on the login
  }
  render();
}

/* ---------- photos (Supabase Storage, private bucket "memories") ---------- */
const urlCache = {};
async function urls(paths) {
  const need = [...new Set(paths)].filter(p => !urlCache[p] || urlCache[p].exp < Date.now());
  if (need.length) {
    try {
      const { data } = await sb.storage.from('memories').createSignedUrls(need, 3600);
      (data || []).forEach(d => { if (d.signedUrl) urlCache[d.path] = { url: d.signedUrl, exp: Date.now() + 3300e3 }; });
    } catch { /* offline: photos just stay blank until the next render */ }
  }
}
async function hydrate() {
  if (!sb || !authed) return;
  const els = [...view.querySelectorAll('[data-photo]')]; if (!els.length) return;
  await urls(els.map(e => e.dataset.photo));
  els.forEach(e => { const u = urlCache[e.dataset.photo]?.url; if (!u) return; if (e.tagName === 'IMG') e.src = u; else e.style.backgroundImage = `url("${u}")`; });
}
async function shrink(file, max, q) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', q));
}
async function addPhotos(input) {
  const files = [...input.files]; if (!files.length) return;
  const date = cal.sel; toast(`Uploading ${files.length} photo${files.length > 1 ? 's' : ''}…`);
  for (const f of files) {
    try {
      const [full, thumb] = await Promise.all([shrink(f, 1600, .82), shrink(f, 360, .7)]);
      const id = uid() + Date.now().toString(36), bucket = sb.storage.from('memories');
      let r = await bucket.upload(`${id}.jpg`, full, { contentType: 'image/jpeg' }); if (r.error) throw r.error;
      r = await bucket.upload(`${id}_t.jpg`, thumb, { contentType: 'image/jpeg' }); if (r.error) throw r.error;
      S.photos.push({ id, date, path: `${id}.jpg`, thumb: `${id}_t.jpg`, at: Date.now() }); save();
    } catch (e) { toast('Upload failed: ' + (e.message || e)); }
  }
  input.value = ''; render();
}
function openViewer(id) {
  const start = S.photos.find(p => p.id === id); if (!start) return;
  const list = S.photos.filter(p => p.date === start.date).sort((a, b) => a.at - b.at);
  let i = list.findIndex(p => p.id === id);
  const back = document.activeElement;
  const box = document.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Photo viewer');
  box.innerHTML = `<img alt="Memory"><div class="lbbar"><button data-x="prev" aria-label="Previous">‹</button><span></span><button data-x="next" aria-label="Next">›</button><button data-x="del">Delete</button><button data-x="close">Close</button></div>`;
  document.body.append(box);
  const img = box.querySelector('img'), cap = box.querySelector('span');
  const show = async () => { const p = list[i]; cap.textContent = `${fmt(p.date)}, ${i + 1} of ${list.length}`; await urls([p.path]); img.src = urlCache[p.path]?.url || ''; };
  const close = () => { box.remove(); document.removeEventListener('keydown', keys); back?.focus?.(); };
  const step = n => { i = (i + n + list.length) % list.length; show(); };
  const keys = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); };
  document.addEventListener('keydown', keys);
  box.onclick = async e => {
    const x = e.target.dataset.x;
    if (e.target === box || x === 'close') return close();
    if (x === 'prev') step(-1);
    if (x === 'next') step(1);
    if (x === 'del' && confirm('Delete this photo for both of you?')) {
      const p = list[i];
      const { error } = await sb.storage.from('memories').remove([p.path, p.thumb]);
      if (error) { toast('Could not delete the photo: ' + error.message); return; }
      S.photos = S.photos.filter(q => q.id !== p.id); save(); close(); render();
    }
  };
  box.querySelector('[data-x=close]').focus();
  show();
}

/* ---------- phone notifications (Web Push via the Supabase function "notify") ---------- */
const ME_KEY = KEY + '-me';
const me = () => { const v = ls.get(ME_KEY); return v === 0 || v === 1 ? v : null; }; // who uses this device (not synced)
const pushReady = () => !!(sb && CFG.VAPID_PUBLIC_KEY && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let pushSub = null; // this device's subscription, if any
const b64ToBytes = s => { const b = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function swReg() { return navigator.serviceWorker.register('sw.js'); }
async function checkPush() {
  if (!pushReady()) return;
  try { const r = await navigator.serviceWorker.getRegistration(); pushSub = r ? await r.pushManager.getSubscription() : null; } catch { pushSub = null; }
  /* make sure the server knows this phone (also repairs a sign-up that failed to save earlier) */
  if (pushSub && me() !== null) {
    const { error } = await sb.from('push_subs').upsert({ endpoint: pushSub.endpoint, sub: pushSub.toJSON(), who: me() });
    if (error) console.warn('Could not register this device for notifications', error);
  }
}
async function notifyOn() {
  if (me() === null) { toast('First choose who uses this device.'); return; }
  try {
    if (await Notification.requestPermission() !== 'granted') { toast('Notifications are blocked. Allow them in the phone settings for this app.'); return; }
    const reg = await swReg(); await navigator.serviceWorker.ready;
    pushSub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(CFG.VAPID_PUBLIC_KEY) });
    const { error } = await sb.from('push_subs').upsert({ endpoint: pushSub.endpoint, sub: pushSub.toJSON(), who: me() });
    if (error) { await pushSub.unsubscribe().catch(() => {}); pushSub = null; throw error; } // keep phone and server in step
    toast('Notifications are on for this device');
  } catch (e) { toast('Could not turn on notifications: ' + (e.message || e)); }
  render();
}
async function notifyOff() {
  try {
    if (pushSub) { await sb.from('push_subs').delete().eq('endpoint', pushSub.endpoint); await pushSub.unsubscribe(); }
    pushSub = null; toast('Notifications are off for this device');
  } catch (e) { toast('Could not turn off: ' + (e.message || e)); }
  render();
}
async function callNotify(body) {
  const { data, error } = await sb.functions.invoke('notify', { body });
  if (error) throw error;
  return data;
}
async function notifyTest() {
  try {
    await checkPush(); // re-register first, in case the server lost this phone
    const r = await callNotify({ test: true, endpoint: pushSub?.endpoint });
    toast(r?.sent ? 'Test sent, it should arrive in a few seconds' : r?.error ? 'Server problem: ' + r.error : 'Nothing was sent. Tap “Turn off”, then “Turn on notifications” again.');
  }
  catch (e) { toast('Test failed: ' + (e.message || e) + '. Is the "notify" function set up in Supabase?'); }
}
/* What did this device add compared with the server copy? Used to tell the partner. */
/* [collection, label, text, page, whose it is (0, 1 or 2 = both)] */
const KINDS = [['events', 'Calendar', x => x.title, 'calendar', x => x.who], ['tasks', 'To-do', x => x.text, 'tasks', x => x.owner], ['notes', 'Notes', x => x.title || x.body, 'notes', x => x.owner],
  ['milestones', 'Special dates', x => x.title, 'dates', () => 2], ['sports', 'Sports', x => x.type, 'sports', x => x.who], ['goals', 'Goals', x => x.name || x.text, 'goals', x => x.owner],
  ['songs', 'Music', () => 'a song', 'home', () => 2], ['photos', 'Memories', () => 'a photo', 'calendar', () => 2]];
function addedItems(before, after) {
  const out = [], ids = a => new Set((Array.isArray(a) ? a : []).map(x => x.id));
  for (const [k, label, txt, page, whose] of KINDS) { const old = ids(before?.[k]); (after[k] || []).filter(x => !old.has(x.id)).forEach(x => out.push({ where: label, what: String(txt(x) || '').slice(0, 80), link: `#${page}/${x.id}`, own: +(whose(x) ?? 2) })); }
  const oldLists = new Map((before?.lists || []).map(l => [l.id, ids(l.items)]));
  for (const l of after.lists || []) {
    const old = oldLists.get(l.id);
    const own = +(l.owner ?? 2);
    if (!old) out.push({ where: 'Lists', what: `new list "${l.name}"`, link: `#lists/${l.id}`, own });
    (l.items || []).filter(i => old && !old.has(i.id)).forEach(i => out.push({ where: l.name, what: i.text, link: `#lists/${l.id}/${i.id}`, own }));
  }
  return out;
}
function tellPartner(before, after) {
  if (!pushReady() || !before || !Object.keys(before).length) return;
  /* only things that concern the partner: theirs or shared ("Both"), never what you added just for yourself */
  const items = addedItems(before, after).filter(x => me() === null || x.own === 2 || x.own !== me());
  if (items.length) callNotify({ by: me(), items: items.slice(0, 10), link: items[0].link, endpoint: pushSub?.endpoint }).catch(() => { /* function not set up: no notification */ });
}
const whoOpts = () => [0, 1].map(i => `<option value="${i}" ${me() === i ? 'selected' : ''}>${esc(S.names[i])}</option>`).join('');
function notifyCard() {
  if (!sb) return '';
  let body;
  if (!CFG.VAPID_PUBLIC_KEY) body = '<p class="muted">Not set up yet: add VAPID_PUBLIC_KEY to config.js (see NOTIFICATIONS-SETUP.md).</p>';
  else if (isIOS && !standalone) body = '<p class="muted">On iPhone this only works from the home screen app: tap Share → “Add to Home Screen”, open Us from there and come back here.</p>';
  else if (!pushReady()) body = '<p class="muted">This browser does not support notifications.</p>';
  else body = `<p class="muted">Get a notification when ${me() === null ? 'your partner' : esc(S.names[1 - me()])} adds something.</p>
    ${pushSub ? '<p><span class="tag teal">On for this device</span></p><button data-act="notifyTest">Send a test</button> <button data-act="notifyOff">Turn off</button>'
      : '<button class="primary" data-act="notifyOn">Turn on notifications</button>'}`;
  return `<div class="card"><h3>Notifications</h3>
    <label class="muted">This device belongs to <select data-me aria-label="Who uses this device"><option value="">choose…</option>${whoOpts()}</select></label>${body}</div>`;
}

/* ---------- weather (Open-Meteo, no key needed) + event places ---------- */
const HOME_PLACES = [['Prague', 50.0755, 14.4378], ['Hradec Králové', 50.2092, 15.8328]]; // first one is "home"
const WX = {};
let lastWx = ''; // last weather HTML, shown straight away on the next render instead of "Loading…"
const wxText = c => c === 0 ? 'Clear' : c <= 2 ? 'Partly cloudy' : c === 3 ? 'Cloudy' : c <= 48 ? 'Fog' : c <= 57 ? 'Drizzle' : c <= 67 ? 'Rain' : c <= 77 ? 'Snow' : c <= 82 ? 'Showers' : c <= 86 ? 'Snow showers' : 'Thunderstorm';
const wxIcon = (c, day = 1) => c === 0 ? (day ? '☀️' : '🌙') : c <= 2 ? (day ? '⛅' : '☁️') : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌦️' : c <= 86 ? '🌨️' : '⛈️';
async function wx(lat, lon) {
  const k = (+lat).toFixed(3) + ',' + (+lon).toFixed(3); if (WX[k] && Date.now() - WX[k].t < 18e5) return WX[k].d;
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,weather_code,precipitation_probability,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset&timezone=auto&forecast_days=10`);
  if (!r.ok) throw new Error('weather ' + r.status);
  const d = await r.json(); WX[k] = { t: Date.now(), d }; return d;
}
const deg = v => `${Math.round(v)}°`;
const hourAt = (d, date, time) => d.hourly.time.indexOf(`${date}T${(time || '12:00').slice(0, 2)}:00`);
/* Weather for one planned event: at its place (or home) and at its time (or the whole day). */
async function eventWx(e) {
  const at = e.lat != null ? [e.lat, e.lon] : HOME_PLACES[0].slice(1);
  const d = await wx(...at);
  const h = e.time ? hourAt(d, e.date, e.time) : -1;
  if (h >= 0) return { code: d.hourly.weather_code[h], day: d.hourly.is_day[h], temp: deg(d.hourly.temperature_2m[h]), rain: d.hourly.precipitation_probability[h], min: d.hourly.temperature_2m[h] };
  const i = d.daily.time.indexOf(e.date); if (i < 0) return null;
  return { code: d.daily.weather_code[i], day: 1, temp: `${deg(d.daily.temperature_2m_min[i])}–${deg(d.daily.temperature_2m_max[i])}`, rain: d.daily.precipitation_probability_max[i], min: d.daily.temperature_2m_min[i] };
}
async function buildWeather() {
  const box = view.querySelector('#wxbox'); if (!box) return;
  const t = iso(new Date()), t0 = today0(), [hName, hLat, hLon] = HOME_PLACES[0];
  try {
    const d = await wx(hLat, hLon), c = d.current, di = d.daily.time.indexOf(t);
    const nowH = d.hourly.time.indexOf(c.time.slice(0, 13) + ':00');
    const hours = [0, 2, 4, 6, 8, 10].map(o => nowH + o).filter(i => nowH >= 0 && i < d.hourly.time.length);
    /* today's plans that haven't finished yet (anything started over 2 hours ago is hidden) */
    const nowHM = new Date().getHours() * 60 + new Date().getMinutes();
    const plans = S.events.filter(e => e.date === t && (!e.time || +e.time.slice(0, 2) * 60 + +e.time.slice(3, 5) >= nowHM - 120))
      .sort((a, b) => (a.time || '').localeCompare(b.time || '')).slice(0, 4);
    const pw = await Promise.all(plans.map(e => eventWx(e).catch(() => null)));
    /* the next trip within the forecast range (an event somewhere else in the next 9 days) */
    const trip = S.events.filter(e => e.date > t && e.lat != null && Math.round((parse(e.date) - t0) / 864e5) <= 9).sort((a, b) => a.date.localeCompare(b.date))[0];
    const tw = trip ? await eventWx(trip).catch(() => null) : null;
    const others = await Promise.all(HOME_PLACES.slice(1).map(async ([n, la, lo]) => { try { const o = await wx(la, lo); return { n, c: o.current }; } catch { return null; } }));
    /* friendly tips */
    const rainMax = Math.max(di >= 0 ? d.daily.precipitation_probability_max[di] : 0, ...pw.filter(Boolean).map(w => w.rain || 0));
    const coldMin = Math.min(di >= 0 ? d.daily.temperature_2m_min[di] : 99, ...pw.filter(Boolean).map(w => w.min));
    const tips = [rainMax >= 50 && '☂️ Take an umbrella', coldMin <= 0 && '🧣 Freezing, wrap up warm', c.wind_speed_10m >= 35 && '💨 Very windy',
      di >= 0 && d.daily.temperature_2m_max[di] >= 28 && '🧴 Hot, sunscreen and water', rainMax < 20 && c.weather_code <= 2 && c.is_day && '😎 Nice day to go outside'].filter(Boolean).slice(0, 2);
    const plansHtml = plans.length ? `<div class="wxplans">${plans.map((e, i) => { const w = pw[i]; return `<div class="wxplan" data-w="${e.who}"><span class="wxpt">${esc(e.time || 'all day')}</span><span class="grow">${esc(e.title)}<small>${esc(e.location || hName)}</small></span>${w ? `<span class="wxpw">${wxIcon(w.code, w.day)} <b>${w.temp}</b>${w.rain >= 20 ? ` <small>💧${w.rain}%</small>` : ''}</span>` : '<small>no forecast</small>'}</div>`; }).join('')}</div>`
      : '<p class="wxnone">No plans today, the weather is all yours.</p>';
    lastWx = `<div class="wxtop"><span class="wxbig">${wxIcon(c.weather_code, c.is_day)}</span>
      <div><div class="wxtemp">${deg(c.temperature_2m)}</div><div class="wxdesc">${wxText(c.weather_code)} in ${esc(hName)}</div></div>
      <div class="wxmeta">${di >= 0 ? `<span>↑ ${deg(d.daily.temperature_2m_max[di])} ↓ ${deg(d.daily.temperature_2m_min[di])}</span><span>💧 ${d.daily.precipitation_probability_max[di]}% rain</span>` : ''}<span>feels ${deg(c.apparent_temperature)} · 💨 ${Math.round(c.wind_speed_10m)} km/h</span></div></div>
      <div class="wxhours">${hours.map((i, k) => `<div><small>${k ? d.hourly.time[i].slice(11, 16) : 'Now'}</small><span>${k ? wxIcon(d.hourly.weather_code[i], d.hourly.is_day[i]) : wxIcon(c.weather_code, c.is_day)}</span><b>${deg(k ? d.hourly.temperature_2m[i] : c.temperature_2m)}</b>${d.hourly.precipitation_probability[i] >= 30 ? `<small class="wxrain">${d.hourly.precipitation_probability[i]}%</small>` : ''}</div>`).join('')}</div>
      <div class="wxsub"><h4>Today's plans</h4>${plansHtml}</div>
      ${tips.length ? `<div class="wxtips">${tips.map(x => `<span>${x}</span>`).join('')}</div>` : ''}
      <div class="wxfoot">${others.filter(Boolean).map(o => `<span>${esc(o.n)} ${wxIcon(o.c.weather_code, o.c.is_day)} <b>${deg(o.c.temperature_2m)}</b></span>`).join('')}${trip && tw ? `<span>${esc(trip.location)}, ${parse(trip.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} ${wxIcon(tw.code)} <b>${tw.temp}</b></span>` : ''}</div>`;
    const cur = view.querySelector('#wxbox'); if (cur) cur.innerHTML = lastWx;
  } catch {
    if (lastWx) return;
    const plans = S.events.filter(e => e.date === t).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    box.innerHTML = `<h3>Weather</h3><p class="wxnone">Weather is not available right now.</p>${plans.length ? `<div class="wxsub"><h4>Today's plans</h4><div class="wxplans">${plans.map(e => `<div class="wxplan" data-w="${e.who}"><span class="wxpt">${esc(e.time || 'all day')}</span><span class="grow">${esc(e.title)}</span></div>`).join('')}</div></div>` : ''}`;
  }
}
const fillWeather = buildWeather;
async function geocodeEvent(e) {
  if (!e.location) return;
  try {
    const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(e.location));
    const g = (await r.json()).results?.[0]; if (g) { e.lat = g.latitude; e.lon = g.longitude; save(); }
  } catch { /* weather for this place just won't show */ }
}
async function rotatePhoto() {
  const img = view.querySelector('.memophoto img'); if (!img || document.hidden) return;
  const others = S.photos.filter(p => p.id !== homePhotoId); if (!others.length) return;
  const p = others[Math.floor(Math.random() * others.length)]; homePhotoId = p.id;
  await urls([p.path]); const u = urlCache[p.path]?.url; if (!u) return;
  img.style.opacity = 0;
  setTimeout(() => {
    img.onload = () => { img.style.opacity = 1; }; img.src = u;
    const c = view.querySelector('.memocap span'); if (c) c.textContent = fmt(p.date);
    view.querySelector('.memophoto')?.setAttribute('onclick', `openViewer('${p.id}')`);
  }, 450);
}

/* ---------- daily goals: amounts per person, donuts for today, bar chart history ---------- */
const GOAL_PRESETS = [
  { key: 'water', name: 'Drink water', icon: '💧', unit: 'L', target: 2, step: 0.25 },
  { key: 'stretch', name: 'Stretching', icon: '🧘', unit: 'min', target: 15, step: 5 },
  { key: 'read', name: 'Read a book', icon: '📖', unit: 'pages', target: 20, step: 5 }
];
const newGoal = (p, id) => ({ id, name: p.name, icon: p.icon, unit: p.unit, target: p.target, step: p.step, owner: p.owner ?? 2, log: { 0: {}, 1: {} } });
const isNewGoal = g => isObj(g) && isObj(g.log) && typeof g.target === 'number';
let goalDays = 7;
/* One-time switch to the new goals: old tick-box goals are removed and water, stretching and
   reading are added. Fixed ids, so both phones doing this at once doesn't create duplicates. */
function migrateGoals() {
  if (S.goalsV === 2 && S.goals.every(isNewGoal)) return false;
  S.goals = S.goals.filter(isNewGoal);
  if (S.goalsV !== 2) for (const k of ['water', 'stretch', 'read']) if (!S.goals.some(g => g.id === 'g-' + k)) S.goals.push(newGoal(GOAL_PRESETS.find(p => p.key === k), 'g-' + k));
  S.goalsV = 2; return true;
}
const amt = (g, w, day) => +(g.log?.[w]?.[day]) || 0;
const nfmt = v => (Math.round(v * 100) / 100).toLocaleString();
const people = g => g.owner == 2 ? [0, 1] : [+g.owner];
const lastDays = n => Array.from({ length: n }, (_, i) => { const d = today0(); d.setDate(d.getDate() - (n - 1 - i)); return iso(d); });
function donut(pct, size, stroke, big, small) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct || 0)), m = size / 2;
  return `<svg class="donut${p >= 1 ? ' full' : ''}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${Math.round(p * 100)} percent">
    <circle class="dtrack" cx="${m}" cy="${m}" r="${r}" stroke-width="${stroke}"/>
    ${p > 0 ? '' : '<!--'}<circle class="dval" cx="${m}" cy="${m}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${m} ${m})"/>${p > 0 ? '' : '-->'}
    <text class="dbig" x="${m}" y="${small ? m - size * .02 : m + size * .07}" font-size="${size * .22}">${big}</text>
    ${small ? `<text class="dsmall" x="${m}" y="${m + size * .17}" font-size="${size * .12}">${small}</text>` : ''}</svg>`;
}
function streakOf(g, w) { let n = 0; const d = today0(); if (amt(g, w, iso(d)) < g.target) d.setDate(d.getDate() - 1); while (amt(g, w, iso(d)) >= g.target && n < 999) { n++; d.setDate(d.getDate() - 1); } return n; }
/* Share of a person's goals met on a day (each goal counts up to 100%). */
const dayScore = (w, day) => { const gs = S.goals.filter(g => people(g).includes(w)); return gs.length ? gs.reduce((a, g) => a + Math.min(1, amt(g, w, day) / g.target), 0) / gs.length : 0; };
function goalChart(g) {
  const days = lastDays(goalDays), ws = people(g), W = 320, H = 120, top = 8, bottom = 18, ch = H - top - bottom;
  const max = Math.max(g.target * 1.15, ...days.flatMap(d => ws.map(w => amt(g, w, d)))) || 1;
  const gw = W / days.length, bw = Math.min(14, (gw - 6) / ws.length), y = v => top + ch - v / max * ch;
  const bars = days.map((d, i) => ws.map((w, j) => { const v = amt(g, w, d), x = i * gw + (gw - bw * ws.length) / 2 + j * bw;
    return `<rect data-w="${w}" x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 1.5).toFixed(1)}" height="${Math.max(0, ch + top - y(v)).toFixed(1)}" rx="2"><title>${esc(S.names[w])}, ${fmt(d)}: ${nfmt(v)} ${esc(g.unit)}</title></rect>`; }).join('')).join('');
  const every = days.length > 10 ? 5 : 1;
  const labels = days.map((d, i) => i % every && i !== days.length - 1 ? '' : `<text x="${(i * gw + gw / 2).toFixed(1)}" y="${H - 4}">${days.length > 10 ? parse(d).getDate() : parse(d).toLocaleDateString(undefined, { weekday: 'narrow' })}</text>`).join('');
  return `<svg class="gchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(g.name)}, last ${goalDays} days">
    <line class="gtarget" x1="0" x2="${W}" y1="${y(g.target).toFixed(1)}" y2="${y(g.target).toFixed(1)}"/>${bars}${labels}</svg>`;
}
function goals() {
  const t = iso(new Date());
  const summary = [0, 1].map(w => {
    const gs = S.goals.filter(g => people(g).includes(w)), met = gs.filter(g => amt(g, w, t) >= g.target).length;
    const week = lastDays(7).map(d => `<i style="--h:${Math.round(dayScore(w, d) * 100)}%" title="${fmt(d)}: ${Math.round(dayScore(w, d) * 100)}%"></i>`).join('');
    return `<div class="card gsum" data-w="${w}">${donut(dayScore(w, t), 132, 14, Math.round(dayScore(w, t) * 100) + '%', 'today')}
      <div><h3>${esc(S.names[w])}</h3><p class="muted">${met} of ${gs.length} goals done today</p><div class="gweek" aria-label="Last 7 days">${week}</div><p class="muted gwl">last 7 days</p></div></div>`;
  }).join('');
  const card = g => editing === g.id
    ? `<form class="card editing gform" data-form="saveGoal">${hid(g.id)}${goalFields(g)}<p>${formBtns}</p></form>`
    : `<div class="card goal" data-hl="${g.id}"><div class="chead"><h3><span class="gicon">${esc(g.icon)}</span>${esc(g.name)}</h3><span>${editBtn(g.id)}<button class="ghost" data-act="delGoal" data-id="${g.id}" aria-label="Delete goal">✕</button></span></div>
      <p class="muted gtgt">Goal: ${nfmt(g.target)} ${esc(g.unit)} a day</p>
      <div class="gpeople">${people(g).map(w => { const v = amt(g, w, t), st = streakOf(g, w); return `<div class="gperson" data-w="${w}">${donut(v / g.target, 96, 10, nfmt(v), '/ ' + nfmt(g.target) + ' ' + g.unit)}
        <div class="gname">${esc(S.names[w])}${st >= 2 ? ` <span title="days in a row">🔥${st}</span>` : ''}</div>
        <div class="gbtns"><button data-act="gstep" data-id="${g.id}|${w}|-1" aria-label="Less for ${esc(S.names[w])}">−</button><button class="primary" data-act="gstep" data-id="${g.id}|${w}|1" aria-label="Add ${nfmt(g.step)} ${esc(g.unit)} for ${esc(S.names[w])}">+${nfmt(g.step)}</button></div></div>`; }).join('')}</div>
      ${goalChart(g)}</div>`;
  return `<h2>Daily goals</h2>${legend()}
  <div class="gsums">${summary}</div>
  <div class="chead" style="margin:1.2rem 0 .6rem;flex-wrap:wrap"><h3>Your goals today</h3><div class="tabs" style="margin:0;align-items:center"><span class="muted">History:</span>${[7, 14, 30].map(n => `<button class="${goalDays === n ? 'on' : ''}" data-act="grange" data-id="${n}">${n} days</button>`).join('')}</div></div>
  <div class="goalgrid">${S.goals.map(card).join('') || '<div class="card"><p class="muted">No goals yet. Add one below.</p></div>'}</div>
  <form class="card gform" data-form="addGoal"><h3>Add a goal</h3>${goalFields({ icon: '⭐', owner: 2, step: 1 })}<p><button class="primary">Add goal</button></p></form>`;
}
const goalFields = g => `<div class="row" style="display:flex;flex-wrap:wrap;gap:.55rem">
  <input type="text" name="icon" value="${esc(g.icon || '')}" maxlength="4" aria-label="Icon (emoji)" style="flex:0 0 4rem;text-align:center">
  <input type="text" name="name" value="${esc(g.name || '')}" placeholder="Name, e.g. Meditate" required aria-label="Name">
  <input type="number" name="target" value="${g.target ?? ''}" min="0.01" step="any" placeholder="Daily target" required aria-label="Daily target" style="width:8rem">
  <input type="text" name="unit" value="${esc(g.unit || '')}" placeholder="unit (min, L…)" required aria-label="Unit" style="flex:0 1 8rem">
  <input type="number" name="step" value="${g.step ?? 1}" min="0.01" step="any" aria-label="Amount added per tap" title="Amount added per tap" style="width:6rem">
  <select name="owner" aria-label="Who tracks it">${ownerOpts(g.owner ?? 2)}</select></div>
  <p class="muted" style="font-size:.82rem">Icon · name · daily target · unit · amount per tap · who tracks it</p>`;

/* ---------- sports ---------- */
const SPORT_TYPES = ['Gym', 'Running', 'Walking', 'Hiking', 'Cycling', 'Swimming', 'Yoga', 'Skating', 'Football', 'Stretching'];
const sportData = d => ({ type: d.type.trim(), date: d.date, mins: Math.max(0, +d.mins || 0), km: Math.max(0, +d.km || 0), who: +d.who, exercises: (d.exercises || '').trim(), note: (d.note || '').trim() });
function sports() {
  const today = iso(new Date()), t0 = today0();
  const wk = new Date(t0); wk.setDate(t0.getDate() - ((t0.getDay() + 6) % 7));
  const start = sportRange === 'week' ? iso(wk) : sportRange === 'month' ? today.slice(0, 8) + '01' : '0000-00-00';
  const all = [...S.sports].sort((a, b) => b.date.localeCompare(a.date));
  const inR = all.filter(s => s.date >= start);
  const has = (s, i) => s.who == i || s.who == 2;
  const mine = i => inR.filter(s => has(s, i));
  const tm = i => mine(i).reduce((a, s) => a + mins(s), 0);
  const km = i => mine(i).reduce((a, s) => a + kms(s), 0);
  const together = inR.filter(s => s.who == 2).reduce((a, s) => a + mins(s), 0);
  const byType = {}; inR.forEach(s => { (byType[s.type] ||= [0, 0, 0])[+s.who || 0] += mins(s); });
  const sum3 = v => v[0] + v[1] + v[2];
  const bars = Object.entries(byType).sort((a, b) => sum3(b[1]) - sum3(a[1])).slice(0, 6), maxB = bars[0] ? sum3(bars[0][1]) : 1;
  const list = inR.filter(s => sportWho === 'all' || has(s, +sportWho));
  const tab = (act, id, on, txt) => `<button class="${on ? 'on' : ''}" data-act="${act}" data-id="${id}">${txt}</button>`;
  const types = [...new Set([...SPORT_TYPES, ...S.sports.map(s => s.type)])];
  const fields = s => `<input type="text" name="type" list="sporttypes" placeholder="Activity (gym, running…)" value="${esc(s.type || '')}" required aria-label="Activity">
    <input type="date" name="date" value="${s.date || today}" required aria-label="Date">
    <input type="number" name="mins" min="1" placeholder="Minutes" value="${s.mins || ''}" aria-label="Minutes" style="width:6.5rem">
    <input type="number" name="km" min="0" step="0.1" placeholder="km" value="${s.km || ''}" aria-label="Distance in km" style="width:5.5rem">
    <select name="who" aria-label="Who">${ownerOpts(s.who ?? 2)}</select>
    <input type="text" name="exercises" placeholder="Exercises (squats 3x10, bench 3x8…)" value="${esc(s.exercises || '')}" aria-label="Exercises" style="flex-basis:100%">
    <input type="text" name="note" placeholder="Note (how it felt, where…)" value="${esc(s.note || '')}" aria-label="Note" style="flex-basis:100%">`;
  const row = s => editing === s.id
    ? `<li><form class="row editing" data-form="saveSport">${hid(s.id)}${fields(s)}${formBtns}</form></li>`
    : `<li data-w="${s.who}" data-hl="${s.id}" class="sport"><div class="grow"><div class="sline"><span class="tag teal">${esc(s.type)}</span><strong>${fmtShort(s.date)}</strong><span class="muted">${[mins(s) && hm(mins(s)), kms(s) && kms(s) + ' km'].filter(Boolean).join(' · ')}</span><span class="tag who">${esc(owner(s.who))}</span></div>
      ${s.exercises ? `<div class="sdesc">${esc(s.exercises)}</div>` : ''}${s.note ? `<div class="muted sdesc">${esc(s.note)}</div>` : ''}</div>
      ${editBtn(s.id)}<button class="ghost" data-act="delSport" data-id="${s.id}" aria-label="Delete activity">✕</button></li>`;
  return `<h2>Sports</h2>
  <div class="tabs">${[['week', 'This week'], ['month', 'This month'], ['all', 'All time']].map(([id, t]) => tab('srange', id, sportRange === id, t)).join('')}</div>
  <div class="grid" style="margin-bottom:1rem">
    <div class="card"><p class="muted">Both of you combined</p><div class="big">${hm(tm(0) + tm(1))}</div><p class="muted">${hm(together)} done together, ${inR.length} activities</p></div>
    ${[0, 1].map(i => `<div class="card" data-w="${i}"><p class="muted">${esc(S.names[i])}</p><div class="big">${hm(tm(i))}</div><p class="muted">${mine(i).length} activities, ${km(i).toFixed(1)} km</p></div>`).join('')}
  </div>
  <p class="muted" style="margin-top:-.4rem">Activities done together count for both of you.</p>
  ${bars.length ? `<div class="card"><h3>Time by activity</h3>${legend()}${bars.map(([t, v]) => { const on = [0, 1, 2].filter(w => v[w]); return `<div class="bgroup"><div class="bhead"><strong>${esc(t)}</strong><span class="muted">${hm(sum3(v))}</span></div>
    <div class="stack" role="img" aria-label="${esc(t)}: ${on.map(w => `${esc(owner(w))} ${hm(v[w])}`).join(', ')}"><div style="width:${Math.max(4, Math.round(sum3(v) / maxB * 100))}%">${on.map(w => `<i data-w="${w}" style="flex:${v[w]}" title="${esc(owner(w))}: ${hm(v[w])}"></i>`).join('')}</div></div>
    <div class="stacklbl">${on.map(w => `<span data-w="${w}"><b></b>${esc(owner(w))} ${hm(v[w])}</span>`).join('')}</div></div>`; }).join('')}</div>` : ''}
  <form class="card row" data-form="addSport"><h3 style="flex-basis:100%;margin:0">Log an activity</h3>${fields({})}<button class="primary">Add activity</button></form>
  <datalist id="sporttypes">${types.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
  <div class="tabs">${tab('swho', 'all', sportWho === 'all', 'Everyone')}${tab('swho', '0', sportWho === '0', esc(S.names[0]))}${tab('swho', '1', sportWho === '1', esc(S.names[1]))}</div>
  <div class="card"><ul class="items">${list.map(row).join('') || '<li class="muted">Nothing logged yet.</li>'}</ul></div>`;
}

/* ---------- shell ---------- */
const view = document.getElementById('view'), nav = document.getElementById('nav');
let lastPage = null, moreOpen = false;
const PHONE_MAIN = ['home', 'calendar', 'tasks', 'health', 'money']; // shown in the phone tab bar; the rest sit under "More"
/* Before showing a page from a link: make sure the item is visible (right day, right list, no filter). */
function focusPrep(page, a, b) {
  if (page === 'calendar') { const x = S.events.find(e => e.id === a) || S.photos.find(p => p.id === a); if (x) goTo(x.date); }
  if (page === 'lists' && S.lists.some(l => l.id === a)) { listTab = a; return b || null; }
  if (page === 'tasks') taskWho = 'all';
  if (page === 'notes') noteWho = 'all';
  if (page === 'sports') { sportRange = 'all'; sportWho = 'all'; }
  if (page === 'home' && S.songs.some(x => x.id === a)) songId = a;
  editing = null;
  return a;
}
let flash = null; // { id, until }: kept for a few seconds so a redraw right after opening doesn't lose the highlight
function focusShow(id) {
  const el = view.querySelector(`[data-hl="${CSS.escape(id)}"]`);
  if (!el) { toast('That item was changed or removed.'); return; }
  flash = { id, until: Date.now() + 3000 };
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  el.classList.add('flash');
}
function reflash() {
  if (!flash || Date.now() > flash.until) { flash = null; return; }
  const el = view.querySelector(`[data-hl="${CSS.escape(flash.id)}"]`);
  if (el) { el.classList.add('flash'); el.style.animationDelay = `-${3000 - (flash.until - Date.now())}ms`; requestAnimationFrame(() => el.scrollIntoView({ block: 'center' })); }
}
/* A tapped notification while the app is already open: fetch the news, then jump to the item. */
navigator.serviceWorker?.addEventListener('message', async e => {
  if (e.data?.type !== 'open') return;
  const h = new URL(e.data.url, location.href).hash; if (!h) return;
  if (authed && sb) await pull();
  if (location.hash === h) render(); else location.hash = h;
});
function render() {
  document.body.classList.toggle('locked', !authed);
  if (recovering && authed) { nav.innerHTML = ''; view.innerHTML = recoverView(); document.body.classList.add('locked'); return; }
  if (!authed) { nav.innerHTML = ''; view.innerHTML = loginView(); return; }
  if (migrateGoals() | compactFood()) save();
  const [page, a, b] = location.hash.slice(1).split('/');
  const m = MODS.find(m => m.id === page) || MODS[0];
  const hl = a ? focusPrep(m.id, a, b) : null;
  const link = x => `<a href="#${x.id}" class="${x.id === m.id ? 'on' : ''}${PHONE_MAIN.includes(x.id) ? ' pri' : ''}" aria-label="${x.title}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[x.id] || ''}</svg><span class="nl">${x.title}</span><span class="ns">${x.short || x.title}</span></a>`;
  const extra = !PHONE_MAIN.includes(m.id);
  nav.innerHTML = MODS.map(link).join('') + `<button class="navmore ${extra ? 'on' : ''}" data-act="more" aria-label="More pages" aria-expanded="${moreOpen}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg><span class="ns">${extra ? (m.short || m.title) : 'More'}</span></button>`
    + `<div class="moresheet" ${moreOpen ? '' : 'hidden'}>${MODS.filter(x => !PHONE_MAIN.includes(x.id)).map(link).join('')}</div>`;
  document.body.classList.toggle('moreopen', moreOpen);
  document.getElementById('brand').textContent = S.names.join(' + ');
  const y = m.id === lastPage ? view.scrollTop : 0; // keep position on the same page, start at the top on a new one
  if (m.id !== lastPage) { editing = null; moreOpen = false; document.body.classList.remove('moreopen'); nav.querySelector('.moresheet')?.setAttribute('hidden', ''); }
  lastPage = m.id;
  view.innerHTML = m.render();
  view.classList.toggle('onehome', m.id === 'home');
  view.scrollTop = y;
  document.title = m.id === 'home' ? 'Us – our little helper' : `${m.title} · Us`;
  if (editing) view.querySelector('.editing input[type=text], .editing textarea')?.focus();
  if (a) { history.replaceState(null, '', '#' + m.id); if (hl) focusShow(hl); } // the link did its job; keep the address tidy
  else reflash();
  view.querySelectorAll('.tabs').forEach(t => { const on = t.querySelector('button.on'); if (on && t.scrollWidth > t.clientWidth) t.scrollLeft = on.offsetLeft - t.offsetLeft - (t.clientWidth - on.offsetWidth) / 2; }); // keep the selected tab visible on phones
  hydrate(); fillWeather();
  clearInterval(rotTimer); if (m.id === 'home' && sb && S.photos.length > 1) rotTimer = setInterval(rotatePhoto, 9000);
}
const UI_ONLY = new Set(['pick', 'prev', 'next', 'edit', 'cancel', 'tab', 'srange', 'swho', 'nwho', 'twho', 'grange', 'hwho', 'hday', 'hedit', 'offPick', 'mmonth', 'mwho', 'mall', 'mbudgets', 'more', 'authMode', 'logout', 'export', 'notifyOn', 'notifyOff', 'notifyTest']);
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  if (f.dataset.form === 'login') { e.preventDefault(); login(new FormData(f)); return; }
  if (f.dataset.form === 'forgot') { e.preventDefault(); sendReset(new FormData(f)); return; }
  if (f.dataset.form === 'newPassword') {
    e.preventDefault();
    setPassword(new FormData(f), document.getElementById('loginmsg')).then(async ok => { if (!ok) return; recovering = false; history.replaceState(null, '', location.pathname); await pull(true); render(); toast('New password saved'); });
    return;
  }
  if (f.dataset.form === 'changePassword') {
    e.preventDefault();
    const m = f.querySelector('.pwmsg');
    setPassword(new FormData(f), m).then(ok => { if (ok) { f.reset(); m.textContent = ''; toast('Password changed'); } });
    return;
  }
  e.preventDefault();
  try { F[f.dataset.form](Object.fromEntries(new FormData(f))); }
  catch (err) { console.error(err); toast('That item was changed or removed on the other device.'); }
  editing = null; save(); render();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.type === 'checkbox' || !A[b.dataset.act]) return;
  const a = b.dataset.act; if (A[a](b.dataset.id) === 'keep') return; // 'keep': the action updated the page itself
  if (!UI_ONLY.has(a)) save(); render();
});
document.addEventListener('change', e => {
  const b = e.target.closest('[data-act]');
  if (b && b.type === 'checkbox' && A[b.dataset.act]) { A[b.dataset.act](b.dataset.id); save(); render(); }
  if (e.target.matches('[data-me]')) {
    if (e.target.value === '') ls.del(ME_KEY); else ls.set(ME_KEY, +e.target.value);
    if (pushSub && me() !== null) sb.from('push_subs').upsert({ endpoint: pushSub.endpoint, sub: pushSub.toJSON(), who: me() });
    render();
  }
  if (e.target.id === 'imp' && e.target.files[0]) {
    const input = e.target;
    input.files[0].text().then(t => {
      let d; try { d = JSON.parse(t); } catch { d = null; }
      input.value = '';
      if (!isObj(d) || !Array.isArray(d.events) || !Array.isArray(d.names)) { alert('That file is not a valid backup.'); return; }
      if (!confirm(`Replace everything${sb ? ' (for both of you)' : ''} with this backup? Anything added since the backup was made will be lost.`)) return;
      S = withDefaults(d); save(); render(); toast('Backup restored');
    });
  }
});
window.addEventListener('hashchange', render);
boot();
