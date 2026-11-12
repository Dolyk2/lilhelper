/* ===== Weight: calorie budget, food diary and weight trend (one per person) =====
   Loaded before app.js; only declares things, nothing runs here until the page is opened. */

/* Common foods: [name (Czech · English for searching), kcal per 100 g, usual portion in g, portion name] */
const FOODS = [
  ['Rohlík · bread roll', 285, 43, '1 roll'], ['Chléb kváskový · sourdough bread', 240, 50, '1 slice'], ['Toustový chléb · toast bread', 265, 25, '1 slice'],
  ['Ovesné vločky · oats', 370, 50, '1 bowl'], ['Müsli · granola', 420, 50, '1 bowl'], ['Corn flakes', 375, 40, '1 bowl'],
  ['Vejce · egg', 143, 55, '1 egg'], ['Míchaná vejce · scrambled eggs', 165, 150, '3 eggs'], ['Šunka · ham', 110, 30, '2 slices'],
  ['Eidam 30 % · cheese', 260, 30, '2 slices'], ['Mozzarella', 250, 60, '½ ball'], ['Cottage', 100, 150, '1 tub'], ['Tvaroh polotučný · quark', 105, 125, '½ tub'],
  ['Bílý jogurt · plain yoghurt', 65, 150, '1 cup'], ['Řecký jogurt · Greek yoghurt', 120, 150, '1 cup'], ['Skyr', 63, 140, '1 cup'],
  ['Mléko polotučné · milk 1.5%', 47, 250, '1 glass'], ['Máslo · butter', 740, 10, '1 tsp'], ['Olivový olej · olive oil', 880, 10, '1 tbsp'],
  ['Banán · banana', 89, 120, '1 piece'], ['Jablko · apple', 52, 180, '1 piece'], ['Pomeranč · orange', 47, 150, '1 piece'], ['Hrozny · grapes', 69, 100, '1 handful'],
  ['Jahody · strawberries', 32, 150, '1 bowl'], ['Borůvky · blueberries', 57, 100, '1 bowl'], ['Avokádo · avocado', 160, 70, '½ piece'],
  ['Rajče · tomato', 18, 120, '1 piece'], ['Okurka · cucumber', 15, 150, '½ piece'], ['Paprika · pepper', 26, 150, '1 piece'], ['Mrkev · carrot', 41, 80, '1 piece'],
  ['Zeleninový salát · mixed salad', 25, 200, '1 bowl'], ['Brokolice · broccoli', 34, 150, '1 portion'],
  ['Kuřecí prsa · chicken breast', 165, 150, '1 portion'], ['Kuřecí stehno · chicken thigh', 210, 150, '1 portion'], ['Hovězí steak · beef steak', 250, 200, '1 steak'],
  ['Mleté hovězí · minced beef', 250, 125, '1 portion'], ['Vepřový řízek · pork schnitzel', 290, 150, '1 piece'], ['Losos · salmon', 208, 150, '1 fillet'],
  ['Tuňák v konzervě · canned tuna', 116, 80, '1 can'], ['Párek · sausage', 290, 50, '1 piece'],
  ['Rýže vařená · rice (cooked)', 130, 200, '1 portion'], ['Těstoviny vařené · pasta (cooked)', 158, 220, '1 portion'], ['Brambory vařené · potatoes (boiled)', 77, 250, '1 portion'],
  ['Hranolky · fries', 312, 150, '1 portion'], ['Bramborová kaše · mashed potatoes', 95, 200, '1 portion'], ['Knedlík houskový · bread dumpling', 230, 120, '4 slices'],
  ['Svíčková s knedlíkem', 180, 450, '1 plate'], ['Guláš s knedlíkem · goulash', 170, 450, '1 plate'], ['Smažený sýr s hranolky · fried cheese', 300, 350, '1 plate'],
  ['Pizza', 266, 350, '1 pizza'], ['Burger', 250, 250, '1 burger'], ['Kebab', 215, 350, '1 kebab'], ['Sushi', 150, 250, '8 pieces'], ['Bowl (poke)', 140, 400, '1 bowl'],
  ['Polévka · soup', 45, 300, '1 bowl'], ['Sendvič · sandwich', 250, 180, '1 piece'], ['Bageta · baguette', 260, 220, '1 piece'],
  ['Ořechy · nuts', 600, 30, '1 handful'], ['Arašídové máslo · peanut butter', 590, 15, '1 tbsp'], ['Hořká čokoláda · dark chocolate', 550, 20, '2 squares'],
  ['Mléčná čokoláda · milk chocolate', 535, 25, '¼ bar'], ['Chipsy · crisps', 535, 50, '½ bag'], ['Sušenky · biscuits', 480, 30, '3 pieces'], ['Zmrzlina · ice cream', 210, 100, '2 scoops'],
  ['Koláč / buchta · cake', 350, 100, '1 piece'], ['Croissant', 406, 60, '1 piece'], ['Proteinová tyčinka · protein bar', 360, 55, '1 bar'],
  ['Protein shake (s vodou)', 380, 30, '1 scoop'], ['Pivo 10° · beer', 35, 500, '0.5 l'], ['Pivo 12° · lager', 43, 500, '0.5 l'], ['Víno · wine', 82, 200, '1 glass'],
  ['Coca-Cola', 42, 330, '1 can'], ['Džus · juice', 45, 250, '1 glass'], ['Cappuccino', 40, 200, '1 cup'], ['Latte', 45, 300, '1 cup'], ['Káva černá · black coffee', 2, 150, '1 cup']
];
const MEALS = [['b', 'Breakfast', '🌅'], ['l', 'Lunch', '🍽️'], ['d', 'Dinner', '🌙'], ['s', 'Snacks', '🍎']];
const ACTIVITY = [[1.2, 'Mostly sitting (office, little walking)'], [1.375, 'Light (walking, sport 1–3× a week)'], [1.55, 'Active (sport 3–5× a week)'], [1.725, 'Very active (hard sport 6–7× a week)']];
const PACE = [[0, 'Keep my weight'], [0.25, 'Lose 0.25 kg a week (easy)'], [0.5, 'Lose 0.5 kg a week (recommended)'], [0.75, 'Lose 0.75 kg a week (hard)']];
let hWho = null, hDay = null, hEdit = false, foodHits = [], offHits = null;

const H = () => (S.health ||= { profiles: {}, food: [], weights: [], myFoods: [], days: {} });
const hPerson = () => hWho ?? me() ?? 0;
const latestWeight = w => H().weights.filter(x => x.who === w).sort((a, b) => b.date.localeCompare(a.date))[0];
const ageOf = born => { if (!born) return 30; const b = parse(born), t = new Date(); return t.getFullYear() - b.getFullYear() - (t < new Date(t.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0); };
/* Daily calorie numbers from the profile (Mifflin–St Jeor formula, the one dietitians use). */
function budgetOf(w) {
  const p = H().profiles[w]; if (!p || !p.height) return null;
  const kg = latestWeight(w)?.kg || p.weight, age = ageOf(p.born);
  const bmr = 10 * kg + 6.25 * p.height - 5 * age + (p.sex === 'f' ? -161 : 5);
  const tdee = bmr * (p.activity || 1.375);
  const floor = p.sex === 'f' ? 1200 : 1500; // never plan to eat less than this
  const deficit = Math.min((p.pace ?? 0.5) * 7700 / 7, 1000);
  const budget = Math.max(floor, Math.round((tdee - deficit) / 10) * 10);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), budget, deficit: Math.round(tdee - budget), kg, floored: budget === floor && tdee - deficit < floor };
}
const eatenOn = (w, day) => H().food.filter(f => f.who === w && f.date === day).reduce((a, f) => a + f.kcal, 0) || +(H().days?.[w]?.[day]) || 0;
const kc = v => Math.round(v).toLocaleString();

/* Keep the shared data small: food older than 60 days is kept only as a daily total. */
function compactFood() {
  const h = S.health; if (!h?.food?.length) return false;
  const cut = iso(new Date(Date.now() - 60 * 864e5)), old = h.food.filter(f => f.date < cut);
  if (!old.length) return false;
  h.days ||= {};
  for (const f of old) { const d = (h.days[f.who] ||= {}); d[f.date] = (d[f.date] || 0) + f.kcal; }
  h.food = h.food.filter(f => f.date >= cut); return true;
}

function health() {
  const w = hPerson(), p = H().profiles[w], b = budgetOf(w), day = hDay || iso(new Date()), t = iso(new Date());
  const who = [0, 1].map(i => `<button class="${w === i ? 'on' : ''}" data-act="hwho" data-id="${i}" data-w="${i}">${esc(S.names[i])}</button>`).join('');
  const head = `<h2>Weight</h2><div class="tabs">${who}</div>`;
  if (!b || hEdit) return head + profileForm(w, p);
  const food = H().food.filter(f => f.who === w && f.date === day), eaten = food.reduce((a, f) => a + f.kcal, 0), left = b.budget - eaten;
  const dayNav = `<div class="daynav"><button class="ghost" data-act="hday" data-id="-1" aria-label="Previous day">‹</button><strong>${day === t ? 'Today' : fmtShort(day)}</strong><button class="ghost" data-act="hday" data-id="1" aria-label="Next day" ${day >= t ? 'disabled' : ''}>›</button></div>`;
  const meals = MEALS.map(([k, name, ic]) => { const items = food.filter(f => f.meal === k); return `<div class="meal"><div class="mealh"><span>${ic} ${name}</span><b>${kc(items.reduce((a, f) => a + f.kcal, 0))} kcal</b></div>
    ${items.map(f => `<div class="fooditem" data-hl="${f.id}"><span class="grow">${esc(f.name)}${f.g ? ` <small class="muted">${f.g} g</small>` : ''}</span><span>${kc(f.kcal)}</span><button class="ghost" data-act="delFood" data-id="${f.id}" aria-label="Remove">✕</button></div>`).join('')}</div>`; }).join('');
  const hour = new Date().getHours(), meal = day !== t ? 's' : hour < 10 ? 'b' : hour < 15 ? 'l' : hour < 21 ? 'd' : 's';
  const recent = [...new Map(H().food.filter(f => f.who === w).sort((a, b) => b.at - a.at).map(f => [f.name, f])).values()].slice(0, 8);
  return `${head}
  <div class="hgrid">
    <div class="card hday" data-w="${w}">${dayNav}
      <div class="hdonut">${donut(eaten / b.budget, 170, 16, left >= 0 ? kc(left) : '+' + kc(-left), left >= 0 ? 'kcal left' : 'kcal over')}</div>
      <div class="hnums"><div><b>${kc(b.budget)}</b><small>budget</small></div><div><b>${kc(eaten)}</b><small>eaten</small></div><div><b>${kc(b.tdee)}</b><small>you burn</small></div></div>
      <p class="muted hhint">${left >= 0 ? `Eating up to ${kc(b.budget)} kcal keeps you ${kc(b.deficit)} kcal under what you burn${b.deficit > 0 ? ` (about ${(b.deficit * 7 / 7700).toFixed(2)} kg a week)` : ''}.` : `Over budget today. One day doesn't matter, the weekly average does.`}</p>
    </div>
    <div class="card"><h3>Add food</h3>
      <form data-form="addFood" class="foodform" autocomplete="off"><input type="hidden" name="date" value="${day}"><input type="hidden" name="k100" id="fk100">
        <div class="fsearch"><input type="text" name="name" id="fname" placeholder="What did you eat? e.g. rohlík, banana…" required aria-label="Food"><div id="fhits" class="fhits"></div></div>
        <div class="row"><input type="number" name="g" id="fg" placeholder="grams" min="1" step="any" aria-label="Grams"><input type="number" name="kcal" id="fkcal" placeholder="kcal" min="0" step="1" required aria-label="Calories">
          <select name="meal" aria-label="Meal">${MEALS.map(([k, n]) => `<option value="${k}" ${k === meal ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="primary">Add</button></div>
        <p class="muted fhelp">Pick a food from the list and the calories fill in, or type the kcal from the packaging. <button type="button" class="ghost" data-act="offSearch">🔎 Search products online</button></p></form>
      ${offHits ? `<div class="offhits">${offHits.length ? offHits.map((o, i) => `<button class="idea" data-act="offPick" data-id="${i}"><span>${esc(o.name)}<small class="muted"> ${kc(o.k100)} kcal / 100 g${o.g ? ` · portion ${o.g} g` : ''}</small></span></button>`).join('') : '<p class="muted">Nothing found online. Type the kcal from the packaging.</p>'}</div>` : ''}
      ${recent.length ? `<h4 class="hsub">Again?</h4><div class="chips">${recent.map(f => `<button class="chip" data-act="foodAgain" data-id="${f.id}">${esc(f.name)} · ${kc(f.kcal)}</button>`).join('')}</div>` : ''}
    </div>
    <div class="card hmeals"><h3>${day === t ? "Today's" : fmtShort(day)} food</h3>${meals}</div>
    ${weightCard(w, p, b)}
    ${historyCard(w, b)}
    <div class="card"><h3>Your numbers</h3><p class="muted">${p.sex === 'f' ? 'Woman' : 'Man'}, ${ageOf(p.born)} years, ${p.height} cm, ${b.kg} kg, ${esc(ACTIVITY.find(a => a[0] == p.activity)?.[1] || '')}.</p>
      <p class="muted">Resting burn ${kc(b.bmr)} kcal, with your activity ${kc(b.tdee)} kcal a day. Goal: ${esc(PACE.find(x => x[0] == (p.pace ?? 0.5))?.[1] || '')}${p.goal ? `, target ${p.goal} kg` : ''}.${b.floored ? ' Your budget is held at a safe minimum.' : ''}</p>
      <button data-act="hedit">Change my numbers</button></div>
  </div>`;
}

function profileForm(w, p = {}) {
  return `<form class="card" data-form="saveProfile"><h3>${p.height ? 'Your numbers' : `Set up ${esc(S.names[w])}'s calorie budget`}</h3>
    <p class="muted">These numbers work out how much you burn in a day and how much to eat to lose weight steadily. Only you two can see them.</p>
    <input type="hidden" name="who" value="${w}">
    <div class="pgrid">
      <label>Sex<select name="sex"><option value="m" ${p.sex !== 'f' ? 'selected' : ''}>Man</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>Woman</option></select></label>
      <label>Birthday<input type="date" name="born" value="${p.born || ''}" required></label>
      <label>Height (cm)<input type="number" name="height" value="${p.height || ''}" min="120" max="230" required></label>
      <label>Weight now (kg)<input type="number" name="weight" value="${latestWeight(w)?.kg || p.weight || ''}" min="35" max="300" step="0.1" required></label>
      <label>Goal weight (kg)<input type="number" name="goal" value="${p.goal || ''}" min="35" max="300" step="0.1"></label>
      <label>How active are you?<select name="activity">${ACTIVITY.map(([v, n]) => `<option value="${v}" ${v == (p.activity || 1.375) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Pace<select name="pace">${PACE.map(([v, n]) => `<option value="${v}" ${v == (p.pace ?? 0.5) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    </div><p><button class="primary">Save</button>${p.height ? ' <button type="button" data-act="hedit">Cancel</button>' : ''}</p></form>`;
}

function weightCard(w, p, b) {
  const ws = H().weights.filter(x => x.who === w).sort((a, z) => a.date.localeCompare(z.date));
  const t = iso(new Date()), cur = ws.at(-1), first = ws[0];
  const W = 340, Hh = 140, pad = 22, pts = ws.slice(-60);
  let chart = '<p class="muted">Log your weight once or twice a week (same time of day) to see the trend.</p>';
  if (pts.length >= 2) {
    const t0 = parse(pts[0].date).getTime(), t1 = Math.max(parse(pts.at(-1).date).getTime(), t0 + 864e5);
    const vals = pts.map(x => x.kg).concat(p.goal ? [p.goal] : []), lo = Math.min(...vals) - 0.5, hi = Math.max(...vals) + 0.5;
    const X = d => pad + (parse(d).getTime() - t0) / (t1 - t0) * (W - pad - 6), Y = v => 8 + (hi - v) / (hi - lo) * (Hh - 26);
    const line = pts.map((x, i) => `${i ? 'L' : 'M'}${X(x.date).toFixed(1)},${Y(x.kg).toFixed(1)}`).join('');
    chart = `<svg class="wchart" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Weight over time">
      ${p.goal ? `<line class="gtarget" x1="${pad}" x2="${W}" y1="${Y(p.goal).toFixed(1)}" y2="${Y(p.goal).toFixed(1)}"/><text x="${W - 4}" y="${(Y(p.goal) - 4).toFixed(1)}" text-anchor="end">goal ${p.goal}</text>` : ''}
      <path d="${line}" class="wline"/>${pts.map(x => `<circle cx="${X(x.date).toFixed(1)}" cy="${Y(x.kg).toFixed(1)}" r="3"><title>${fmtShort(x.date)}: ${x.kg} kg</title></circle>`).join('')}
      <text x="${pad}" y="${Hh - 4}">${fmtShort(pts[0].date)}</text><text x="${W - 4}" y="${Hh - 4}" text-anchor="end">${fmtShort(pts.at(-1).date)}</text></svg>`;
  }
  const lost = first && cur ? +(first.kg - cur.kg).toFixed(1) : 0, toGo = p.goal && cur ? +(cur.kg - p.goal).toFixed(1) : null;
  const weeks = toGo > 0 && b.deficit > 0 ? Math.ceil(toGo / (b.deficit * 7 / 7700)) : null;
  return `<div class="card wcard" data-w="${w}"><div class="chead"><h3>Weight</h3>${cur ? `<span class="muted">${cur.kg} kg · ${fmtShort(cur.date)}</span>` : ''}</div>
    <form class="row" data-form="addWeight"><input type="number" name="kg" step="0.1" min="35" max="300" placeholder="kg" required aria-label="Weight in kg" style="max-width:7rem"><input type="date" name="date" value="${t}" aria-label="Date"><button class="primary">Log</button></form>
    ${chart}
    <div class="chips">${first && cur && ws.length > 1 ? `<span class="chip">${lost >= 0 ? 'lost' : 'gained'} <b>${Math.abs(lost)} kg</b> since ${fmtShort(first.date)}</span>` : ''}${toGo > 0 ? `<span class="chip"><b>${toGo} kg</b> to go</span>` : toGo !== null ? '<span class="chip">🎉 <b>goal reached</b></span>' : ''}${weeks ? `<span class="chip">about <b>${weeks} weeks</b> at this pace</span>` : ''}</div>
    ${ws.length ? `<details class="wlog"><summary class="muted">All entries (${ws.length})</summary>${ws.slice().reverse().map(x => `<div class="fooditem"><span class="grow">${fmtShort(x.date)}</span><span>${x.kg} kg</span><button class="ghost" data-act="delWeight" data-id="${x.id}" aria-label="Remove">✕</button></div>`).join('')}</details>` : ''}</div>`;
}

function historyCard(w, b) {
  const days = lastDays(14), vals = days.map(d => eatenOn(w, d)), logged = vals.filter(v => v > 0);
  const W = 340, Hh = 130, top = 8, ch = Hh - 26, max = Math.max(b.budget * 1.25, ...vals), gw = W / days.length, Y = v => top + ch - v / max * ch;
  const bars = days.map((d, i) => { const v = vals[i]; return `<rect class="${v > b.budget ? 'over' : ''}" x="${(i * gw + 3).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${(gw - 6).toFixed(1)}" height="${(top + ch - Y(v)).toFixed(1)}" rx="3"><title>${fmtShort(d)}: ${kc(v)} kcal</title></rect>`; }).join('');
  const labels = days.map((d, i) => i % 2 && i !== days.length - 1 ? '' : `<text x="${(i * gw + gw / 2).toFixed(1)}" y="${Hh - 4}">${parse(d).getDate()}</text>`).join('');
  const avg = logged.length ? logged.reduce((a, v) => a + v, 0) / logged.length : 0;
  return `<div class="card" data-w="${w}"><h3>Last 2 weeks</h3>
    <svg class="gchart hchart" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Calories per day, last 14 days"><line class="gtarget" x1="0" x2="${W}" y1="${Y(b.budget).toFixed(1)}" y2="${Y(b.budget).toFixed(1)}"/>${bars}${labels}</svg>
    <div class="chips">${logged.length ? `<span class="chip">average <b>${kc(avg)} kcal</b></span><span class="chip"><b>${logged.filter(v => v <= b.budget).length} of ${logged.length}</b> days on budget</span>${avg < b.tdee ? `<span class="chip">≈ <b>${((b.tdee - avg) * logged.length / 7700).toFixed(1)} kg</b> lost in these days</span>` : ''}` : '<span class="muted">Days you log food show up here. The dashed line is your budget.</span>'}</div></div>`;
}

/* food suggestions while typing */
const normTxt = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function showFoodHits(q) {
  const box = document.getElementById('fhits'); if (!box) return;
  const n = normTxt(q).trim(); if (n.length < 2) { box.innerHTML = ''; return; }
  const mine = H().myFoods.filter(f => normTxt(f.name).includes(n)).map(f => ({ name: f.name, k100: f.k100, g: f.g, label: f.g ? f.g + ' g' : 'portion', kcal: f.kcal }));
  const base = FOODS.filter(f => normTxt(f[0]).includes(n)).map(([name, k100, g, label]) => ({ name, k100, g, label }));
  foodHits = [...mine, ...base].slice(0, 8);
  box.innerHTML = foodHits.map((f, i) => `<button type="button" data-act="foodPick" data-id="${i}"><span>${esc(f.name)}</span><small>${f.k100 ? kc(f.k100) + ' kcal/100 g · ' : ''}${esc(f.label)} ${kc(f.kcal ?? f.k100 * f.g / 100)} kcal</small></button>`).join('');
}
function fillFood(f) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  set('fname', f.name); set('fk100', f.k100 || ''); set('fg', f.g || '');
  set('fkcal', f.kcal != null ? Math.round(f.kcal) : f.k100 && f.g ? Math.round(f.k100 * f.g / 100) : '');
  const box = document.getElementById('fhits'); if (box) box.innerHTML = '';
  document.getElementById(f.g ? 'fg' : 'fkcal')?.focus();
}
document.addEventListener('input', e => {
  if (e.target.id === 'fname') { document.getElementById('fk100').value = ''; showFoodHits(e.target.value); }
  if (e.target.id === 'fg') { const k = +document.getElementById('fk100')?.value; if (k && e.target.value) document.getElementById('fkcal').value = Math.round(k * e.target.value / 100); }
});
/* Open Food Facts: free product database (also Czech products), no account needed */
async function offSearch() {
  const q = document.getElementById('fname')?.value.trim();
  if (!q || q.length < 2) { toast('Type a product name first, e.g. "Activia" or "Kaufland skyr".'); return; }
  toast('Searching…');
  try {
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,nutriments,serving_quantity`);
    const d = await r.json();
    offHits = (d.products || []).map(p => ({ name: [p.product_name, p.brands?.split(',')[0]].filter(Boolean).join(' · '), k100: Math.round(p.nutriments?.['energy-kcal_100g'] || 0), g: Math.round(+p.serving_quantity || 0) || null }))
      .filter(p => p.name && p.k100).slice(0, 8);
  } catch { offHits = []; toast('Online search is not available right now.'); }
  const keep = document.getElementById('fname')?.value; render();
  const el = document.getElementById('fname'); if (el) el.value = keep;
}

const HEALTH_ACTS = {
  hwho: id => { hWho = +id; hEdit = false; offHits = null; },
  hday: d => { const x = parse(hDay || iso(new Date())); x.setDate(x.getDate() + +d); const t = iso(new Date()); hDay = iso(x) > t ? t : iso(x); offHits = null; },
  hedit: () => { hEdit = !hEdit; },
  foodPick: i => { const f = foodHits[+i]; if (f) setTimeout(() => fillFood(f)); return 'keep'; },
  offSearch: () => { offSearch(); return 'keep'; },
  offPick: i => { const f = offHits?.[+i]; if (f) { offHits = null; setTimeout(() => fillFood(f)); } },
  foodAgain: id => { const f = H().food.find(x => x.id === id); if (f) H().food.push({ ...f, id: uid(), date: hDay || iso(new Date()), at: Date.now(), meal: f.meal }); },
  delFood: id => { H().food = H().food.filter(f => f.id !== id); },
  delWeight: id => { if (confirm('Remove this weight entry?')) H().weights = H().weights.filter(x => x.id !== id); }
};
const HEALTH_FORMS = {
  saveProfile: d => {
    const w = +d.who;
    H().profiles[w] = { sex: d.sex, born: d.born, height: +d.height, weight: +d.weight, goal: +d.goal || null, activity: +d.activity, pace: +d.pace };
    const lw = latestWeight(w);
    if (!lw || lw.kg !== +d.weight) H().weights.push({ id: uid(), who: w, date: iso(new Date()), kg: +d.weight });
    hEdit = false;
  },
  addFood: d => {
    const w = hPerson(), name = d.name.trim(), kcal = Math.max(0, Math.round(+d.kcal)), g = +d.g || null, k100 = +d.k100 || (g ? Math.round(kcal / g * 100) : null);
    H().food.push({ id: uid(), who: w, date: d.date, meal: d.meal, name, kcal, g, at: Date.now() });
    /* remember foods that aren't in the built-in list, so they show up next time */
    if (!FOODS.some(f => normTxt(f[0]) === normTxt(name))) {
      const mf = H().myFoods; const ex = mf.find(f => normTxt(f.name) === normTxt(name));
      if (ex) Object.assign(ex, { k100, g, kcal }); else mf.push({ id: uid(), name, k100, g, kcal });
      if (mf.length > 150) mf.splice(0, mf.length - 150);
    }
    offHits = null;
  },
  addWeight: d => { const w = hPerson(); H().weights = H().weights.filter(x => !(x.who === w && x.date === d.date)); H().weights.push({ id: uid(), who: w, date: d.date, kg: +(+d.kg).toFixed(1) }); }
};
