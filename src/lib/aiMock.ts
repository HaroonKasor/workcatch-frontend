import type { AiAction, AiChatResult, AiSuggestion } from './api'
import type { Project, Task } from './types'

/**
 * A stand-in for the Gemini endpoints (backend/docs/ai-api.md) on the local
 * development store, which has no server. It answers in the contract's exact
 * shapes, from the tasks already in the browser, so the panel and the overview
 * card can be built and checked before the backend exists.
 *
 * `localStorage['wc.ai.mock']` forces one of the contract's failure answers, so
 * every state the panel has to draw can be reached on purpose:
 * ok · unavailable · disabled · quota · busy · failed · slow · empty.
 * It is read only here, and only when the app runs on the local store.
 */

export type MockMode = 'ok' | 'unavailable' | 'disabled' | 'quota' | 'busy' | 'failed' | 'slow' | 'empty'

const MODES: MockMode[] = ['ok', 'unavailable', 'disabled', 'quota', 'busy', 'failed', 'slow', 'empty']
const DAILY_LIMIT = 50

export function mockMode(): MockMode {
  try {
    const raw = localStorage.getItem('wc.ai.mock')
    return MODES.includes(raw as MockMode) ? (raw as MockMode) : 'ok'
  } catch {
    return 'ok'
  }
}

/** What the server would have answered instead of a body: a status and a ProblemDetail. */
export interface MockFailure {
  status: number
  body: Record<string, unknown>
}

function fail(status: number, code: string, detail: string, extra: Record<string, unknown> = {}): MockFailure {
  return { status, body: { code, detail, ...extra } }
}

export function resetsAt(now = new Date()): string {
  // Midnight in Bangkok, which is UTC+7 with no daylight saving.
  const bangkok = new Date(now.getTime() + 7 * 3_600_000)
  const next = Date.UTC(bangkok.getUTCFullYear(), bangkok.getUTCMonth(), bangkok.getUTCDate() + 1) - 7 * 3_600_000
  return new Date(next).toISOString()
}

function read<T>(key: string, fallback: T, storage: 'local' | 'session' = 'local'): T {
  try {
    const raw = (storage === 'local' ? localStorage : sessionStorage).getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown, storage: 'local' | 'session' = 'local') {
  try {
    (storage === 'local' ? localStorage : sessionStorage).setItem(key, JSON.stringify(value))
  } catch {
    // A mock that cannot remember still answers.
  }
}

export function mockPreferences(): { enabled: boolean; useHabits: boolean } {
  return read('wc.ai.prefs', { enabled: true, useHabits: true })
}

export function saveMockPreferences(prefs: { enabled: boolean; useHabits: boolean }) {
  write('wc.ai.prefs', prefs)
  return prefs
}

function used(): number {
  return read('wc.ai.used', 0, 'session')
}

export function mockStatus() {
  const mode = mockMode()
  return {
    available: mode !== 'unavailable',
    enabled: mode !== 'disabled' && mockPreferences().enabled,
    usedToday: mode === 'quota' ? DAILY_LIMIT : used(),
    dailyLimit: DAILY_LIMIT,
    resetsAt: resetsAt(),
  }
}

/** The contract's refusals, in the contract's order. Null means "go ahead". */
function refusal(): MockFailure | null {
  const mode = mockMode()
  if (mode === 'unavailable') return fail(503, 'AI_UNAVAILABLE', 'ยังไม่ได้ตั้งค่า AI')
  if (mode === 'disabled' || !mockPreferences().enabled) return fail(403, 'AI_DISABLED', 'ผู้ใช้ปิด AI ไว้')
  if (mode === 'quota') return fail(429, 'AI_QUOTA', 'ใช้ครบโควตาวันนี้แล้ว', { resetsAt: resetsAt() })
  if (mode === 'busy') return fail(503, 'AI_BUSY', 'AI ไม่ว่างชั่วคราว', { retryAfterSeconds: 178 })
  if (mode === 'failed') return fail(502, 'AI_FAILED', 'AI ตอบไม่สำเร็จ')
  return null
}

let actionSeq = 0
const nextActionId = () => `act_mock_${Date.now().toString(36)}_${actionSeq++}`

function bangkokAt(daysAhead: number, hour: number): string {
  const now = new Date()
  const bangkok = new Date(now.getTime() + 7 * 3_600_000)
  const at = Date.UTC(bangkok.getUTCFullYear(), bangkok.getUTCMonth(), bangkok.getUTCDate() + daysAhead, hour) - 7 * 3_600_000
  return new Date(at).toISOString()
}

const isOpen = (t: Task) => t.status !== 'DONE' && t.status !== 'CANCELLED'
const isLate = (t: Task, now: number) => isOpen(t) && !!t.dueAt && Date.parse(t.dueAt) < now

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(id)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })
}

export async function mockChat(
  messages: { role: 'user' | 'model'; content: string }[],
  context: { route: string; taskId: string | null; projectId: string | null },
  tasks: Task[],
  projects: Project[],
  signal?: AbortSignal,
): Promise<AiChatResult> {
  await wait(mockMode() === 'slow' ? 60_000 : 900, signal)
  const refused = refusal()
  if (refused) throw refused

  const question = messages[messages.length - 1]?.content ?? ''
  const now = Date.now()
  const late = tasks.filter((t) => isLate(t, now))
  const focus = context.taskId ? tasks.find((t) => t.id === context.taskId) : undefined
  const actions: AiAction[] = []
  let reply: string

  if (focus) {
    const left = (focus.subtasks ?? []).filter((s) => !s.done).length
    reply = left > 0
      ? `งาน "${focus.title}" ยังเหลือรายการย่อย ${left} ข้อ ถ้าเริ่มตอนนี้ยังทันกำหนดครับ`
      : `งาน "${focus.title}" ไม่มีรายการย่อยค้าง ถ้าพร้อมแล้วปิดงานได้เลยครับ`
    if (isOpen(focus)) {
      actions.push({ id: nextActionId(), type: 'SET_DUE', taskId: focus.id, dueAt: bangkokAt(1, 10), label: 'เลื่อนไปพรุ่งนี้ 10:00', reason: 'ยังเหลือรายการย่อย เลื่อนไปเช้าพรุ่งนี้จะทำได้ครบ' })
      actions.push({ id: nextActionId(), type: 'SET_STATUS', taskId: focus.id, status: 'DONE', label: 'ปิดงานนี้', reason: null })
    }
  } else if (/เพิ่ม|สร้าง/.test(question)) {
    const title = question.replace(/^(ช่วย)?(เพิ่ม|สร้าง)(งาน)?/, '').trim() || 'งานใหม่จาก AI'
    reply = `ร่างงานไว้ให้แล้วครับ กดเพิ่มงานเพื่อบันทึก`
    actions.push({ id: nextActionId(), type: 'CREATE_TASK', title, dueAt: bangkokAt(1, 9), projectId: projects[0]?.id ?? null, label: 'เพิ่มงาน', reason: 'ตั้งไว้พรุ่งนี้ 09:00 เวลาที่คุณมักตั้งเตือน' })
  } else if (late.length > 0) {
    reply = `เกินกำหนด ${late.length} งาน เริ่มจาก "${late[0].title}" ก่อนครับ ถ้ายังทำไม่ได้วันนี้ เลื่อนไปพรุ่งนี้เช้าจะได้ไม่ค้างต่อ`
    for (const t of late.slice(0, 3)) {
      actions.push({ id: nextActionId(), type: 'SET_DUE', taskId: t.id, dueAt: bangkokAt(1, 9), label: `เลื่อน "${t.title.slice(0, 18)}" ไปพรุ่งนี้ 09:00`, reason: 'เลยกำหนดแล้ว เลื่อนให้มีเวลาจริงดีกว่าค้างเป็นสีแดง' })
    }
  } else {
    const next = tasks.filter((t) => isOpen(t) && t.dueAt).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!))[0]
    reply = next
      ? `ไม่มีงานเกินกำหนดครับ งานถัดไปคือ "${next.title}"`
      : 'ตอนนี้ไม่มีงานที่มีกำหนดส่งค้างอยู่ครับ'
  }

  write('wc.ai.used', used() + 1, 'session')
  return { reply, actions: actions.slice(0, 5), usedToday: used(), dailyLimit: DAILY_LIMIT }
}

const SUGGESTION_KEY = 'wc.ai.suggestion'

/**
 * `cached` is the card's load (cachedOnly=true): today's stored answer or null,
 * never "generating". `generate` is the button press that would call Gemini.
 */
export async function mockSuggestion(tasks: Task[], mode: 'cached' | 'generate'): Promise<AiSuggestion | null> {
  const today = resetsAt()
  if (mode === 'cached') {
    const refused = refusal()
    if (refused && refused.status !== 429) throw refused
    const stored = read<{ day: string; suggestion: AiSuggestion | null } | null>(SUGGESTION_KEY, null, 'session')
    return stored && stored.day === today ? stored.suggestion : null
  }
  await wait(mockMode() === 'slow' ? 60_000 : 400)
  const refused = refusal()
  if (refused) throw refused
  const suggestion = generate(tasks)
  write(SUGGESTION_KEY, { day: today, suggestion }, 'session')
  write('wc.ai.used', used() + 1, 'session')
  return suggestion
}

function generate(tasks: Task[]): AiSuggestion | null {
  const open = tasks.filter(isOpen)
  if (mockMode() === 'empty' || open.length === 0) return null
  const now = Date.now()
  const ranked = [
    ...open.filter((t) => isLate(t, now)),
    ...open.filter((t) => !isLate(t, now) && t.dueAt).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!)),
    ...open.filter((t) => t.status === 'WAITING'),
  ].filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i).slice(0, 3)

  const late = open.filter((t) => isLate(t, now)).length
  return {
    text: late > 0
      ? `เกินกำหนด ${late} งาน เคลียร์งานที่เลยเวลาก่อน แล้วค่อยไล่งานที่ครบกำหนดวันนี้`
      : 'ไม่มีงานเกินกำหนด เริ่มจากงานที่ครบกำหนดใกล้ที่สุดก่อน',
    actions: ranked.map((t): AiAction => isLate(t, now)
      ? { id: nextActionId(), type: 'SET_DUE', taskId: t.id, dueAt: bangkokAt(1, 9), label: 'เลื่อนกำหนด', reason: 'เกินกำหนดแล้ว และยังไม่มีเวลาใหม่' }
      : { id: nextActionId(), type: 'SET_STATUS', taskId: t.id, status: 'IN_PROGRESS', label: 'เริ่มทำ', reason: t.dueAt ? 'ครบกำหนดใกล้ที่สุดในตอนนี้' : 'รอคนอื่นอยู่ ทักตามก่อนบ่าย' }),
    generatedAt: new Date().toISOString(),
  }
}
