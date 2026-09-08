import { test } from '@playwright/test'
import { capture } from './helpers'

test.describe('login', () => {
  test('renders', async ({ page }, testInfo) => {
    await page.goto('/login')
    await capture(page, `login-${testInfo.project.name}`)
  })
})
