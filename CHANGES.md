# Changes

Current version is shown at the bottom of **Settings**.

## 1.6 – 12 Nov 2026
- **Notifications only when it concerns the other person:** something you add just for yourself (your to-do, note, event, sport, list or goal) no longer notifies the other phone. Things for them or for "Both" still do.
- **New page: Weight.** Each of you sets up height, birthday, weight, activity and pace once; the app works out how much you burn and a daily calorie budget for steady weight loss (never below a safe minimum). Log food with a built-in list of common Czech foods (calories fill in from grams), online search of packaged products (Open Food Facts) or by typing kcal; foods you add are remembered and "Again?" re-adds recent ones in one tap. Weight log with a chart, goal line, kilos lost and roughly how many weeks to go; a 14-day calorie chart.
- **New page: Money.** Import your bank's CSV statement (Czech banks and Revolut formats, old Windows encoding too) or add payments by hand. Payments are sorted into categories automatically and learn from your corrections. Shows income, spending, what's left, a category ring, monthly budgets per category, a savings goal and the last 6 months. Only date, amount and description are stored; account numbers are left out. Duplicates are skipped and the last import can be undone.
- **Phone:** the bottom bar shows Home, Calendar, To-do, Weight and Money; everything else is under "•••".
- **Security:** the database now only lets your two accounts in (before, any account created in your Supabase project could have read it).
- Lighter syncing: the app checks whether anything changed before downloading everything.

## 1.5 – 10 Nov 2026
- **Tapping a notification opens the new item:** the app goes straight to the right page (the right day in the calendar, the right list, filters reset) and the new item glows for a few seconds. Works whether the app was closed or already open. If the item was deleted in the meantime, you get a short message instead.
- Several new things now show as separate notifications instead of replacing each other.
- Phones: the selected tab (e.g. a list) scrolls into view in the sideways tab row.

## 1.4 – 10 Nov 2026
- **Whole app checked and tidied on computer, laptop, tablet and phone.**
- Home: cleaner special dates (next one big, the following three as a list with dates), the "Today" card is gone (today's plans are in the weather panel), event and to-do rows show the title with time/place underneath instead of squashing, new **Goals today** card with both donuts, Lists cards are clickable. On laptops the page now scrolls normally instead of squeezing every card into one screen and cutting them off.
- **Our playlist** added to the music card and shown first; "⇄ Next" goes through your songs.
- Calendar: the calendar comes first; "Add an event" sits under the selected day (date filled in automatically).
- Special dates show the *next* date (e.g. 17 May 2027), not the original one.
- Sports: entries no longer get squeezed on phones; the totals sit in two columns on phones.
- Phone: short "Dates" label in the bottom bar, the active tab label no longer appears twice, Edit is a small ✎ in lists so rows stay on one line, filter buttons scroll sideways instead of wrapping.
- Goals: removed the "Add a goal" suggestions (walk, sleep, fruit & veg); your own goals can still be added.
- Fixed: the Phone calendar link was broken because the saved code contained the whole link.

## 1.3 – 10 Nov 2026
- **Home weather redone:** big current weather for Prague (feels-like, high/low, rain chance, wind), an hourly strip for the next 10 hours, and **weather for each of today's plans** at its place and time (events without a place use Prague). Also tips like "Take an umbrella", Hradec Králové and your next trip.
- **To-do grouped by person:** one coloured block each for you, Anna and Both, plus Everyone / Jirka / Anna filter buttons with open counts.
- **Goals rebuilt from scratch:** each goal now has an amount per day (water in litres, stretching in minutes, reading in pages…). Donut charts show today's progress for each of you, with +/− buttons, 🔥 streaks and a bar chart of the last 7, 14 or 30 days. A summary donut shows how much of your goals each of you has done today. Water, stretching and reading are added automatically, and more can be added with one tap (walk, sleep, fruit & veg) or made your own. **The old tick-box goals were removed** as asked.
- **Sports:** "Time by activity" is now one line per activity, split into colours for you, Anna and together. The three totals now sit side by side as intended.

## 1.2.1 – 10 Nov 2026
- Notifications: the app re-registers the phone with the server every time it opens, so a sign-up that failed to save fixes itself.

## 1.2 – 10 Nov 2026
- **Version number** at the bottom of Settings, so you can see if your phone has the latest version.
- **Notes can belong to someone** (you, your partner or both), like the other tabs, with a colour stripe, a name tag and an Everyone / per-person filter. Older notes count as "Both".
- **Phone notifications** when your partner adds something (event, to-do, note, list item, special date, sport, goal, song, photo). Needs a one-time setup in Supabase, see `NOTIFICATIONS-SETUP.md`.
- Added `manifest.json` (better "Add to Home Screen" app on phones) and `sw.js` (shows the notifications; it caches nothing, so updates still load straight away).

## 1.1 – 10 Nov 2026

Originals are kept untouched in `backup-original/` (on the Mac).

### Bugs fixed
- **Edits from both of you could be lost.** Each save used to overwrite the whole shared record, so if you both changed something within ~15 s, one person's change disappeared. Saving now checks whether the online copy changed in the meantime and merges both sets of changes item by item.
- **A failed save was never retried**, and it also stopped your partner's changes from loading on that device. Saves now retry automatically, also when the connection comes back.
- **Unsaved changes are no longer lost when you close or reload the tab.** They are remembered and uploaded on the next visit, and saved right away when you lock your phone or switch apps.
- **Default data was being changed by accident** (the app reused the same starting lists in memory), which could make deleted items come back after a sync or an import.
- **Past special dates showed as negative numbers** on Home (e.g. "-10 days until…"). Home now only shows upcoming dates; the Special dates page shows "10 days ago".
- **29 February dates** jumped to 1 March in non-leap years; they now land on 28 February.
- **Sports showed "NaN"** for activities with no minutes or km.
- **Switching pages kept the old scroll position**, so a new page could open halfway down.
- **Logging out left all your data in the browser.** It's now cleared on logout (you're warned if something isn't saved online yet). If your login runs out, the app shows the login screen instead of failing quietly.
- **The photo viewer** kept listening for the Esc key after closing, and deleting a photo ignored errors.
- **Importing a backup** accepted any JSON file and replaced everything without asking.
- **Calendar link** in Settings wasn't URL-encoded.
- **Clicking an item your partner just deleted** could crash the page.

### Improvements
- Asks before deleting a whole list, a note, a goal (streak history) or clearing finished to-dos.
- Overdue to-dos get an "overdue" tag (on Home and on To-do).
- Special dates show on the calendar (♥) and on the selected day; repeating dates show how many years it's been.
- Spotify `spotify:track:…` links work too.
- Photo viewer: arrow keys to move between photos.
- Browser tab title follows the page you're on.
- "Sync now" says whether everything is up to date.
- Removed unused CSS; cache version bumped to `v=7` so phones load the new files.

### Not changed
- `apple-icon-v2.png`, `apple-icon-v3.png` and `icon.png` are not used anywhere (only `apple-icon-v4.png` is). They can be deleted.
- When your partner's change arrives while you're on Home, the Spotify player reloads (and stops playing).
