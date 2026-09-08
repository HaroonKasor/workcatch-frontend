import type { Page } from '@playwright/test'

/**
 * Screens are compared against Figma exports, so the page must be visually
 * settled first. The font wait matters most: Thai text reflows noticeably
 * between the fallback and Anuphan/Kanit, and a screenshot taken during that
 * window produces a false mismatch on every line of text.
 */
export async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
  // One frame for layout to commit after the font swap.
  await page.evaluate(() => new Promise(requestAnimationFrame))
}

export async function capture(page: Page, name: string) {
  await settle(page)
  await page.screenshot({
    path: `tests/visual/__actual__/${name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
}
