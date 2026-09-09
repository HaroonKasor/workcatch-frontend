import { test } from '@playwright/test'
import { capture } from './helpers'

test('dashboard renders', async ({ page }, testInfo) => {
  await page.goto('/app/dashboard')
  await capture(page, `dashboard-${testInfo.project.name}`)
})
