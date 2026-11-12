/* ===== Health: calorie budget, food diary and weight trend (one per person) =====
   Loaded before app.js; only declares things, nothing runs here until the page is opened. */

/* Common foods: [name (Czech · English for searching), kcal per 100 g, usual portion in g, portion name, [protein, carbs, fat] g per 100 g] */
const FOODS = [
  ['Rohlík · bread roll', 285, 43, '1 roll', [9, 55, 3]], ['Chléb kváskový · sourdough bread', 240, 50, '1 slice', [8, 47, 1.5]], ['Toustový chléb · toast bread', 265, 25, '1 slice', [8, 48, 4]],
  ['Ovesné vločky · oats', 370, 50, '1 bowl', [13, 60, 7]], ['Müsli · granola', 420, 50, '1 bowl', [9, 64, 14]], ['Corn flakes', 375, 40, '1 bowl', [7, 84, 1]],
  ['Vejce · egg', 143, 55, '1 egg', [12.5, 0.7, 10]], ['Míchaná vejce · scrambled eggs', 165, 150, '3 eggs', [11, 1.6, 12]], ['Šunka · ham', 110, 30, '2 slices', [19, 1, 4]],
  ['Eidam 30 % · cheese', 260, 30, '2 slices', [26, 0, 16]], ['Mozzarella', 250, 60, '½ ball', [18, 1, 19]], ['Cottage', 100, 150, '1 tub', [11, 3, 4.5]], ['Tvaroh polotučný · quark', 105, 125, '½ tub', [14, 3.5, 4.5]],
  ['Bílý jogurt · plain yoghurt', 65, 150, '1 cup', [4, 5, 3]], ['Řecký jogurt · Greek yoghurt', 120, 150, '1 cup', [6, 4, 9]], ['Skyr', 63, 140, '1 cup', [11, 4, 0.2]],
  ['Mléko polotučné · milk 1.5%', 47, 250, '1 glass', [3.4, 4.8, 1.5]], ['Máslo · butter', 740, 10, '1 tsp', [0.7, 0.6, 82]], ['Olivový olej · olive oil', 880, 10, '1 tbsp', [0, 0, 100]],
  ['Banán · banana', 89, 120, '1 piece', [1.1, 23, 0.3]], ['Jablko · apple', 52, 180, '1 piece', [0.3, 14, 0.2]], ['Pomeranč · orange', 47, 150, '1 piece', [0.9, 12, 0.1]], ['Hrozny · grapes', 69, 100, '1 handful', [0.7, 18, 0.2]],
  ['Jahody · strawberries', 32, 150, '1 bowl', [0.7, 7.7, 0.3]], ['Borůvky · blueberries', 57, 100, '1 bowl', [0.7, 14, 0.3]], ['Avokádo · avocado', 160, 70, '½ piece', [2, 9, 15]],
  ['Rajče · tomato', 18, 120, '1 piece', [0.9, 3.9, 0.2]], ['Okurka · cucumber', 15, 150, '½ piece', [0.7, 3.6, 0.1]], ['Paprika · pepper', 26, 150, '1 piece', [1, 6, 0.3]], ['Mrkev · carrot', 41, 80, '1 piece', [0.9, 10, 0.2]],
  ['Zeleninový salát · mixed salad', 25, 200, '1 bowl', [1.5, 4, 0.3]], ['Brokolice · broccoli', 34, 150, '1 portion', [2.8, 7, 0.4]],
  ['Kuřecí prsa · chicken breast', 165, 150, '1 portion', [31, 0, 3.6]], ['Kuřecí stehno · chicken thigh', 210, 150, '1 portion', [26, 0, 11]], ['Hovězí steak · beef steak', 250, 200, '1 steak', [26, 0, 17]],
  ['Mleté hovězí · minced beef', 250, 125, '1 portion', [26, 0, 17]], ['Vepřový řízek · pork schnitzel', 290, 150, '1 piece', [18, 14, 18]], ['Losos · salmon', 208, 150, '1 fillet', [20, 0, 13]],
  ['Tuňák v konzervě · canned tuna', 116, 80, '1 can', [26, 0, 1]], ['Párek · sausage', 290, 50, '1 piece', [12, 2, 26]],
  ['Rýže vařená · rice (cooked)', 130, 200, '1 portion', [2.7, 28, 0.3]], ['Těstoviny vařené · pasta (cooked)', 158, 220, '1 portion', [5.8, 31, 0.9]], ['Brambory vařené · potatoes (boiled)', 77, 250, '1 portion', [2, 17, 0.1]],
  ['Hranolky · fries', 312, 150, '1 portion', [3.4, 41, 15]], ['Bramborová kaše · mashed potatoes', 95, 200, '1 portion', [2, 14, 3.5]], ['Knedlík houskový · bread dumpling', 230, 120, '4 slices', [7, 48, 1.5]],
  ['Svíčková s knedlíkem', 180, 450, '1 plate', [9, 18, 8]], ['Guláš s knedlíkem · goulash', 170, 450, '1 plate', [9, 17, 7.5]], ['Smažený sýr s hranolky · fried cheese', 300, 350, '1 plate', [12, 25, 17]],
  ['Pizza', 266, 350, '1 pizza', [11, 33, 10]], ['Burger', 250, 250, '1 burger', [13, 24, 11]], ['Kebab', 215, 350, '1 kebab', [12, 18, 11]], ['Sushi', 150, 250, '8 pieces', [6, 28, 1.5]], ['Bowl (poke)', 140, 400, '1 bowl', [9, 17, 4]],
  ['Polévka · soup', 45, 300, '1 bowl', [2, 5, 2]], ['Sendvič · sandwich', 250, 180, '1 piece', [11, 28, 10]], ['Bageta · baguette', 260, 220, '1 piece', [10, 40, 6]],
  ['Ořechy · nuts', 600, 30, '1 handful', [20, 16, 52]], ['Arašídové máslo · peanut butter', 590, 15, '1 tbsp', [25, 16, 50]], ['Hořká čokoláda · dark chocolate', 550, 20, '2 squares', [8, 36, 40]],
  ['Mléčná čokoláda · milk chocolate', 535, 25, '¼ bar', [7, 57, 31]], ['Chipsy · crisps', 535, 50, '½ bag', [6, 50, 34]], ['Sušenky · biscuits', 480, 30, '3 pieces', [6, 68, 20]], ['Zmrzlina · ice cream', 210, 100, '2 scoops', [3.5, 24, 11]],
  ['Koláč / buchta · cake', 350, 100, '1 piece', [6, 50, 14]], ['Croissant', 406, 60, '1 piece', [8, 46, 21]], ['Proteinová tyčinka · protein bar', 360, 55, '1 bar', [30, 35, 10]],
  ['Protein shake (s vodou)', 380, 30, '1 scoop', [75, 8, 6]], ['Pivo 10° · beer', 35, 500, '0.5 l', [0.4, 3, 0]], ['Pivo 12° · lager', 43, 500, '0.5 l', [0.5, 3.6, 0]], ['Víno · wine', 82, 200, '1 glass', [0.1, 2.6, 0]],
  ['Coca-Cola', 42, 330, '1 can', [0, 10.6, 0]], ['Džus · juice', 45, 250, '1 glass', [0.5, 10, 0.1]], ['Cappuccino', 40, 200, '1 cup', [2.2, 3.3, 2]], ['Latte', 45, 300, '1 cup', [2.4, 3.6, 2.1]], ['Káva černá · black coffee', 2, 150, '1 cup', [0.1, 0, 0]]
];
const MEALS = [['b', 'Breakfast', '🌅'], ['l', 'Lunch', '🍽️'], ['d', 'Dinner', '🌙'], ['s', 'Snacks', '🍎']];
const ACTIVITY = [[1.2, 'Mostly sitting (office, little walking)'], [1.375, 'Light (walking, sport 1–3× a week)'], [1.55, 'Active (sport 3–5× a week)'], [1.725, 'Very active (hard sport 6–7× a week)']];
const PACE = [[0, 'Keep my weight'], [0.25, 'Lose 0.25 kg a week (easy)'], [0.5, 'Lose 0.5 kg a week (recommended)'], [0.75, 'Lose 0.75 kg a week (hard)']];
let hWho = null, hDay = null, hEdit = false, foodHits = [], offHits = null;

const H = () => (S.health ||= { profiles: {}, food: [], weights: [], myFoods: [], days: {}, burn: {} });
const hPerson = () => I(); // everyone sees only their own food and weight
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
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), budget, deficit: Math.round(tdee - budget), kg, floor, target: deficit, floored: budget === floor && tdee - deficit < floor, goalKg: p.goal || kg };
}
const eatenOn = (w, day) => H().food.filter(f => f.who === w && f.date === day).reduce((a, f) => a + f.kcal, 0) || +(H().days?.[w]?.[day]) || 0;
const kc = v => Math.round(v).toLocaleString();

/* ---- Calories burned on a day ----
   1. A Garmin number for that day (synced automatically or typed in) wins: Garmin already counts
      resting burn, steps and workouts, so nothing is added on top.
   2. Otherwise: resting burn × 1.2 (normal daily life) + steps above 3,000 (from the Steps goal)
      + each sport from the Sports page (standard MET values × your weight × time). */
const STEP_RE = /step|krok/i, WALKISH = /walk|chůze|prochaz|procház|hik|turist/i;
const SPORT_MET = [[/run|běh|jog/i, 9.8], [/hik|turist/i, 6], [/walk|chůze|prochaz|procház/i, 3.5], [/cycl|bike|kolo/i, 7.5], [/swim|plav/i, 7],
  [/squash/i, 7.3], [/tennis|tenis/i, 7.3], [/padel|badminton/i, 6], [/footb|fotbal|soccer/i, 7], [/basket|hockey|hokej|floorball|florbal/i, 7], [/volley|volejbal/i, 4],
  [/skat|brusl/i, 7.5], [/ski|lyž|snowboard/i, 7], [/climb|boulder|lezen/i, 6], [/yoga|jóga|pilates/i, 2.8], [/stretch|protah/i, 2.3],
  [/wellness|sauna|spa/i, 1.3], [/danc|tanec/i, 5], [/gym|posil|weights|crossfit|fitness/i, 5]];
const metOf = s => { let m = SPORT_MET.find(([re]) => re.test(s.type))?.[1] ?? 5;
  if (/cycl|bike|kolo/i.test(s.type) && s.km && s.mins) { const v = s.km / (s.mins / 60); m = v < 16 ? 4 : v < 20 ? 6.8 : v < 24 ? 8 : 10; }
  if (/run|běh|jog/i.test(s.type) && s.km && s.mins) { const v = s.km / (s.mins / 60); m = Math.max(6, Math.min(14, v * 1.0)); }
  return m; };
/* extra kcal on top of resting burn; Garmin workouts bring their own number (total, so the resting part is taken off) */
const sportKcal = (s, kg, bmr, w) => s.gk?.[w] && bmr ? Math.round(Math.max(0, s.gk[w] - bmr * (+s.mins || 0) / 1440)) : Math.round(Math.max(0, metOf(s) - 1) * kg * (+s.mins || 0) / 60);
const stepsGoal = w => S.goals?.find(g => isObj(g?.log) && STEP_RE.test(`${g.unit} ${g.name}`) && people(g).includes(w));
const stepsOn = (w, day) => { const g = stepsGoal(w); return g ? amt(g, w, day) : 0; };
function burnOf(w, day, b = budgetOf(w)) {
  if (!b) return null;
  const kg = b.kg, rest = Math.round(b.bmr * 1.2), g = H().burn?.[w]?.[day];
  const steps = Math.round(g?.steps || stepsOn(w, day)), stepK = Math.round(Math.max(0, steps - 3000) * kg * 0.0005);
  const sp = S.sports.filter(s => s.date === day && (s.who == w || s.who == 2)).map(s => ({ s, kcal: sportKcal(s, kg, b.bmr, w), skip: !!steps && WALKISH.test(s.type) }));
  const est = rest + stepK + sp.reduce((a, x) => a + (x.skip ? 0 : x.kcal), 0);
  return { total: g?.kcal ? Math.round(g.kcal) : est, garmin: g?.kcal ? g : null, est, rest, steps, stepK, sp };
}
/* Eating budget for one day = what you burned that day − your planned deficit (never below the safe minimum). */
const budgetOn = (w, day, b = budgetOf(w), burn = burnOf(w, day, b)) => Math.max(b.floor, Math.round((burn.total - b.target) / 10) * 10);
/* Daily nutrient targets: protein 1.6 g per kg of goal weight, fat 30 % of calories, carbs the rest. */
const macroTargets = (b, budget) => { const p = Math.round(1.6 * b.goalKg), f = Math.round(budget * 0.3 / 9); return { p, f, c: Math.max(0, Math.round((budget - p * 4 - f * 9) / 4)) }; };
const mac = v => v == null || v === '' ? null : Math.round(+v * 10) / 10;
const mfmt = v => (Math.round(v * 10) / 10).toLocaleString();
const macStr = f => f.p != null || f.c != null || f.f != null ? `P ${mfmt(f.p || 0)} · C ${mfmt(f.c || 0)} · F ${mfmt(f.f || 0)}` : '';

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
  const head = `<div class="homehead"><h2>Health</h2><span class="muted">${esc(S.names[w])} · your own food and weight</span></div>`;
  if (!b || hEdit) return head + profileForm(w, p);
  const burn = burnOf(w, day, b), budget = budgetOn(w, day, b, burn);
  const food = H().food.filter(f => f.who === w && f.date === day), eaten = food.reduce((a, f) => a + f.kcal, 0), left = budget - eaten;
  const sum = k => food.reduce((a, f) => a + (+f[k] || 0), 0), mt = macroTargets(b, budget), noMac = food.filter(f => f.p == null && f.c == null && f.f == null).length;
  const dayNav = `<div class="daynav"><button class="ghost" data-act="hday" data-id="-1" aria-label="Previous day">‹</button><strong>${day === t ? 'Today' : fmtShort(day)}</strong><button class="ghost" data-act="hday" data-id="1" aria-label="Next day" ${day >= t ? 'disabled' : ''}>›</button></div>`;
  const meals = MEALS.map(([k, name, ic]) => { const items = food.filter(f => f.meal === k); return `<div class="meal"><div class="mealh"><span>${ic} ${name}</span><b>${kc(items.reduce((a, f) => a + f.kcal, 0))} kcal</b></div>
    ${items.map(f => `<div class="fooditem" data-hl="${f.id}"><span class="grow">${esc(f.name)}${f.g ? ` <small class="muted">${f.g} g</small>` : ''}${macStr(f) ? `<small class="muted fmac">${macStr(f)}</small>` : ''}</span><span>${kc(f.kcal)}</span><button class="ghost" data-act="delFood" data-id="${f.id}" aria-label="Remove">✕</button></div>`).join('')}</div>`; }).join('');
  const hour = new Date().getHours(), meal = day !== t ? 's' : hour < 10 ? 'b' : hour < 15 ? 'l' : hour < 21 ? 'd' : 's';
  const recent = [...new Map(H().food.filter(f => f.who === w).sort((a, b) => b.at - a.at).map(f => [f.name, f])).values()].slice(0, 8);
  const bar = (label, v, goal, cls) => `<div class="mbar ${cls}"><div class="mbh"><span>${label}</span><span><b>${mfmt(v)}</b> / ${goal} g</span></div><div class="mtrack"><i style="width:${Math.min(100, goal ? v / goal * 100 : 0).toFixed(0)}%"></i></div></div>`;
  return `${head}
  <div class="hgrid">
    <div class="card hday" data-w="${w}">${dayNav}
      <div class="hdonut">${donut(eaten / budget, 170, 16, left >= 0 ? kc(left) : '+' + kc(-left), left >= 0 ? 'kcal left' : 'kcal over')}</div>
      <div class="hnums"><div><b>${kc(budget)}</b><small>budget</small></div><div><b>${kc(eaten)}</b><small>eaten</small></div><div><b>${kc(burn.total)}</b><small>burned${burn.garmin ? ' ⌚' : ''}</small></div></div>
      <div class="macros">${bar('Protein', sum('p'), mt.p, 'mp')}${bar('Carbs', sum('c'), mt.c, 'mc')}${bar('Fat', sum('f'), mt.f, 'mf')}
        ${noMac ? `<p class="muted fhelp">${noMac} food${noMac > 1 ? 's' : ''} without nutrients ${noMac > 1 ? "aren't" : "isn't"} counted here.</p>` : ''}</div>
      <p class="muted hhint">${left >= 0 ? `Eating up to ${kc(budget)} kcal keeps you ${kc(burn.total - budget)} kcal under what you burned${burn.total - budget > 0 ? ` (about ${((burn.total - budget) * 7 / 7700).toFixed(2)} kg a week)` : ''}.` : `Over budget ${day === t ? 'today' : 'this day'}. One day doesn't matter, the weekly average does.`}</p>
    </div>
    ${burnCard(w, day, b, burn)}
    <div class="card"><h3>Add food</h3>
      <form data-form="addFood" class="foodform" autocomplete="off"><input type="hidden" name="date" value="${day}"><input type="hidden" name="k100" id="fk100"><input type="hidden" name="m100" id="fm100">
        <div class="fsearch"><input type="text" name="name" id="fname" placeholder="What did you eat? e.g. rohlík, banana…" required aria-label="Food"><div id="fhits" class="fhits"></div></div>
        <div class="row"><input type="number" name="g" id="fg" placeholder="grams" min="1" step="any" aria-label="Grams"><input type="number" name="kcal" id="fkcal" placeholder="kcal" min="0" step="1" required aria-label="Calories">
          <select name="meal" aria-label="Meal">${MEALS.map(([k, n]) => `<option value="${k}" ${k === meal ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="primary">Add</button></div>
        <div class="row macrow"><input type="number" name="p" id="fp" placeholder="protein g" min="0" step="any" aria-label="Protein in grams"><input type="number" name="c" id="fc" placeholder="carbs g" min="0" step="any" aria-label="Carbs in grams"><input type="number" name="f" id="ff" placeholder="fat g" min="0" step="any" aria-label="Fat in grams"></div>
        <p class="muted fhelp">Pick a food from the list and calories and nutrients fill in, or type them from the packaging. <button type="button" class="ghost" data-act="offSearch">🔎 Search products online</button></p></form>
      ${offHits ? `<div class="offhits">${offHits.length ? offHits.map((o, i) => `<button class="idea" data-act="offPick" data-id="${i}"><span>${esc(o.name)}<small class="muted"> ${kc(o.k100)} kcal / 100 g${o.m100 ? ` · P ${mfmt(o.m100[0])} C ${mfmt(o.m100[1])} F ${mfmt(o.m100[2])}` : ''}${o.g ? ` · portion ${o.g} g` : ''}</small></span></button>`).join('') : '<p class="muted">Nothing found online. Type the kcal from the packaging.</p>'}</div>` : ''}
      ${recent.length ? `<h4 class="hsub">Again?</h4><div class="chips">${recent.map(f => `<button class="chip" data-act="foodAgain" data-id="${f.id}">${esc(f.name)} · ${kc(f.kcal)}</button>`).join('')}</div>` : ''}
    </div>
    <div class="card hmeals"><h3>${day === t ? "Today's" : fmtShort(day)} food</h3>${meals}
      ${food.length ? `<div class="mealh mtot"><span>Total</span><b>${kc(eaten)} kcal</b></div><p class="muted fmac">Protein ${mfmt(sum('p'))} g · Carbs ${mfmt(sum('c'))} g · Fat ${mfmt(sum('f'))} g</p>` : ''}</div>
    ${weightCard(w, p, b)}
    ${historyCard(w, b)}
    <div class="card"><h3>Your numbers</h3><p class="muted">${p.sex === 'f' ? 'Woman' : 'Man'}, ${ageOf(p.born)} years, ${p.height} cm, ${b.kg} kg.</p>
      <p class="muted">Resting burn ${kc(b.bmr)} kcal a day, about ${kc(b.bmr * 1.2)} kcal with normal daily life before steps and sport. Goal: ${esc(PACE.find(x => x[0] == (p.pace ?? 0.5))?.[1] || '')}${p.goal ? `, target ${p.goal} kg` : ''}, so your budget is what you burn minus ${kc(b.target)} kcal.</p>
      <p class="muted">Daily nutrient targets: protein ${mt.p} g (1.6 g per kg of ${p.goal ? 'goal ' : ''}weight), fat about 30 % of calories, carbs the rest.</p>
      <button data-act="hedit">Change my numbers</button></div>
  </div>`;
}

/* Where the "burned" number comes from, plus quick entry of steps and the Garmin total. */
function burnCard(w, day, b, burn) {
  const t = iso(new Date()), g = burn.garmin, sg = stepsGoal(w);
  const lines = [`<div class="fooditem"><span class="grow">Resting burn and daily life</span><span>${kc(burn.rest)}</span></div>`,
    `<div class="fooditem"><span class="grow">Steps <small class="muted">${burn.steps ? kc(burn.steps) + ' steps (first 3,000 are in daily life)' : 'none logged yet'}</small></span><span>${kc(burn.stepK)}</span></div>`,
    ...burn.sp.map(x => `<div class="fooditem"><span class="grow">${esc(x.s.type)} <small class="muted">${x.s.gk?.[w] ? '⌚ ' : ''}${hm(+x.s.mins || 0)}${x.s.km ? ` · ${x.s.km} km` : ''}${x.skip ? ' · already in your steps' : ''}</small></span><span>${x.skip ? '–' : kc(x.kcal)}</span></div>`)].join('');
  return `<div class="card burn" data-w="${w}"><div class="chead"><h3>🔥 Burned ${day === t ? 'today' : fmtShort(day)}</h3><b>${kc(burn.total)} kcal</b></div>
    ${g ? `<p class="gar">⌚ From Garmin${g.src === 'manual' ? ' (typed in)' : ' (synced)'}: <b>${kc(g.kcal)} kcal</b>${g.active ? `, of that ${kc(g.active)} active` : ''}${g.steps ? `, ${kc(g.steps)} steps` : ''}. Steps and sports below are already included, so nothing is added on top. <button class="ghost" data-act="delBurn" data-id="${day}">Remove</button></p>
      <details><summary class="muted">Estimate without Garmin: ${kc(burn.est)} kcal</summary>${lines}</details>`
    : `${lines}<p class="muted fhelp">This is an estimate. Sports come from the Sports page${burn.sp.length ? '' : ' (nothing logged this day)'}.</p>`}
    <form class="row" data-form="setSteps"><input type="hidden" name="date" value="${day}"><input type="number" name="steps" min="0" step="1" placeholder="steps" value="${stepsOn(w, day) || ''}" aria-label="Steps"><button>${sg ? 'Save steps' : 'Start tracking steps'}</button></form>
    <form class="row" data-form="setBurn"><input type="hidden" name="date" value="${day}"><input type="number" name="kcal" min="500" max="9000" step="1" placeholder="Garmin total kcal" value="${g?.src === 'manual' ? g.kcal : ''}" aria-label="Total calories burned from Garmin"><button>Save Garmin kcal</button>${H().garminOn?.[w] ? '<button type="button" class="ghost" data-act="garminSync">↻ Sync Garmin</button>' : ''}</form>
    <p class="muted fhelp">Garmin Connect app → today → <i>Calories</i>: type the <b>total</b> (resting + active). It replaces the estimate.</p></div>`;
}

function profileForm(w, p = {}) {
  return `<form class="card" data-form="saveProfile"><h3>${p.height ? 'Your numbers' : `Set up ${esc(S.names[w])}'s calorie budget`}</h3>
    <p class="muted">These numbers work out your resting burn. Steps, sports and Garmin add the rest each day, and your eating budget follows. Only you two can see them.</p>
    <input type="hidden" name="who" value="${w}">
    <div class="pgrid">
      <label>Sex<select name="sex"><option value="m" ${p.sex !== 'f' ? 'selected' : ''}>Man</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>Woman</option></select></label>
      <label>Birthday<input type="date" name="born" value="${p.born || ''}" required></label>
      <label>Height (cm)<input type="number" name="height" value="${p.height || ''}" min="120" max="230" required></label>
      <label>Weight now (kg)<input type="number" name="weight" value="${latestWeight(w)?.kg || p.weight || ''}" min="35" max="300" step="0.1" required></label>
      <label>Goal weight (kg)<input type="number" name="goal" value="${p.goal || ''}" min="35" max="300" step="0.1"></label>
      <input type="hidden" name="activity" value="${p.activity || 1.375}">
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
  const days = lastDays(14), vals = days.map(d => eatenOn(w, d)), burns = days.map(d => burnOf(w, d, b)), buds = days.map((d, i) => budgetOn(w, d, b, burns[i]));
  const W = 340, Hh = 130, top = 8, ch = Hh - 26, max = Math.max(...buds.map(v => v * 1.2), ...vals), gw = W / days.length, Y = v => top + ch - v / max * ch;
  const bars = days.map((d, i) => { const v = vals[i]; return `<rect class="${v > buds[i] ? 'over' : ''}" x="${(i * gw + 3).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${(gw - 6).toFixed(1)}" height="${(top + ch - Y(v)).toFixed(1)}" rx="3"><title>${fmtShort(d)}: ate ${kc(v)} kcal, budget ${kc(buds[i])}, burned ${kc(burns[i].total)}</title></rect>`; }).join('');
  const marks = days.map((d, i) => `<line class="gtarget" x1="${(i * gw + 1).toFixed(1)}" x2="${(i * gw + gw - 1).toFixed(1)}" y1="${Y(buds[i]).toFixed(1)}" y2="${Y(buds[i]).toFixed(1)}"/>`).join('');
  const labels = days.map((d, i) => i % 2 && i !== days.length - 1 ? '' : `<text x="${(i * gw + gw / 2).toFixed(1)}" y="${Hh - 4}">${parse(d).getDate()}</text>`).join('');
  const li = days.map((d, i) => i).filter(i => vals[i] > 0), avg = li.length ? li.reduce((a, i) => a + vals[i], 0) / li.length : 0;
  const gap = li.reduce((a, i) => a + burns[i].total - vals[i], 0);
  return `<div class="card" data-w="${w}"><h3>Last 2 weeks</h3>
    <svg class="gchart hchart" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Calories per day, last 14 days">${marks}${bars}${labels}</svg>
    <div class="chips">${li.length ? `<span class="chip">average <b>${kc(avg)} kcal</b></span><span class="chip"><b>${li.filter(i => vals[i] <= buds[i]).length} of ${li.length}</b> days on budget</span>${gap >= 385 ? `<span class="chip">≈ <b>${(gap / 7700).toFixed(1)} kg</b> lost in these days</span>` : ''}` : '<span class="muted">Days you log food show up here. The dashes are each day\'s budget.</span>'}</div></div>`;
}

/* food suggestions while typing */
const normTxt = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function showFoodHits(q) {
  const box = document.getElementById('fhits'); if (!box) return;
  const n = normTxt(q).trim(); if (n.length < 2) { box.innerHTML = ''; return; }
  const mine = H().myFoods.filter(f => normTxt(f.name).includes(n)).map(f => ({ name: f.name, k100: f.k100, g: f.g, label: f.g ? f.g + ' g' : 'portion', kcal: f.kcal, m100: f.m100, mp: f.mp }));
  const base = FOODS.filter(f => normTxt(f[0]).includes(n)).map(([name, k100, g, label, m100]) => ({ name, k100, g, label, m100 }));
  foodHits = [...mine, ...base].slice(0, 8);
  box.innerHTML = foodHits.map((f, i) => `<button type="button" data-act="foodPick" data-id="${i}"><span>${esc(f.name)}</span><small>${f.k100 ? kc(f.k100) + ' kcal/100 g · ' : ''}${esc(f.label)} ${kc(f.kcal ?? f.k100 * f.g / 100)} kcal</small></button>`).join('');
}
function fillFood(f) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  set('fname', f.name); set('fk100', f.k100 || ''); set('fg', f.g || '');
  set('fkcal', f.kcal != null ? Math.round(f.kcal) : f.k100 && f.g ? Math.round(f.k100 * f.g / 100) : '');
  set('fm100', f.m100 ? f.m100.join(',') : '');
  if (f.m100 && f.g) fillMacros(f.g); else ['fp', 'fc', 'ff'].forEach((id, i) => set(id, f.mp?.[i] ?? ''));
  const box = document.getElementById('fhits'); if (box) box.innerHTML = '';
  document.getElementById(f.g ? 'fg' : 'fkcal')?.focus();
}
/* protein / carbs / fat for the grams typed, from the per-100 g values of the picked food */
function fillMacros(g) {
  const m = (document.getElementById('fm100')?.value || '').split(',').filter(Boolean).map(Number); if (m.length !== 3 || !g) return;
  ['fp', 'fc', 'ff'].forEach((id, i) => { const el = document.getElementById(id); if (el) el.value = Math.round(m[i] * g / 10) / 10; });
}
document.addEventListener('input', e => {
  if (e.target.id === 'fname') { document.getElementById('fk100').value = ''; document.getElementById('fm100').value = ''; showFoodHits(e.target.value); }
  if (e.target.id === 'fg') { const k = +document.getElementById('fk100')?.value; if (k && e.target.value) document.getElementById('fkcal').value = Math.round(k * e.target.value / 100); fillMacros(+e.target.value); }
});
/* Open Food Facts: free product database (also Czech products), no account needed */
async function offSearch() {
  const q = document.getElementById('fname')?.value.trim();
  if (!q || q.length < 2) { toast('Type a product name first, e.g. "Activia" or "Kaufland skyr".'); return; }
  toast('Searching…');
  try {
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,nutriments,serving_quantity`);
    const d = await r.json();
    offHits = (d.products || []).map(p => { const n = p.nutriments || {}, has = ['proteins_100g', 'carbohydrates_100g', 'fat_100g'].some(k => n[k] != null);
      return { name: [p.product_name, p.brands?.split(',')[0]].filter(Boolean).join(' · '), k100: Math.round(n['energy-kcal_100g'] || 0), g: Math.round(+p.serving_quantity || 0) || null,
        m100: has ? [+n.proteins_100g || 0, +n.carbohydrates_100g || 0, +n.fat_100g || 0].map(v => Math.round(v * 10) / 10) : null }; })
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
  delWeight: id => { if (confirm('Remove this weight entry?')) H().weights = H().weights.filter(x => x.id !== id); },
  delBurn: day => { const w = hPerson(), B = H().burn?.[w]; if (B?.[day] && confirm('Remove the Garmin calories for this day? The estimate will be used again.')) delete B[day]; },
  garminSync: () => { garminSync(); return 'keep'; }
};
/* Ask the server to fetch the latest numbers from Garmin now (it also does this by itself every 30 minutes). */
async function garminSync() {
  if (!sb || !authed) { toast('Garmin sync works when you are logged in online.'); return; }
  toast('Asking Garmin…');
  const { data, error } = await sb.functions.invoke('garmin-sync', { body: { who: hPerson() } });
  if (error || data?.error) { toast('Garmin sync failed: ' + (data?.error || error.message)); return; }
  await pull(true); render(); toast(data?.updated ? 'Garmin numbers updated' : 'Garmin: nothing new yet');
}
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
    const [p, c, f] = [d.p, d.c, d.f].map(mac), hasM = [p, c, f].some(v => v != null);
    const m100 = (d.m100 || '').split(',').filter(Boolean).map(Number), m100ok = m100.length === 3 ? m100 : hasM && g ? [p, c, f].map(v => Math.round((v || 0) / g * 1000) / 10) : null;
    H().food.push({ id: uid(), who: w, date: d.date, meal: d.meal, name, kcal, g, ...(hasM ? { p: p || 0, c: c || 0, f: f || 0 } : {}), at: Date.now() });
    /* remember foods that aren't in the built-in list, so they show up next time */
    if (!FOODS.some(f => normTxt(f[0]) === normTxt(name))) {
      const mf = H().myFoods; const ex = mf.find(f => normTxt(f.name) === normTxt(name));
      const nut = { m100: m100ok, mp: hasM ? [p || 0, c || 0, f || 0] : null };
      if (ex) Object.assign(ex, { k100, g, kcal }, nut); else mf.push({ id: uid(), name, k100, g, kcal, ...nut });
      if (mf.length > 150) mf.splice(0, mf.length - 150);
    }
    offHits = null;
  },
  setSteps: d => {
    const w = hPerson(), v = Math.max(0, Math.round(+d.steps || 0));
    let g = stepsGoal(w);
    if (!g) { g = newGoal({ name: 'Steps', icon: '👟', unit: 'steps', target: 10000, step: 1000, owner: w }, uid()); S.goals.push(g); }
    const L = (g.log[w] ||= {}); if (v) L[d.date] = v; else delete L[d.date];
  },
  setBurn: d => {
    const w = hPerson(), v = Math.round(+d.kcal || 0), B = ((H().burn ||= {})[w] ||= {});
    if (v) B[d.date] = { kcal: v, src: 'manual', at: Date.now() }; else delete B[d.date];
  },
  addWeight: d => { const w = hPerson(); H().weights = H().weights.filter(x => !(x.who === w && x.date === d.date)); H().weights.push({ id: uid(), who: w, date: d.date, kg: +(+d.kg).toFixed(1) }); }
};
