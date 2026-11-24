/* ===== Cards: a collectible card game made of your own photos =====
   Every photo in Memories is a card. Each of you collects your own album:
   - a free pack every day,
   - bonus packs (better odds) for: all daily goals done, a sport logged, a love letter written,
   - duplicates turn into ✨ sparkles; 10 sparkles buy a bonus pack.
   Photos taken on a special date (anniversary, birthday…) are always Legendary.
   Loaded before app.js; only declares things. */

const RAR = [['c', 'Common', '#b8b2cc'], ['r', 'Rare', '#5ab4ff'], ['e', 'Epic', '#c47bff'], ['l', 'Legendary', '#ffc857']];
const RNAME = Object.fromEntries(RAR.map(([k, n]) => [k, n]));
const ODDS = { daily: { c: 60, r: 28, e: 10, l: 2 }, bonus: { c: 30, r: 38, e: 24, l: 8 } };
const SPARK = { c: 1, r: 2, e: 4, l: 8 }, PACK_COST = 10;
let albumWho = null, cardSort = 'date';
const G = () => { const g = (S.game ||= {}); g.packs ||= { 0: [], 1: [] }; g.earned ||= { 0: {}, 1: {} }; g.cards ||= { 0: {}, 1: {} }; g.spark ||= { 0: 0, 1: 0 }; return g; };
const hashN = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const rarityOf = p => S.milestones.some(m => onDay(m, p.date)) ? 'l' : (h => h < .1 ? 'e' : h < .36 ? 'r' : 'c')(hashN(p.id));
const powerOf = p => ({ c: 10, r: 35, e: 60, l: 85 }[rarityOf(p)] + Math.floor(hashN(p.id + 'p') * 15));
const cardName = p => { const e = S.events.filter(x => x.date === p.date)[0], m = S.milestones.find(x => onDay(x, p.date)); return m ? m.title : e ? e.title : 'A day together'; };

/* Give a pack once per reason (key) — e.g. "goals:2026-11-24". Shows a small message. */
function earnPack(w, key, why, kind = 'bonus') {
  const g = G(), e = (g.earned[w] ||= {});
  if (e[key]) return false;
  e[key] = iso(new Date()); (g.packs[w] ||= []).push(kind);
  if (w === I() && why) toast(`🃏 New ${kind === 'daily' ? '' : 'bonus '}pack for ${why}!`);
  return true;
}
/* Check today's reasons for packs. Runs when the app draws a page; returns true if something changed. */
function checkPacks() {
  if (!S.photos.length) return false;
  const t = iso(new Date()), g = G(); let ch = false;
  for (const w of [0, 1]) {
    if (w === I()) ch = earnPack(w, 'daily:' + t, '', 'daily') || ch; // the daily pack waits in your album
    if (S.goals.some(x => people(x).includes(w)) && dayScore(w, t) >= 1) ch = earnPack(w, 'goals:' + t, 'finishing all your goals today') || ch;
    if (S.sports.some(s => s.date === t && (s.who == w || s.who == 2))) ch = earnPack(w, 'sport:' + t, 'doing sport today') || ch;
  }
  /* forget reasons older than 40 days, so the list stays small */
  const old = iso(new Date(Date.now() - 40 * 864e5));
  for (const w of [0, 1]) for (const k of Object.keys(g.earned[w] || {})) if (k.split(':')[1] < old) { delete g.earned[w][k]; ch = true; }
  return ch;
}
function drawCard(kind) {
  const odds = ODDS[kind] || ODDS.daily, roll = Math.random() * 100;
  let acc = 0, want = 'c'; for (const k of ['l', 'e', 'r', 'c']) { acc += odds[k]; if (roll < acc) { want = k; break; } }
  const order = ['l', 'e', 'r', 'c'], have = G().cards[I()] || {};
  for (let i = order.indexOf(want); i < order.length + 4; i++) { // fall back to a lower rarity if there is no photo of this one
    const r = order[Math.min(i, 3)], pool = S.photos.filter(p => rarityOf(p) === r);
    if (pool.length) { const w = pool.map(p => have[p.id] ? 1 : 3), sum = w.reduce((a, b) => a + b, 0); let x = Math.random() * sum; return pool.find((p, j) => (x -= w[j]) < 0) || pool[0]; }
  }
  return S.photos[Math.floor(Math.random() * S.photos.length)];
}
const cardHtml = (p, n = 1, big = false) => { const r = rarityOf(p); return `<div class="pcard r-${r}${big ? ' big' : ''}" data-hl="${p.id}">
  <div class="pctop"><b>${esc(cardName(p))}</b><span class="pcpow">♥ ${powerOf(p)}</span></div>
  <div class="pcimg"><img data-photo="${esc(big ? p.path : p.thumb)}" alt=""></div>
  <div class="pcbot"><span class="pcr">${RNAME[r]}</span><small>${fmtShort(p.date)}</small>${n > 1 ? `<span class="pcn">×${n}</span>` : ''}</div></div>`; };

function cardsPage() {
  const w = albumWho ?? I(), g = G(), mine = w === I(), have = g.cards[w] || {};
  const all = [...S.photos].sort(cardSort === 'rarity' ? (a, b) => 'lerc'.indexOf(rarityOf(a)) - 'lerc'.indexOf(rarityOf(b)) || b.date.localeCompare(a.date) : (a, b) => b.date.localeCompare(a.date));
  const got = all.filter(p => have[p.id]).length, packs = g.packs[I()] || [];
  const byR = RAR.map(([k, n, c]) => `<span class="chip" style="--rc:${c}"><b>${all.filter(p => rarityOf(p) === k && have[p.id]).length}/${all.filter(p => rarityOf(p) === k).length}</b> ${n}</span>`).join('');
  if (!S.photos.length) return `<h2>Cards</h2><div class="card"><p>Every photo you add to a day in the <a href="#calendar">Calendar</a> becomes a collectible card. Add a few photos and come back for your first pack!</p></div>`;
  return `<h2>Cards</h2>
  <div class="cardtop">
    <div class="card packbox">${packs.length
      ? `<button class="pack ${packs[0]}" onclick="openPack()" aria-label="Open a pack"><span class="pshine"></span><b>${packs[0] === 'bonus' ? 'BONUS' : 'DAILY'}</b><small>tap to open</small></button><div><h3>${packs.length} pack${packs.length > 1 ? 's' : ''} waiting</h3><p class="muted">${packs.filter(x => x === 'bonus').length ? `${packs.filter(x => x === 'bonus').length} bonus (better odds)` : 'Daily pack'}</p></div>`
      : `<div class="pack empty"><b>✓</b></div><div><h3>No packs right now</h3><p class="muted">Tomorrow brings a new daily pack.</p></div>`}</div>
    <div class="card earnbox"><h3>Earn bonus packs</h3><ul class="earn">
      ${[['goals', '🎯', 'Finish all your daily goals'], ['sport', '🏃', 'Log a sport'], ['letter', '💌', 'Write a love letter']].map(([k, i, t]) => `<li class="${g.earned[I()]?.[k + ':' + iso(new Date())] ? 'done' : ''}"><span>${i}</span>${t}<b>${g.earned[I()]?.[k + ':' + iso(new Date())] ? '✓ today' : '+1'}</b></li>`).join('')}
      <li><span>✨</span>${g.spark[I()] || 0} / ${PACK_COST} sparkles from duplicates<button class="ghost" data-act="buyPack" ${(g.spark[I()] || 0) < PACK_COST ? 'disabled' : ''}>Get a pack</button></li></ul></div>
  </div>
  <div class="chead albumh"><h3>${mine ? 'Your' : esc(S.names[w]) + '’s'} album <span class="muted">${got} of ${all.length}</span></h3>
    <div class="tabs" style="margin:0">${[0, 1].map(i => `<button class="${w === i ? 'on' : ''}" data-act="album" data-id="${i}" data-w="${i}">${esc(S.names[i])} · ${Object.keys(g.cards[i] || {}).filter(id => S.photos.some(p => p.id === id)).length}</button>`).join('')}
      <button class="${cardSort === 'rarity' ? 'on' : ''}" data-act="csort">${cardSort === 'rarity' ? 'By rarity' : 'By date'}</button></div></div>
  <div class="progress"><i style="width:${all.length ? Math.round(got / all.length * 100) : 0}%"></i></div>
  <div class="chips">${byR}</div>
  <div class="album">${all.map(p => have[p.id] ? `<button class="cardbtn" onclick="showCard('${p.id}')" aria-label="${esc(cardName(p))}">${cardHtml(p, have[p.id])}</button>`
    : `<div class="pcard locked r-${rarityOf(p)}" title="Not found yet"><div class="pcimg"><span>?</span></div><div class="pcbot"><span class="pcr">${RNAME[rarityOf(p)]}</span><small>${fmtShort(p.date)}</small></div></div>`).join('')}</div>`;
}
function showCard(id) { const p = S.photos.find(x => x.id === id); if (p) modal(`<div class="cardshow">${cardHtml(p, G().cards[albumWho ?? I()]?.[p.id] || 1, true)}</div>`, 'Card'); }
/* Pack opening: the pack shakes, tears open, the card flips over with a glow in its rarity's colour. */
function openPack() {
  const g = G(), w = I(), kind = (g.packs[w] || [])[0]; if (!kind) return;
  const p = drawCard(kind), r = rarityOf(p);
  g.packs[w].shift();
  const have = (g.cards[w] ||= {}), dup = !!have[p.id];
  have[p.id] = (have[p.id] || 0) + 1;
  if (dup) g.spark[w] = (g.spark[w] || 0) + SPARK[r];
  save();
  const box = modal(`<div class="opening r-${r}"><button class="pack ${kind} shake" aria-label="Open"><span class="pshine"></span><b>${kind === 'bonus' ? 'BONUS' : 'DAILY'}</b><small>tap!</small></button>
    <div class="flip"><div class="fback"></div><div class="ffront">${cardHtml(p, 1, true)}</div></div>
    <p class="reveal">${dup ? `Duplicate · +${SPARK[r]} ✨` : `New ${RNAME[r]} card!`}</p>
    <p class="reveal"><button class="primary" data-again>${(g.packs[w] || []).length ? `Open next (${g.packs[w].length})` : 'Done'}</button></p></div>`, 'Pack opening', () => render());
  hydrateIn(box);
  box.querySelector('.pack').addEventListener('click', () => box.querySelector('.opening').classList.add('open'), { once: true });
  box.querySelector('[data-again]').addEventListener('click', () => { box.close(); if ((g.packs[w] || []).length) setTimeout(openPack, 50); });
}
const CARD_ACTS = {
  album: id => { albumWho = +id; },
  csort: () => { cardSort = cardSort === 'date' ? 'rarity' : 'date'; },
  buyPack: () => { const g = G(), w = I(); if ((g.spark[w] || 0) >= PACK_COST) { g.spark[w] -= PACK_COST; g.packs[w].push('bonus'); toast('🃏 Bonus pack added'); } }
};
