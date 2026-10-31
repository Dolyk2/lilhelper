/* Us – relationship helper. Each feature is a module in MODS: add one object
   {id,title,render} and it appears in the menu. All data lives in S and goes
   through store.load/save, so later you can swap localStorage for a server. */

const KEY = 'us-helper-v1';
const DEFAULTS = {
  names: ['Me', 'Her'], events: [], tasks: [], notes: [], photos: [], sports: [],
  lists: [{ id: 'l1', name: 'Shopping', items: [] }], milestones: []
};
const store = {
  load() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return structuredClone(DEFAULTS); } },
  save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { console.warn('Could not save', e); } }
};
let S = store.load();
/* Saving: always keep a local copy; when online mode is on, also push to Supabase. */
const save = () => {
  store.save(S);
  if (sb && authed) { dirty = true; clearTimeout(pushTimer); pushTimer = setTimeout(push, 400); }
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
const daysTo = m => {
  const d = parse(m.date), t = today0();
  let o = d;
  if (m.repeat) { o = new Date(t.getFullYear(), d.getMonth(), d.getDate()); if (o < t) o.setFullYear(t.getFullYear() + 1); }
  return Math.round((o - t) / 864e5);
};

/* ---------- modules ---------- */
const cal = { y: new Date().getFullYear(), m: new Date().getMonth(), sel: iso(new Date()) };
let listTab = null;
let homePhotoId = null, sportRange = 'month', sportWho = 'all';
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
  const evRow = (e, label) => `<li><span class="grow">${esc(e.title)}</span>${label ? `<span class="tag teal">${label}</span>` : ''}<span class="muted">${esc(e.time || 'all day')}</span></li>`;
  const label = k => { const n = Math.round((parse(k) - t0) / 864e5); return n === 1 ? 'Tomorrow' : parse(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); };
  const evs = S.events.filter(e => e.date === t).sort(byTime);
  const coming = S.events.filter(e => e.date > t).sort(byTime).slice(0, 8);
  const open = S.tasks.filter(x => !x.done).slice(0, 6);
  const ms = S.milestones.map(m => ({ ...m, n: daysTo(m) })).sort((a, b) => a.n - b.n).slice(0, 3);
  const lst = S.lists.slice(0, 4).map(l => ({ name: l.name, open: l.items.filter(i => !i.done) }));
  if (!S.photos.find(p => p.id === homePhotoId)) homePhotoId = S.photos.length ? S.photos[Math.floor(Math.random() * S.photos.length)].id : null;
  const hp = S.photos.find(p => p.id === homePhotoId);
  const mon = S.sports.filter(s => s.date.startsWith(t.slice(0, 7)));
  const tm = i => mon.filter(s => s.who == i || s.who == 2).reduce((a, s) => a + s.mins, 0);
  const last = [...S.sports].sort((a, b) => b.date.localeCompare(a.date))[0];
  const more = (id, txt) => `<p style="margin:.6rem 0 0"><a href="#${id}">${txt}</a></p>`;
  return `<h2>${(h => h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')(new Date().getHours())}, ${esc(S.names[0])} & ${esc(S.names[1])}</h2><p class="muted">${fmt(t)}</p>
  <div class="home">
    <section class="card span hero"><h3>Special dates</h3>${ms.length
      ? `<div class="herorow">${ms.map((m, i) => `<div class="${i ? 'small' : ''}"><div class="big">${m.n === 0 ? 'Today' : m.n}</div><p>${m.n === 0 ? '' : 'days until '}${esc(m.title)}</p></div>`).join('')}</div>`
      : `<p class="muted">Add an anniversary or birthday under Special dates.</p>`}</section>
    <section class="card"><h3>Today</h3>${evs.length ? `<ul class="items">${evs.map(e => evRow(e)).join('')}</ul>` : `<p class="muted">Nothing planned today.</p>`}${more('calendar', 'Open calendar')}</section>
    <section class="card"><h3>Coming up</h3>${coming.length ? `<ul class="items">${coming.map(e => evRow(e, label(e.date))).join('')}</ul>` : `<p class="muted">No upcoming events. Add one in the Calendar.</p>`}${more('calendar', 'Open calendar')}</section>
    <section class="card"><h3>Memory</h3>${hp && sb
      ? `<button class="homephoto" onclick="openViewer('${hp.id}')" aria-label="Open photo"><img data-photo="${hp.path}" alt="Memory from ${fmt(hp.date)}"></button><p class="muted">${fmt(hp.date)} <button class="ghost" onclick="shufflePhoto()">Show another</button></p>`
      : `<p class="muted">Add photos to a day in the Calendar and a random one shows up here.</p>`}</section>
    <section class="card"><h3>Sports this month</h3>${mon.length
      ? `<div class="big">${hm(tm(0) + tm(1))}</div><p class="muted">both of you combined</p><p>${esc(S.names[0])} <strong>${hm(tm(0))}</strong>, ${esc(S.names[1])} <strong>${hm(tm(1))}</strong></p>${last ? `<p class="muted">Last: ${esc(last.type)} on ${fmt(last.date)}</p>` : ''}`
      : `<p class="muted">Nothing logged this month.</p>`}${more('sports', 'Open sports')}</section>
    <section class="card"><h3>Lists</h3>${lst.length ? lst.map(l => `<div class="mini"><strong>${esc(l.name)}</strong> <span class="tag">${l.open.length} open</span><div class="muted">${l.open.length ? esc(l.open.slice(0, 4).map(i => i.text).join(', ')) + (l.open.length > 4 ? '…' : '') : 'All done'}</div></div>`).join('') : `<p class="muted">No lists yet.</p>`}${more('lists', 'All lists')}</section>
    <section class="card"><h3>Open to-dos</h3>${open.length ? `<ul class="items">${open.map(x => `<li><span class="grow">${esc(x.text)}</span><span class="tag">${esc(owner(x.owner))}</span></li>`).join('')}</ul>` : `<p class="muted">All done. Add a new to-do when something comes up.</p>`}${more('tasks', 'All to-dos')}</section>
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
    const p1 = S.photos.find(p => p.date === k);
    cells += `<button class="${cls}${p1 ? ' pic' : ''}" ${p1 ? `data-photo="${p1.thumb}"` : ''} data-act="pick" data-id="${k}" aria-label="${fmt(k)}${p1 ? ', has photos' : ''}"><span>${d}</span></button>`;
  }
  const evs = S.events.filter(e => e.date === cal.sel).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const evLi = e => editing === e.id
    ? `<li><form class="row editing" data-form="saveEvent">${hid(e.id)}<input type="text" name="title" value="${esc(e.title)}" required aria-label="Event title"><input type="date" name="date" value="${e.date}" required aria-label="Date"><input type="time" name="time" value="${esc(e.time || '')}" aria-label="Time"><select name="who" aria-label="Who">${ownerOpts(e.who)}</select>${formBtns}</form></li>`
    : `<li><span class="grow">${esc(e.title)}</span><span class="muted">${esc(e.time || 'all day')}</span><span class="tag teal">${esc(owner(e.who))}</span>${editBtn(e.id)}<button class="ghost" data-act="delEvent" data-id="${e.id}" aria-label="Delete event">✕</button></li>`;
  const ph = S.photos.filter(p => p.date === cal.sel).sort((a, b) => a.at - b.at);
  const memories = `<div class="card"><h3>Memories</h3>${sb
    ? `<div class="thumbs">${ph.map(p => `<button class="thumb" onclick="openViewer('${p.id}')" aria-label="Open photo"><img data-photo="${p.thumb}" alt="Memory from ${fmt(cal.sel)}"></button>`).join('')}</div>
      <button class="primary" onclick="this.nextElementSibling.click()">Add photos</button><input type="file" accept="image/*" multiple hidden onchange="addPhotos(this)">`
    : '<p class="muted">Photos need the online mode (Supabase login).</p>'}</div>`;
  return `<h2>Calendar</h2>
  <form class="card row" data-form="addEvent"><h3 style="flex-basis:100%;margin:0">New event</h3>
    <input type="text" name="title" placeholder="What's happening?" required aria-label="Event title">
    <input type="date" name="date" value="${cal.sel}" required aria-label="Date">
    <input type="time" name="time" aria-label="Time">
    <select name="who" aria-label="Who">${ownerOpts()}</select>
    <button class="primary">Add event</button></form>
  <div class="calwrap"><div class="card"><div class="calhead"><button data-act="prev" aria-label="Previous month">‹</button><h3>${title}</h3><button data-act="next" aria-label="Next month">›</button></div><div class="cal">${cells}</div></div>
  <div class="daypanel"><div class="card"><h3>${fmt(cal.sel)}</h3>
    <ul class="items">${evs.map(evLi).join('') || '<li class="muted">No events this day.</li>'}</ul></div>${memories}</div></div>`;
}

function tasks() {
  const li = x => editing === x.id
    ? `<li><form class="row editing" data-form="saveTask">${hid(x.id)}<input type="text" name="text" value="${esc(x.text)}" required aria-label="To-do"><select name="owner" aria-label="Who">${ownerOpts(x.owner)}</select><input type="date" name="due" value="${x.due || ''}" aria-label="Due date">${formBtns}</form></li>`
    : `<li class="${x.done ? 'done' : ''}"><input type="checkbox" ${x.done ? 'checked' : ''} data-act="toggleTask" data-id="${x.id}" aria-label="Done">
    <span class="grow">${esc(x.text)} ${x.due ? `<span class="muted">due ${fmt(x.due)}</span>` : ''}</span>${editBtn(x.id)}<button class="ghost" data-act="delTask" data-id="${x.id}" aria-label="Delete to-do">✕</button></li>`;
  const secs = [[2, 'Both of us'], [1, S.names[1]], [0, S.names[0]]];
  const sec = ([o, title]) => {
    const mine = S.tasks.filter(x => x.owner == o), open = mine.filter(x => !x.done), done = mine.filter(x => x.done);
    return `<section class="card"><h3>${esc(title)}</h3>
      <ul class="items">${open.map(li).join('') || '<li class="muted">Nothing open.</li>'}</ul>
      ${done.length ? `<p class="muted" style="margin:.9rem 0 0">Done</p><ul class="items">${done.map(li).join('')}</ul>` : ''}</section>`;
  };
  return `<h2>To-do</h2>
  <form class="card row" data-form="addTask"><h3 style="flex-basis:100%;margin:0">New to-do</h3>
    <input type="text" name="text" placeholder="What needs doing?" required aria-label="To-do">
    <select name="owner" aria-label="For whom">${ownerOpts(2)}</select>
    <input type="date" name="due" aria-label="Due date">
    <button class="primary">Add to-do</button></form>
  <div class="cols">${secs.map(sec).join('')}</div>
  ${S.tasks.some(x => x.done) ? '<p><button data-act="clearDone">Clear all done</button></p>' : ''}`;
}

function notes() {
  const sorted = [...S.notes].sort((a, b) => (b.pin - a.pin) || b.at - a.at);
  const card = n => editing === n.id
    ? `<form class="card editing" data-form="saveNote">${hid(n.id)}<input type="text" name="title" value="${esc(n.title)}" placeholder="Title (optional)" style="width:100%;margin-bottom:.5rem" aria-label="Title"><textarea name="body" required aria-label="Note">${esc(n.body)}</textarea><p>${formBtns}</p></form>`
    : `<article class="card note ${n.pin ? 'pin' : ''}"><h3>${esc(n.title || 'Untitled')}</h3><div>${esc(n.body)}</div>
    <p class="muted">${new Date(n.at).toLocaleDateString()} ${editBtn(n.id)}<button class="ghost" data-act="pinNote" data-id="${n.id}">${n.pin ? 'Unpin' : 'Pin'}</button><button class="ghost" data-act="delNote" data-id="${n.id}">Delete</button></p></article>`;
  return `<h2>Notes</h2>
  <form class="card" data-form="addNote"><input type="text" name="title" placeholder="Title (optional)" style="width:100%;margin-bottom:.5rem" aria-label="Title">
    <textarea name="body" placeholder="Gift ideas, things she said she likes, places to try…" required aria-label="Note"></textarea><p><button class="primary">Save note</button></p></form>
  ${sorted.map(card).join('')}`;
}

function lists() {
  if (!S.lists.find(l => l.id === listTab)) listTab = S.lists[0]?.id;
  const cur = S.lists.find(l => l.id === listTab);
  const item = i => editing === i.id
    ? `<li><form class="row editing" data-form="saveItem">${hid(i.id)}<input type="text" name="text" value="${esc(i.text)}" required aria-label="Item">${formBtns}</form></li>`
    : `<li class="${i.done ? 'done' : ''}"><input type="checkbox" ${i.done ? 'checked' : ''} data-act="toggleItem" data-id="${i.id}" aria-label="Done"><span class="grow">${esc(i.text)}</span>${editBtn(i.id)}<button class="ghost" data-act="delItem" data-id="${i.id}" aria-label="Delete item">✕</button></li>`;
  const foot = cur && (editing === cur.id
    ? `<form class="row editing" data-form="saveList">${hid(cur.id)}<input type="text" name="name" value="${esc(cur.name)}" required aria-label="List name">${formBtns}</form>`
    : `<p>${editBtn(cur.id).replace('>Edit<', '>Rename list<')}<button class="ghost" data-act="delList" data-id="${cur.id}">Delete this list</button></p>`);
  return `<h2>Lists</h2><p class="muted">Shopping, movies to watch, places to visit, bucket list.</p>
  <div class="tabs">${S.lists.map(l => `<button class="${l.id === listTab ? 'on' : ''}" data-act="tab" data-id="${l.id}">${esc(l.name)}</button>`).join('')}</div>
  <form class="row" data-form="addList"><input type="text" name="name" placeholder="New list name" required aria-label="List name"><button>Create list</button></form>
  ${cur ? `<div class="card"><form class="row" data-form="addItem"><input type="text" name="text" placeholder="Add to ${esc(cur.name)}" required aria-label="Item"><button class="primary">Add</button></form>
    <ul class="items">${cur.items.map(item).join('') || '<li class="muted">Empty list.</li>'}</ul>${foot}</div>` : ''}`;
}

function dates() {
  const ms = S.milestones.map(m => ({ ...m, n: daysTo(m) })).sort((a, b) => a.n - b.n);
  const li = m => editing === m.id
    ? `<li><form class="row editing" data-form="saveMs">${hid(m.id)}<input type="text" name="title" value="${esc(m.title)}" required aria-label="Title"><input type="date" name="date" value="${m.date}" required aria-label="Date"><label class="muted"><input type="checkbox" name="repeat" ${m.repeat ? 'checked' : ''}> every year</label>${formBtns}</form></li>`
    : `<li><span class="grow">${esc(m.title)} <span class="muted">· ${fmt(m.date)}</span></span><span class="tag teal">${m.n === 0 ? 'today' : m.n + ' days'}</span>${editBtn(m.id)}<button class="ghost" data-act="delMs" data-id="${m.id}" aria-label="Delete date">✕</button></li>`;
  return `<h2>Special dates</h2>
  <form class="row" data-form="addMs"><input type="text" name="title" placeholder="Anniversary, birthday, trip…" required aria-label="Title"><input type="date" name="date" required aria-label="Date">
    <label class="muted"><input type="checkbox" name="repeat" checked> every year</label><button class="primary">Add date</button></form>
  <div class="card"><ul class="items">${ms.map(li).join('') || '<li class="muted">No dates yet.</li>'}</ul></div>`;
}

function settings() {
  return `<h2>Settings</h2>
  <form class="card" data-form="names"><h3>Names</h3><div class="row"><input type="text" name="a" value="${esc(S.names[0])}" aria-label="Your name"><input type="text" name="b" value="${esc(S.names[1])}" aria-label="Partner's name"><button class="primary">Save names</button></div></form>
  ${sb ? `<div class="card"><h3>Account</h3><p class="muted">You are logged in. Changes reach your partner within about 15 seconds.</p><p class="muted" role="status">${esc(syncInfo)}</p><button onclick="pull(true).then(render)">Sync now</button> <button data-act="logout">Log out</button></div>` : ''}
  <div class="card"><h3>Backup</h3><p class="muted">${sb ? 'Your data is saved online. A backup file is still a good safety net.' : 'Data is stored in this browser only. Export a copy now and then.'}</p>
    <button data-act="export">Export backup</button> <label><button type="button" onclick="this.nextElementSibling.click()">Import backup</button><input type="file" id="imp" accept=".json" hidden></label></div>`;
}

const MODS = [
  { id: 'home', title: 'Home', render: home },
  { id: 'calendar', title: 'Calendar', render: calendar },
  { id: 'tasks', title: 'To-do', render: tasks },
  { id: 'notes', title: 'Notes', render: notes },
  { id: 'lists', title: 'Lists', render: lists },
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
  toggleTask: id => { const t = S.tasks.find(x => x.id === id); t.done = !t.done; },
  delTask: id => { S.tasks = S.tasks.filter(x => x.id !== id); },
  clearDone: () => { S.tasks = S.tasks.filter(x => !x.done); },
  pinNote: id => { const n = S.notes.find(x => x.id === id); n.pin = !n.pin; },
  delNote: id => { S.notes = S.notes.filter(x => x.id !== id); },
  tab: id => { listTab = id; editing = null; },
  toggleItem: id => { const i = S.lists.find(l => l.id === listTab).items.find(x => x.id === id); i.done = !i.done; },
  delItem: id => { const l = S.lists.find(l => l.id === listTab); l.items = l.items.filter(x => x.id !== id); },
  delList: id => { S.lists = S.lists.filter(l => l.id !== id); },
  delMs: id => { S.milestones = S.milestones.filter(m => m.id !== id); },
  srange: id => { sportRange = id; },
  swho: id => { sportWho = id; },
  delSport: id => { S.sports = S.sports.filter(s => s.id !== id); },
  logout: () => { sb.auth.signOut(); authed = false; },
  export: () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
    a.download = `us-backup-${iso(new Date())}.json`; a.click();
  }
};
const F = {
  addEvent: d => { S.events.push({ id: uid(), date: d.date, title: d.title.trim(), time: d.time, who: +d.who }); goTo(d.date); },
  addTask: d => S.tasks.push({ id: uid(), text: d.text.trim(), owner: +d.owner, due: d.due, done: false }),
  addNote: d => S.notes.push({ id: uid(), title: d.title.trim(), body: d.body.trim(), pin: false, at: Date.now() }),
  addList: d => { const l = { id: uid(), name: d.name.trim(), items: [] }; S.lists.push(l); listTab = l.id; },
  addItem: d => S.lists.find(l => l.id === listTab).items.push({ id: uid(), text: d.text.trim(), done: false }),
  addMs: d => S.milestones.push({ id: uid(), title: d.title.trim(), date: d.date, repeat: !!d.repeat }),
  saveEvent: d => { const e = S.events.find(x => x.id === d.id); Object.assign(e, { title: d.title.trim(), date: d.date, time: d.time, who: +d.who }); goTo(d.date); },
  saveTask: d => Object.assign(S.tasks.find(x => x.id === d.id), { text: d.text.trim(), owner: +d.owner, due: d.due }),
  saveNote: d => Object.assign(S.notes.find(x => x.id === d.id), { title: d.title.trim(), body: d.body.trim() }),
  saveItem: d => { S.lists.find(l => l.id === listTab).items.find(x => x.id === d.id).text = d.text.trim(); },
  saveList: d => { S.lists.find(l => l.id === d.id).name = d.name.trim(); },
  saveMs: d => Object.assign(S.milestones.find(x => x.id === d.id), { title: d.title.trim(), date: d.date, repeat: !!d.repeat }),
  addSport: d => S.sports.push({ id: uid(), ...sportData(d) }),
  saveSport: d => Object.assign(S.sports.find(x => x.id === d.id), sportData(d)),
  names: d => { S.names = [d.a.trim() || 'Me', d.b.trim() || 'Her']; }
};

const ICONS = {
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
let authed = !sb, dirty = false, pushTimer = null, syncInfo = '';
const canon = o => JSON.stringify(o, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : 1)) : v);
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 4000); }
async function push() {
  const { data, error } = await sb.from('shared_data').update({ data: S, updated_at: new Date().toISOString() }).eq('id', 1).select('id');
  if (error) toast('Could not save online: ' + error.message);
  else if (!data.length) toast('Not saved online: the shared row is missing or blocked. Check the Supabase setup.');
  else { dirty = false; syncInfo = 'Last saved online at ' + new Date().toLocaleTimeString(); }
}
async function pull(first) {
  const { data, error } = await sb.from('shared_data').select('data').eq('id', 1).single();
  if (error) { if (first) toast('Could not load online data: ' + error.message); return; }
  syncInfo = 'Last checked online at ' + new Date().toLocaleTimeString();
  const remote = data.data || {};
  if (!Object.keys(remote).length) { if (first) push(); return; } // online copy empty: upload what is on this device
  if (dirty || editing || document.activeElement?.matches('input,textarea,select')) return;
  const merged = { ...DEFAULTS, ...remote };
  if (canon(merged) === canon(S)) return;
  S = merged; store.save(S); render();
}
async function login(fd) {
  const msg = document.getElementById('loginmsg'); msg.textContent = 'Signing in…';
  const { error } = await sb.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
  if (error) { msg.textContent = 'Wrong email or password.'; return; }
  authed = true; await pull(true); render();
}
const loginView = () => `<form class="card login" data-form="login"><h2>Welcome back</h2><p class="muted">Log in to open your shared space.</p>
  <p><input type="email" name="email" placeholder="Email" required autocomplete="username" aria-label="Email" style="width:100%"></p>
  <p><input type="password" name="password" placeholder="Password" required autocomplete="current-password" aria-label="Password" style="width:100%"></p>
  <p><button class="primary">Log in</button> <span id="loginmsg" class="muted" role="status"></span></p></form>`;
async function boot() {
  if (sb) {
    const { data } = await sb.auth.getSession();
    authed = !!data.session;
    if (authed) await pull(true);
    setInterval(() => { if (authed && !document.hidden) pull(); }, 15000);
    document.addEventListener('visibilitychange', () => { if (authed && !document.hidden) pull(); });
  }
  render();
}

/* ---------- photos (Supabase Storage, private bucket "memories") ---------- */
const urlCache = {};
async function urls(paths) {
  const need = [...new Set(paths)].filter(p => !urlCache[p] || urlCache[p].exp < Date.now());
  if (need.length) {
    const { data } = await sb.storage.from('memories').createSignedUrls(need, 3600);
    (data || []).forEach(d => { if (d.signedUrl) urlCache[d.path] = { url: d.signedUrl, exp: Date.now() + 3300e3 }; });
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
  const date = S.photos.find(p => p.id === id).date;
  const list = S.photos.filter(p => p.date === date).sort((a, b) => a.at - b.at);
  let i = list.findIndex(p => p.id === id);
  const box = document.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  box.innerHTML = `<img alt="Memory"><div class="lbbar"><button data-x="prev" aria-label="Previous">‹</button><span></span><button data-x="next" aria-label="Next">›</button><button data-x="del">Delete</button><button data-x="close">Close</button></div>`;
  document.body.append(box);
  const img = box.querySelector('img'), cap = box.querySelector('span');
  const show = async () => { const p = list[i]; cap.textContent = `${fmt(p.date)}, ${i + 1} of ${list.length}`; await urls([p.path]); img.src = urlCache[p.path]?.url || ''; };
  const esc_ = e => { if (e.key === 'Escape') { box.remove(); document.removeEventListener('keydown', esc_); } };
  document.addEventListener('keydown', esc_);
  box.onclick = async e => {
    const x = e.target.dataset.x;
    if (e.target === box || x === 'close') return box.remove();
    if (x === 'prev') { i = (i - 1 + list.length) % list.length; show(); }
    if (x === 'next') { i = (i + 1) % list.length; show(); }
    if (x === 'del' && confirm('Delete this photo for both of you?')) {
      const p = list[i]; await sb.storage.from('memories').remove([p.path, p.thumb]);
      S.photos = S.photos.filter(q => q.id !== p.id); save(); box.remove(); render();
    }
  };
  show();
}

/* ---------- sports ---------- */
const SPORT_TYPES = ['Gym', 'Running', 'Walking', 'Hiking', 'Cycling', 'Swimming', 'Yoga', 'Skating', 'Football', 'Stretching'];
const sportData = d => ({ type: d.type.trim(), date: d.date, mins: +d.mins || 0, km: +d.km || 0, who: +d.who, exercises: d.exercises.trim(), note: d.note.trim() });
function sports() {
  const today = iso(new Date()), t0 = today0();
  const wk = new Date(t0); wk.setDate(t0.getDate() - ((t0.getDay() + 6) % 7));
  const start = sportRange === 'week' ? iso(wk) : sportRange === 'month' ? today.slice(0, 8) + '01' : '0000-00-00';
  const all = [...S.sports].sort((a, b) => b.date.localeCompare(a.date));
  const inR = all.filter(s => s.date >= start);
  const has = (s, i) => s.who == i || s.who == 2;
  const mine = i => inR.filter(s => has(s, i));
  const tm = i => mine(i).reduce((a, s) => a + s.mins, 0);
  const km = i => mine(i).reduce((a, s) => a + s.km, 0);
  const together = inR.filter(s => s.who == 2).reduce((a, s) => a + s.mins, 0);
  const byType = {}; inR.forEach(s => byType[s.type] = (byType[s.type] || 0) + s.mins);
  const bars = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6), maxB = bars[0]?.[1] || 1;
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
    : `<li><span class="tag teal">${esc(s.type)}</span><div class="grow"><strong>${parse(s.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong>
      <span class="muted">${[s.mins && s.mins + ' min', s.km && s.km + ' km'].filter(Boolean).join(', ')}</span>
      ${s.exercises ? `<div>${esc(s.exercises)}</div>` : ''}${s.note ? `<div class="muted">${esc(s.note)}</div>` : ''}</div>
      <span class="tag">${esc(owner(s.who))}</span>${editBtn(s.id)}<button class="ghost" data-act="delSport" data-id="${s.id}" aria-label="Delete activity">✕</button></li>`;
  return `<h2>Sports</h2>
  <div class="tabs">${[['week', 'This week'], ['month', 'This month'], ['all', 'All time']].map(([id, t]) => tab('srange', id, sportRange === id, t)).join('')}</div>
  <div class="grid" style="margin-bottom:1rem">
    <div class="card"><p class="muted">Both of you combined</p><div class="big">${hm(tm(0) + tm(1))}</div><p class="muted">${hm(together)} done together, ${inR.length} activities</p></div>
    ${[0, 1].map(i => `<div class="card"><p class="muted">${esc(S.names[i])}</p><div class="big">${hm(tm(i))}</div><p class="muted">${mine(i).length} activities, ${km(i).toFixed(1)} km</p></div>`).join('')}
  </div>
  <p class="muted" style="margin-top:-.4rem">Activities done together count for both of you.</p>
  ${bars.length ? `<div class="card"><h3>Time by activity</h3>${bars.map(([t, v]) => `<div class="bar"><span>${esc(t)}</span><div><i style="width:${Math.round(v / maxB * 100)}%"></i></div><b>${hm(v)}</b></div>`).join('')}</div>` : ''}
  <form class="card row" data-form="addSport"><h3 style="flex-basis:100%;margin:0">Log an activity</h3>${fields({})}<button class="primary">Add activity</button></form>
  <datalist id="sporttypes">${types.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
  <div class="tabs">${tab('swho', 'all', sportWho === 'all', 'Everyone')}${tab('swho', '0', sportWho === '0', esc(S.names[0]))}${tab('swho', '1', sportWho === '1', esc(S.names[1]))}</div>
  <div class="card"><ul class="items">${list.map(row).join('') || '<li class="muted">Nothing logged yet.</li>'}</ul></div>`;
}

/* ---------- shell ---------- */
const view = document.getElementById('view'), nav = document.getElementById('nav');
function render() {
  document.body.classList.toggle('locked', !authed);
  if (!authed) { nav.innerHTML = ''; view.innerHTML = loginView(); return; }
  const m = MODS.find(m => m.id === location.hash.slice(1)) || MODS[0];
  nav.innerHTML = MODS.map(x => `<a href="#${x.id}" class="${x.id === m.id ? 'on' : ''}" aria-label="${x.title}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[x.id] || ''}</svg><span>${x.title}</span></a>`).join('');
  document.getElementById('brand').textContent = S.names.join(' + ');
  const y = view.scrollTop;
  view.innerHTML = m.render();
  view.scrollTop = y;
  if (editing) view.querySelector('.editing input[type=text], .editing textarea')?.focus();
  hydrate();
}
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  if (f.dataset.form === 'login') { e.preventDefault(); login(new FormData(f)); return; }
  e.preventDefault(); F[f.dataset.form](Object.fromEntries(new FormData(f))); editing = null; save(); render();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.type === 'checkbox') return;
  A[b.dataset.act](b.dataset.id); save(); render();
});
document.addEventListener('change', e => {
  const b = e.target.closest('[data-act]');
  if (b && b.type === 'checkbox') { A[b.dataset.act](b.dataset.id); save(); render(); }
  if (e.target.id === 'imp' && e.target.files[0]) {
    e.target.files[0].text().then(t => {
      try { S = { ...DEFAULTS, ...JSON.parse(t) }; save(); render(); } catch { alert('That file is not a valid backup.'); }
    });
  }
});
window.addEventListener('hashchange', render);
boot();
