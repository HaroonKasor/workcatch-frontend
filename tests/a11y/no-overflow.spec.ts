import { expect, test } from '@playwright/test'

// AC-10: nothing may scroll sideways on a phone. Run it against every route
// rather than spot-checking, because a single wide table breaks the whole page
// and it is easy to miss on a desktop-sized window.
const ROUTES = [
  '/login', '/app/dashboard', '/app/inbox', '/app/tasks', '/app/tasks/t6',
  '/app/board', '/app/calendar', '/app/projects', '/app/notifications',
  '/app/settings', '/app/upgrade',
]

for (const path of ROUTES) {
  test(`${path} does not scroll horizontally at 390px`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(path)
    await page.evaluate(() => document.fonts.ready)
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }))
    expect(overflow.scroll, `${path} overflows by ${overflow.scroll - overflow.client}px`)
      .toBeLessThanOrEqual(overflow.client)
  })
}
