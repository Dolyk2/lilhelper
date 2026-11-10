/* Us – relationship helper. Each feature is a module in MODS: add one object
   {id,title,render} and it appears in the menu. All data lives in S and goes
   through store.load/save, so later you can swap localStorage for a server. */

const APP_VERSION = '1.2.1', APP_DATE = '10 Nov 2026'; // bump this (and ?v= in index.html) with every change
const KEY = 'us-helper-v1', BASE_KEY = KEY + '-base', DIRTY_KEY = KEY + '-dirty';
const DEFAULTS = {
  names: ['Me', 'Her'], events: [], tasks: [], notes: [], photos: [], sports: [], goals: [], songs: [], calToken: '',
  lists: [{ id: 'l1', name: 'Shopping', items: [] }], milestones: []
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
let listTab = null, noteWho = 'all';
let songAdd = false, goalOwner = 2, songId = null, rotTimer = null, homePhotoId = null, sportRange = 'month', sportWho = 'all';
const legend = () => `<p class="legend">${[0, 1, 2].map(i => `<span class="tag who" data-w="${i}">${esc(owner(i))}</span>`).join(' ')}</p>`;
const copyText = t => navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast('Copied'), () => toast('Could not copy. Select the text and copy it by hand.')) : toast('Copying is not supported here. Select the text and copy it by hand.');
const spotifyId = u => (u || '').trim().match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?|^spotify:)(track|album|playlist|artist|episode|show)[/:]([A-Za-z0-9]+)/);
const overdue = x => !x.done && x.due && x.due < iso(new Date());
const GOAL_IDEAS = [['📖', 'Read 15 pages'], ['💧', 'Drink 2 liters of water'], ['🧘', 'Stretching, 10 minutes'], ['🚶', 'Walk 8 000 steps'], ['😴', 'In bed by 23:00'], ['🍎', 'Fruit or veg with every meal'], ['📵', 'One hour without phone'], ['✍️', 'Write 3 things you are grateful for']];
const nextSong = () => { songId = null; render(); };
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
  const evRow = (e, label) => `<li data-w="${e.who}"><span class="grow">${esc(e.title)}${e.location ? ` <span class="muted">at ${esc(e.location)}</span>` : ''}</span>${label ? `<span class="tag teal">${label}</span>` : ''}<span class="muted">${esc(e.time || 'all day')}</span></li>`;
  const label = k => { const n = Math.round((parse(k) - t0) / 864e5); return n === 1 ? 'Tomorrow' : parse(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); };
  const evs = S.events.filter(e => e.date === t).sort(byTime).slice(0, 4);
  const coming = S.events.filter(e => e.date > t).sort(byTime).slice(0, 5);
  const open = S.tasks.filter(x => !x.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 5);
  const ms = S.milestones.map(m => ({ ...m, n: daysTo(m) })).filter(m => m.n >= 0).sort((a, b) => a.n - b.n).slice(0, 3);
  const lst = S.lists.slice(0, 4).map(l => ({ name: l.name, owner: l.owner ?? 2, open: l.items.filter(i => !i.done) }));
  const trip = S.events.filter(e => e.date >= t && e.lat != null && Math.round((parse(e.date) - t0) / 864e5) <= 9).sort(byTime)[0];
  const places = [['Prague', 50.0755, 14.4378, ''], ['Hradec Králové', 50.2092, 15.8328, ''], ...(trip ? [[`${trip.location}, ${label(trip.date)}`, trip.lat, trip.lon, trip.date]] : [])];
  if (!S.songs.find(s => s.id === songId)) songId = S.songs.length ? S.songs[Math.floor(Math.random() * S.songs.length)].id : null;
  const song = S.songs.find(s => s.id === songId);
  if (!S.photos.find(p => p.id === homePhotoId)) homePhotoId = S.photos.length ? S.photos[Math.floor(Math.random() * S.photos.length)].id : null;
  const hp = S.photos.find(p => p.id === homePhotoId);
  const mon = S.sports.filter(s => s.date.startsWith(t.slice(0, 7)));
  const wkStart = iso(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() - ((t0.getDay() + 6) % 7)));
  const tm = i => mon.filter(s => s.who == i || s.who == 2).reduce((a, s) => a + mins(s), 0);
  const kmTot = mon.reduce((a, s) => a + kms(s), 0), mx = Math.max(tm(0), tm(1), 1);
  const longest = mon.reduce((a, s) => mins(s) > (a ? mins(a) : 0) ? s : a, null);
  const byT = {}; mon.forEach(s => byT[s.type] = (byT[s.type] || 0) + mins(s));
  const topT = Object.entries(byT).sort((a, b) => b[1] - a[1])[0];
  const head = (title, id) => `<div class="chead"><h3>${title}</h3><a href="#${id}">Open</a></div>`;
  const hello = (h => h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')(new Date().getHours());
  const player = !song ? `<p class="muted">Tap “+ Add” and paste a Spotify link to a song, album or playlist. A player shows up here.</p>`
    : song.sid ? `<iframe class="spot" src="https://open.spotify.com/embed/${song.kind}/${song.sid}?theme=0" height="152" allow="encrypted-media; clipboard-write" loading="lazy" title="Spotify player"></iframe>`
    : `<div class="songt">${esc(song.title)}</div><p class="muted">${esc(song.artist)}</p><a class="btn" href="https://open.spotify.com/search/${encodeURIComponent(song.title + ' ' + song.artist)}" target="_blank" rel="noopener">Find on Spotify</a>`;
  return `<div class="homehead"><h2>${hello}, ${esc(S.names[0])} & ${esc(S.names[1])} <span class="muted">${fmt(t)}</span></h2>${legend()}</div>
  <div class="home">
    <section class="card span hero"><div class="herogrid">
      <div><h3>Special dates</h3>${ms.length
        ? `<div class="herorow">${ms.map((m, i) => `<div class="${i ? 'small' : ''}"><div class="big">${m.n === 0 ? 'Today' : m.n}</div><p>${m.n === 0 ? '' : m.n === 1 ? 'day until ' : 'days until '}${esc(m.title)}</p></div>`).join('')}</div>`
        : `<p class="muted">Add an anniversary or birthday under <a href="#dates">Special dates</a>.</p>`}</div>
      <div><h3>Weather</h3><div class="wxrow">${places.map(p => `<div class="wxplace"><span class="muted">${esc(p[0])}</span><div data-wx="${p[1]}|${p[2]}|${p[3]}">…</div></div>`).join('')}</div></div>
    </div></section>
    <section class="card todaycard">${head('Today', 'calendar')}${evs.length ? `<ul class="items">${evs.map(e => evRow(e)).join('')}</ul>` : `<p class="muted">Nothing planned today.</p>`}</section>
    <section class="card">${head('Coming up', 'calendar')}${coming.length ? `<ul class="items">${coming.map(e => evRow(e, label(e.date))).join('')}</ul>` : `<p class="muted">No upcoming events.</p>`}</section>
    <section class="card">${head('To-dos', 'tasks')}${open.length ? `<ul class="items">${open.map(x => `<li data-w="${x.owner}"><span class="grow">${esc(x.text)}${x.due ? ` <span class="muted">${fmt(x.due)}</span>` : ''}</span>${overdue(x) ? '<span class="tag warn">overdue</span>' : ''}</li>`).join('')}</ul>` : `<p class="muted">All done.</p>`}</section>
    <section class="card memo">${hp && sb
      ? `<button class="memophoto" onclick="openViewer('${hp.id}')" aria-label="Open photo"><img data-photo="${hp.path}" alt="Memory from ${fmt(hp.date)}"></button><div class="memocap"><span>${fmt(hp.date)}</span></div>`
      : `<div class="memoempty"><h3>Memory</h3><p class="muted">Add photos to a day in the Calendar. They show here and change every few seconds.</p></div>`}</section>
    <section class="card music"><div class="chead"><h3>Our music</h3><span><button class="ghost" onclick="nextSong()">Shuffle</button><button class="ghost" onclick="songAdd=!songAdd;render()">${songAdd ? 'Close' : '+ Add'}</button></span></div>${player}
      ${songAdd ? `<form class="row" data-form="addSong" style="margin:.6rem 0 0"><input type="text" name="url" placeholder="Paste a Spotify link" required aria-label="Spotify link"><button class="primary">Add</button></form>` : ''}
      ${song ? `<button class="ghost" data-act="delSong" data-id="${song.id}">Remove this one</button>` : ''}</section>
    <section class="card">${head('Sports this month', 'sports')}${mon.length
      ? `<div class="sportrow"><div class="big">${hm(tm(0) + tm(1))}</div><span class="muted">combined</span></div>
        ${[0, 1].map(i => `<div class="bar" data-w="${i}"><span>${esc(S.names[i])}</span><div><i style="width:${Math.round(tm(i) / mx * 100)}%"></i></div><b>${hm(tm(i))}</b></div>`).join('')}
        <div class="chips"><span class="chip"><b>${mon.length}</b> activities</span><span class="chip"><b>${S.sports.filter(s => s.date >= wkStart).length}</b> this week</span><span class="chip"><b>${kmTot.toFixed(0)}</b> km</span>${topT ? `<span class="chip">top <b>${esc(topT[0])}</b></span>` : ''}${longest ? `<span class="chip">longest <b>${hm(longest.mins)}</b></span>` : ''}</div>`
      : `<p class="muted">Nothing logged this month.</p>`}</section>
    <section class="card span2">${head('Lists', 'lists')}<div class="listgrid">${lst.length ? lst.map(l => `<div class="mini" data-w="${l.owner}"><strong>${esc(l.name)}</strong> <span class="tag who">${l.open.length} open</span><div class="muted">${l.open.length ? esc(l.open.slice(0, 3).map(i => i.text).join(', ')) + (l.open.length > 3 ? '…' : '') : 'All done'}</div></div>`).join('') : `<p class="muted">No lists yet.</p>`}</div></section>
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
    : `<li data-w="${e.who}"><span class="grow">${esc(e.title)}${e.location ? ` <span class="muted">at ${esc(e.location)}</span>` : ''}</span><span class="muted">${esc(e.time || 'all day')}</span><span class="tag who">${esc(owner(e.who))}</span>${editBtn(e.id)}<button class="ghost" data-act="delEvent" data-id="${e.id}" aria-label="Delete event">✕</button></li>`;
  const ph = S.photos.filter(p => p.date === cal.sel).sort((a, b) => a.at - b.at);
  const dayMs = S.milestones.filter(m => onDay(m, cal.sel));
  const memories = `<div class="card"><h3>Memories</h3>${sb
    ? `<div class="thumbs">${ph.map(p => `<button class="thumb" onclick="openViewer('${p.id}')" aria-label="Open photo"><img data-photo="${p.thumb}" alt="Memory from ${fmt(cal.sel)}"></button>`).join('')}</div>
      <button class="primary" onclick="this.nextElementSibling.click()">Add photos</button><input type="file" accept="image/*" multiple hidden onchange="addPhotos(this)">`
    : '<p class="muted">Photos need the online mode (Supabase login).</p>'}</div>`;
  return `<h2>Calendar</h2>${legend()}
  <form class="card row" data-form="addEvent"><h3 style="flex-basis:100%;margin:0">New event</h3>
    <input type="text" name="title" placeholder="What's happening?" required aria-label="Event title">
    <input type="date" name="date" value="${cal.sel}" required aria-label="Date">
    <input type="time" name="time" aria-label="Time">
    <input type="text" name="location" placeholder="Place (optional, for weather)" aria-label="Place">
    <select name="who" aria-label="Who">${ownerOpts()}</select>
    <button class="primary">Add event</button></form>
  <div class="calwrap"><div class="card"><div class="calhead"><button data-act="prev" aria-label="Previous month">‹</button><h3>${title}</h3><button data-act="next" aria-label="Next month">›</button></div><div class="cal">${cells}</div></div>
  <div class="daypanel"><div class="card"><h3>${fmt(cal.sel)}</h3>
    ${dayMs.length ? `<p>${dayMs.map(m => `<span class="tag">♥ ${esc(m.title)}</span>`).join(' ')}</p>` : ''}
    <ul class="items">${evs.map(evLi).join('') || '<li class="muted">No events this day.</li>'}</ul></div>${memories}</div></div>`;
}

function tasks() {
  const li = x => editing === x.id
    ? `<li><form class="row editing" data-form="saveTask">${hid(x.id)}<input type="text" name="text" value="${esc(x.text)}" required aria-label="To-do"><select name="owner" aria-label="Who">${ownerOpts(x.owner)}</select><input type="date" name="due" value="${x.due || ''}" aria-label="Due date">${formBtns}</form></li>`
    : `<li data-w="${x.owner}" class="${x.done ? 'done' : ''}"><input type="checkbox" ${x.done ? 'checked' : ''} data-act="toggleTask" data-id="${x.id}" aria-label="Done">
    <span class="grow">${esc(x.text)} ${x.due ? `<span class="muted">due ${fmt(x.due)}</span>` : ''}</span>${overdue(x) ? '<span class="tag warn">overdue</span>' : ''}<span class="tag who">${esc(owner(x.owner))}</span>${editBtn(x.id)}<button class="ghost" data-act="delTask" data-id="${x.id}" aria-label="Delete to-do">✕</button></li>`;
  const sorted = [...S.tasks].sort((a, b) => (a.done - b.done) || (a.due || '9').localeCompare(b.due || '9'));
  return `<h2>To-do</h2>
  <form class="card row" data-form="addTask"><h3 style="flex-basis:100%;margin:0">New to-do</h3>
    <input type="text" name="text" placeholder="What needs doing?" required aria-label="To-do">
    <select name="owner" aria-label="For whom">${ownerOpts(2)}</select>
    <input type="date" name="due" aria-label="Due date">
    <button class="primary">Add to-do</button></form>
  ${legend()}<div class="card"><ul class="items">${sorted.map(li).join('') || '<li class="muted">Nothing here yet.</li>'}</ul></div>
  ${S.tasks.some(x => x.done) ? '<p><button data-act="clearDone">Clear all done</button></p>' : ''}`;
}

function notes() {
  const own = n => n.owner ?? 2; // notes made before owners existed belong to both
  const sorted = [...S.notes].filter(n => noteWho === 'all' || own(n) == noteWho || own(n) == 2).sort((a, b) => (b.pin - a.pin) || b.at - a.at);
  const card = n => editing === n.id
    ? `<form class="card editing" data-form="saveNote">${hid(n.id)}<div class="row" style="display:flex;gap:.55rem;margin-bottom:.5rem"><input type="text" name="title" value="${esc(n.title)}" placeholder="Title (optional)" aria-label="Title"><select name="owner" aria-label="Whose note">${ownerOpts(own(n))}</select></div><textarea name="body" required aria-label="Note">${esc(n.body)}</textarea><p>${formBtns}</p></form>`
    : `<article class="card note ${n.pin ? 'pin' : ''}" data-w="${own(n)}"><div class="chead"><h3>${n.pin ? '📌 ' : ''}${esc(n.title || 'Untitled')}</h3><span class="tag who">${esc(owner(own(n)))}</span></div><div>${esc(n.body)}</div>
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
    : `<li class="${i.done ? 'done' : ''}"><input type="checkbox" ${i.done ? 'checked' : ''} data-act="toggleItem" data-id="${i.id}" aria-label="Done"><span class="grow">${esc(i.text)}</span>${editBtn(i.id)}<button class="ghost" data-act="delItem" data-id="${i.id}" aria-label="Delete item">✕</button></li>`;
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
    : `<li class="${m.n < 0 ? 'past' : ''}"><span class="grow">${esc(m.title)} <span class="muted">· ${fmt(m.date)}${m.repeat ? ' · every year' : ''}${m.y > 0 ? ` · ${m.y} year${m.y > 1 ? 's' : ''}` : ''}</span></span><span class="tag ${m.n < 0 ? '' : 'teal'}">${daysLabel(m.n)}</span>${editBtn(m.id)}<button class="ghost" data-act="delMs" data-id="${m.id}" aria-label="Delete date">✕</button></li>`;
  return `<h2>Special dates</h2>
  <form class="row" data-form="addMs"><input type="text" name="title" placeholder="Anniversary, birthday, trip…" required aria-label="Title"><input type="date" name="date" required aria-label="Date">
    <label class="muted"><input type="checkbox" name="repeat" checked> every year</label><button class="primary">Add date</button></form>
  <div class="card"><ul class="items">${ms.map(li).join('') || '<li class="muted">No dates yet.</li>'}</ul></div>`;
}

const calLink = () => `${CFG.SUPABASE_URL}/functions/v1/calendar?token=${encodeURIComponent(S.calToken)}`;
function settings() {
  return `<h2>Settings</h2>
  <form class="card" data-form="names"><h3>Names</h3><div class="row"><input type="text" name="a" value="${esc(S.names[0])}" aria-label="Your name"><input type="text" name="b" value="${esc(S.names[1])}" aria-label="Partner's name"><button class="primary">Save names</button></div></form>
  ${sb ? `<div class="card"><h3>Phone calendar</h3><p class="muted">Keep your secret code here instead of a note. Both of you can see it after logging in.</p>
    <form class="row" data-form="saveToken"><input type="text" name="token" value="${esc(S.calToken || '')}" placeholder="Calendar code (CAL_TOKEN)" aria-label="Calendar code"><button class="primary">Save</button></form>
    ${S.calToken ? `<p class="muted" style="word-break:break-all">${esc(calLink())}</p><button onclick="copyText(this.dataset.t)" data-t="${esc(calLink())}">Copy link</button> <button onclick="copyText(this.dataset.t)" data-t="${esc(calLink().replace('https://', 'webcal://'))}">Copy webcal link</button>` : ''}</div>` : ''}
  ${sb ? `<div class="card"><h3>Account</h3><p class="muted">You are logged in. Changes reach your partner within about 15 seconds.</p><p class="muted" role="status">${esc(syncInfo)}${dirty ? ' · some changes are not saved online yet' : ''}</p><button onclick="syncNow()">Sync now</button> <button data-act="logout">Log out</button></div>` : ''}
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
  { id: 'dates', title: 'Special dates', render: dates },
  { id: 'settings', title: 'Settings', render: settings }
];

/* ---------- actions (buttons/checkboxes) and forms ---------- */
const A = {
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
  delSong: id => { S.songs = S.songs.filter(s => s.id !== id); songId = null; },
  preset: t => { if (GOAL_IDEAS.some(i => i[1] === t) && !S.goals.some(g => g.text === t)) S.goals.push({ id: uid(), text: t, owner: goalOwner, days: {} }); },
  toggleGoal: id => { const g = S.goals.find(x => x.id === id), t = iso(new Date()); if (!g) return; g.days ||= {}; if (g.days[t]) delete g.days[t]; else g.days[t] = 1; },
  delGoal: id => { if (confirm('Delete this goal and its streak history?')) S.goals = S.goals.filter(g => g.id !== id); },
  delSport: id => { S.sports = S.sports.filter(s => s.id !== id); },
  logout: () => { logout(); },
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
  addSong: d => { const m = spotifyId(d.url); if (!m) { toast('That does not look like a Spotify link.'); return; } S.songs.push({ id: uid(), kind: m[1], sid: m[2] }); songAdd = false; songId = null; },
  addGoal: d => S.goals.push({ id: uid(), text: d.text.trim(), owner: +d.owner, days: {} }),
  saveGoal: d => Object.assign(S.goals.find(x => x.id === d.id), { text: d.text.trim(), owner: +d.owner }),
  saveToken: d => { S.calToken = d.token.trim(); },
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
  dates: '<path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'
};

/* ---------- cloud sync (Supabase) ---------- */
const CFG = window.CONFIG || {};
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
const loginView = () => `<form class="card login" data-form="login"><img class="loginlogo" src="us-cutout.png" alt=""><h2>Welcome back</h2><p class="muted">Log in to open your shared space.</p>
  <p><input type="email" name="email" placeholder="Email" required autocomplete="username" aria-label="Email" style="width:100%"></p>
  <p><input type="password" name="password" placeholder="Password" required autocomplete="current-password" aria-label="Password" style="width:100%"></p>
  <p><button class="primary">Log in</button> <span id="loginmsg" class="muted" role="status"></span></p></form>`;
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
    sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && authed) { authed = false; editing = null; render(); } });
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
const KINDS = [['events', 'Calendar', x => x.title], ['tasks', 'To-do', x => x.text], ['notes', 'Notes', x => x.title || x.body], ['milestones', 'Special dates', x => x.title],
  ['sports', 'Sports', x => x.type], ['goals', 'Goals', x => x.text], ['songs', 'Music', () => 'a song'], ['photos', 'Memories', () => 'a photo']];
function addedItems(before, after) {
  const out = [], ids = a => new Set((Array.isArray(a) ? a : []).map(x => x.id));
  for (const [k, label, txt] of KINDS) { const old = ids(before?.[k]); (after[k] || []).filter(x => !old.has(x.id)).forEach(x => out.push({ where: label, what: String(txt(x) || '').slice(0, 80) })); }
  const oldLists = new Map((before?.lists || []).map(l => [l.id, ids(l.items)]));
  for (const l of after.lists || []) {
    const old = oldLists.get(l.id);
    if (!old) out.push({ where: 'Lists', what: `new list "${l.name}"` });
    (l.items || []).filter(i => old && !old.has(i.id)).forEach(i => out.push({ where: l.name, what: i.text }));
  }
  return out;
}
function tellPartner(before, after) {
  if (!pushReady() || !before || !Object.keys(before).length) return;
  const items = addedItems(before, after);
  if (items.length) callNotify({ by: me(), items: items.slice(0, 10), endpoint: pushSub?.endpoint }).catch(() => { /* function not set up: no notification */ });
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
const WX = {};
const wxText = c => c === 0 ? 'Clear' : c <= 2 ? 'Partly cloudy' : c === 3 ? 'Cloudy' : c <= 48 ? 'Fog' : c <= 57 ? 'Drizzle' : c <= 67 ? 'Rain' : c <= 77 ? 'Snow' : c <= 82 ? 'Showers' : c <= 86 ? 'Snow showers' : 'Thunderstorm';
const wxIcon = c => c === 0 ? '☀️' : c <= 2 ? '⛅' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌦️' : c <= 86 ? '🌨️' : '⛈️';
async function wx(lat, lon) {
  const k = lat + ',' + lon; if (WX[k] && Date.now() - WX[k].t < 18e5) return WX[k].d;
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=10`);
  const d = await r.json(); WX[k] = { t: Date.now(), d }; return d;
}
async function fillWeather() {
  for (const el of view.querySelectorAll('[data-wx]')) {
    const [lat, lon, date] = el.dataset.wx.split('|');
    try {
      const d = await wx(lat, lon); let c, t;
      if (date) { const i = d.daily.time.indexOf(date); if (i < 0) { el.textContent = 'no forecast yet'; continue; } c = d.daily.weather_code[i]; t = `${Math.round(d.daily.temperature_2m_min[i])}° to ${Math.round(d.daily.temperature_2m_max[i])}°`; }
      else { c = d.current.weather_code; t = `${Math.round(d.current.temperature_2m)}°`; }
      el.innerHTML = `<span class="wxi">${wxIcon(c)}</span> <strong>${t}</strong> <span class="muted">${wxText(c)}</span>`;
    } catch { el.textContent = 'weather unavailable'; }
  }
}
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

/* ---------- daily goals ---------- */
function goals() {
  const t = iso(new Date());
  const streak = g => { let n = 0; const d = parse(t); if (!g.days[t]) d.setDate(d.getDate() - 1); while (g.days[iso(d)]) { n++; d.setDate(d.getDate() - 1); } return n; };
  const week = g => Array.from({ length: 7 }, (_, i) => { const d = parse(t); d.setDate(d.getDate() - 6 + i); return `<i class="${g.days[iso(d)] ? 'on' : ''}"></i>`; }).join('');
  const done = S.goals.filter(g => g.days[t]).length, pct = S.goals.length ? Math.round(done / S.goals.length * 100) : 0;
  const row = g => editing === g.id
    ? `<li><form class="row editing" data-form="saveGoal">${hid(g.id)}<input type="text" name="text" value="${esc(g.text)}" required aria-label="Goal"><select name="owner" aria-label="Who">${ownerOpts(g.owner)}</select>${formBtns}</form></li>`
    : `<li data-w="${g.owner}" class="${g.days[t] ? 'done' : ''}"><input type="checkbox" ${g.days[t] ? 'checked' : ''} data-act="toggleGoal" data-id="${g.id}" aria-label="Done today">
      <div class="grow">${esc(g.text)}<div class="week" aria-label="Last 7 days">${week(g)}</div></div><span class="muted">${streak(g)} day streak</span><span class="tag who">${esc(owner(g.owner))}</span>${editBtn(g.id)}<button class="ghost" data-act="delGoal" data-id="${g.id}" aria-label="Delete goal">✕</button></li>`;
  return `<h2>Daily goals</h2><p class="muted">${done} of ${S.goals.length} done today</p>
  <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
  ${GOAL_IDEAS.some(([, t]) => !S.goals.some(g => g.text === t)) ? `<div class="card"><div class="chead"><h3>Popular goals</h3><label class="muted">For <select onchange="goalOwner=+this.value" aria-label="Who is it for">${ownerOpts(goalOwner)}</select></label></div>
    <div class="ideas">${GOAL_IDEAS.filter(([, t]) => !S.goals.some(g => g.text === t)).map(([ic, t]) => `<button class="idea" data-act="preset" data-id="${esc(t)}"><span class="ic">${ic}</span>${esc(t)}</button>`).join('')}</div></div>` : ''}
  <form class="card row" data-form="addGoal"><h3 style="flex-basis:100%;margin:0">New daily goal</h3>
    <input type="text" name="text" placeholder="e.g. 10 000 steps, read 20 minutes, no sugar" required aria-label="Goal">
    <select name="owner" aria-label="For whom">${ownerOpts(2)}</select><button class="primary">Add goal</button></form>
  ${legend()}<div class="card"><ul class="items">${S.goals.map(row).join('') || '<li class="muted">No goals yet. Add one above and tick it off every day.</li>'}</ul></div>`;
}

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
  const maxS = Math.max(1, ...bars.flatMap(([, v]) => v));
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
    : `<li data-w="${s.who}"><span class="tag teal">${esc(s.type)}</span><div class="grow"><strong>${parse(s.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong>
      <span class="muted">${[s.mins && s.mins + ' min', s.km && s.km + ' km'].filter(Boolean).join(', ')}</span>
      ${s.exercises ? `<div>${esc(s.exercises)}</div>` : ''}${s.note ? `<div class="muted">${esc(s.note)}</div>` : ''}</div>
      <span class="tag who">${esc(owner(s.who))}</span>${editBtn(s.id)}<button class="ghost" data-act="delSport" data-id="${s.id}" aria-label="Delete activity">✕</button></li>`;
  return `<h2>Sports</h2>
  <div class="tabs">${[['week', 'This week'], ['month', 'This month'], ['all', 'All time']].map(([id, t]) => tab('srange', id, sportRange === id, t)).join('')}</div>
  <div class="grid" style="margin-bottom:1rem">
    <div class="card"><p class="muted">Both of you combined</p><div class="big">${hm(tm(0) + tm(1))}</div><p class="muted">${hm(together)} done together, ${inR.length} activities</p></div>
    ${[0, 1].map(i => `<div class="card" data-w="${i}"><p class="muted">${esc(S.names[i])}</p><div class="big">${hm(tm(i))}</div><p class="muted">${mine(i).length} activities, ${km(i).toFixed(1)} km</p></div>`).join('')}
  </div>
  <p class="muted" style="margin-top:-.4rem">Activities done together count for both of you.</p>
  ${bars.length ? `<div class="card"><h3>Time by activity</h3>${legend()}${bars.map(([t, v]) => `<div class="bgroup"><div class="bhead"><strong>${esc(t)}</strong><span class="muted">${hm(sum3(v))} in total</span></div>${[0, 1, 2].filter(w => v[w]).map(w => `<div class="bar" data-w="${w}"><span>${esc(owner(w))}</span><div><i style="width:${Math.round(v[w] / maxS * 100)}%"></i></div><b>${hm(v[w])}</b></div>`).join('')}</div>`).join('')}</div>` : ''}
  <form class="card row" data-form="addSport"><h3 style="flex-basis:100%;margin:0">Log an activity</h3>${fields({})}<button class="primary">Add activity</button></form>
  <datalist id="sporttypes">${types.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
  <div class="tabs">${tab('swho', 'all', sportWho === 'all', 'Everyone')}${tab('swho', '0', sportWho === '0', esc(S.names[0]))}${tab('swho', '1', sportWho === '1', esc(S.names[1]))}</div>
  <div class="card"><ul class="items">${list.map(row).join('') || '<li class="muted">Nothing logged yet.</li>'}</ul></div>`;
}

/* ---------- shell ---------- */
const view = document.getElementById('view'), nav = document.getElementById('nav');
let lastPage = null;
function render() {
  document.body.classList.toggle('locked', !authed);
  if (!authed) { nav.innerHTML = ''; view.innerHTML = loginView(); return; }
  const m = MODS.find(m => m.id === location.hash.slice(1)) || MODS[0];
  nav.innerHTML = MODS.map(x => `<a href="#${x.id}" class="${x.id === m.id ? 'on' : ''}" aria-label="${x.title}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[x.id] || ''}</svg><span>${x.title}</span></a>`).join('');
  document.getElementById('brand').textContent = S.names.join(' + ');
  const y = m.id === lastPage ? view.scrollTop : 0; // keep position on the same page, start at the top on a new one
  if (m.id !== lastPage) editing = null;
  lastPage = m.id;
  view.innerHTML = m.render();
  view.classList.toggle('onehome', m.id === 'home');
  view.scrollTop = y;
  document.title = m.id === 'home' ? 'Us – our little helper' : `${m.title} · Us`;
  if (editing) view.querySelector('.editing input[type=text], .editing textarea')?.focus();
  hydrate(); fillWeather();
  clearInterval(rotTimer); if (m.id === 'home' && sb && S.photos.length > 1) rotTimer = setInterval(rotatePhoto, 9000);
}
const UI_ONLY = new Set(['pick', 'prev', 'next', 'edit', 'cancel', 'tab', 'srange', 'swho', 'nwho', 'logout', 'export', 'notifyOn', 'notifyOff', 'notifyTest']);
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  if (f.dataset.form === 'login') { e.preventDefault(); login(new FormData(f)); return; }
  e.preventDefault();
  try { F[f.dataset.form](Object.fromEntries(new FormData(f))); }
  catch (err) { console.error(err); toast('That item was changed or removed on the other device.'); }
  editing = null; save(); render();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.type === 'checkbox' || !A[b.dataset.act]) return;
  const a = b.dataset.act; A[a](b.dataset.id); if (!UI_ONLY.has(a)) save(); render();
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
