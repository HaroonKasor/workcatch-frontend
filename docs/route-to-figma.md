# Route to Figma mapping

File key `us7AYNBGNXKWFJdd8buLZJ`
Open a node: `https://figma.com/design/us7AYNBGNXKWFJdd8buLZJ/WorkCatch?node-id=<id>`

Keep this current. If a design changes, update the node id here in the same
commit as the code change, or the next person cannot tell which is authoritative.

## Screens

| Route | Desktop 1440 | Mobile 390 |
|---|---|---|
| `/login` | `32:3` | reuses desktop, narrowed |
| `/app/dashboard` | `9:3` | `56:1001` |
| `/app/inbox` | `34:2` | — |
| `/app/tasks` | `35:118` | `58:1001` |
| `/app/tasks/:id` | `37:389` | `63:1089` |
| `/app/board` | `44:567` | — |
| `/app/calendar` | `45:648` | — |
| `/app/projects` | `46:729` | — |
| `/app/notifications` | `47:810` | — |
| `/app/settings` | `42:486` | `58:1153` |
| `/app/upgrade` | `60:1001` | — |
| Quick Add overlay | inside `34:2` | `56:1151` |
| `/admin` | `49:891` | — |
| `/admin/users` | `51:913` | — |
| `/admin/notifications` | `52:935` | — |
| `/admin/settings` | `53:957` | — |
| `/admin/audit-logs` | `54:979` | — |

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
