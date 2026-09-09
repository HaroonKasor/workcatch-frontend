import type { Priority, ProjectColor, TimeState } from './types'

/**
 * The design rules, expressed once so they cannot drift between screens.
 *
 * Colour belongs to time. Priority is weight. Projects get a cool dot and
 * nothing else. If a screen needs a colour that is not here, the screen is
 * probably wrong, not this file.
 */

export const timeBar: Record<TimeState, string> = {
  late: 'bg-time-late',
  today: 'bg-time-today',
  soon: 'bg-time-soon',
  waiting: 'bg-time-waiting',
  done: 'bg-transparent',
  none: 'bg-transparent',
}

export const timeText: Record<TimeState, string> = {
  late: 'text-time-late',
  today: 'text-time-today',
  soon: 'text-time-soon',
  waiting: 'text-time-waiting',
  done: 'text-ink-3',
  none: 'text-ink-3',
}

/** Only overdue work gets the heavier monospace face. */
export const timeWeight: Record<TimeState, string> = {
  late: 't-time-em', today: 't-time', soon: 't-time',
  waiting: 't-time', done: 't-time', none: 't-time',
}

/** Urgency is read faster from weight than from an added icon or colour. */
export const priorityTitle: Record<Priority, string> = {
  URGENT: 't-task-urgent',
  HIGH: 't-task-high',
  MEDIUM: 't-task-normal',
  LOW: 't-task-normal',
}

export const projectDot: Record<ProjectColor, string> = {
  BLUE: 'bg-project-blue',
  GREEN: 'bg-project-green',
  VIOLET: 'bg-project-violet',
  TEAL: 'bg-project-teal',
  INDIGO: 'bg-project-indigo',
  SLATE: 'bg-project-slate',
}

export const statusLabel: Record<string, string> = {
  INBOX: 'กล่องรับงาน', TODO: 'ต้องทำ', IN_PROGRESS: 'ทำอยู่',
  WAITING: 'รอคนอื่น', REVIEW: 'ตรวจงาน', DONE: 'เสร็จ', CANCELLED: 'ยกเลิก',
}
