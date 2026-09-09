import type { NotificationRecord, Project, Task } from './types'

/**
 * Development fixtures. These exist so screens can be built and compared against
 * Figma before the API is ready, and so the visual harness has identical content
 * on every run. Deadlines are expressed as offsets from "now" rather than fixed
 * dates, so the fixtures never go stale and start rendering everything as late.
 */
const h = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString()
const d = (n: number) => h(n * 24)

export const projects: Project[] = [
  { id: 'p1', name: 'รายงานประจำเดือน', color: 'BLUE' },
  { id: 'p2', name: 'ระบบคลังสินค้า', color: 'GREEN' },
  { id: 'p3', name: 'งานฝากทั่วไป', color: 'VIOLET' },
]

const [monthly, warehouse, general] = projects

export const tasks: Task[] = [
  {
    id: 't1', title: 'ส่งใบเสนอราคา บ.ทรัพย์เจริญ', status: 'IN_PROGRESS', priority: 'URGENT',
    dueAt: d(-3), project: general, requester: 'คุณมานพ', source: 'โทรศัพท์',
    createdAt: d(-9),
  },
  {
    id: 't2', title: 'ตอบกลับอีเมลฝ่ายบัญชีเรื่องใบกำกับภาษี', status: 'TODO', priority: 'HIGH',
    dueAt: d(-1), project: general, requester: 'คุณสุดา', source: 'อีเมล', createdAt: d(-5),
  },
  {
    id: 't3', title: 'ประชุมสรุป Q3 กับฝ่ายขาย', status: 'IN_PROGRESS', priority: 'MEDIUM',
    dueAt: h(1), project: monthly, createdAt: d(-4),
  },
  {
    id: 't4', title: 'ส่งไฟล์ออกแบบให้ทีมกราฟิก', status: 'TODO', priority: 'MEDIUM',
    dueAt: h(4), project: warehouse, createdAt: d(-2),
  },
  {
    id: 't5', title: 'รีวิวเอกสารสัญญาผู้รับเหมา', status: 'REVIEW', priority: 'HIGH',
    dueAt: h(6), project: general, requester: 'คุณวิชัย', createdAt: d(-2),
  },
  {
    id: 't6', title: 'สรุปรายงานยอดขาย Q3 ส่งหัวหน้าฝ่าย', status: 'IN_PROGRESS', priority: 'URGENT',
    dueAt: h(8), project: monthly, requester: 'คุณสมชาย', source: 'LINE',
    description: 'รวมยอดขายรายภูมิภาคของไตรมาส 3 เทียบกับเป้า แล้วสรุปสาเหตุที่ภาคเหนือต่ำกว่าเป้า 12% ส่งเป็นไฟล์ PDF พร้อมสไลด์สรุป 3 หน้า',
    createdAt: d(-2),
  },
  {
    id: 't7', title: 'เตรียมสไลด์ประชุมคณะกรรมการ', status: 'TODO', priority: 'MEDIUM',
    dueAt: d(1), project: monthly, createdAt: d(-1),
  },
  {
    id: 't8', title: 'ตรวจนับสต็อกคลังสาขาบางนา', status: 'TODO', priority: 'HIGH',
    dueAt: d(3), project: warehouse, createdAt: d(-1),
  },
  {
    id: 't9', title: 'รออนุมัติงบประมาณจากฝ่ายการเงิน', status: 'WAITING', priority: 'MEDIUM',
    dueAt: d(5), project: warehouse, waitingFor: 'คุณอนงค์', followUpAt: d(2), createdAt: d(-6),
  },
  {
    id: 't10', title: 'รอไฟล์ต้นฉบับจากเอเจนซี', status: 'WAITING', priority: 'MEDIUM',
    dueAt: d(6), project: monthly, waitingFor: 'คุณปกรณ์', followUpAt: d(3), createdAt: d(-8),
  },
  {
    id: 't11', title: 'สั่งซื้ออุปกรณ์สำนักงานประจำเดือน', status: 'INBOX', priority: 'LOW',
    dueAt: null, source: 'อีเมล', createdAt: h(-4),
  },
  {
    id: 't12', title: 'โทรกลับลูกค้าเรื่องใบเสนอราคาที่ค้างอยู่', status: 'INBOX', priority: 'MEDIUM',
    dueAt: null, source: 'โทรศัพท์', createdAt: h(-31),
  },
  {
    id: 't13', title: 'ขอไฟล์โลโก้เวอร์ชันล่าสุดจากฝ่ายการตลาด', status: 'INBOX', priority: 'LOW',
    dueAt: null, source: 'LINE', createdAt: h(-26),
  },
  {
    id: 't14', title: 'จัดตารางประชุมทีมประจำสัปดาห์หน้า', status: 'INBOX', priority: 'LOW',
    dueAt: null, source: 'ที่ประชุม', createdAt: h(-9),
  },
  {
    id: 't15', title: 'ส่งสรุปประชุมเช้าให้ทีม', status: 'DONE', priority: 'MEDIUM',
    dueAt: h(-2), project: general, completedAt: h(-1.5), createdAt: d(-1),
  },
]

export const notifications: NotificationRecord[] = [
  { id: 'n1', at: h(-0.5), taskTitle: 'สรุปรายงานยอดขาย Q3 ส่งหัวหน้าฝ่าย', channel: 'LINE',
    status: 'SENT', attempt: 1, maxAttempts: 3, errorCode: '200',
    reason: 'เตือนก่อนครบกำหนด 1 วัน' },
  { id: 'n2', at: h(-2), taskTitle: 'สรุปงานประจำวัน', channel: 'LINE',
    status: 'SENT', attempt: 1, maxAttempts: 3, errorCode: '200', reason: 'สรุปประจำวัน 08:00' },
  { id: 'n3', at: h(6), taskTitle: 'สรุปรายงานยอดขาย Q3 ส่งหัวหน้าฝ่าย', channel: 'LINE',
    status: 'PENDING', attempt: 0, maxAttempts: 3, reason: 'รอถึงเวลาส่ง' },
  { id: 'n4', at: h(-20), taskTitle: 'ตรวจนับสต็อกคลังสาขาบางนา', channel: 'LINE',
    status: 'FAILED_RETRYABLE', attempt: 2, maxAttempts: 3, errorCode: '500',
    reason: 'LINE ตอบข้อผิดพลาดชั่วคราว จะลองใหม่อีกครั้งใน 30 นาที' },
  { id: 'n5', at: d(-3), taskTitle: 'ขอไฟล์โลโก้เวอร์ชันล่าสุดจากฝ่ายการตลาด', channel: 'LINE',
    status: 'FAILED_FINAL', attempt: 1, maxAttempts: 3, errorCode: '403',
    reason: 'ปัญหาสิทธิ์การส่ง ไม่ลองใหม่เพราะลองไปก็ไม่หาย' },
  { id: 'n6', at: d(-2), taskTitle: 'ส่งสรุปประชุมเช้าให้ทีม', channel: 'LINE',
    status: 'CANCELLED', attempt: 0, maxAttempts: 3,
    reason: 'ปิดงานก่อนถึงเวลาเตือน จึงไม่ส่ง' },
  { id: 'n7', at: d(-1), taskTitle: 'รออนุมัติงบประมาณจากฝ่ายการเงิน', channel: 'IN_APP',
    status: 'SENT', attempt: 1, maxAttempts: 3, reason: 'ถึงวันติดตามงานที่รอคนอื่น' },
]
