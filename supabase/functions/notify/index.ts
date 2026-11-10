// Supabase Edge Function "notify": sends a phone notification to your partner's devices
// when the app reports that something was added. Called by the app after each save.
// Needs two secrets: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (see NOTIFICATIONS-SETUP.md).
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Only logged-in users of your app may trigger notifications.
  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = req.headers.get('Authorization') ?? '';
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: who } = await asUser.auth.getUser();
  if (!who?.user) return json({ error: 'not logged in' }, 401);

  const { by, items = [], test = false, endpoint } = await req.json().catch(() => ({}));
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Names come from the shared data, so the notification says "Anna added…"
  const { data: row } = await admin.from('shared_data').select('data').eq('id', 1).single();
  const names: string[] = row?.data?.names ?? ['Me', 'Her'];

  let subs;
  if (test) {
    ({ data: subs } = await admin.from('push_subs').select('endpoint, sub').eq('endpoint', endpoint ?? ''));
  } else {
    if (!Array.isArray(items) || !items.length) return json({ sent: 0 });
    let q = admin.from('push_subs').select('endpoint, sub');
    if (by === 0 || by === 1) q = q.neq('who', by); // don't notify the person who added it
    if (endpoint) q = q.neq('endpoint', endpoint); // nor the device it was added on
    ({ data: subs } = await q);
  }
  if (!subs?.length) return json({ sent: 0 });

  const author = by === 0 || by === 1 ? names[by] : 'Something new';
  const first = items[0] ?? {};
  const payload = test
    ? { title: 'Us', body: 'Test notification: it works! 🎉', tag: 'us-test' }
    : {
        title: by === 0 || by === 1 ? `${author} added to ${first.where}` : `New in ${first.where}`,
        body: items.length === 1 ? String(first.what ?? '') : `${first.what} and ${items.length - 1} more`,
        tag: 'us-update',
      };

  const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) return json({ error: 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY secrets are missing' }, 500);
  // The "subject" must identify the sender; the site's own address is accepted by Apple and Google.
  const origin = req.headers.get('Origin');
  webpush.setVapidDetails(origin && origin.startsWith('https://') ? origin : 'mailto:admin@us-helper.app', pub, priv);

  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try { await webpush.sendNotification(s.sub, JSON.stringify(payload)); sent++; }
    catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from('push_subs').delete().eq('endpoint', s.endpoint); // phone unsubscribed
      else console.error('push failed', code, e);
    }
  }));
  return json({ sent });
});
