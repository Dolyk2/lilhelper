// Supabase Edge Function "garmin-sync": fetches calories, steps and workouts from Garmin Connect
// (official Personal API) for each of you and puts them into the app:
//   - total calories burned per day  -> Health ("🔥 Burned", replaces the estimate)
//   - steps per day                  -> the Steps goal
//   - workouts (last 3 days)         -> Sports, as that person's own activity
// Secrets (Edge Functions → Secrets): GARMIN_KEY_0 (first person), GARMIN_KEY_1 (second person).
// The 30-minute schedule proves itself with a random password kept in the database vault
// (see supabase/garmin.sql). See GARMIN-SETUP.md.
import { createClient } from 'npm:@supabase/supabase-js@2';

const API = 'https://personal.connectapi.garmin.com';
const TOKEN_URL = API + '/personalapitoken-service/personal-api/personal-api-key/token';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
// Dates in Prague time, so "today" matches the app.
const pragueDay = (daysAgo = 0) => new Date(Date.now() - daysAgo * 864e5).toLocaleDateString('en-CA', { timeZone: 'Europe/Prague' });
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

/* Garmin's field names vary between endpoints and versions (flat "totalSteps" or nested
   "movement.steps"), so numbers are found by the end of their path. */
function flat(o: unknown, pre = '', out: Record<string, number> = {}) {
  if (isObj(o)) for (const [k, v] of Object.entries(o)) {
    const p = pre ? `${pre}.${k}` : k;
    if (typeof v === 'number' && isFinite(v)) out[p] = v; else if (isObj(v)) flat(v, p, out);
  }
  return out;
}
function pick(f: Record<string, number>, ...res: RegExp[]) {
  for (const re of res) for (const [k, v] of Object.entries(f)) if (re.test(k)) return Math.round(v);
  return null;
}

async function getToken(key: string): Promise<string> {
  const r = await fetch(TOKEN_URL, { method: 'POST', headers: { Authorization: `ApiKey ${key}`, Accept: '*/*' } });
  const txt = (await r.text()).trim();
  if (!r.ok) throw new Error(`Garmin login failed (${r.status}). Is the key right and not expired?`);
  if (txt.startsWith('{')) { const j = JSON.parse(txt); return j.access_token ?? j.accessToken ?? j.token; }
  return txt.replace(/^"|"$/g, ''); // the token comes as plain text
}
async function get(token: string, path: string, params: Record<string, string | number>) {
  const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const r = await fetch(`${API}${path}?${q}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(`Garmin ${path.split('/')[1]} request failed (${r.status})`);
  return r.json();
}

/* Garmin activity type → the names the app already uses on the Sports page */
const TYPES: [RegExp, string][] = [
  [/strength|weight|gym|fitness_equipment|hiit|indoor_cardio|crossfit/, 'Gym'], [/trail_run|treadmill|running|run/, 'Running'],
  [/hik/, 'Hiking'], [/walk/, 'Walking'], [/cycl|bik|ride/, 'Cycling'], [/swim/, 'Swimming'], [/yoga|pilates/, 'Yoga'],
  [/skat/, 'Skating'], [/soccer|football/, 'Football'], [/tennis/, 'Tennis'], [/squash/, 'Squash'], [/padel/, 'Padel'],
  [/ski|snowboard/, 'Skiing'], [/climb|boulder/, 'Climbing'], [/breathwork|stretch|mobility/, 'Stretching'],
];
const niceType = (key: string, name: string) => {
  const k = key.toLowerCase();
  return TYPES.find(([re]) => re.test(k))?.[1] ?? (k ? k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : name || 'Workout');
};
const uid = () => Math.random().toString(36).slice(2, 9);

type Day = { day: string; kcal: number | null; active: number | null; steps: number | null };
type Act = { gid: string; type: string; date: string; mins: number; km: number; kcal: number | null; name: string };

async function fetchPerson(key: string) {
  const token = await getToken(key);
  const start = pragueDay(2), end = pragueDay(0);
  const sum = await get(token, '/usersummary-service/v2/dailysummaries', { startDate: start, endDate: end });
  const list: unknown[] = Array.isArray(sum) ? sum : isObj(sum) ? ((sum.data ?? sum.dailySummaries ?? sum.summaries ?? [sum]) as unknown[]) : [];
  const days: Day[] = [];
  let sample: string[] = [];
  for (const s of list) {
    if (!isObj(s)) continue;
    const day = String(s.calendarDate ?? s.date ?? '').slice(0, 10);
    const f = flat(s);
    if (!sample.length) sample = Object.keys(f).slice(0, 60);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const active = pick(f, /^activeKilocalories$/i, /(^|\.)active(Kilo)?calories$/i, /calories?\.active$/i);
    const bmr = pick(f, /^bmrKilocalories$/i, /(^|\.)bmr(Kilo)?calories$/i, /calories?\.(bmr|resting)$/i);
    const total = pick(f, /^totalKilocalories$/i, /(^|\.)total(Kilo)?calories$/i, /calories?\.total$/i) ?? (active !== null && bmr !== null ? active + bmr : null);
    const steps = pick(f, /^totalSteps$/i, /^movement\.(total)?steps$/i, /(^|\.)(total)?steps$/i);
    days.push({ day, kcal: total, active, steps });
  }
  const acts: Act[] = [];
  const al = await get(token, '/activitylist-service/activities/search/activities', { start: 0, limit: 20, startDate: start, endDate: end });
  for (const a of (Array.isArray(al) ? al : isObj(al) ? ((al.data ?? al.activities ?? []) as unknown[]) : [])) {
    if (!isObj(a) || a.activityId == null) continue;
    const t = isObj(a.activityType) ? String(a.activityType.typeKey ?? '') : String(a.activityType ?? '');
    const date = String(a.startTimeLocal ?? a.startTimeGMT ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const secs = Number(a.duration ?? a.movingDuration ?? a.elapsedDuration ?? 0);
    acts.push({ gid: String(a.activityId), type: niceType(t, String(a.activityName ?? '')), date, name: String(a.activityName ?? ''),
      mins: Math.round(secs / 60), km: Math.round(Number(a.distance ?? 0) / 100) / 10, kcal: typeof a.calories === 'number' ? Math.round(a.calories) : null });
  }
  return { days, acts, sample, raw: { summaries: sum, activities: al } };
}

/* Put one person's Garmin numbers into the shared data. Returns true if anything changed. */
function apply(d: Obj, who: number, days: Day[], acts: Act[]) {
  const before = JSON.stringify(d);
  const h = (isObj(d.health) ? d.health : (d.health = {})) as Obj;
  const burn = (isObj(h.burn) ? h.burn : (h.burn = {})) as Obj;
  const wb = (isObj(burn[who]) ? burn[who] : (burn[who] = {})) as Obj;
  const on = (isObj(h.garminOn) ? h.garminOn : (h.garminOn = {})) as Obj;
  on[who] = true;
  const goals = Array.isArray(d.goals) ? d.goals as Obj[] : [];
  const stepGoal = goals.find((g) => isObj(g.log) && /step|krok/i.test(`${g.unit} ${g.name}`) && (g.owner == 2 || g.owner == who));
  for (const x of days) {
    if (x.kcal) {
      const old = wb[x.day] as Obj | undefined;
      if (!old || old.kcal !== x.kcal || old.steps !== x.steps || old.src !== 'garmin')
        wb[x.day] = { kcal: x.kcal, active: x.active, steps: x.steps, src: 'garmin', at: Date.now() };
    }
    if (x.steps && stepGoal) { const L = ((stepGoal.log as Obj)[who] ??= {}) as Obj; L[x.day] = x.steps; }
  }
  // Workouts → Sports. Deleted ones are remembered in "garminSeen" so they don't come back.
  const sports = (Array.isArray(d.sports) ? d.sports : (d.sports = [])) as Obj[];
  const seen = ((isObj(h.garminSeen) ? h.garminSeen : (h.garminSeen = {})) as Obj);
  const mySeen = (Array.isArray(seen[who]) ? seen[who] : (seen[who] = [])) as string[];
  for (const a of acts) {
    if (mySeen.includes(a.gid)) continue;
    mySeen.push(a.gid);
    // Already logged by hand (same day and activity, similar length)? Link it instead of adding a copy.
    const same = sports.find((s) => !s.garminId && s.date === a.date && (s.who == who || s.who == 2) && String(s.type).toLowerCase() === a.type.toLowerCase()
      && Math.abs(Number(s.mins || 0) - a.mins) <= 20);
    if (same) { same.garminId = a.gid; if (a.kcal) same.gk = { ...(isObj(same.gk) ? same.gk : {}), [who]: a.kcal }; continue; }
    sports.push({ id: uid(), type: a.type, date: a.date, mins: a.mins, km: a.km, who, exercises: '', note: a.name ? `⌚ ${a.name}` : '⌚ From Garmin', garminId: a.gid, ...(a.kcal ? { gk: { [who]: a.kcal } } : {}) });
  }
  if (mySeen.length > 300) mySeen.splice(0, mySeen.length - 300);
  return JSON.stringify(d) !== before;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // Allowed: the 30-minute schedule (secret header) or one of you, logged in to the app.
  const sent = req.headers.get('x-sync-secret');
  const secret = sent ? (await admin.rpc('garmin_sync_secret')).data : null;
  let only: number | null = null, debug = false;
  if (secret && sent === secret) debug = !!(await req.clone().json().catch(() => ({})))?.debug;
  if (!(secret && sent === secret)) {
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data } = await asUser.auth.getUser();
    if (!data?.user) return json({ error: 'not logged in' }, 401);
    const body = await req.json().catch(() => ({}));
    if (body?.who === 0 || body?.who === 1) only = body.who;
  }

  const fetched: Record<number, Awaited<ReturnType<typeof fetchPerson>>> = {}, out: Obj = {};
  for (const who of [0, 1]) {
    if (only !== null && who !== only) continue;
    const key = Deno.env.get(`GARMIN_KEY_${who}`);
    if (!key) { out[who] = 'no key'; continue; }
    try {
      fetched[who] = await fetchPerson(key);
      const f = fetched[who];
      out[who] = { days: f.days, activities: f.acts.length, ...(f.days.some((x) => x.kcal) ? {} : { fieldsSeen: f.sample }),
        // debug (schedule password only): a cut-down copy of what Garmin sent, to adjust field names
        ...(debug ? { raw: JSON.stringify(f.raw).slice(0, 6000) } : {}) };
    } catch (e) { out[who] = { error: String((e as Error).message ?? e) }; }
  }

  // Save with the same "only if nobody saved in between" rule the app uses, so nothing is overwritten.
  let updated = false;
  if (Object.keys(fetched).length) {
    for (let tries = 0; tries < 4; tries++) {
      const { data: row, error } = await admin.from('shared_data').select('data,updated_at').eq('id', 1).single();
      if (error || !row) return json({ error: 'could not read app data', result: out }, 500);
      const d = row.data as Obj;
      let changed = false;
      for (const [who, f] of Object.entries(fetched)) changed = apply(d, +who, f.days, f.acts) || changed;
      if (!changed) break;
      const { data: saved, error: e2 } = await admin.from('shared_data').update({ data: d, updated_at: new Date().toISOString() })
        .eq('id', 1).eq('updated_at', row.updated_at).select('updated_at');
      if (e2) return json({ error: e2.message, result: out }, 500);
      if (saved?.length) { updated = true; break; }
    }
  }
  const errs = Object.values(out).filter((v) => isObj(v) && v.error) as { error: string }[];
  return json({ updated, result: out, ...(only !== null && errs.length ? { error: errs[0].error } : {}) });
});
