import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { lineEvents as mockLineEvents, notifications as mockNotifications } from './fixtures'
import { store } from './store'
import {
  mockChat, mockPreferences, mockStatus, mockSuggestion, saveMockPreferences, type MockFailure,
} from './aiMock'
import { outcomeBody, type AiFinal, type AiStatusValue } from './aiRules'
import { mockDeleteAttachment, mockUpload, type MockRefusal } from './attachMock'
import { mockAddLink, mockDeleteLink, type LinkRefusal } from './linkMock'
import type {
  DeletedProject, LineEvent, NotificationRecord, Note, NoteBlock, Project, Task, TaskAttachment, TaskLink, TaskReminder, TaskStatus,
} from './types'

/**
 * Data layer. Screens must never call `fetch` directly, or swapping the source
 * becomes a hunt through the codebase.
 *
 * Two sources, one set of hooks. The Spring API is the default; only explicit
 * `VITE_API=0` runs the local development store, so
 * the UI stays demonstrable when the backend is not running. Everything above
 * the transport — cache keys, invalidation, optimistic updates, error shape — is
 * identical either way, which is the only reason the switch is a flag rather
 * than a rewrite of every screen.
 */
const USE_API = import.meta.env.VITE_API !== '0'
export const usingApi = USE_API

/** What a screen is allowed to know about a failure. */
export class ApiError extends Error {
  // Written out rather than declared as a parameter property: this project sets
  // erasableSyntaxOnly, so TypeScript-only syntax that emits code is rejected.
  readonly status: number
  readonly code?: string
  readonly body?: Record<string, unknown>

  constructor(status: number, message: string, body?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.code = typeof body?.code === 'string' ? body.code : undefined
    this.body = body
  }
}

/* ------------------------------------------------------------ who is here -- */

/** The signed-in account, as the shell is allowed to know it. */
export interface Me {
  displayName: string
  role: 'USER' | 'ADMIN'
  admin: boolean
  timezone: string
}

/**
 * One LINE account can hold both roles — the owner of a one-person product is
 * its operator too. So "admin" is a property of the account, not a second login,
 * and the only honest way to show the admin area is to show it to the accounts
 * that have it and hide it from the ones that do not.
 *
 * This is a hint for the shell, never a permission. The API enforces the role on
 * every /api/admin/** request; if this hook ever lied, the screens would be
 * empty rather than revealing anything.
 */
export function useMe() {
  return useQuery<Me>({
    queryKey: ['me'],
    queryFn: () =>
      USE_API
        ? http<Me>('GET', '/auth/me')
        : // On the development store there is no session to ask. Treat the local
          // operator as an admin so the admin screens stay reachable without a
          // backend; nothing here can grant access to real data.
          Promise.resolve({ displayName: 'ผู้ใช้ทดสอบ', role: 'ADMIN', admin: true, timezone: 'Asia/Bangkok' }),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/* ------------------------------------------------------------- wire shape -- */

/**
 * The server's task, which is NOT the screen's task. It carries `projectId`
 * rather than a nested project, and a `source` enum rather than a label. The
 * join and the wording happen here so that no screen has to know the difference,
 * and so a contract change lands in one file.
 */
interface ApiTask {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Task['priority']
  source: 'MANUAL' | 'LINE'
  parseConfidence: number | null
  needsReview: boolean
  dueAt: string | null
  projectId: string | null
  requester: string | null
  waitingFor: string | null
  followUpAt: string | null
  completedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  /** Ambiguous LINE drafts only: the times the message could have meant. */
  parseCandidates?: { label: string; dueAt: string }[]
  /** The LINE message a draft was made from, until it is erased at 30 days. */
  sourceMessage?: string | null
  sourceMessageExpiresAt?: string | null
}

interface ApiChecklistItem {
  id: string
  label: string
  done: boolean
}

interface ApiAttachment {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  scan: TaskAttachment['scan']
  downloadable?: boolean
  createdAt: string
}

interface ApiReminder {
  id: string
  fireAt: string
  channel: TaskReminder['channel'] | null
  status: TaskReminder['status']
  kind: string
}

interface ApiProject extends Omit<Project, 'archivedAt'> {
  archivedAt?: string | null
}

const SOURCE_LABEL: Record<ApiTask['source'], string> = {
  MANUAL: 'เพิ่มเอง',
  LINE: 'LINE',
}

function toTask(t: ApiTask, projects: Project[]): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? undefined,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt,
    project: projects.find((p) => p.id === t.projectId),
    requester: t.requester ?? undefined,
    source: SOURCE_LABEL[t.source] ?? t.source,
    // The message a LINE draft was read from, in its own read-only field and
    // only until it is erased; the description is the owner's own writing.
    sourceMessage: t.sourceMessage ?? undefined,
    sourceMessageExpiresAt: t.sourceMessageExpiresAt ?? undefined,
    parseCandidates: (t.parseCandidates ?? []).map((c, i) => ({ id: `${t.id}-c${i}`, label: c.label, dueAt: c.dueAt })),
    // The API stores the parser's score as a percentage; screens use a fraction.
    parseConfidence: t.parseConfidence == null ? undefined : t.parseConfidence / 100,
    waitingFor: t.waitingFor ?? undefined,
    followUpAt: t.followUpAt,
    createdAt: t.createdAt,
    completedAt: t.completedAt,
  }
}

function toProject(project: ApiProject): Project {
  return { ...project, archivedAt: project.archivedAt ?? null }
}

function toSubtask(item: ApiChecklistItem): NonNullable<Task['subtasks']>[number] {
  return { id: item.id, text: item.label, done: item.done }
}

function toAttachment(item: ApiAttachment): TaskAttachment {
  return {
    id: item.id,
    name: item.fileName,
    kind: item.contentType.split('/').at(-1)?.toUpperCase() ?? 'FILE',
    size: item.sizeBytes >= 1_048_576
      ? `${(item.sizeBytes / 1_048_576).toFixed(1)} MB`
      : `${Math.max(1, Math.round(item.sizeBytes / 1024))} KB`,
    scan: item.scan,
    at: item.createdAt,
    contentType: item.contentType,
    downloadable: item.downloadable ?? item.scan === 'CLEAN',
  }
}

function toReminder(item: ApiReminder): TaskReminder {
  return { id: item.id, at: item.fireAt, channel: item.channel ?? 'LINE', status: item.status, why: item.kind }
}

/* -------------------------------------------------------------- transport -- */

async function http<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const request = () => fetch(`/api${path}`, {
    method,
    signal,
    credentials: 'same-origin',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      // Spring Security 6 masks the CSRF token per request. The server sets a
      // readable XSRF-TOKEN cookie on the first GET and this echoes it back;
      // the contract is written down in the backend's docs/api-contract.md.
      ...(method === 'GET' ? {} : { 'X-XSRF-TOKEN': readCookie('XSRF-TOKEN') ?? '' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let res = await request()
  // A stale CSRF cookie is recoverable. Application 403s are JSON ProblemDetails
  // (including wrong unlock codes), so only a bare CSRF rejection is safe to replay.
  if (res.status === 403 && method !== 'GET' && !res.headers.get('Content-Type')?.toLowerCase().includes('json')) {
    await fetch('/api/auth/me', { credentials: 'same-origin' })
    res = await request()
  }
  if (!res.ok) {
    const problem = await readProblem(res)
    throw new ApiError(res.status, messageFor(res.status, problem), problem)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

function readCookie(name: string): string | null {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(name + '='))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null
}

async function readProblem(res: Response): Promise<Record<string, unknown> | undefined> {
  try {
    const parsed: unknown = await res.json()
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined
  } catch {
    return undefined
  }
}

function messageFor(status: number, body?: Record<string, unknown>): string {
  // A status code is not a message. These three are the ones a person can
  // actually act on, so they get said in words.
  if (status === 401) return 'เซสชันหมดอายุ ต้องเข้าระบบใหม่'
  if (status === 403) return 'คำขอถูกปฏิเสธ ลองรีเฟรชหน้าแล้วทำอีกครั้ง'
  if (status === 404) return 'ไม่พบรายการนี้'
  return typeof body?.detail === 'string'
    ? body.detail
    : typeof body?.title === 'string'
      ? body.title
      : String(status)
}

function localMutation<T>(operation: () => T): Promise<T> {
  try {
    return Promise.resolve(operation())
  } catch (error) {
    if (error instanceof ApiError) return Promise.reject(error)
    return Promise.reject(new ApiError(400, error instanceof Error ? error.message : 'คำขอไม่สำเร็จ'))
  }
}

interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

const PAGE_SIZE = 50

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const items: T[] = []
  for (let page = 0; ; page += 1) {
    const joiner = path.includes('?') ? '&' : '?'
    const response = await http<PageResponse<T>>('GET', `${path}${joiner}page=${page}&size=${PAGE_SIZE}`)
    items.push(...response.items)
    if (!response.hasNext) return items
  }
}

/** Tasks and projects together: a task without its project is half a row. */
async function fetchTasks(): Promise<Task[]> {
  const [tasks, projects] = await Promise.all([
    fetchAllPages<ApiTask>('/tasks'),
    http<ApiProject[]>('GET', '/projects').then((items) => items.map(toProject)),
  ])
  return tasks.map((t) => toTask(t, projects))
}

async function withProjects(task: Promise<ApiTask>): Promise<Task> {
  const [t, projects] = await Promise.all([task, http<ApiProject[]>('GET', '/projects').then((items) => items.map(toProject))])
  return toTask(t, projects)
}

async function fetchTaskDetail(id: string): Promise<Task> {
  const path = '/tasks/' + encodeURIComponent(id)
  const [task, projects, checklist, attachments, reminders] = await Promise.all([
    http<ApiTask>('GET', path),
    http<ApiProject[]>('GET', '/projects').then((items) => items.map(toProject)),
    http<ApiChecklistItem[]>('GET', path + '/checklist'),
    http<ApiAttachment[]>('GET', path + '/attachments'),
    http<ApiReminder[]>('GET', path + '/reminders'),
  ])
  return {
    ...toTask(task, projects),
    subtasks: checklist.map(toSubtask),
    attachments: attachments.map(toAttachment),
    // The contract embeds the list in the detail response.
    links: (task as ApiTask & { links?: TaskLink[] }).links ?? [],
    reminders: reminders.map(toReminder),
  }
}

/* ---------------------------------------------------------------- queries -- */

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => (USE_API ? fetchTasks() : Promise.resolve(store.tasks())),
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', id],
    enabled: !!id,
    queryFn: () =>
      USE_API
        ? fetchTaskDetail(id as string)
        : Promise.resolve(store.task(id as string) as Task),
  })
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () =>
      USE_API ? http<ApiProject[]>('GET', '/projects').then((items) => items.map(toProject)) : Promise.resolve(store.projects()),
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      USE_API
        ? fetchAllPages<ApiNotification>('/notifications').then((items) => items.map(toNotification))
        : Promise.resolve<NotificationRecord[]>(mockNotifications),
  })
}

/**
 * Inbound LINE events, for the admin screen only.
 *
 * The endpoint is ADMIN-scoped and returns no message content by design; this
 * hook does nothing to reassemble it, and nothing above it should try. See the
 * note on `LineEvent`.
 */
export function useLineEvents() {
  return useQuery({
    queryKey: ['admin', 'line-events'],
    queryFn: () =>
      USE_API
        ? http<ApiLineEvent[]>('GET', '/admin/line-events').then((items) => items.map(toLineEvent))
        : Promise.resolve<LineEvent[]>(mockLineEvents),
  })
}

export interface AdminUser {
  id: string
  displayName: string | null
  role: 'USER' | 'ADMIN'
  status: string
  suspended: boolean
  timezone: string
  createdAt: string
  updatedAt: string
}

export function useAdminUsers(status?: string) {
  return useQuery({
    queryKey: ['admin', 'users', status],
    queryFn: () => USE_API
      ? fetchAllPages<AdminUser>('/admin/users' + (status ? '?status=' + encodeURIComponent(status) : ''))
      : Promise.resolve<AdminUser[]>([]),
  })
}

function useAdminUserAction(action: 'suspend' | 'restore') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => USE_API
      ? http<AdminUser>('POST', '/admin/users/' + encodeURIComponent(id) + '/' + action)
      : Promise.resolve(undefined),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useSuspendAdminUser() { return useAdminUserAction('suspend') }
export function useRestoreAdminUser() { return useAdminUserAction('restore') }

/** Re-runs one failed event through the pipeline. */
export function useRetryLineEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      USE_API
        ? http<ApiLineEvent>('POST', '/admin/line-events/' + encodeURIComponent(id) + '/retry').then(() => undefined)
        : Promise.resolve(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'line-events'] })
    },
  })
}

/* --------------------------------------------------------- real settings -- */

export interface LinePreferences {
  lineNotify: boolean
  eachTask: boolean
  waitingFollowUp: boolean
  /** The 09:00 inbox digest. Its own switch; it still only goes over LINE. */
  digest: boolean
}

export interface LineStatus {
  linked: boolean
  linkedAt: string | null
  friendState: 'FRIEND' | 'BLOCKED' | 'UNKNOWN'
  lastEventAt: string | null
  preferences: LinePreferences
  testMessages: {
    limitPerDay: number
    leftToday: number
    lastSentAt: string | null
    lastStatus: 'SENT' | 'FAILED' | null
  }
  usage: { sentLast30Days: number; scheduledNext30Days: number }
}

const localLineStatus: LineStatus = {
  linked: true,
  linkedAt: null,
  friendState: 'FRIEND',
  lastEventAt: null,
  preferences: { lineNotify: true, eachTask: true, waitingFollowUp: true, digest: true },
  testMessages: { limitPerDay: 3, leftToday: 3, lastSentAt: null, lastStatus: null },
  usage: { sentLast30Days: 0, scheduledNext30Days: 0 },
}

export function useLineStatus() {
  return useQuery({
    queryKey: ['me', 'line'],
    queryFn: () => USE_API ? http<LineStatus>('GET', '/me/line') : Promise.resolve(localLineStatus),
  })
}

export function useNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (preferences: LinePreferences) => USE_API
      ? http<LinePreferences>('PUT', '/me/notification-preferences', preferences)
      : Promise.resolve(preferences),
    onMutate: async (preferences) => {
      await qc.cancelQueries({ queryKey: ['me', 'line'] })
      const previous = qc.getQueryData<LineStatus>(['me', 'line'])
      qc.setQueryData<LineStatus>(['me', 'line'], (current) => current
        ? { ...current, preferences }
        : current)
      return { previous }
    },
    onError: (_error, _preferences, context) => {
      if (context?.previous) qc.setQueryData(['me', 'line'], context.previous)
    },
    onSuccess: (preferences) => {
      qc.setQueryData<LineStatus>(['me', 'line'], (current) => current
        ? { ...current, preferences }
        : current)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['me', 'line'] }),
  })
}

export interface TestMessageResult {
  status: 'SENT' | 'FAILED'
  statusCode: number
  sentAt: string
  leftToday: number
}

export function useTestLineMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => USE_API
      ? http<TestMessageResult>('POST', '/me/line/test-message')
      : Promise.resolve({ status: 'SENT' as const, statusCode: 200, sentAt: new Date().toISOString(), leftToday: 2 }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me', 'line'] }),
  })
}

export interface AdminOverview {
  users: { total: number; active: number; suspended: number; deleted: number; lineLinked: number }
  tasks: { total: number; open: number }
  notifications7d: { sent: number; failed: number; pending: number }
  inbound24h: { received: number; failed: number }
  sendingPaused: boolean
  services: {
    reminderScheduler: { lastRunAt: string | null }
    inboundScheduler: { lastRunAt: string | null }
    lineMessaging: { configured: boolean }
    lineLogin: { configured: boolean }
    database: { ok: boolean }
  }
  quota: { limit: number; consumed: number } | null
  recentFailures: AdminRecentFailure[]
}

export interface AdminNotification {
  id: string
  taskId: string
  userId: string
  userDisplayName: string | null
  kind: string
  channel: string
  state: 'PENDING' | 'SENT' | 'CANCELLED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL'
  attempts: number
  maxAttempts: number
  lastStatusCode: number | null
  scheduledFor: string | null
  firstAttemptAt: string | null
  updatedAt: string
}

/** The overview is intentionally a smaller, failure-only projection of the ledger. */
export interface AdminRecentFailure {
  notificationId: string
  taskId: string
  userId: string
  userDisplayName: string | null
  at: string
  state: 'FAILED_RETRYABLE' | 'FAILED_FINAL'
  statusCode: number | null
  attempts: number
  maxAttempts: number
  retryable: boolean
}

const emptyOverview: AdminOverview = {
  users: { total: 0, active: 0, suspended: 0, deleted: 0, lineLinked: 0 },
  tasks: { total: 0, open: 0 }, notifications7d: { sent: 0, failed: 0, pending: 0 },
  inbound24h: { received: 0, failed: 0 }, sendingPaused: false,
  services: { reminderScheduler: { lastRunAt: null }, inboundScheduler: { lastRunAt: null }, lineMessaging: { configured: false }, lineLogin: { configured: false }, database: { ok: true } },
  quota: null, recentFailures: [],
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => USE_API ? http<AdminOverview>('GET', '/admin/overview') : Promise.resolve(emptyOverview),
  })
}

export function useAdminNotifications(state?: string) {
  return useQuery({
    queryKey: ['admin', 'notifications', state],
    queryFn: () => USE_API
      ? fetchAllPages<AdminNotification>('/admin/notifications' + (state ? '?state=' + encodeURIComponent(state) : ''))
      : Promise.resolve<AdminNotification[]>([]),
  })
}

export function useRetryAdminNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => USE_API
      ? http<AdminNotification>('POST', '/admin/notifications/' + encodeURIComponent(id) + '/retry')
      : Promise.resolve(undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'notifications'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'overview'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'audit'] })
    },
  })
}

export interface AdminSetting { key: string; value: string; editable: boolean; updatedAt: string }
export interface AdminConfig {
  defaultTimezone: string
  beforeDueMinutes: number[]
  delivery: { maxAttempts: number; retryDelaysSeconds: number[] }
  deletedItemRetentionDays: number
  inboundMessageRetentionDays: number
  unlockCode: { maxAttempts: number; lockMinutes: number }
  stepUpMinutes: number
}
export interface MessageTemplate { code: string; description: string; preview: string }

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => USE_API
      ? http<AdminSetting[]>('GET', '/admin/settings')
      : Promise.resolve<AdminSetting[]>([]),
  })
}
export function useAdminConfig() {
  return useQuery({
    queryKey: ['admin', 'config'],
    queryFn: () => USE_API
      ? http<AdminConfig>('GET', '/admin/config')
      : Promise.resolve<AdminConfig | null>(null),
  })
}
export function useAdminMessageTemplates() {
  return useQuery({
    queryKey: ['admin', 'message-templates'],
    queryFn: () => USE_API
      ? http<MessageTemplate[]>('GET', '/admin/message-templates')
      : Promise.resolve<MessageTemplate[]>([]),
  })
}
export function useUpdateAdminSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: boolean }) => USE_API
      ? http<AdminSetting>('PUT', '/admin/settings/' + encodeURIComponent(key), { value: String(value) })
      : Promise.resolve(undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
  })
}

export interface AdminAuditEntry {
  id: string
  action: string
  actorId: string
  actorName: string | null
  target: string
  detail: string | null
  at: string
}
export function useAdminAudit() {
  return useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => USE_API ? fetchAllPages<AdminAuditEntry>('/admin/audit') : Promise.resolve<AdminAuditEntry[]>([]),
  })
}

export interface UnlockCodeStatus {
  set: boolean
  attemptsLeft: number
  lockedUntil: string | null
}

export interface StepUpResult {
  expiresAt: string
}

export interface RevealedSecret {
  id: string
  label: string
  loginUrl: string | null
  username: string | null
  password: string | null
  notes: string | null
  revealedAt: string
}

// This deliberately holds only the code needed to make the offline demo behave
// like the server. It is module state, not browser storage: an unlock code must
// never survive in a client-side persistence layer.
let localUnlockCode: { code: string | null; failed: number; lockedUntil: number | null } = {
  code: null,
  failed: 0,
  lockedUntil: null,
}

function localUnlockCodeStatus(): UnlockCodeStatus {
  if (localUnlockCode.lockedUntil !== null && localUnlockCode.lockedUntil <= Date.now()) {
    localUnlockCode.lockedUntil = null
  }
  return {
    set: localUnlockCode.code !== null,
    attemptsLeft: localUnlockCode.code === null ? 5 : 5 - localUnlockCode.failed,
    lockedUntil: localUnlockCode.lockedUntil === null ? null : new Date(localUnlockCode.lockedUntil).toISOString(),
  }
}

function unacceptableLocalUnlockCode(code: string): boolean {
  if (!/^\d{6}$/.test(code)) return true
  if (new Set(code).size === 1) return true
  const step = code.charCodeAt(1) - code.charCodeAt(0)
  return (step === 1 || step === -1) && [...code].every((digit, i) =>
    i < 2 || digit.charCodeAt(0) - code.charCodeAt(i - 1) === step,
  )
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => USE_API ? http<void>('POST', '/auth/logout') : Promise.resolve(),
    onSuccess: () => qc.clear(),
  })
}

export function useUnlockCodeStatus() {
  return useQuery({
    queryKey: ['secrets', 'unlock-code'],
    queryFn: () =>
      USE_API
        ? http<UnlockCodeStatus>('GET', '/secrets/unlock-code')
        : Promise.resolve(localUnlockCodeStatus()),
  })
}

export function useSetUnlockCode() {
  const qc = useQueryClient()
  return useSensitiveAction((code: string) =>
      USE_API
        ? http<UnlockCodeStatus>('POST', '/secrets/unlock-code', { code })
        : localMutation(() => {
          if (localUnlockCode.code !== null) {
            throw new ApiError(409, 'ตั้งรหัสปลดล็อกไว้แล้ว ต้องตั้งใหม่ผ่านการรีเซ็ต', {
              code: 'UNLOCK_CODE_ALREADY_SET',
            })
          }
          if (unacceptableLocalUnlockCode(code)) {
            throw new ApiError(400, 'รหัสต้องเป็นตัวเลข 6 หลัก และห้ามเป็นเลขซ้ำหรือเลขเรียงกัน')
          }
          localUnlockCode = { code, failed: 0, lockedUntil: null }
          return localUnlockCodeStatus()
        }),
    () => void qc.invalidateQueries({ queryKey: ['secrets', 'unlock-code'] }),
  )
}

export function useResetUnlockCode() {
  const qc = useQueryClient()
  return useSensitiveAction(() =>
      USE_API
        ? http<{ destroyedEntries: number }>('POST', '/secrets/unlock-code/reset')
        : localMutation(() => {
          store.purgeAllSecrets()
          localUnlockCode = { code: null, failed: 0, lockedUntil: null }
          return { destroyedEntries: 0 }
        }),
    () => void qc.invalidateQueries({ queryKey: ['secrets', 'unlock-code'] }),
  )
}

export function useStepUp() {
  return useSensitiveAction((credential: string) => {
      if (USE_API) return http<StepUpResult>('POST', '/secrets/step-up', { credential })
      const status = localUnlockCodeStatus()
      if (!status.set) return Promise.reject(new ApiError(409, 'Set an unlock code first.', {
        code: 'UNLOCK_CODE_REQUIRED',
      }))
      if (status.lockedUntil !== null) return Promise.reject(new ApiError(429, 'Too many wrong codes. Try again after the lock ends.', {
        code: 'UNLOCK_CODE_LOCKED', lockedUntil: status.lockedUntil,
      }))
      if (credential !== localUnlockCode.code) {
        localUnlockCode.failed += 1
        if (localUnlockCode.failed >= 5) {
          localUnlockCode.failed = 0
          localUnlockCode.lockedUntil = Date.now() + 15 * 60_000
          return Promise.reject(new ApiError(429, 'Too many wrong codes. Try again after the lock ends.', {
            code: 'UNLOCK_CODE_LOCKED', lockedUntil: new Date(localUnlockCode.lockedUntil).toISOString(),
          }))
        }
        return Promise.reject(new ApiError(403, 'The unlock code is not right.', {
          code: 'UNLOCK_CODE_WRONG', attemptsLeft: 5 - localUnlockCode.failed,
        }))
      }
      localUnlockCode.failed = 0
      return Promise.resolve({ expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() })
    })
}

export function useRevealSecret() {
  return useSensitiveAction((id: string): Promise<RevealedSecret> => {
      if (USE_API) return http<RevealedSecret>('POST', '/secrets/' + encodeURIComponent(id) + '/reveal')
      const value = store.revealSecret(id)
      if (value === undefined) return Promise.reject(new ApiError(404, 'ไม่พบรายการนี้'))
      return Promise.resolve({
        id,
        label: '',
        loginUrl: null,
        username: value,
        password: null,
        notes: null,
        revealedAt: new Date().toISOString(),
      })
    })
}

/** Sensitive requests intentionally bypass MutationCache: it retains variables
 * and results after a component has hidden them. This hook retains only pending
 * state; the input and result live on the stack for the duration of the call. */
function useSensitiveAction<Input, Output>(
  action: (input: Input) => Promise<Output>,
  onSuccess?: () => void,
) {
  const [isPending, setPending] = useState(false)
  async function mutateAsync(input: Input): Promise<Output> {
    setPending(true)
    try {
      const result = await action(input)
      onSuccess?.()
      return result
    } finally {
      setPending(false)
    }
  }
  function mutate(input: Input, callbacks?: {
    onSuccess?: (result: Output) => void
    onError?: (error: unknown) => void
  }) {
    void mutateAsync(input).then(callbacks?.onSuccess).catch(callbacks?.onError)
  }
  return { mutate, mutateAsync, isPending }
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (confirmation: string) =>
      USE_API ? http<void>('POST', '/account/delete', { confirmation }) : Promise.resolve(),
    onSuccess: () => qc.clear(),
  })
}

interface ApiNotification {
  id: string
  taskTitle: string | null
  channel: NotificationRecord['channel']
  status: NotificationRecord['status']
  attempts: number
  maxAttempts: number
  state: string
  lastStatusCode: number | null
  scheduledFor: string
}

function toNotification(notification: ApiNotification): NotificationRecord {
  return {
    id: notification.id,
    at: notification.scheduledFor,
    taskTitle: notification.taskTitle ?? 'งานที่ลบแล้ว',
    channel: notification.channel,
    status: notification.status,
    attempt: notification.attempts,
    maxAttempts: notification.maxAttempts,
    reason: notification.state,
    errorCode: notification.lastStatusCode == null ? undefined : String(notification.lastStatusCode),
  }
}

interface ApiLineEvent {
  id: string
  receivedAt: string
  lineUserIdHash: string | null
  statusTrail: string[]
  parseConfidence: number | null
  needsReview: boolean
  errorCode: string | null
  retryable: boolean
}

function toLineEvent(event: ApiLineEvent): LineEvent {
  const trail = event.statusTrail.filter((stage): stage is LineEvent['trail'][number] =>
    stage === 'RECEIVED' || stage === 'PARSED' || stage === 'DRAFTED' || stage === 'REPLIED',
  )
  const message = event.errorCode == null ? undefined : lineEventMessage(event.errorCode)
  const informational = event.errorCode === 'FOLLOW_EVENT'
  return {
    id: event.id,
    at: event.receivedAt,
    userHash: event.lineUserIdHash,
    trail,
    error: message && !informational ? { code: event.errorCode ?? undefined, message } : undefined,
    info: message && informational ? message : undefined,
    parseConfidence: event.parseConfidence == null ? undefined : event.parseConfidence / 100,
    canRetry: event.retryable,
  }
}

function lineEventMessage(code: string): string {
  const messages: Record<string, string> = {
    UNLINKED_ACCOUNT: 'ยังไม่ได้เชื่อมบัญชี · ส่งลิงก์เชื่อมบัญชีแล้ว',
    NO_TEXT_CONTENT: 'ไม่ใช่ข้อความตัวอักษร',
    FOLLOW_EVENT: 'เพิ่มเพื่อน · ส่งข้อความต้อนรับแล้ว',
    ACCOUNT_INACTIVE: 'บัญชีถูกระงับหรือถูกลบ · ไม่สร้างงาน',
    CREDENTIAL_SUSPECTED: 'ดูเหมือนรหัสผ่าน · ไม่บันทึก',
    REPLY_FAILED: 'ส่งข้อความตอบกลับไม่สำเร็จ',
    RETRY_EXHAUSTED: 'ลองใหม่ครบแล้ว',
    MESSAGE_PURGED: 'ข้อความเกินระยะเก็บ 30 วัน',
  }
  return messages[code] ?? code
}

/* -------------------------------------------------------------- mutations -- */

export interface NewTask {
  title: string
  dueAt?: string | null
  projectId?: string
  priority?: Task['priority']
  status?: TaskStatus
  requester?: string
  description?: string
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewTask): Promise<Task> => {
      if (!USE_API) return localMutation(() => store.createTask(input))
      // `status` is deliberately absent from the server's create shape: the
      // server decides it — INBOX, or TODO when the task arrives with a deadline
      // or a project, which is the triage the inbox is waiting for.
      const { status: _status, ...body } = input
      return withProjects(http<ApiTask>('POST', '/tasks', body))
    },
    onSuccess: () => invalidateTasks(qc),
  })
}

/**
 * What the server's Thai parser — the one LINE messages go through — reads in
 * a Quick Add title. `reason === 'NONE'` is the only answer whose `dueAt` may be
 * applied as it stands; every other reason is something to show the person.
 */
export interface QuickParse {
  title: string
  dueAt: string | null
  reason: 'NONE' | 'AMBIGUOUS_TIME' | 'RESOLVED_TIME_IN_PAST' | 'DATE_WITHOUT_TIME' | 'MISSING_TITLE'
  candidates: string[]
}

/**
 * Null in the local development store, which has no parser: there the title is
 * saved exactly as typed and the date picker is the only way to set a deadline.
 * There is deliberately no second Thai parser in the browser to fall back on.
 */
export function quickParse(text: string): Promise<QuickParse | null> {
  if (!USE_API || !text.trim()) return Promise.resolve(null)
  return http<QuickParse>('POST', '/tasks/parse', { text: text.slice(0, 255) })
}

export function quickParseQuery(text: string) {
  return {
    queryKey: ['quick-parse', text] as const,
    queryFn: () => quickParse(text),
    staleTime: 30_000,
  }
}

export interface TaskPatch extends Partial<Omit<Task, 'project'>> {
  projectId?: string
}

async function updateApiTask(id: string, patch: TaskPatch): Promise<Task> {
  const path = '/tasks/' + encodeURIComponent(id)
  const body: Record<string, unknown> = {}
  for (const key of ['title', 'description', 'status', 'priority', 'requester', 'waitingFor'] as const) {
    if (patch[key] !== undefined) body[key] = patch[key]
  }
  // These three values can be cleared. PATCH deliberately treats null as
  // "leave alone", so their API contract is the dedicated PUT endpoints.
  if (Object.keys(body).length > 0) await http<ApiTask>('PATCH', path, body)
  if (patch.dueAt !== undefined) await http<ApiTask>('PUT', path + '/due', { dueAt: patch.dueAt })
  if (patch.followUpAt !== undefined) {
    await http<ApiTask>('PUT', path + '/follow-up', { followUpAt: patch.followUpAt })
  }
  if (Object.hasOwn(patch, 'projectId')) {
    await http<ApiTask>('PUT', path + '/project', { projectId: patch.projectId ?? null })
  }
  return withProjects(http<ApiTask>('GET', path))
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskPatch }): Promise<Task> =>
      USE_API
        ? updateApiTask(id, patch)
        : localMutation(() => store.updateTask(id, patch)),

    // Optimistic on purpose. Marking a task done is the most repeated action in
    // the product; a row that waits for a round trip before it recedes makes the
    // whole app feel like it is thinking about it.
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const previous = qc.getQueryData<Task[]>(['tasks'])
      const previousOne = qc.getQueryData<Task>(['tasks', id])
      qc.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      )
      // The detail screen reads ['tasks', id], not the list. Ticking a subtask
      // there is the most repeated action on that page, and a tick that waits
      // for a refetch reads as a tick that did not register.
      qc.setQueryData<Task>(['tasks', id], (old) => (old ? { ...old, ...patch } : old))
      return { previous, previousOne, id }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['tasks'], ctx.previous)
      if (ctx?.previousOne) qc.setQueryData(['tasks', ctx.id], ctx.previousOne)
    },
    onSettled: () => invalidateTasks(qc),
  })
}

function invalidateTaskDetail(qc: ReturnType<typeof useQueryClient>, id: string) {
  void qc.invalidateQueries({ queryKey: ['tasks', id] })
  void qc.invalidateQueries({ queryKey: ['tasks'] })
}

export function useCreateChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, label }: { taskId: string; label: string }) =>
      USE_API
        ? http<ApiChecklistItem>('POST', '/tasks/' + encodeURIComponent(taskId) + '/checklist', { label })
        : localMutation(() => {
          const task = store.task(taskId)
          if (!task) throw new ApiError(404, 'ไม่พบรายการนี้')
          const item = { id: `sub_${Date.now()}`, text: label, done: false }
          store.updateTask(taskId, { subtasks: [...(task.subtasks ?? []), item] })
          return { id: item.id, label: item.text, done: item.done }
        }),
    onSuccess: (_item, variables) => invalidateTaskDetail(qc, variables.taskId),
  })
}

export function useUpdateChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, id, patch }: { taskId: string; id: string; patch: { label?: string; done?: boolean } }) =>
      USE_API
        ? http<ApiChecklistItem>('PATCH', '/checklist-items/' + encodeURIComponent(id), patch)
        : localMutation(() => {
          const task = store.task(taskId)
          const before = task?.subtasks?.find((item) => item.id === id)
          if (!task || !before) throw new ApiError(404, 'ไม่พบรายการนี้')
          const item = { ...before, text: patch.label ?? before.text, done: patch.done ?? before.done }
          store.updateTask(taskId, { subtasks: task.subtasks?.map((row) => row.id === id ? item : row) })
          return { id: item.id, label: item.text, done: item.done }
        }),
    onSuccess: (_item, variables) => invalidateTaskDetail(qc, variables.taskId),
  })
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, id }: { taskId: string; id: string }) =>
      USE_API
        ? http<void>('DELETE', '/checklist-items/' + encodeURIComponent(id))
        : localMutation(() => {
          const task = store.task(taskId)
          if (!task) throw new ApiError(404, 'ไม่พบรายการนี้')
          store.updateTask(taskId, { subtasks: task.subtasks?.filter((item) => item.id !== id) })
        }),
    onSuccess: (_item, variables) => invalidateTaskDetail(qc, variables.taskId),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      USE_API ? http<void>('DELETE', '/tasks/' + id) : localMutation(() => store.deleteTask(id)),
    onSuccess: () => invalidateTasks(qc),
  })
}

/** Puts a task back exactly as it was. The undo half of every destructive action. */
export function useRestoreTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (task: Task): Promise<Task> =>
      USE_API
        ? withProjects(http<ApiTask>('POST', '/tasks/' + task.id + '/restore'))
        : localMutation(() => store.restoreTask(task)),
    onSuccess: () => invalidateTasks(qc),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; color: Project['color'] }) =>
      USE_API
        ? http<ApiProject>('POST', '/projects', input).then(toProject)
        : localMutation(() => store.createProject(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export type ProjectPatch = Partial<Omit<Project, 'id'>>

/** Rename, archive, un-archive. One PATCH, because the server has one. */
export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProjectPatch }): Promise<Project> =>
      USE_API
        ? http<ApiProject>('PATCH', '/projects/' + id, {
          ...patch,
          ...(Object.hasOwn(patch, 'archivedAt') ? { archived: !!patch.archivedAt } : {}),
          archivedAt: undefined,
        }).then(toProject)
        : localMutation(() => store.updateProject(id, patch)),
    onSuccess: () => invalidateProjects(qc),
  })
}

/**
 * Deleting a project puts it in the bin for 30 days: its tasks read as unfiled
 * until it is restored, and its note links are removed. Both lists have to be
 * re-read afterwards — a task row that keeps painting a project that is in the
 * bin is the visible half of the same bug.
 */
export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      USE_API ? http<void>('DELETE', '/projects/' + id) : localMutation(() => store.deleteProject(id)),
    onSuccess: () => invalidateProjects(qc),
  })
}

/** Projects in the bin, with how long each has left before it is purged. */
export function useDeletedProjects() {
  return useQuery({
    queryKey: ['projects', 'trash'],
    queryFn: (): Promise<DeletedProject[]> =>
      USE_API ? http<DeletedProject[]>('GET', '/projects/trash') : Promise.resolve(store.deletedProjects()),
  })
}

/**
 * Takes a project out of the bin. Its tasks come back under it because the
 * delete never cleared their link; only the project being in the bin hid it.
 */
export function useRestoreProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      USE_API
        ? http<ApiProject>('POST', '/projects/' + encodeURIComponent(id) + '/restore').then(toProject)
        : localMutation(() => store.restoreProject(id)),
    onSuccess: () => invalidateProjects(qc),
  })
}

function invalidateProjects(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['projects'] })
  void qc.invalidateQueries({ queryKey: ['tasks'] })
  void qc.invalidateQueries({ queryKey: ['notes'] })
}

function invalidateTasks(qc: ReturnType<typeof useQueryClient>) {
  // The rail counts, the dashboard, the board and the list all read from
  // ['tasks']; a single key keeps them from drifting apart.
  void qc.invalidateQueries({ queryKey: ['tasks'] })
}

/* ------------------------------------------------------------------ notes -- */

interface ApiNoteBlock {
  id: string
  blockType: string
  position: number
  secret: boolean
  secretId: string | null
  label: string | null
  content: unknown | null
}

interface ApiNote {
  id: string
  title: string
  category: Note['category']
  tags: string[]
  pinned: boolean
  reviewAt: string | null
  version: number
  projectId: string | null
  taskIds: string[]
  blocks: ApiNoteBlock[]
  deletedAt: string | null
  updatedAt: string
}

interface ApiNoteSummary extends Omit<ApiNote, 'blocks' | 'deletedAt'> {
  blockCount: number
  hasSecretBlocks: boolean
  /** Set only by GET /notes/trash; null from the live list. */
  deletedAt?: string | null
}

interface ApiNoteVersion {
  id: string
  version: number
  title: string
  at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function toNoteBlock(block: ApiNoteBlock): NoteBlock {
  const kind = block.blockType.toLowerCase() as NoteBlock['kind']
  if (block.secret) {
    return {
      id: block.id,
      kind: 'credentials',
      title: block.label ?? undefined,
      fields: [{ id: block.secretId ?? block.id, label: block.label ?? 'รหัสผ่าน', secret: true }],
    }
  }
  const content = isRecord(block.content) ? block.content : {}
  return { id: block.id, kind, ...content } as NoteBlock
}

function toApiBlock(block: NoteBlock, position: number) {
  const { id: _id, kind, ...content } = block
  const credential = kind === 'credentials'
  const typedSecret = credential && block.fields.some((field) => field.secret && field.value !== undefined)
  const secretId = credential && !typedSecret
    ? block.fields.find((field): field is { id: string; label: string; secret: boolean } =>
      isRecord(field) && typeof field.id === 'string' && field.secret === true && isUuid(field.id),
    )?.id
    : undefined
  return {
    blockType: kind.toUpperCase(),
    position,
    content: credential ? credentialContent(block) : content,
    secret: credential,
    ...(secretId ? { secretId } : {}),
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/** Secret blocks have a deliberately non-generic wire shape. Field ids are UI
 * bookkeeping, never server ids; the four recognised names are the contract. */
function credentialContent(block: Extract<NoteBlock, { kind: 'credentials' }>) {
  const find = (name: string, secret?: boolean) => block.fields.find((field) =>
    field.secret === secret && field.label.includes(name),
  )?.value ?? ''
  const password = find('รหัสผ่าน', true) || block.fields.find((field) => field.secret)?.value || ''
  return {
    label: block.title ?? 'ข้อมูลเข้าสู่ระบบ',
    loginUrl: find('เว็บ', false),
    username: find('ชื่อผู้ใช้', true),
    password,
    notes: find('หมายเหตุ', true),
  }
}

function toNote(note: ApiNote, versions: ApiNoteVersion[] = []): Note {
  return {
    id: note.id,
    title: note.title,
    category: note.category,
    tags: note.tags,
    projectId: note.projectId ?? undefined,
    taskIds: note.taskIds,
    blocks: note.blocks.map(toNoteBlock),
    pinned: note.pinned,
    reviewAt: note.reviewAt,
    version: note.version,
    updatedAt: note.updatedAt,
    // Version responses intentionally omit bodies. Keep that fact visible to
    // the existing screen rather than inventing content it could revert to.
    revisions: versions.map((version) => ({
      version: version.version,
      summary: version.title,
      at: version.at,
      title: version.title,
      blocks: [],
    })),
    deletedAt: note.deletedAt,
  }
}

function toNoteSummary(note: ApiNoteSummary): Note {
  return toNote({ ...note, blocks: [], deletedAt: note.deletedAt ?? null })
}

async function fetchNotes(): Promise<Note[]> {
  return (await fetchAllPages<ApiNoteSummary>('/notes')).map(toNoteSummary)
}

async function fetchNoteResponse(response: Promise<ApiNote>): Promise<Note> {
  const note = await response
  const versions = await http<ApiNoteVersion[]>('GET', '/notes/' + encodeURIComponent(note.id) + '/versions')
  return toNote(note, versions)
}

function fetchNote(id: string): Promise<Note> {
  return fetchNoteResponse(http<ApiNote>('GET', '/notes/' + encodeURIComponent(id)))
}

async function createApiNote(input: NewNote): Promise<Note> {
  let note = await http<ApiNote>('POST', '/notes', {
    title: input.title,
    category: input.category,
    tags: input.tags,
    blocks: input.blocks?.map(toApiBlock),
  })
  if (input.projectId !== undefined) {
    note = await http<ApiNote>('PUT', '/notes/' + encodeURIComponent(note.id) + '/project', {
      projectId: input.projectId,
    })
  }
  if (input.taskIds !== undefined) {
    note = await http<ApiNote>('PUT', '/notes/' + encodeURIComponent(note.id) + '/tasks', {
      taskIds: input.taskIds,
    })
  }
  return fetchNoteResponse(Promise.resolve(note))
}

async function updateApiNote(id: string, patch: Partial<Note>): Promise<Note> {
  const path = '/notes/' + encodeURIComponent(id)
  const body: Record<string, unknown> = {}
  if (patch.title !== undefined) body.title = patch.title
  if (patch.category !== undefined) body.category = patch.category
  if (patch.tags !== undefined) body.tags = patch.tags
  if (patch.blocks !== undefined) body.blocks = patch.blocks.map(toApiBlock)
  if (patch.version !== undefined) body.version = patch.version
  if (Object.keys(body).length > 0) await http<ApiNote>('PATCH', path, body)
  if (Object.hasOwn(patch, 'projectId')) {
    await http<ApiNote>('PUT', path + '/project', { projectId: patch.projectId ?? null })
  }
  if (patch.taskIds !== undefined) await http<ApiNote>('PUT', path + '/tasks', { taskIds: patch.taskIds })
  if (patch.reviewAt !== undefined) await http<ApiNote>('PUT', path + '/review', { reviewAt: patch.reviewAt })
  if (patch.pinned !== undefined) {
    await http<ApiNote>(patch.pinned ? 'POST' : 'DELETE', path + '/pin')
  }
  return fetchNote(id)
}

async function revertApiNote(noteId: string, version: number): Promise<Note> {
  const versions = await http<ApiNoteVersion[]>('GET', '/notes/' + encodeURIComponent(noteId) + '/versions')
  const target = versions.find((item) => item.version === version)
  if (!target) throw new ApiError(404, 'ไม่พบรายการนี้')
  return fetchNoteResponse(http<ApiNote>('POST', '/note-versions/' + encodeURIComponent(target.id) + '/revert'))
}

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: () => USE_API ? fetchNotes() : Promise.resolve(store.notes()),
  })
}

/** The bin — Figma 219:28. A separate key, so a list never has to filter it out. */
export function useDeletedNotes() {
  return useQuery({
    queryKey: ['notes', 'deleted'],
    // GET /notes/trash: deleted notes, most recent first, until restore or the
    // 30-day sweep. Summaries only — the bin shows titles, not bodies.
    queryFn: () =>
      USE_API
        ? fetchAllPages<ApiNoteSummary>('/notes/trash').then((items) => items.map(toNoteSummary))
        : Promise.resolve(store.deletedNotes()),
  })
}

export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: ['notes', id],
    enabled: !!id,
    queryFn: () =>
      USE_API
        ? fetchNote(id as string)
        : Promise.resolve(store.note(id as string) ?? null),
  })
}

export interface NewNote {
  title: string
  category?: Note['category']
  tags?: string[]
  projectId?: string
  taskIds?: string[]
  blocks?: NoteBlock[]
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewNote): Promise<Note> =>
      USE_API ? createApiNote(input) : localMutation(() => store.createNote(input)),
    onSuccess: () => invalidateNotes(qc),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch, summary: _summary }: { id: string; patch: Partial<Note>; summary?: string }) =>
      USE_API ? updateApiNote(id, patch) : localMutation(() => store.updateNote(id, patch, _summary)),
    // Optimistic, for the same reason task updates are: ticking a checklist item
    // inside a note is a rapid, repeated action, and a tick that waits for a
    // round trip feels like the tick did not register.
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['notes'] })
      const previousList = qc.getQueryData<Note[]>(['notes'])
      const previousOne = qc.getQueryData<Note>(['notes', id])
      qc.setQueryData<Note[]>(['notes'], (old) =>
        old?.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      )
      qc.setQueryData<Note | null>(['notes', id], (old) => (old ? { ...old, ...patch } : old))
      return { previousList, previousOne, id }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousList) qc.setQueryData(['notes'], ctx.previousList)
      if (ctx?.previousOne) qc.setQueryData(['notes', ctx.id], ctx.previousOne)
    },
    onSettled: () => invalidateNotes(qc),
  })
}

export function useRevertNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      USE_API ? revertApiNote(id, version) : localMutation(() => store.revertNote(id, version)),
    onSuccess: () => invalidateNotes(qc),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      USE_API ? http<void>('DELETE', '/notes/' + encodeURIComponent(id)) : localMutation(() => store.deleteNote(id)),
    onSuccess: () => invalidateNotes(qc),
  })
}

/** The undo half of deleting a note. */
export function useRestoreNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note: Note): Promise<Note> =>
      USE_API
        ? fetchNoteResponse(http<ApiNote>('POST', '/notes/' + encodeURIComponent(note.id) + '/restore'))
        : localMutation(() => store.restoreNote(note)),
    onSuccess: () => invalidateNotes(qc),
  })
}

function invalidateNotes(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['notes'] })
}

/* --------------------------------------------------------------------- AI -- */
//
// backend/docs/ai-api.md is the contract. The AI never writes: it proposes
// `actions`, the panel shows them as buttons, and a click applies one through
// the ordinary task endpoints, so ownership and validation are the same as for
// any other edit. On the local store the endpoints are answered by aiMock.ts.

export type AiActionType = 'CREATE_TASK' | 'SET_DUE' | 'SET_PROJECT' | 'SET_STATUS'

export interface AiAction {
  id: string
  type: AiActionType
  label: string
  taskId?: string
  title?: string
  dueAt?: string | null
  projectId?: string | null
  /** SET_STATUS only. Anything else is refused at apply time (lib/aiRules.ts). */
  status?: AiStatusValue
  /** Why the AI proposes it, in Thai, at most 120 characters. Optional. */
  reason?: string | null
}

export interface AiStatus {
  available: boolean
  enabled: boolean
  usedToday: number
  dailyLimit: number
  resetsAt: string
}

export interface AiPreferences {
  enabled: boolean
  useHabits: boolean
}

export interface AiMessage {
  role: 'user' | 'model'
  content: string
}

export interface AiContext {
  route: string
  taskId: string | null
  projectId: string | null
}

export interface AiChatResult {
  reply: string
  actions: AiAction[]
  usedToday: number
  dailyLimit: number
}

export interface AiSuggestion {
  text: string
  actions: AiAction[]
  generatedAt: string
}

export type AiOutcome = 'ACCEPTED' | 'EDITED' | 'DISMISSED'

/** The contract allows 1–20 messages per request; the panel never keeps more. */
export const AI_MAX_MESSAGES = 20

function asApiError(failure: MockFailure): ApiError {
  return new ApiError(failure.status, messageFor(failure.status, failure.body), failure.body)
}

async function mocked<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && 'body' in error) {
      throw asApiError(error as MockFailure)
    }
    throw error
  }
}

const AI_UNAVAILABLE: AiStatus = { available: false, enabled: false, usedToday: 0, dailyLimit: 0, resetsAt: '' }

export function useAiStatus() {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: async (): Promise<AiStatus> => {
      if (!USE_API) return mockStatus()
      try {
        return await http<AiStatus>('GET', '/ai/status')
      } catch (error) {
        // A server that predates the AI endpoints answers 404: that is "not
        // available", not an outage, and the rest of the app must not notice.
        if (error instanceof ApiError && (error.status === 404 || error.code === 'AI_UNAVAILABLE')) return AI_UNAVAILABLE
        throw error
      }
    },
    staleTime: 60_000,
  })
}

export function useAiPreferences() {
  return useQuery({
    queryKey: ['ai', 'preferences'],
    queryFn: (): Promise<AiPreferences> =>
      USE_API ? http<AiPreferences>('GET', '/me/ai-preferences') : Promise.resolve(mockPreferences()),
  })
}

export function useUpdateAiPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prefs: AiPreferences): Promise<AiPreferences> =>
      USE_API ? http<AiPreferences>('PUT', '/me/ai-preferences', prefs) : Promise.resolve(saveMockPreferences(prefs)),
    onMutate: async (prefs) => {
      await qc.cancelQueries({ queryKey: ['ai', 'preferences'] })
      const previous = qc.getQueryData<AiPreferences>(['ai', 'preferences'])
      qc.setQueryData(['ai', 'preferences'], prefs)
      return { previous }
    },
    onError: (_error, _prefs, context) => {
      if (context?.previous) qc.setQueryData(['ai', 'preferences'], context.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['ai'] })
    },
  })
}

/**
 * One turn. The client holds the conversation, so `messages` is the whole of it
 * (newest last, at most AI_MAX_MESSAGES). `signal` is the panel's หยุด button.
 */
export function useAiChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messages, context, signal }: { messages: AiMessage[]; context: AiContext; signal?: AbortSignal }) => {
      const body = { messages: messages.slice(-AI_MAX_MESSAGES), context }
      if (USE_API) return http<AiChatResult>('POST', '/ai/chat', body, signal)
      return mocked(() => mockChat(body.messages, context, store.tasks(), store.projects(), signal))
    },
    onSuccess: (result) => {
      qc.setQueryData<AiStatus>(['ai', 'status'], (s) => (s ? { ...s, usedToday: result.usedToday, dailyLimit: result.dailyLimit } : s))
    },
    onError: (error) => {
      // The status line has to agree with what just happened.
      if (error instanceof ApiError && (error.code === 'AI_QUOTA' || error.code === 'AI_DISABLED' || error.code === 'AI_UNAVAILABLE')) {
        void qc.invalidateQueries({ queryKey: ['ai', 'status'] })
      }
    },
  })
}

/**
 * Feeds the habit memory after the person decided. Best effort: a lost outcome
 * costs a slightly worse suggestion later, and must never undo or block the
 * change the person just made.
 */
export function recordAiOutcome(actionId: string, outcome: AiOutcome, final?: AiFinal) {
  if (!USE_API) return Promise.resolve()
  // `final` only with EDITED (lib/aiRules.ts). Any failure — a 404 for an
  // action the server no longer knows included — is swallowed on purpose.
  return http<void>('POST', '/ai/actions/' + encodeURIComponent(actionId) + '/outcome', outcomeBody(outcome, final))
    .catch(() => undefined)
}

/**
 * The overview card's state. On load the card asks only for TODAY'S CACHED
 * suggestion (`cachedOnly=true`), which never calls Gemini: nothing is sent to
 * Google until the person presses a button.
 * - `none`  — nothing generated yet today (cachedOnly answered 204)
 * - `empty` — generated, and there was nothing worth suggesting (204)
 * - `ready` — a suggestion to show
 */
export type AiSuggestionState =
  | { kind: 'none' }
  | { kind: 'empty' }
  | { kind: 'ready'; suggestion: AiSuggestion }

export function useAiSuggestion(enabled: boolean) {
  return useQuery({
    queryKey: ['ai', 'suggestion'],
    enabled,
    queryFn: async (): Promise<AiSuggestionState> => {
      const s = USE_API
        ? await http<AiSuggestion | undefined>('GET', '/ai/suggestion?cachedOnly=true').then((x) => x ?? null)
        : await mocked(() => mockSuggestion(store.tasks(), 'cached'))
      return s ? { kind: 'ready', suggestion: s } : { kind: 'none' }
    },
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/**
 * ขอคำแนะนำวันนี้ (`request`, the ordinary GET) or สร้างใหม่ (`refresh=true`).
 * Either may call Gemini and cost one unit of the daily quota, which is why
 * both are buttons and neither runs by itself.
 */
export function useGenerateAiSuggestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (mode: 'request' | 'refresh'): Promise<AiSuggestionState> => {
      const s = USE_API
        ? await http<AiSuggestion | undefined>('GET', mode === 'refresh' ? '/ai/suggestion?refresh=true' : '/ai/suggestion')
          .then((x) => x ?? null)
        : await mocked(() => mockSuggestion(store.tasks(), 'generate'))
      return s ? { kind: 'ready', suggestion: s } : { kind: 'empty' }
    },
    onSuccess: (state) => qc.setQueryData(['ai', 'suggestion'], state),
    // usedToday moved (or the answer explains why it could not).
    onSettled: () => void qc.invalidateQueries({ queryKey: ['ai', 'status'] }),
  })
}

/* ------------------------------------------------------------ attachments -- */
//
// backend/docs/attachments-api.md. Bytes go up and come back only through the
// server: a download is an <a href download> to /download, a thumbnail is an
// <img> of /preview (PNG/JPEG only). Nothing is ever shown from a blob URL of
// what was picked, and a file name is only ever text.

export const attachmentDownloadUrl = (id: string) => `/api/attachments/${encodeURIComponent(id)}/download`
export const attachmentPreviewUrl = (id: string) => `/api/attachments/${encodeURIComponent(id)}/preview`

/**
 * One file, with upload progress (0–1). XHR rather than fetch, because fetch
 * still cannot report upload progress. The CSRF header is the same one every
 * other write sends; a bare 403 (stale token) is refreshed and retried once.
 */
export function uploadAttachment(taskId: string, file: File, onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<TaskAttachment> {
  if (!USE_API) {
    return mockUpload(taskId, file, onProgress, signal).catch((e: unknown) => {
      if (e && typeof e === 'object' && 'status' in e && 'body' in e) {
        const r = e as MockRefusal
        throw new ApiError(r.status, messageFor(r.status, r.body), r.body)
      }
      throw e
    })
  }
  const send = (retried: boolean): Promise<TaskAttachment> => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/tasks/${encodeURIComponent(taskId)}/attachments`)
    xhr.withCredentials = true
    xhr.setRequestHeader('X-XSRF-TOKEN', readCookie('XSRF-TOKEN') ?? '')
    xhr.responseType = 'text'
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total) }
    xhr.onerror = () => reject(new ApiError(0, 'ต่อเซิร์ฟเวอร์ไม่ได้ เช็คอินเทอร์เน็ตแล้วลองใหม่'))
    xhr.onabort = () => reject(new DOMException('aborted', 'AbortError'))
    xhr.onload = () => {
      let body: Record<string, unknown> | undefined
      try {
        const parsed: unknown = xhr.responseText ? JSON.parse(xhr.responseText) : undefined
        body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined
      } catch {
        body = undefined
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(toAttachment(body as unknown as ApiAttachment))
      } else if (xhr.status === 403 && !retried && !(xhr.getResponseHeader('Content-Type') ?? '').includes('json')) {
        void fetch('/api/auth/me', { credentials: 'same-origin' }).then(() => send(true)).then(resolve, reject)
      } else {
        reject(new ApiError(xhr.status, messageFor(xhr.status, body), body))
      }
    }
    signal?.addEventListener('abort', () => xhr.abort())
    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
  return send(false)
}

export function useDeleteAttachment(taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) =>
      USE_API
        ? http<void>('DELETE', '/attachments/' + encodeURIComponent(attachmentId))
        : localMutation(() => mockDeleteAttachment(taskId, attachmentId)),
    onSuccess: () => invalidateTaskDetail(qc, taskId),
  })
}

/* ------------------------------------------------------------------ links -- */

/** Words for the contract's refusals; the server's own detail wins when it sends one. */
function linkMessage(status: number, body?: Record<string, unknown>): string {
  if (body?.code === 'INVALID_URL') return 'ใส่ได้เฉพาะลิงก์ http หรือ https'
  if (body?.code === 'TOO_MANY_LINKS') return 'แนบลิงก์ได้สูงสุด 30 ลิงก์ต่องาน'
  return messageFor(status, body)
}

export function useAddLink(taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { url: string; title?: string }): Promise<TaskLink> =>
      USE_API
        ? http<TaskLink>('POST', '/tasks/' + encodeURIComponent(taskId) + '/links', input).catch((e: unknown) => {
            if (e instanceof ApiError) throw new ApiError(e.status, linkMessage(e.status, e.body), e.body)
            throw e
          })
        : localMutation(() => mockAddLink(taskId, input)).catch((e: unknown) => {
            if (e && typeof e === 'object' && 'status' in e && 'code' in e) {
              const r = e as LinkRefusal
              throw new ApiError(r.status, linkMessage(r.status, { code: r.code }), { code: r.code })
            }
            throw e
          }),
    onSuccess: () => invalidateTaskDetail(qc, taskId),
  })
}

export function useDeleteLink(taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) =>
      USE_API
        ? http<void>('DELETE', '/links/' + encodeURIComponent(linkId))
        : localMutation(() => mockDeleteLink(taskId, linkId)),
    onSuccess: () => invalidateTaskDetail(qc, taskId),
  })
}
