import { test } from '@playwright/test'
import { capture } from './helpers'

const screens = [
  { name: 'inbox', path: '/app/inbox' },
  { name: 'tasks', path: '/app/tasks' },
  { name: 'task-detail', path: '/app/tasks/t6' },
]

for (const s of screens) {
  test(`${s.name} renders`, async ({ page }, testInfo) => {
    await page.goto(s.path)
    await capture(page, `${s.name}-${testInfo.project.name}`)
  })
}
