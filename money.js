/* ===== Finances: income, spending by category, budgets, standing orders, bank CSV import =====
   Loaded before app.js; only declares things. Amounts: spending is negative, income positive (CZK). */

const CATS = [
  ['groceries', 'Groceries', '🛒', '#7dd3a7'], ['eating', 'Eating out', '🍽️', '#ffb26b'], ['transport', 'Transport & car', '🚌', '#6bb8ff'],
  ['home', 'Home & bills', '🏠', '#c9a4ff'], ['subs', 'Subscriptions', '📺', '#ff8fb8'], ['shopping', 'Shopping', '🛍️', '#ffd36b'],
  ['health', 'Health & beauty', '💊', '#8fe0e0'], ['fun', 'Fun & trips', '🎉', '#ff7a7a'], ['sport', 'Sport', '🏋️', '#a7e36b'],
  ['gifts', 'Gifts', '🎁', '#f0a0ff'], ['cash', 'Cash withdrawals', '🏧', '#b0b0c8'], ['other', 'Other', '📦', '#9aa0b4'],
  ['income', 'Income', '💵', '#5fd38d'], ['savings', 'Moved to savings', '💰', '#4fc3f7'], ['transfer', 'Own transfers (ignored)', '🔁', '#777']
];
const CAT = Object.fromEntries(CATS.map(([k, n, i, c]) => [k, { n, i, c }]));
const SPEND_CATS = CATS.filter(c => !['income', 'savings', 'transfer'].includes(c[0]));
/* Shop names → category (lower case, without accents). Your own corrections are learned on top. */
const AUTO = {
  groceries: 'albert|lidl|billa|tesco|kaufland|penny|globus|rohlik|kosik.cz|coop|zabka|makro|hruska|norma|potraviny|vecerka|spar',
  eating: 'restaura|bistro|cafe|kavarna|coffee|wolt|foodora|dame jidlo|bolt food|mcdonald|kfc|burger|starbucks|costa|pizz|sushi|kebab|bageterie|pekarna|bakery|jidelna',
  transport: 'bolt|uber|liftago|litacka|dpp|ceske drahy|cd.cz|regiojet|leo express|flixbus|shell|omv|mol |benzina|orlen|eurooil|parking|parkovani|dalnicni',
  home: 'cez|prazska energetika|innogy|eon|plynarensk|najem|svj|vodafone|o2 czech|t-mobile|tmobile|nordic telecom|pojist|allianz|kooperativa|generali|ikea|hornbach|obi |bauhaus',
  subs: 'netflix|spotify|apple.com|icloud|google|youtube|hbo|disney|voyo|skyshowtime|chatgpt|openai|anthropic|claude.ai|microsoft|adobe|patreon|audible|storytel',
  shopping: 'alza|mall.cz|czc|datart|zara|h&m|reserved|primark|about you|zalando|amazon|aliexpress|temu|shein|vinted|notino',
  health: 'lekarna|dr.max|drmax|benu|pharm|zubar|dental|nemocnice|klinika|dm drogerie|dm-drogerie|rossmann|teta drogerie|douglas|sephora|kadernic|barber',
  fun: 'kino|cinema|cinestar|ticket|goout|booking.com|airbnb|ryanair|wizz|smartwings|easyjet|hotel|steam|playstation|nintendo|muzeum|divadlo|koncert',
  sport: 'gym|fitness|squash|multisport|sportisimo|decathlon|intersport|hudy|bouldering|lezeck|bazen',
  gifts: 'darek|kvetin|flower',
  cash: 'atm|bankomat|vyber hotovost|vyber z bankomatu|cash withdrawal',
  savings: 'sporeni|sporici|savings|investic|portu|fondee|anycoin|penzijni|stavebni sporeni'
};
let mMonth = null, mWho = 'all', mShowAll = false, mEditBudgets = false, mRecForm = false;
const M = () => (S.money ||= { tx: [], budgets: {}, saveGoal: 0, rules: [] });

/* ---- standing orders: repeating payments (weekly, every 2 weeks, monthly, yearly) ---- */
const FREQS = [['w', 'Every week', 52], ['2w', 'Every 2 weeks', 26], ['m', 'Every month', 12], ['y', 'Every year', 1]];
const freqName = f => FREQS.find(x => x[0] === f)?.[1] || f;
const perMonth = r => r.amount * (FREQS.find(x => x[0] === r.freq)?.[2] || 12) / 12;
const REC = () => (M().rec ||= []);
/* all payment dates of a standing order between two dates (inclusive) */
function occurrences(r, from, to) {
  const out = [], start = parse(r.start), end = r.end ? parse(r.end) : null, lo = parse(from), hi = parse(to);
  for (let i = 0; i < 2000; i++) {
    let d;
    if (r.freq === 'w' || r.freq === '2w') { d = new Date(start); d.setDate(d.getDate() + i * (r.freq === 'w' ? 7 : 14)); }
    else if (r.freq === 'y') d = inYear(start, start.getFullYear() + i);
    else { d = new Date(start.getFullYear(), start.getMonth() + i, 1); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(start.getDate(), last)); }
    if (d > hi || (end && d > end)) break;
    if (d >= lo) out.push(iso(d));
  }
  return out;
}
const nextPay = r => occurrences(r, iso(new Date(Date.now() + 864e5)), iso(new Date(Date.now() + 400 * 864e5)))[0]; // today's payment is already in the list
/* When a payment date has come, add it to the transactions (same id on both phones, so no duplicates). */
function materializeRec() {
  const m = S.money; if (!m?.rec?.length) return false;
  const t = iso(new Date()); let changed = false;
  const have = new Set(m.tx.map(x => x.id));
  for (const r of m.rec) {
    const from = r.from || r.start; // never fills in payments from before the order was added
    for (const d of occurrences(r, from, t)) {
      const id = `r-${r.id}-${d}`;
      if (have.has(id) || (r.skip || []).includes(d)) continue;
      m.tx.push({ id, date: d, amount: r.amount, desc: r.desc, cat: r.cat, who: r.who, rec: r.id }); have.add(id); changed = true;
    }
  }
  return changed;
}
const skipRec = tx => { const r = tx?.rec && REC().find(x => x.id === tx.rec); if (r) (r.skip ||= []).push(tx.date); };
const mineOpts = () => `<option value="${I()}">Mine</option><option value="2">Shared</option>`;
const recFields = r => `<select name="type" aria-label="Type"><option value="out" ${r.amount > 0 ? '' : 'selected'}>Pay</option><option value="in" ${r.amount > 0 ? 'selected' : ''}>Receive</option></select>
  <input type="number" name="amount" min="0.01" step="any" value="${r.amount ? Math.abs(r.amount) : ''}" placeholder="Kč" required aria-label="Amount" style="max-width:7rem">
  <input type="text" name="desc" value="${esc(r.desc || '')}" placeholder="What for? e.g. Rent, pocket money" required aria-label="What for">
  <select name="freq" aria-label="How often">${FREQS.map(([f, n]) => `<option value="${f}" ${f === r.freq ? 'selected' : ''}>${n}</option>`).join('')}</select>
  <label class="muted rl">first payment <input type="date" name="start" value="${r.start || ''}" required></label>
  <label class="muted rl">until (optional) <input type="date" name="end" value="${r.end || ''}"></label>
  <select name="cat" aria-label="Category"><option value="">auto category</option>${CATS.map(([c, n, i]) => `<option value="${c}" ${c === r.cat ? 'selected' : ''}>${i} ${n}</option>`).join('')}</select>
  <select name="who" aria-label="Whose"><option value="${I()}" ${+r.who === I() ? 'selected' : ''}>Mine</option><option value="2" ${+r.who === 2 ? 'selected' : ''}>Shared</option></select>`;
const money = v => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(v);
const monthKey = (d = new Date()) => iso(d).slice(0, 7);
const monthName = k => new Date(+k.slice(0, 4), +k.slice(5) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const shiftMonth = (k, n) => monthKey(new Date(+k.slice(0, 4), +k.slice(5) - 1 + n, 1));
const merchantKey = d => normTxt(d).replace(/[^a-z0-9 .&-]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
function guessCat(desc, amount) {
  const n = normTxt(desc), mk = merchantKey(desc);
  const learned = M().rules.find(r => r.match && (mk === r.match || n.includes(r.match)));
  if (learned) return learned.cat;
  if (amount > 0) return 'income';
  for (const [cat, words] of Object.entries(AUTO)) if (words.split('|').some(w => n.includes(w))) return cat;
  return 'other';
}
const inMonth = (k, who) => M().tx.filter(t => t.date.startsWith(k) && visPick(who, t.who)); // your own + shared accounts; never your partner's personal ones
function totals(txs) {
  const income = txs.filter(t => t.amount > 0 && t.cat !== 'transfer').reduce((a, t) => a + t.amount, 0);
  const spent = -txs.filter(t => t.amount < 0 && !['transfer', 'savings'].includes(t.cat)).reduce((a, t) => a + t.amount, 0);
  const saved = -txs.filter(t => t.amount < 0 && t.cat === 'savings').reduce((a, t) => a + t.amount, 0);
  const byCat = {}; txs.filter(t => t.amount < 0 && !['transfer', 'savings'].includes(t.cat)).forEach(t => byCat[t.cat] = (byCat[t.cat] || 0) - t.amount);
  return { income, spent, saved, left: income - spent, byCat };
}
function pie(parts, size = 170) {
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1, r = size / 2 - 12, c = 2 * Math.PI * r, m = size / 2;
  let off = 0;
  const segs = parts.map(p => { const len = p.v / tot * c, s = `<circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="${p.c}" stroke-width="22" stroke-dasharray="${Math.max(0, len - 2).toFixed(1)} ${c.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 ${m} ${m})"><title>${esc(p.n)}: ${money(p.v)}</title></circle>`; off += len; return s; }).join('');
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Spending by category"><circle class="dtrack" cx="${m}" cy="${m}" r="${r}" stroke-width="22"/>${segs}</svg>`;
}

function moneyPage() {
  const k = mMonth || monthKey(), txs = inMonth(k, mWho), T = totals(txs), prev = totals(inMonth(shiftMonth(k, -1), mWho));
  const cats = Object.entries(T.byCat).sort((a, b) => b[1] - a[1]);
  const goal = +M().saveGoal || 0, keep = T.left;
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(k, i - 5)), mt = months.map(m => totals(inMonth(m, mWho))), mmax = Math.max(1, ...mt.flatMap(x => [x.income, x.spent]));
  const list = txs.slice().sort((a, b) => b.date.localeCompare(a.date) || a.amount - b.amount), shown = mShowAll ? list : list.slice(0, 25);
  const catSel = t => `<select class="catsel" data-txcat="${t.id}" aria-label="Category">${CATS.map(([c, n, i]) => `<option value="${c}" ${c === t.cat ? 'selected' : ''}>${i} ${n}</option>`).join('')}</select>`;
  /* standing orders I can see, and what is still due this month */
  const recs = REC().filter(r => visPick(mWho, r.who)), tday = iso(new Date());
  const monthEnd = iso(new Date(+k.slice(0, 4), +k.slice(5), 0));
  const upcoming = k < monthKey() ? 0 : recs.filter(r => r.amount < 0).reduce((a, r) => a + occurrences(r, k === monthKey() ? iso(new Date(Date.now() + 864e5)) : k + '-01', monthEnd).length * r.amount, 0);
  const recOut = recs.filter(r => r.amount < 0).reduce((a, r) => a + perMonth(r), 0);
  const recRow = r => editing === r.id
    ? `<li><form class="row editing" data-form="saveRec">${hid(r.id)}${recFields(r)}${formBtns}</form></li>`
    : `<li data-w="${r.who}" data-hl="${r.id}"><div class="grow"><div class="evt">${CAT[r.cat]?.i || ''} ${esc(r.desc)}</div><div class="evm">${freqName(r.freq)}${nextPay(r) ? ` · next ${fmtShort(nextPay(r))}` : ' · finished'}${r.who == 2 ? ' · shared' : ''}</div></div><b class="${r.amount > 0 ? 'mpos' : ''}">${r.amount > 0 ? '+' : ''}${money(r.amount)}</b>${editBtn(r.id)}<button class="ghost" data-act="delRec" data-id="${r.id}" aria-label="Stop standing order">✕</button></li>`;
  const lastImport = M().tx.reduce((a, t) => t.imp && (!a || t.imp > a) ? t.imp : a, null);
  return `<h2>Finances</h2>
  <div class="mtop"><div class="daynav"><button class="ghost" data-act="mmonth" data-id="-1" aria-label="Previous month">‹</button><strong>${monthName(k)}</strong><button class="ghost" data-act="mmonth" data-id="1" aria-label="Next month" ${k >= monthKey() ? 'disabled' : ''}>›</button></div>
    <div class="tabs" style="margin:0">${visTabs(mWho, 'mwho')}</div></div>
  <div class="grid mgrid">
    <div class="card"><div class="muted">Income</div><div class="big mpos">${money(T.income)}</div></div>
    <div class="card"><div class="muted">Spent</div><div class="big">${money(T.spent)}</div>${upcoming < 0 ? `<div class="muted msmall">+ ${money(-upcoming)} in standing orders still to go out</div>` : ''}${prev.spent ? `<div class="muted msmall">${T.spent > prev.spent ? '▲' : '▼'} ${money(Math.abs(T.spent - prev.spent))} vs last month</div>` : ''}</div>
    <div class="card"><div class="muted">Left over</div><div class="big ${keep >= 0 ? 'mpos' : 'mneg'}">${money(keep)}</div>${T.income ? `<div class="muted msmall">${Math.round(keep / T.income * 100)} % of income${T.saved ? ` · ${money(T.saved)} moved to savings` : ''}</div>` : ''}</div>
  </div>
  ${goal ? `<div class="card"><div class="chead"><h3>Savings goal</h3><span class="muted">${keep >= goal ? '🎉 reached: ' : ''}${money(Math.max(0, keep))} of ${money(goal)} left over this month</span></div><div class="bar" data-w="2"><span></span><div><i style="width:${Math.min(100, Math.max(0, keep / goal * 100)).toFixed(0)}%"></i></div><b>${Math.min(999, Math.max(0, Math.round(keep / goal * 100)))} %</b></div></div>` : ''}
  <div class="mcols">
    <div class="card"><h3>Where the money went</h3>${cats.length ? `<div class="mpie">${pie(cats.map(([c, v]) => ({ v, c: CAT[c].c, n: CAT[c].n })))}<div class="mpiec"><b>${money(T.spent)}</b><small>spent</small></div></div>
      <div class="mcats">${cats.map(([c, v]) => { const lim = +M().budgets[c] || 0; return `<div class="mcat"><span class="mdot" style="background:${CAT[c].c}"></span><span class="grow">${CAT[c].i} ${CAT[c].n}</span><b>${money(v)}</b><small class="muted">${Math.round(v / T.spent * 100)} %</small>
        ${lim ? `<div class="mlim ${v > lim ? 'over' : ''}"><i style="width:${Math.min(100, v / lim * 100).toFixed(0)}%"></i><small>${v > lim ? `${money(v - lim)} over` : `${money(lim - v)} left`} of ${money(lim)}</small></div>` : ''}</div>`; }).join('')}</div>`
      : '<p class="muted">No spending this month yet. Import your bank statement or add expenses below.</p>'}</div>
    <div class="card"><h3>Last 6 months</h3><div class="mtrend">${months.map((m, i) => `<div class="mtm"><div class="mtb"><i class="inc" style="height:${(mt[i].income / mmax * 100).toFixed(0)}%" title="Income ${money(mt[i].income)}"></i><i class="out" style="height:${(mt[i].spent / mmax * 100).toFixed(0)}%" title="Spent ${money(mt[i].spent)}"></i></div><small>${new Date(+m.slice(0, 4), +m.slice(5) - 1).toLocaleDateString(undefined, { month: 'short' })}</small></div>`).join('')}</div>
      <p class="legend"><span class="tag" style="background:#5fd38d33;color:#5fd38d">income</span> <span class="tag warn">spent</span></p>
      ${cats.length ? `<p class="muted">Biggest: ${cats.slice(0, 3).map(([c, v]) => `${CAT[c].i} ${CAT[c].n} ${money(v)}`).join(', ')}.</p>` : ''}</div>
  </div>
  <div class="card"><div class="chead"><h3>Transactions</h3><span class="muted">${list.length} this month</span></div>
    <form class="row" data-form="addTx"><select name="type" aria-label="Type"><option value="out">Spent</option><option value="in">Received</option></select><input type="number" name="amount" min="0.01" step="any" placeholder="Kč" required aria-label="Amount" style="max-width:8rem">
      <input type="text" name="desc" placeholder="What for? e.g. Lidl, rent" required aria-label="Description"><select name="cat" aria-label="Category"><option value="">auto category</option>${CATS.map(([c, n, i]) => `<option value="${c}">${i} ${n}</option>`).join('')}</select>
      <input type="date" name="date" value="${k === monthKey() ? iso(new Date()) : k + '-01'}" aria-label="Date"><select name="who" aria-label="Whose">${mineOpts()}</select><button class="primary">Add</button></form>
    <ul class="items txlist">${shown.map(t => `<li data-w="${t.who}" data-hl="${t.id}"><div class="grow"><div class="evt">${esc(t.desc)}</div><div class="evm">${fmtShort(t.date)}${t.who == 2 ? ' · shared' : ''}</div></div>${catSel(t)}<b class="${t.amount > 0 ? 'mpos' : ''}">${t.amount > 0 ? '+' : ''}${money(t.amount)}</b><button class="ghost" data-act="delTx" data-id="${t.id}" aria-label="Delete">✕</button></li>`).join('') || '<li class="muted">Nothing yet.</li>'}</ul>
    ${list.length > 25 ? `<button class="ghost" data-act="mall">${mShowAll ? 'Show fewer' : `Show all ${list.length}`}</button>` : ''}</div>
  <div class="card"><div class="chead"><h3>Standing orders</h3><button class="ghost" data-act="mrec">${mRecForm ? 'Close' : '+ Add'}</button></div>
    <p class="muted">Payments that repeat, like rent, savings, a weekly allowance or subscriptions. On each payment day they're added to your transactions by themselves${recs.length ? `. Together about <b>${money(-recOut)}</b> a month goes out this way` : ''}.</p>
    ${mRecForm ? `<form class="row" data-form="addRec">${recFields({ freq: 'w', start: tday, who: I() })}<button class="primary">Add</button></form>` : ''}
    <ul class="items txlist">${recs.map(recRow).join('') || (mRecForm ? '' : '<li class="muted">No standing orders yet.</li>')}</ul></div>
  <div class="mcols">
    <div class="card"><h3>Import bank statement (CSV)</h3>
      <p class="muted">In your bank's internet banking, open the account history, pick the month and export it as <b>CSV</b>. Then choose the file here. Shops are sorted into categories automatically; when you change a category, the app remembers it for that shop.</p>
      <div class="row"><label class="muted">Whose account? <select id="impWho">${mineOpts()}</select></label><button class="primary" type="button" onclick="document.getElementById('csvfile').click()">Choose CSV file</button><input type="file" id="csvfile" accept=".csv,text/csv" hidden></div>
      <p class="muted msmall">Only the date, amount and description are saved. Account numbers are left out. Payments already imported are skipped.</p>
      ${lastImport ? `<button class="ghost" data-act="undoImport" data-id="${lastImport}">Undo last import</button>` : ''}</div>
    <div class="card"><div class="chead"><h3>Monthly budgets</h3><button class="ghost" data-act="mbudgets">${mEditBudgets ? 'Close' : 'Edit'}</button></div>
      ${mEditBudgets ? `<form data-form="saveBudgets"><div class="pgrid">${SPEND_CATS.map(([c, n, i]) => `<label>${i} ${n}<input type="number" name="${c}" min="0" step="100" value="${M().budgets[c] || ''}" placeholder="no limit"></label>`).join('')}
        <label>💰 Savings goal per month<input type="number" name="__save" min="0" step="500" value="${M().saveGoal || ''}" placeholder="e.g. 5000"></label></div><p><button class="primary">Save</button></p></form>`
      : `<p class="muted">${Object.values(M().budgets).some(v => +v) ? Object.entries(M().budgets).filter(([, v]) => +v).map(([c, v]) => `${CAT[c]?.i} ${money(+v)}`).join(' · ') : 'Set a limit for categories you want to keep an eye on, e.g. Eating out 3 000 Kč, and a monthly savings goal.'}</p>`}</div>
  </div>`;
}

/* ---- CSV import (works with most Czech banks: Air Bank, ČSOB, KB, Raiffeisen, Fio, mBank, Revolut…) ---- */
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const sample = lines.slice(0, 15).join('\n');
  const delim = [';', ',', '\t'].map(d => [d, (sample.match(new RegExp(d === '\t' ? '\t' : '\\' + d, 'g')) || []).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); if (row.some(c => c.trim())) rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  row.push(cur); if (row.some(c => c.trim())) rows.push(row);
  return rows.map(r => r.map(c => c.trim()));
}
const parseAmount = s => {
  let v = String(s || '').replace(/[\s ]/g, '').replace(/[^0-9,.\-+−]/g, '').replace('−', '-');
  if (!v || !/\d/.test(v)) return NaN;
  if (v.includes(',') && v.includes('.')) v = v.lastIndexOf(',') > v.lastIndexOf('.') ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '');
  else if (v.includes(',')) v = v.replace(',', '.');
  return parseFloat(v);
};
const parseDate = s => {
  s = String(s || '').trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
};
function importCSV(text, who) {
  const rows = parseCSV(text);
  const h = rows.findIndex(r => r.some(c => /datum|date|zaúčtován|zauctovan|provedení|proveden/i.test(c)) && r.some(c => /částka|castka|amount|objem|suma|výdaj|vydaj|příjem|prijem/i.test(c)));
  if (h < 0) return { error: 'Could not find the date and amount columns in this file. Is it the CSV export of your account history?' };
  const head = rows[h].map(c => normTxt(c));
  const find = re => head.findIndex(c => re.test(c));
  const iDate = find(/datum zauct|datum provedeni|booking date|^datum$|^date$|datum|date/);
  let iAmt = find(/^castka$|^amount$|castka v|objem|^castka|amount|castka|suma/);
  const iOut = find(/^vydaj|^debit|castka vydaj|^odchozi castka/), iIn = find(/^prijem$|^prijem \(|^credit|castka prijem|^prichozi castka/);
  if (iAmt < 0 && iOut < 0) return { error: 'Could not find the amount column in this file.' };
  const isAcct = c => /^nazev uctu|^nazev\s*\(?uctu|account name|^ucet$|ucet\b|iban|account|bic|swift|kod banky|bank code|cislo|variabil|konstant|specif|\bvs\b|\bks\b|\bss\b|mena|currency|zustatek|balance|typ|type|stav|state|kategorie|category|id/.test(c);
  const descCols = head.map((c, i) => [c, i]).filter(([c, i]) => i !== iDate && i !== iAmt && i !== iOut && i !== iIn && !isAcct(c) && /popis|zprava|nazev|protistran|obchodnik|merchant|description|poznamk|detail|message|counterparty|payee|misto|place|reference|uziv|note|text|predmet/.test(c)).map(([, i]) => i);
  const seen = new Set(M().tx.map(t => `${t.date}|${t.amount}|${normTxt(t.desc)}`));
  const imp = Date.now(); let added = 0, dup = 0, bad = 0, replaced = 0;
  for (const r of rows.slice(h + 1)) {
    const date = parseDate(r[iDate]);
    let amount = iAmt >= 0 ? parseAmount(r[iAmt]) : NaN;
    if (isNaN(amount)) { const o = parseAmount(r[iOut]), n = parseAmount(r[iIn]); amount = (isNaN(n) ? 0 : Math.abs(n)) - (isNaN(o) ? 0 : Math.abs(o)); if (!o && !n) amount = NaN; }
    if (!date || isNaN(amount) || !amount) { bad++; continue; }
    let desc = [...new Set(descCols.map(i => r[i]).filter(Boolean))].join(' · ').replace(/\b\d{6,}(\/\d{4})?\b/g, '').replace(/\s+/g, ' ').replace(/^[ ·]+|[ ·]+$/g, '').slice(0, 120) || (amount > 0 ? 'Incoming payment' : 'Payment');
    amount = Math.round(amount * 100) / 100;
    const key = `${date}|${amount}|${normTxt(desc)}`;
    if (seen.has(key)) { dup++; continue; }
    seen.add(key);
    const auto = M().tx.find(t => t.rec && t.amount === amount && Math.abs(parse(t.date) - parse(date)) <= 4 * 864e5);
    let cat = guessCat(desc, amount);
    if (auto) { cat = auto.cat; skipRec(auto); M().tx = M().tx.filter(t => t !== auto); replaced++; } // the real bank payment replaces the planned one
    M().tx.push({ id: uid(), date, amount, desc, cat, who, imp }); added++;
  }
  return { added, dup, bad, replaced, month: added ? M().tx.filter(t => t.imp === imp).map(t => t.date).sort().at(-1).slice(0, 7) : null };
}
async function readCSVFile(file) {
  const buf = await file.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(buf);
  if (text.includes('�')) text = new TextDecoder('windows-1250').decode(buf); // older Czech bank exports
  return text;
}
document.addEventListener('change', async e => {
  if (e.target.id === 'csvfile' && e.target.files[0]) {
    const who = +(document.getElementById('impWho')?.value ?? 2), file = e.target.files[0];
    e.target.value = '';
    const r = importCSV(await readCSVFile(file), who);
    if (r.error) { alert(r.error); return; }
    if (r.month) mMonth = r.month;
    save(); render();
    toast(`Imported ${r.added} payment${r.added === 1 ? '' : 's'}${r.replaced ? ` (${r.replaced} matched your standing orders)` : ''}${r.dup ? `, ${r.dup} already there` : ''}${r.bad ? `, ${r.bad} rows skipped` : ''}`);
  }
  if (e.target.matches('[data-txcat]')) {
    const t = M().tx.find(x => x.id === e.target.dataset.txcat); if (!t) return;
    t.cat = e.target.value;
    /* learn: same shop next time → same category; also fix this shop's other uncategorised payments */
    const mk = merchantKey(t.desc);
    if (mk.length >= 3) {
      M().rules = M().rules.filter(r => r.match !== mk); M().rules.push({ match: mk, cat: t.cat });
      M().tx.forEach(x => { if (x !== t && merchantKey(x.desc) === mk && (x.cat === 'other' || x.cat === guessCat('', x.amount))) x.cat = t.cat; });
    }
    save(); render();
  }
});

const MONEY_ACTS = {
  mmonth: n => { const k = shiftMonth(mMonth || monthKey(), +n); mMonth = k > monthKey() ? monthKey() : k; mShowAll = false; },
  mwho: id => { mWho = id; },
  mall: () => { mShowAll = !mShowAll; },
  mbudgets: () => { mEditBudgets = !mEditBudgets; },
  mrec: () => { mRecForm = !mRecForm; },
  delTx: id => { const t = M().tx.find(x => x.id === id); skipRec(t); M().tx = M().tx.filter(x => x.id !== id); },
  delRec: id => { const r = REC().find(x => x.id === id); if (r && confirm(`Stop "${r.desc}"? Payments already added stay in your transactions.`)) M().rec = REC().filter(x => x.id !== id); },
  undoImport: imp => { const n = M().tx.filter(t => String(t.imp) === String(imp)).length; if (confirm(`Remove the ${n} payments from the last import?`)) M().tx = M().tx.filter(t => String(t.imp) !== String(imp)); }
};
const recData = d => { const amt = Math.round(Math.abs(+d.amount) * 100) / 100 * (d.type === 'in' ? 1 : -1); return { desc: d.desc.trim(), amount: amt, cat: d.cat || guessCat(d.desc, amt), freq: d.freq, start: d.start, end: d.end || null, who: +d.who }; };
const MONEY_FORMS = {
  addRec: d => { const r = { id: uid(), ...recData(d) }; const t = iso(new Date()); r.from = r.start > t ? r.start : t; REC().push(r); mRecForm = false; },
  saveRec: d => { const r = REC().find(x => x.id === d.id); if (r) Object.assign(r, recData(d)); },
  addTx: d => { const amt = Math.abs(+d.amount) * (d.type === 'in' ? 1 : -1); M().tx.push({ id: uid(), date: d.date, amount: Math.round(amt * 100) / 100, desc: d.desc.trim(), cat: d.cat || guessCat(d.desc, amt), who: +d.who }); },
  saveBudgets: d => { const b = {}; for (const [c] of SPEND_CATS) if (+d[c] > 0) b[c] = +d[c]; M().budgets = b; M().saveGoal = +d.__save || 0; mEditBudgets = false; }
};
