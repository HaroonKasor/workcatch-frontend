import { expect, test } from '@playwright/test'

/**
 * A screenshot cannot prove any of this. NFR-A11Y-01 requires the main flows to
 * be reachable by keyboard with visible focus, so it gets real assertions.
 */
test.describe('login keyboard access', () => {
  test('the sign-in action is reachable by keyboard and shows focus', async ({ page }) => {
    await page.goto('/login')

    const signIn = page.getByRole('link', { name: /เข้าสู่ระบบด้วย LINE/ })
    await expect(signIn).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(signIn).toBeFocused()

    // The focus ring is drawn with outline, not box-shadow, so assert on outline.
    const outlineWidth = await signIn.evaluate(
      (el) => getComputedStyle(el).outlineWidth,
    )
    expect(parseFloat(outlineWidth)).toBeGreaterThan(0)
  })

  test('does not scroll horizontally at 390px', async ({ page }) => {
    // AC-10: mobile must not scroll sideways.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)
  })
})
