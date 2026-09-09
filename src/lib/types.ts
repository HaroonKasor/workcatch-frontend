/** Mirrors the API contract. Keep in sync with backend docs/api-contract.md. */

export type TaskStatus =
  | 'INBOX' | 'TODO' | 'IN_PROGRESS' | 'WAITING' | 'REVIEW' | 'DONE' | 'CANCELLED'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

/** Only cool hues. Warm hues are reserved for time and must never leak here. */
export type ProjectColor = 'BLUE' | 'GREEN' | 'VIOLET' | 'TEAL' | 'INDIGO' | 'SLATE'

export interface Project {
  id: string
  name: string
  color: ProjectColor
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
}

/**
 * How a task reads on screen. Derived, never stored: a task does not become
 * "late" by being written to, it becomes late by time passing.
 */
export type TimeState = 'late' | 'today' | 'soon' | 'waiting' | 'done' | 'none'
