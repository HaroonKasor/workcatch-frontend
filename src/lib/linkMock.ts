import { store } from './store'
import { MAX_LINKS, hostOf, safeHttpUrl } from './links'
import type { TaskLink } from './types'

/**
 * Links for the local development store (`VITE_API=0`), in the shapes of
 * backend/docs/links-api.md. `localStorage['wc.links.mock']` forces an outcome:
 * ok (the default) · INVALID_URL · TOO_MANY_LINKS. Without it the mock applies
 * the server's own rules: http(s) only, at most 30 per task.
 */
export type LinkMockMode = 'ok' | 'INVALID_URL' | 'TOO_MANY_LINKS'

export interface LinkRefusal {
  status: number
  code: string
}

function mode(): LinkMockMode {
  try {
    return (localStorage.getItem('wc.links.mock') as LinkMockMode | null) ?? 'ok'
  } catch {
    return 'ok'
  }
}

export function mockAddLink(taskId: string, input: { url: string; title?: string }): TaskLink {
  const forced = mode()
  const existing = store.task(taskId)?.links ?? []
  const url = safeHttpUrl(input.url)
  if (forced === 'INVALID_URL' || !url) throw { status: 400, code: 'INVALID_URL' } satisfies LinkRefusal
  if (forced === 'TOO_MANY_LINKS' || existing.length >= MAX_LINKS) throw { status: 409, code: 'TOO_MANY_LINKS' } satisfies LinkRefusal
  const link: TaskLink = {
    id: `lnk_${Date.now().toString(36)}`,
    url,
    host: hostOf(url),
    title: input.title?.trim() ? input.title.trim().slice(0, 120) : null,
    createdAt: new Date().toISOString(),
  }
  store.updateTask(taskId, { links: [link, ...existing] })
  return link
}

export function mockDeleteLink(taskId: string, linkId: string) {
  const task = store.task(taskId)
  store.updateTask(taskId, { links: (task?.links ?? []).filter((l) => l.id !== linkId) })
}
