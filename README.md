# WorkCatch — Web

React client for WorkCatch, a Thai task tracker that reminds you through LINE
before work slips.

The API lives in a separate repository: **workcatch-api**.

## Stack

Vite · React · TypeScript · Tailwind v4 · React Router · TanStack Query ·
react-hook-form + zod · Playwright

No component library. The design is a system of its own (10 component sets,
47 variants in Figma) and a prebuilt library would fight it the whole way.
No icon library either — the design uses type and rules, not icons.

## Running locally

    npm install
    npm run dev

`/api` proxies to `http://127.0.0.1:8081`, so run the API alongside. The proxy
keeps the browser on one origin locally, matching production, so cookie and
CSRF behaviour is the same in both.

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

    npm run test:visual     # renders each screen at fixed viewports
    npm run test:a11y       # keyboard order, focus, no horizontal scroll

`tests/visual/__actual__/` holds what the browser rendered.
`tests/visual/__figma__/` holds the exported reference.
Compare them side by side. Do not chase pixel equality — a browser and a design
tool never rasterise Thai text identically. Look for real differences: wrong
spacing, wrong weight, wrong colour, text that wraps differently.

A screenshot cannot prove keyboard order, focus visibility, or Thai line
wrapping. That is what `tests/a11y` is for.

Node ids for every screen: `docs/route-to-figma.md`.

## Deploying

    WORKCATCH_HOST=user@host ./ops/deploy.sh

Web and API deploy independently and can drift. If your change needs a new API
shape, deploy the API first.
