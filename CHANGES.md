# Changes – 10 Nov 2026

Originals are kept untouched in `backup-original/`.

## Bugs fixed
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

## Improvements
- Asks before deleting a whole list, a note, a goal (streak history) or clearing finished to-dos.
- Overdue to-dos get an "overdue" tag (on Home and on To-do).
- Special dates show on the calendar (♥) and on the selected day; repeating dates show how many years it's been.
- Spotify `spotify:track:…` links work too.
- Photo viewer: arrow keys to move between photos.
- Browser tab title follows the page you're on.
- "Sync now" says whether everything is up to date.
- Removed unused CSS; cache version bumped to `v=7` so phones load the new files.

## Not changed
- `apple-icon-v2.png`, `apple-icon-v3.png` and `icon.png` are not used anywhere (only `apple-icon-v4.png` is). They can be deleted.
- When your partner's change arrives while you're on Home, the Spotify player reloads (and stops playing).
