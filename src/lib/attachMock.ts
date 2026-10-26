import { store } from './store'
import { extensionOf, formatBytes, precheck } from './attachments'
import type { TaskAttachment } from './types'

/**
 * Upload, scan and refusal for the local development store (`VITE_API=0`),
 * in the shapes of backend/docs/attachments-api.md. Nothing is read from the
 * file but its name and size: no bytes are kept, and nothing is ever rendered
 * from them.
 *
 * `localStorage['wc.attach.mock']` picks the outcome, the same switch style as
 * the AI mock: ok (scans CLEAN) · infected · too_large (scan limit) ·
 * FILE_TOO_LARGE · UNSUPPORTED_TYPE · TOO_MANY_FILES · STORAGE_FULL · UPLOAD_RATE.
 */
export type AttachMockMode =
  | 'ok' | 'infected' | 'too_large'
  | 'FILE_TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'TOO_MANY_FILES' | 'STORAGE_FULL' | 'UPLOAD_RATE'

const REFUSALS: Record<string, number> = {
  FILE_TOO_LARGE: 413, UNSUPPORTED_TYPE: 415, TOO_MANY_FILES: 409, STORAGE_FULL: 409, UPLOAD_RATE: 429,
}

function mode(): AttachMockMode {
  try {
    return (localStorage.getItem('wc.attach.mock') as AttachMockMode | null) ?? 'ok'
  } catch {
    return 'ok'
  }
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export interface MockRefusal {
  status: number
  body: Record<string, unknown>
}

export function mockUpload(taskId: string, file: { name: string; size: number }, onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<TaskAttachment> {
  return new Promise((resolve, reject) => {
    const forced = mode()
    // The server's own checks, so a precheck bypass still meets them.
    const code = (forced in REFUSALS ? forced : null) ?? precheck(file)
    let sent = 0
    const id = setInterval(() => {
      sent = Math.min(1, sent + 0.2)
      onProgress(sent)
      if (sent < 1) return
      clearInterval(id)
      if (code) {
        reject({ status: REFUSALS[code], body: { code, detail: code } } satisfies MockRefusal)
        return
      }
      const attachment: TaskAttachment = {
        id: `att_${Date.now().toString(36)}`,
        name: file.name,
        size: formatBytes(file.size),
        kind: extensionOf(file.name).toUpperCase(),
        scan: 'SCANNING',
        at: new Date().toISOString(),
        contentType: CONTENT_TYPES[extensionOf(file.name)],
        downloadable: false,
      }
      const task = store.task(taskId)
      store.updateTask(taskId, { attachments: [...(task?.attachments ?? []), attachment] })
      // The scanner's verdict arrives later, as it does on the server.
      setTimeout(() => {
        const verdict = forced === 'infected' ? 'INFECTED' : forced === 'too_large' ? 'TOO_LARGE' : 'CLEAN'
        const now = store.task(taskId)
        store.updateTask(taskId, {
          attachments: (now?.attachments ?? []).map((a) => (a.id === attachment.id ? { ...a, scan: verdict, downloadable: verdict === 'CLEAN' } : a)),
        })
      }, 5000)
      resolve(attachment)
    }, 220)
    signal?.addEventListener('abort', () => {
      clearInterval(id)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })
}

export function mockDeleteAttachment(taskId: string, attachmentId: string) {
  const task = store.task(taskId)
  store.updateTask(taskId, { attachments: (task?.attachments ?? []).filter((a) => a.id !== attachmentId) })
}
