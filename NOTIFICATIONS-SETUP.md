# Phone notifications: one-time setup (about 10 minutes)

The app code is ready. Supabase needs three things, all done in the Supabase dashboard
(https://supabase.com/dashboard → your project).

## 1. Create the table
**SQL Editor → New query**, paste everything from `supabase/notifications.sql`, click **Run**.

## 2. Add the two secret keys
**Edge Functions → Secrets** (sometimes under *Project Settings → Edge Functions*). Add:

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | the same long key that is in `config.js` |
| `VAPID_PRIVATE_KEY` | the private key from the file `SECRET-vapid-keys.txt` on your Mac |

⚠️ The private key must **never** go into GitHub or into `config.js`. Keep that file off GitHub.

## 3. Create the function
**Edge Functions → Deploy a new function → Via Editor**.
- Name it exactly: `notify`
- Delete the example code, paste everything from `supabase/functions/notify/index.ts`
- Click **Deploy**

(If you use the Supabase CLI instead: `supabase functions deploy notify`.)

## 4. Turn it on, on each phone
iPhone (iOS 16.4 or newer) only allows notifications for apps on the home screen:
1. Open the site in **Safari** → Share → **Add to Home Screen**.
2. Open **Us** from the home screen icon and log in.
3. **Settings → Notifications**: pick who the phone belongs to, tap **Turn on notifications**, allow.
4. Tap **Send a test**.

Do the same on the other phone. From then on, when one of you adds an event, to-do, note,
list item, special date, sport, goal, song or photo, the other one gets a notification.
Edits and deletions don't notify, only new things.

## If something doesn't work
- **"Test failed … is the notify function set up?"**: step 3 is missing or the name isn't `notify`.
- **"Could not turn on notifications: … push_subs …"**: step 1 is missing.
- **Test says sent, but nothing arrives**: check step 2 (both keys, no spaces), and that
  notifications for *Us* are allowed in iPhone Settings → Notifications.
- Logs: Supabase → Edge Functions → notify → **Logs**.
