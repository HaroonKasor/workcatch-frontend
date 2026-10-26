import type {
  FileScan, NoteBlockKind, NoteCategory, NotificationStatus, Priority, ProjectColor, TimeState,
} from './types'

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
  VIOLET: 'bg-project-violet',
  TEAL: 'bg-project-teal',
  INDIGO: 'bg-project-indigo',
  SLATE: 'bg-project-slate',
}

export const statusLabel: Record<string, string> = {
  INBOX: 'กล่องรับงาน', TODO: 'ต้องทำ', IN_PROGRESS: 'ทำอยู่',
  WAITING: 'รอคนอื่น', REVIEW: 'ตรวจงาน', DONE: 'เสร็จ', CANCELLED: 'ยกเลิก',
}

/**
 * Priority, in the language the rest of the screen is written in — Figma 37:389
 * shows "เร่งด่วน" and 42:486 shows "ปานกลาง". The enum is the API's word, not
 * the reader's, so it is never printed raw: a Thai screen that says URGENT in
 * one row and เร่งด่วน in the next reads as two different fields.
 */
export const priorityLabel: Record<Priority, string> = {
  URGENT: 'เร่งด่วน',
  HIGH: 'สูง',
  MEDIUM: 'ปานกลาง',
  LOW: 'ต่ำ',
}

/**
 * The delivery state machine, said in words.
 *
 * SENT means LINE accepted the request — it does NOT mean anyone received it.
 * Both the history screen and a task's own reminder list report the same states,
 * so they read from one map rather than two that can drift.
 */
export const notificationLabel: Record<NotificationStatus, string> = {
  PENDING: 'รอส่ง',
  PROCESSING: 'กำลังส่ง',
  SENT: 'ส่งแล้ว',
  FAILED_RETRYABLE: 'กำลังลองใหม่',
  FAILED_FINAL: 'ล้มเหลว',
  CANCELLED: 'ยกเลิก',
}

export const notificationTone: Record<NotificationStatus, string> = {
  PENDING: 'text-ink-3',
  PROCESSING: 'text-ink-3',
  SENT: 'text-ink-2',
  FAILED_RETRYABLE: 'text-time-soon',
  FAILED_FINAL: 'text-error',
  CANCELLED: 'text-ink-3',
}

/**
 * Note category. The label is also the eyebrow drawn on the card in Figma
 * 127:1082, so the two cannot drift apart.
 */
export const noteCategoryLabel: Record<NoteCategory, string> = {
  WORKFLOW: 'ขั้นตอนงาน',
  CONTACTS: 'ผู้ติดต่อ',
  LINKS: 'ลิงก์และเอกสาร',
  CREDENTIALS: 'ข้อมูลเข้าสู่ระบบ',
}

/** The name of each block type, as written on the "เพิ่มบล็อก" row. */
export const noteBlockLabel: Record<NoteBlockKind, string> = {
  heading: 'หัวข้อ',
  text: 'ข้อความ',
  steps: 'ขั้นตอน',
  checklist: 'เช็คลิสต์',
  links: 'ลิงก์',
  contacts: 'ผู้ติดต่อ',
  file: 'ไฟล์',
  credentials: 'ข้อมูลเข้าสู่ระบบ',
}

/**
 * File scan verdicts — BR-KN-04.
 *
 * `tone` is achromatic for everything except the refusal, which borrows
 * state/error. That is allowed here for the same reason it is allowed in a form:
 * this is an alert about a file, not a row in the task ledger, so it cannot be
 * confused with a deadline.
 */
export const fileScan: Record<FileScan, { badge: string; note: string; tone: string }> = {
  CLEAN: { badge: 'ปลอดภัย', note: 'ตรวจไฟล์แล้ว', tone: 'text-brand-strong bg-mint' },
  SCANNING: { badge: 'กำลังตรวจ', note: 'กำลังตรวจไฟล์', tone: 'text-ink-2 bg-ground' },
  INFECTED: { badge: 'ไม่ปลอดภัย', note: 'ตรวจไม่ผ่าน ไม่เปิดให้ดาวน์โหลด', tone: 'text-error bg-error/[0.08]' },
  TOO_LARGE: { badge: 'ใหญ่เกินไป', note: 'เกิน 10 MB จึงอัปโหลดไม่สำเร็จ', tone: 'text-ink-2 bg-ground' },
}

/** What the action button on a file row offers, given its verdict. */
export const fileAction: Record<FileScan, string> = {
  CLEAN: 'ดาวน์โหลด',
  SCANNING: 'รอตรวจเสร็จ',
  INFECTED: 'ลบไฟล์',
  TOO_LARGE: 'ลองใหม่',
}

/**
 * Why the action beside a file cannot be pressed yet.
 *
 * There is no file storage behind this product: attachments are a table with no
 * upload endpoint and no download endpoint. A CLEAN file therefore has nothing
 * to download, and the button that said "ดาวน์โหลด" and did nothing at all was
 * the worst of the three options — worse than hiding it, because it looked like
 * a working feature, and worse than disabling it, because it explained nothing.
 *
 * Kept rather than hidden on purpose. The scan verdicts around it are real and a
 * file that passed one is genuinely different from a file that did not; removing
 * the row's action would take that distinction off the screen with it, and would
 * also hide the fact that the capability is coming. The rule is the same one the
 * unlink button on the settings screen follows: greying a control without a
 * reason teaches people the page is broken.
 *
 * One sentence, in one place, because both the note screen and the task screen
 * show these rows and must not come to different conclusions about the same file.
 */
export const fileStorageNote = 'ยังดาวน์โหลดไม่ได้ · ระบบเก็บไฟล์ยังไม่เปิดใช้งาน'

/** The palette is the whole colour rule of this product, enforced in one place. */
export const COOL: { value: ProjectColor; label: string }[] = [
  { value: 'BLUE', label: 'น้ำเงิน' },
  { value: 'VIOLET', label: 'ม่วง' },
  { value: 'TEAL', label: 'เขียวน้ำทะเล' },
  { value: 'INDIGO', label: 'คราม' },
  { value: 'SLATE', label: 'เทาน้ำเงิน' },
]
