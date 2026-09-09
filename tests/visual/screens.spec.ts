import { test } from '@playwright/test'
import { capture } from './helpers'

const screens = [
  { name: 'inbox', path: '/app/inbox' },
  { name: 'tasks', path: '/app/tasks' },
  { name: 'task-detail', path: '/app/tasks/t6' },
  { name: 'board', path: '/app/board' },
  { name: 'calendar', path: '/app/calendar' },
  { name: 'projects', path: '/app/projects' },
  { name: 'notifications', path: '/app/notifications' },
  { name: 'settings', path: '/app/settings' },
  { name: 'upgrade', path: '/app/upgrade' },
  { name: 'admin-overview', path: '/admin' },
  { name: 'admin-users', path: '/admin/users' },
  { name: 'admin-notifications', path: '/admin/notifications' },
  { name: 'admin-settings', path: '/admin/settings' },
  { name: 'admin-audit', path: '/admin/audit-logs' },
]

for (const s of screens) {
  test(`${s.name} renders`, async ({ page }, testInfo) => {
    await page.goto(s.path)
    await capture(page, `${s.name}-${testInfo.project.name}`)
  })
}
