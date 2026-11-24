# Changes

Current version is shown at the bottom of **Settings**.

## 1.13 – 24 Nov 2026
- Home is laid out in tidy rows of two cards with the same height (letters + photo, next 7 days + to-dos, activity + music), lists across the full width: no gaps.
- **Finances are private again:** each of you sees only your own payments, standing orders, budgets and savings goal. Imports and manual payments are always yours.

## 1.12 – 24 Nov 2026
- **New top of Home:** a weather card for where you are right now (asks for your location once; otherwise Prague) with colours that follow the weather, the next 12 hours with today's plans placed at their hour, a tip (umbrella, cold…), plus a countdown card for special dates and your days together.
- Home shows the **next 7 days**; cards are only as tall as their content (two columns on a computer, one on a phone); list chips fill each row.
- Love letters got their own card on Home.
- **Spotify:** Spotify's own playlists (Blend, Daily Mix) can't play inside other websites, so they show as a big "Open in Spotify" button.
- **iPhone:** dialogs (photos, cards, letters) fit the screen, with a close button that is always visible; swipe down to close, swipe left/right between photos. Taps react right away (no double-tap delay), the page scrolls normally, and the heavy blurred background and per-card blur are gone, which made everything slow.
- **Simpler:** Add food is one search box, grams/kcal and Add; the bank import is one line; standing orders, logging a sport and adding a goal are folded away until you need them.

## 1.11 – 24 Nov 2026
- **New Home:** the big card has two tabs: *Today* (days together, next special dates, weather) and *💌 Letters*. "Next 3 days" shows only events, special dates and to-dos due in the next 3 days. Memory photo and to-dos swapped; sports and goals became one compact "Today's activity" card; music has an "Open in Spotify" button; lists are small chips.
- **Love letters:** one letter a day for each other, typed or written by hand with a finger or pen. Your partner's letter arrives as a sealed envelope; they get a notification. Older letters stay under "Earlier".
- **Everything is visible to both of you.** Filters All / name / name / Both instead of "Only mine". Health has tabs for both of you.
- **Fewer menu entries:** *Plans* (To-do · Lists · Notes) and *Activity* (Goals · Sports). To split them again, remove `group` from MODS in app.js.
- **Nicer choices everywhere:** pill buttons instead of plain dropdowns for who / meal / type; the remaining dropdowns are styled.
- **Goals:** pick an icon from a set of emojis.
- **Health:** a tidy 2-column grid with equal card sizes; Garmin numbers as three tiles; typing by hand tucked away; food search now shows the built-in list (40 more Czech and everyday dishes) and packaged products online in the same list while you type.
- **Finances:** the monthly bank CSV import is on top; adding by hand is tucked away; "Delete all payments" button.
- **Cards (new):** a collectible card game from your photos. A daily pack, bonus packs for finishing all goals, logging a sport or writing a love letter, duplicates turn into sparkles. Photos from special dates are Legendary.
- Settings: "Together since" date for the day counter.

## 1.10 – 12 Nov 2026
- **Nutrients in Health:** every food can have protein, carbs and fat. They fill in by themselves from the built-in food list (all foods now have them), from online product search, and from foods you added before; or type them from the packaging. The day card shows three bars against your daily targets (protein 1.6 g per kg of goal weight, fat about 30 % of calories, carbs the rest), and each food shows its nutrients.
- **Calories burned now follow your real day:** Health has a new "🔥 Burned" card. Without Garmin it adds up resting burn × 1.2 (normal daily life), steps above 3,000 (from the **Steps** goal) and every sport logged on the Sports page that day (standard MET values × your weight × minutes; for cycling and running the speed counts). Walks aren't counted twice when steps are logged.
- **Garmin:** type the day's total calories from Garmin Connect ("Save Garmin kcal") and it replaces the estimate, because Garmin already includes steps and workouts. **Automatic Garmin sync every 30 minutes:** total calories, steps (into the Steps goal) and workouts (into Sports as your own, marked ⌚, with Garmin's calories; a workout you already logged by hand is linked, not doubled). Each of you only needs to add a personal Garmin key once; see `GARMIN-SETUP.md`. In Health, **↻ Sync Garmin** fetches right away.
- **Your eating budget changes every day:** budget = what you burned that day − your planned deficit (never below the safe minimum). The "How active are you?" setting is no longer needed. The 2-week chart shows each day's own budget.
- Steps can be typed straight in Health; they go into the Steps goal.
- Sports: each activity shows roughly how many kcal it burned for you.

## 1.9 – 12 Nov 2026
- **Money is now called Finances.**
- **Standing orders:** add payments that repeat every week, every 2 weeks, every month or every year (paying or receiving), with an optional end date. On each payment day the payment is added to your transactions automatically. When you import the bank statement, the real payment replaces the planned one (same amount within 4 days), so nothing is counted twice. The page shows the monthly total of standing orders and, for the current month, how much is still to go out. Mine or shared, like other finances.

## 1.8 – 12 Nov 2026
- **Personal things stay personal:** in To-do, Notes, Money and Health you see only your own items and the shared ("Both") ones; your partner's personal items are hidden from you, and yours from them. The app knows who you are from your login. Filters: All / Only mine / Shared. You can still add a to-do or note for your partner: it goes to their list (you get a short message), and they're notified.
- Home shows only your own and shared to-dos.
- **Weight is now called Health**, with a new icon. It always shows your own food and weight.
- New to-dos and notes are "mine" by default.

## 1.7 – 12 Nov 2026
- **Forgot password?** on the login screen: type your email, open the link from the email, choose a new password, and you're logged in. Expired or already-used links show a clear message.
- **Settings → Account → Change password** while logged in.

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
