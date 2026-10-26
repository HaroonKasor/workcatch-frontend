/**
 * The client half of backend/docs/attachments-api.md. Pure, so `node --test`
 * covers it (lib/attachments.test.ts).
 *
 * The pre-check is for a friendly message before a 10 MB upload is wasted. It
 * is NOT the security check: the server decides the type from the bytes and
 * refuses anything else, whatever the name says.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'xlsx'] as const
/** For the file picker. A hint to the OS dialog only. */
export const ACCEPT = '.pdf,.png,.jpg,.jpeg,.docx,.xlsx'
export const TYPES_LABEL = 'PDF · XLSX · DOCX · PNG · JPG'

export type UploadErrorCode =
  | 'FILE_TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'TOO_MANY_FILES' | 'STORAGE_FULL' | 'UPLOAD_RATE'

/** What each refusal means to the person, and what they can do about it. */
export const UPLOAD_ERRORS: Record<UploadErrorCode, string> = {
  FILE_TOO_LARGE: 'ไฟล์ใหญ่เกิน 10 MB ย่อขนาดหรือแบ่งไฟล์ก่อนแนบ',
  UNSUPPORTED_TYPE: 'รองรับเฉพาะ PDF · DOCX · XLSX · PNG · JPG',
  TOO_MANY_FILES: 'งานนี้มีไฟล์แนบครบ 20 ไฟล์แล้ว ลบไฟล์ที่ไม่ใช้ก่อนแนบเพิ่ม',
  STORAGE_FULL: 'พื้นที่เก็บไฟล์ของบัญชีเต็มแล้ว (200 MB) ลบไฟล์เก่าที่ไม่ใช้แล้วลองใหม่',
  UPLOAD_RATE: 'แนบไฟล์ถี่เกินไป (สูงสุด 30 ไฟล์ต่อชั่วโมง) รอสักครู่แล้วลองใหม่',
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

/** Null when the file may be sent; otherwise the refusal the server would give. */
export function precheck(file: { name: string; size: number }): UploadErrorCode | null {
  if (file.size > MAX_UPLOAD_BYTES) return 'FILE_TOO_LARGE'
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) return 'UNSUPPORTED_TYPE'
  return null
}

/** The Thai message for a server refusal code, or a generic one. */
export function uploadErrorMessage(code: string | undefined): string {
  return code && code in UPLOAD_ERRORS ? UPLOAD_ERRORS[code as UploadErrorCode] : 'แนบไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง'
}

export function formatBytes(bytes: number): string {
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Only these get a thumbnail, and only from the server's /preview. */
export function isPreviewable(contentType: string | undefined): boolean {
  return contentType === 'image/png' || contentType === 'image/jpeg'
}
