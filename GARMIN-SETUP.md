# Garmin: automatic calories and steps

Once this is set up, the app fetches your **total calories burned** and **steps** from Garmin Connect
every 30 minutes. They appear in Health ("🔥 Burned", marked ⌚) and the steps fill your Steps goal.
Each of you who has a Garmin does steps 1 and 2 once; everything else is already set up.

## 1. Create your personal Garmin key (each person, 2 minutes)
1. On a computer, log in to **Garmin Connect** in the browser (connect.garmin.com).
2. Open the **Personal API Key** page (in Garmin's developer site: developer.garmin.com → Connect Developer Program → Personal → *Set up now*).
3. **Create Key** → accept the terms → choose the **longest expiry** → **Create**.
4. Copy the key straight away. Garmin shows it only once. Treat it like a password.

## 2. Put the key into Supabase (each person)
Supabase dashboard → your project → **Edge Functions → Secrets** → **Add new secret**:

| Name | Value |
|---|---|
| `GARMIN_KEY_0` | Jířa's key (first name in the app) |
| `GARMIN_KEY_1` | Anetka's key (second name in the app) |

⚠️ Never paste the key into the app, into GitHub, or into a chat.

## 3. Server side (already done)
- Function `garmin-sync` (code in `supabase/functions/garmin-sync/index.ts`) is deployed with "Verify JWT" off; it checks the login or the schedule password itself.
- `supabase/garmin.sql` was run: it turns on `pg_cron` and `pg_net`, keeps a random schedule password in the vault, and runs the sync every 30 minutes.
- To redeploy after changing the code: `supabase functions deploy garmin-sync --no-verify-jwt`.

## What comes in
- **Calories:** total burned per day (resting + active) for today and the 2 days before.
- **Steps:** into the Steps goal (and shown in Health).
- **Workouts:** from the last 3 days, into Sports as that person's own activity (marked ⌚, with Garmin's calories). If you already logged the same workout by hand (same day, same sport, similar length), it is linked instead of added twice. A workout you delete in the app does not come back.

## How the numbers are used
- A Garmin number for a day **replaces** the app's estimate. Garmin already counts resting burn, steps and
  workouts, so the app adds nothing on top.
- Without Garmin, the app estimates: resting burn × 1.2 + steps above 3,000 + sports from the Sports page.
- You can always type the Garmin total yourself in Health ("Save Garmin kcal"). The next sync overwrites it with the synced value.
- Your eating budget for the day = calories burned − your planned deficit (never below the safe minimum).

## If something doesn't work
- In Health, tap **↻ Sync Garmin**: the message says what went wrong.
- "Garmin login failed": the key is wrong, has spaces, or has expired. Create a new one (step 1) and replace the secret.
- Logs: Supabase → Edge Functions → garmin-sync → **Logs**.
