# WorkCatch — Web

React client for WorkCatch, a Thai task tracker that reminds you through LINE
before work slips.

The API lives in a separate repository: **workcatch-api**.

## Stack

Vite · React · TypeScript · Tailwind v4 · React Router · TanStack Query ·
react-hook-form + zod

No component library. The design is a system of its own (10 component sets,
47 variants in Figma) and a prebuilt library would fight it the whole way.
No icon library either — the design uses type and rules, not icons.

## Running locally

    npm install
    npm run dev

`/api` proxies to `http://127.0.0.1:8081`, so run the API alongside. The proxy
keeps the browser on one origin locally, matching production, so cookie and
CSRF behaviour is the same in both.

## The AI panel on the local store

With `VITE_API=0` the AI endpoints (`backend/docs/ai-api.md`) are answered by
`src/lib/aiMock.ts` from the tasks in the browser. To see a state the panel must
handle, set `localStorage['wc.ai.mock']` to one of `ok`, `unavailable`,
`disabled`, `quota`, `busy`, `failed`, `slow` (a 60-second answer, for the หยุด
button) or `empty` (the overview card's 204), then reload.

## Attachments on the local store

With `VITE_API=0` uploads (`backend/docs/attachments-api.md`) are answered by
`src/lib/attachMock.ts`: progress ticks, the row is SCANNING for 5 s, then gets
its verdict. Set `localStorage['wc.attach.mock']` to `ok` (CLEAN, the default),
`infected`, `too_large`, or one of the refusals `FILE_TOO_LARGE`,
`UNSUPPORTED_TYPE`, `TOO_MANY_FILES`, `STORAGE_FULL`, `UPLOAD_RATE`, then reload.

## The design system

Tokens live in `src/index.css` and mirror the Figma variables exactly. The class
names there are the whole vocabulary; if you find yourself typing a hex value
into a component, stop and add a token instead.

**The rule that governs colour:** warm hues belong to time, cool hues belong to
projects, everything else is achromatic. Priority is expressed as font weight,
never as colour. Completed work fades rather than turning celebratory green.
Radius carries meaning too: 2px is paper you cannot touch, 8px is a control you
can.

`--wc-state-error` aliases `--wc-time-late` and is permitted only in form
validation and alert banners — never inside the task ledger, or the screen loses
the one property the design exists to provide.

## Checking a screen against Figma

Open the screen on the dev server at 1440px and 390px wide and put it next to
the Figma frame. Check it before merging: there are no automated tests for
screens in this repository (`npm test` covers only the pure `#project` tag
rules in `src/lib/projectTag.ts`, which must stay identical to the backend's
`ProjectTag`). Do not chase pixel equality — a browser and a design
tool never rasterise Thai text identically. Look for real differences: wrong
spacing, wrong weight, wrong colour, text that wraps differently.

A screenshot cannot prove keyboard order, focus visibility, or Thai line
wrapping, so check those by hand too: Tab through the screen, and make sure
nothing scrolls sideways at 390px.

Node ids for every screen: `docs/route-to-figma.md`.

## Deploying

    WORKCATCH_HOST=user@host ./ops/deploy.sh

Web and API deploy independently and can drift. If your change needs a new API
shape, deploy the API first.
