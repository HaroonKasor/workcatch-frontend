/** Mirrors the API contract. Keep in sync with backend docs/api-contract.md. */

export type TaskStatus =
  | 'INBOX' | 'TODO' | 'IN_PROGRESS' | 'WAITING' | 'REVIEW' | 'DONE' | 'CANCELLED'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

/** Only cool hues. Warm hues are reserved for time and must never leak here. */
export type ProjectColor = 'BLUE' | 'VIOLET' | 'TEAL' | 'INDIGO' | 'SLATE'

export interface Project {
  id: string
  name: string
  color: ProjectColor
  /**
   * Figma 46:729. An archived project keeps every task it ever held but takes no
   * new work, so it is drawn dashed with its live counters at zero. Absent or
   * null means live — a boolean would have made "archived" a fact with no date,
   * and the card says when it was put away.
   */
  archivedAt?: string | null
}

/**
 * A project in the bin. Its tasks still hold the link, so a restore puts them
 * back under it; after `purgeAt` the sweep deletes it and they stay unfiled.
 */
export interface DeletedProject {
  id: string
  name: string
  color: ProjectColor
  deletedAt: string
  purgeAt: string
  /** Live tasks a restore would put back under this project. */
  taskCount: number
}

/** One line of "รายการย่อย" — Figma 37:389 (desktop) / 63:1089 (mobile). */
export interface Subtask {
  id: string
  text: string
  done: boolean
}

/**
 * A file hung off a task.
 *
 * `scan` is the SERVER's verdict and nothing is downloadable until it reads
 * CLEAN — the same rule a note's files live under, which is why the verdict type
 * is shared here rather than copied. See `FileScan` below and Figma 147:1333.
 */
export interface TaskAttachment {
  id: string
  name: string
  /** Already formatted ("842 KB"), because the design shows the unit the uploader saw. */
  size: string
  /** The extension chip drawn to the left of the name: XLSX, PDF, PNG. */
  kind: string
  scan: FileScan
  /** UTC instant the file was attached. */
  at: string
  /** The type the server detected from the bytes. Decides whether a thumbnail is offered. */
  contentType?: string
  /** CLEAN and its task live: the download endpoint will answer. */
  downloadable?: boolean
}

/**
 * One row of "การเตือน" on a task.
 *
 * It reuses `NotificationStatus` on purpose: this is the same delivery state
 * machine the history screen reports, seen from the task's end, so SENT means
 * exactly what it means there — LINE accepted the request, not that anyone read it.
 */
export interface TaskReminder {
  id: string
  /** UTC instant it fires, or fired. */
  at: string
  channel: 'LINE' | 'IN_APP' | 'WEB_PUSH'
  status: NotificationStatus
  /** Why this reminder exists, in the user's words. */
  why: string
}

/**
 * A reading the LINE parser considered but could not choose between.
 *
 * These are the server's candidates, never this client's: guessing at Thai date
 * phrasing in the browser would produce a second, quieter parser that disagrees
 * with the one that drafted the task.
 */
export interface ParseCandidate {
  id: string
  /** "ศุกร์นี้ 14:00" — what the reading says, in the words the user will tap. */
  label: string
  dueAt: string
}

/** A link pasted onto a task — backend/docs/links-api.md. `host` is the server's punycode form. */
export interface TaskLink {
  id: string
  url: string
  host: string
  title?: string | null
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  /** UTC instant, ISO 8601. Null means no deadline, which also means no reminder. */
  dueAt: string | null
  project?: Project
  requester?: string
  source?: string
  /** WAITING only: who we are waiting on, and when to chase. */
  waitingFor?: string
  followUpAt?: string | null
  createdAt: string
  completedAt?: string | null
  /** "รายการย่อย". Ticking one is not an edit to the task, so it keeps no version. */
  subtasks?: Subtask[]
  /** "ไฟล์แนบ". */
  attachments?: TaskAttachment[]
  /** "ลิงก์", newest first. */
  links?: TaskLink[]
  /** "การเตือน" — what has been sent for this task and what is still queued. */
  reminders?: TaskReminder[]
  /**
   * 0–1, how sure the LINE parser was of the draft it produced. Absent on
   * anything a person typed, because a person typing a deadline is not a guess.
   * Below the needs-review threshold the inbox asks before scheduling anything —
   * see lib/tasks.ts.
   */
  parseConfidence?: number
  /**
   * The message the draft was parsed from, quoted back so the reader can check
   * the parse against the words rather than against the parser.
   */
  sourceMessage?: string
  /** When that message is erased (30 days after it arrived). */
  sourceMessageExpiresAt?: string
  /** Readings the parser could not choose between. Empty unless it was unsure. */
  parseCandidates?: ParseCandidate[]
  /**
   * What the parser was unsure about, in the server's own words — "ระบบอ่านได้ว่า
   * ... แต่ไม่แน่ใจว่า ...". It comes from the server rather than being composed
   * here, because only the parser knows which fragment it choked on.
   */
  parseNote?: string
}

/**
 * How a task reads on screen. Derived, never stored: a task does not become
 * "late" by being written to, it becomes late by time passing.
 */
export type TimeState = 'late' | 'today' | 'soon' | 'waiting' | 'done' | 'none'

/**
 * The delivery state machine. Note that SENT means LINE accepted the request —
 * it does NOT mean the user received or read it. LINE returns 200 even for a
 * user who has blocked the bot, so anything that claims "delivered" is lying.
 */
export type NotificationStatus =
  | 'PENDING' | 'PROCESSING' | 'SENT'
  | 'FAILED_RETRYABLE' | 'FAILED_FINAL' | 'CANCELLED'

export interface NotificationRecord {
  id: string
  /** UTC instant the attempt was made or is scheduled for. */
  at: string
  taskTitle: string
  channel: 'LINE' | 'IN_APP' | 'WEB_PUSH'
  status: NotificationStatus
  attempt: number
  maxAttempts: number
  /** Why it is in this state, in the user's language, not a stack trace. */
  reason: string
  errorCode?: string
}

/* ------------------------------------------------------------------ notes -- */

/**
 * คู่มือและบันทึก — the knowledge half of the product.
 *
 * A note is deliberately NOT a task: it has no deadline, so nothing about it is
 * sorted by time and nothing about it can be late. That is why the list screen
 * groups by pinned/all rather than by the time buckets every task screen uses.
 */
export type NoteCategory = 'WORKFLOW' | 'CONTACTS' | 'LINKS' | 'CREDENTIALS'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface NoteLink {
  id: string
  label: string
  /** Shown as text, never opened blind. A note can point at an internal system. */
  href: string
}

export interface NoteContact {
  id: string
  name: string
  /** Phone, email, whatever the note keeper wrote. One line, as drawn. */
  detail: string
}

/**
 * BR-KN-04: a file is not downloadable until the server says it scanned clean.
 * The verdict is the SERVER's, never this client's — see the note on `scan` in
 * lib/store.ts.
 */
export type FileScan = 'CLEAN' | 'SCANNING' | 'INFECTED' | 'TOO_LARGE'

export interface NoteFile {
  id: string
  name: string
  /** Already formatted ("84 KB"), because the design shows the unit the uploader saw. */
  size: string
  scan: FileScan
}

/**
 * One row of a credentials block.
 *
 * `value` is present ONLY for fields that are not secret — a URL, an account
 * label. A secret's plaintext is never carried on the note object, never
 * serialised, and never persisted by this client; `store.revealSecret` is the
 * single door to it.
 *
 * There is deliberately no `length`. The mask is a fixed number of dots, because
 * how long a value is would itself be a fact about the value.
 */
export interface CredentialField {
  id: string
  label: string
  value?: string
  secret: boolean
}

export type NoteBlock =
  | { id: string; kind: 'heading'; text: string }
  | { id: string; kind: 'text'; text: string }
  | { id: string; kind: 'steps'; steps: string[] }
  | { id: string; kind: 'checklist'; items: ChecklistItem[] }
  | { id: string; kind: 'links'; title?: string; links: NoteLink[] }
  | { id: string; kind: 'contacts'; title?: string; contacts: NoteContact[] }
  | { id: string; kind: 'file'; title?: string; files: NoteFile[] }
  | { id: string; kind: 'credentials'; title?: string; fields: CredentialField[] }

export type NoteBlockKind = NoteBlock['kind']

/**
 * FR-KN-13. One entry per save. It carries the content it replaced so "ย้อนกลับ"
 * can actually put it back — and it carries no credentials block, because the
 * design's own line is "เก็บเฉพาะเนื้อหาทั่วไป ไม่เก็บค่าที่ซ่อนไว้".
 */
export interface NoteRevision {
  version: number
  /** What changed, in the user's words. */
  summary: string
  at: string
  title: string
  blocks: NoteBlock[]
}

export interface Note {
  id: string
  title: string
  category: NoteCategory
  tags: string[]
  projectId?: string
  /** Many-to-many with tasks on purpose: deleting a task must not delete the note. */
  taskIds: string[]
  blocks: NoteBlock[]
  pinned: boolean
  /** FR-KN-14. Null means no review reminder, which means no notification. */
  reviewAt?: string | null
  version: number
  updatedAt: string
  revisions: NoteRevision[]
  /** Soft delete. Recoverable for 30 days, so the UI must never say "ลบถาวร". */
  deletedAt?: string | null
}

/* ------------------------------------------------------ LINE inbound -- */

/**
 * How far an inbound LINE message got. The order is the pipeline's order and
 * the table draws it as a trail, so a row says where it stopped rather than only
 * that it failed.
 */
export type LineEventStage = 'RECEIVED' | 'PARSED' | 'DRAFTED' | 'REPLIED'

/**
 * One inbound LINE message, as the admin screen is allowed to see it —
 * `GET /api/admin/line/events`, ADMIN only, Figma 216:1565.
 *
 * There is deliberately NO message body on this type and there must never be
 * one. An admin debugging the pipeline needs to know whether a message became a
 * task, not what somebody wrote; the whole point of the screen is that the
 * answer to "did it work" does not require reading anyone's mail. `userHash` is
 * a hash for the same reason — it is enough to see that one account is failing
 * repeatedly, and not enough to identify them from this table.
 */
export interface LineEvent {
  /** LINE's own event id, already abbreviated by the server. */
  id: string
  at: string
  userHash: string | null
  trail: LineEventStage[]
  /** What happened after the trail ran out, in the user's words. */
  note?: string
  /** Present only on a failure: the glyph, the red and the retry all hang off it. */
  error?: { code?: string; message: string }
  /** A completed event that is useful to report, but is not a failure. */
  info?: string
  /** 0-1, absent when the message never got as far as being parsed. */
  parseConfidence?: number
  canRetry?: boolean
}
