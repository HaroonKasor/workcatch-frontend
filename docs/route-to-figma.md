# Route to Figma mapping

File key `us7AYNBGNXKWFJdd8buLZJ`
Open a node: `https://figma.com/design/us7AYNBGNXKWFJdd8buLZJ/WorkCatch?node-id=<id>`

Keep this current. If a design changes, update the node id here in the same
commit as the code change, or the next person cannot tell which is authoritative.

## Screens

The authoritative design is the page **"v2 — Flow"** (`423:2`). The v1 node is
kept in the last column for history; where v2 has no frame for a state, the code
follows the nearest v2 frame and says so below.

| Route | v2 desktop 1440 | v2 mobile 390 | v1 |
|---|---|---|---|
| `/login` | `423:214` | `423:2969` | `32:3` |
| `/app/dashboard` | `423:334` · AI card `440:2244` (collapsed `440:2398`) · postpone `433:1329` · first visit `433:2302` | `423:3003` · ask-AI button `447:2484` | `9:3` |
| `/app/inbox` | `423:587` · empty `433:1659` | — (follows desktop, one column) | `34:2` |
| `/app/tasks` | `423:747` · loading `433:1838` · failed `433:2207` · postponed `433:1480` | `423:3188` | `35:118` |
| `/app/tasks/:id` | `423:796` | `423:3344` | `37:389` |
| `/app/board` | `423:941` | — | `44:567` |
| `/app/calendar` | `423:1115` (month; week view follows it) | — | `45:648` |
| `/app/projects` | `423:1320` | — | `46:729` |
| `/app/projects/:id` | `423:1418` | — (stacks) | — |
| `/app/notes` | `423:1468` | `423:3436` | `127:1082` |
| `/app/notes/:id` | `423:1625` | — | — |
| `/app/notes/new`, `:id/edit` | `423:1737` | — | — |
| `/app/notifications` | `423:2103` | — | `47:810` |
| `/app/settings` | `423:1939` · AI section `442:4263` · delete account `433:2638` | `423:3522` | `42:486` |
| `/app/upgrade` | `423:2189` | — (table scrolls inside its box) | `60:1001` |
| Quick Add | `433:1212` | `423:3157` | `56:1151` |
| Search (⌘K / Ctrl K, `/`) | `433:2513` | — (same dialog, full width) | — |
| AI panel (⌘J / Ctrl J) | open `445:2428` · on a task `446:2424` · answering `446:2731` · busy/quota `446:2767` · off `446:2803` · history `446:2827` | full-height sheet `447:2557` | — |
| `/admin` | `423:2308` | — | `49:891` |
| `/admin/users` | `423:2404` | — | `51:913` |
| `/admin/notifications` | `423:2537` | — | `52:935` |
| `/admin/line-events` | `423:2655` | — | — |
| `/admin/audit-logs` | `423:2732` | — | `54:979` |
| `/admin/settings` | `423:2823` | — | `53:957` |
| `/` (landing) | `423:3` | — | — |

Gaps the code fills consistently with the frames above (no new styles):
- AI panel states with no frame of their own — *not available*, *quota used*,
  *failed* — reuse the busy frame's `time/soon` box (quota) or the alert
  treatment (failed), and the *off* frame's layout (not available).
- The ⌘J button is drawn only in `445:2643`; every screen's rail carries it, and
  on phones it is the floating button of `447:2484`.
- Project cards keep the three number tiles of `423:1320` on every card,
  archived ones included (washed, counters at zero).
- Phone frames that do not exist follow the desktop frame stacked to one column.

## Shared references

| Topic | Node |
|---|---|
| Design tokens: colour, text styles, spacing, radius | `19:3` (page `02 — Foundations`) |
| Component library, 10 sets / 47 variants | page `03 — Components` (`22:2`) |
| LINE message bodies, all 7 | `76:3` |
| LINE connection states, all 5 | `78:2` |
| Empty states, all 6 | `79:2` |
| Dialogs, all 4 | `82:2` |
| Toasts, errors, loading, focus, shortcuts | `84:2` |

## How to build a screen so it actually matches

1. Pull real values with `get_design_context` / `get_variable_defs` on the node.
   Never estimate a colour or a spacing by looking at a screenshot.
2. Use the token classes in `frontend/src/index.css`. If you are typing a hex
   value into a component, something has gone wrong.
3. Compare under fixed conditions: viewport 1440x900 or 390x844, same browser,
   self-hosted fonts, same fixture data.
4. A screenshot cannot prove keyboard order, focus visibility, or Thai line
   wrapping. Test those by hand.

## The colour rule, restated because it is easy to break

Warm hues belong to time and nothing else. Cool hues belong to projects and
nothing else. Everything else is achromatic.

`--wc-state-error` is an alias of `--wc-time-late` and is permitted only in form
validation and alert banners. It must never appear inside the task ledger, or the
screen loses the one property the whole design exists to provide: your eye going
straight to what is about to be late.
