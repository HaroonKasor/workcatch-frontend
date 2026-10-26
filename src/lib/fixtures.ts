import type { LineEvent, NotificationRecord, Note, Project, Task } from './types'

/**
 * Development fixtures. These exist so screens can be built and compared against
 * Figma before the API is ready, and so the visual harness has identical content
 * on every run. Deadlines are expressed as offsets from "now" rather than fixed
 * dates, so the fixtures never go stale and start rendering everything as late.
 */
const h = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString()
const d = (n: number) => h(n * 24)

/**
 * The next occurrence of a weekday at a given local hour, optionally a number of
 * weeks further out. The needs-review card's two candidate readings are "this
 * Friday" and "next Friday", and they only demonstrate the ambiguity if they
 * stay a week apart as the fixtures age.
 */
function nextWeekday(weekday: number, hour: number, addWeeks = 0): string {
  const at = new Date()
  at.setHours(hour, 0, 0, 0)
  const ahead = (weekday - at.getDay() + 7) % 7 || 7
  at.setDate(at.getDate() + ahead + addWeeks * 7)
  return at.toISOString()
}

export const projects: Project[] = [
  { id: 'p1', name: 'รายงานประจำเดือน', color: 'BLUE' },
  { id: 'p2', name: 'ระบบคลังสินค้า', color: 'TEAL' },
  { id: 'p3', name: 'งานฝากทั่วไป', color: 'VIOLET' },
  // Figma 46:729 draws one card in the archived state. It carries no open work
  // by construction — that is what archiving a project means — so the counters
  // it shows are the real derived zeroes, not decoration.
  { id: 'p4', name: 'ปรับปรุงเว็บไซต์บริษัท', color: 'SLATE', archivedAt: d(-40) },
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
    description: 'รวมยอดขายรายภูมิภาคของไตรมาส 3 เทียบกับเป้า แล้วสรุปสาเหตุที่ภาคเหนือต่ำกว่าเป้า 12% ส่งเป็นไฟล์ PDF พร้อมสไลด์สรุป 3 หน้า ใช้เทมเพลตจาก https://docs.google.com/q3-template',
    createdAt: d(-2),
    // A LINE draft the parser was sure about, so nothing asks about it.
    parseConfidence: 0.94,
    subtasks: [
      { id: 's1', text: 'ดึงข้อมูลยอดขายจากระบบ ERP', done: true },
      { id: 's2', text: 'ทำตารางเทียบเป้ารายภูมิภาค', done: true },
      { id: 's3', text: 'เขียนสรุปสาเหตุภาคเหนือต่ำกว่าเป้า', done: false },
      { id: 's4', text: 'ทำสไลด์ 3 หน้าและส่งให้คุณสมชาย', done: false },
    ],
    links: [
      { id: 'l1', url: 'https://www.figma.com/file/8Kd2Q3sales', host: 'www.figma.com', title: 'ไฟล์ Figma — สไลด์สรุปยอดขาย Q3', createdAt: h(-5) },
      { id: 'l2', url: 'https://drive.google.com/drive/folders/q3-sales', host: 'drive.google.com', title: null, createdAt: d(-1) },
    ],
    // One of each verdict the server can return, because the point of the list
    // is that a file is not downloadable until the scan says so — 147:1333.
    attachments: [
      { id: 'a1', name: 'ยอดขาย-Q3-รายภูมิภาค.xlsx', size: '842 KB', kind: 'XLSX', scan: 'CLEAN', at: h(-19) },
      { id: 'a2', name: 'สรุปประชุมฝ่ายขาย-5กย.pdf', size: '1.2 MB', kind: 'PDF', scan: 'CLEAN', at: d(-1) },
      { id: 'a3', name: 'กราฟเทียบเป้า.png', size: '318 KB', kind: 'PNG', contentType: 'image/png', scan: 'SCANNING', at: h(-1) },
      { id: 'a4', name: 'แบบฟอร์ม.docx', size: '340 KB', kind: 'DOCX', scan: 'INFECTED', at: d(-1) },
      { id: 'a5', name: 'วิดีโอสอนงาน.mp4', size: '48 MB', kind: 'MP4', scan: 'TOO_LARGE', at: d(-1) },
    ],
    reminders: [
      { id: 'r1', at: h(6), channel: 'LINE', status: 'PENDING', why: 'ก่อนครบกำหนด 2 ชั่วโมง' },
      { id: 'r2', at: h(-16), channel: 'LINE', status: 'SENT', why: 'ก่อนครบกำหนด 1 วัน' },
    ],
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
    // Read cleanly, just never given a deadline. Above the threshold, so it is
    // an ordinary triage card — the two cases have to be visibly different.
    parseConfidence: 0.88,
  },
  {
    id: 't16', title: 'โทรหาคุณเอเรื่องใบเสนอราคา', status: 'INBOX', priority: 'MEDIUM',
    dueAt: null, source: 'LINE', createdAt: h(-2),
    // Figma 34:2. The parser read a time it could not place, so it drafted the
    // task, set NO deadline, scheduled NO reminder, and asked.
    parseConfidence: 0.41,
    sourceMessage: 'โทรหาคุณเอเรื่องใบเสนอราคา วันศุกร์บ่ายสอง',
    sourceMessageExpiresAt: h(-2 + 30 * 24),
    parseNote: 'ระบบอ่านได้ว่า “ศุกร์ 14:00” แต่ไม่แน่ใจว่าศุกร์นี้หรือศุกร์หน้า จึงยังไม่ตั้งกำหนดส่งและยังไม่ตั้งเตือน',
    parseCandidates: [
      { id: 'pc1', label: 'ศุกร์นี้ 14:00', dueAt: nextWeekday(5, 14) },
      { id: 'pc2', label: 'ศุกร์หน้า 14:00', dueAt: nextWeekday(5, 14, 1) },
    ],
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

/* ----------------------------------------------------------- line events -- */

/**
 * Inbound LINE traffic for the admin screen — Figma 216:1565.
 *
 * Note what is not here: no message text, on any row, including the failures.
 * The fixtures make the same promise the endpoint does, so a screen built
 * against them cannot quietly start rendering a field the real API never sends.
 */
export const lineEvents: LineEvent[] = [
  {
    id: 'evt_8f21c4…9a', at: h(-0.4), userHash: 'u_3b91…',
    trail: ['RECEIVED', 'PARSED', 'DRAFTED', 'REPLIED'], parseConfidence: 0.92,
  },
  {
    id: 'evt_3ac907…1c', at: h(-0.45), userHash: 'u_7c02…',
    trail: ['RECEIVED', 'PARSED', 'DRAFTED'], note: 'ต้องตรวจ', parseConfidence: 0.41,
  },
  {
    id: 'evt_71bd55…4e', at: h(-0.9), userHash: 'u_3b91…',
    trail: ['RECEIVED', 'PARSED'], note: 'วันที่อยู่ในอดีต', parseConfidence: 0.66,
  },
  {
    id: 'evt_20ffa1…77', at: h(-1.2), userHash: 'u_9d44…',
    trail: ['RECEIVED'],
    error: { code: '429', message: 'ตอบกลับไม่สำเร็จ' }, canRetry: true,
  },
  {
    id: 'evt_9012ce…b3', at: h(-1.4), userHash: null,
    trail: [], error: { message: 'ปฏิเสธ' }, note: 'ลายเซ็นไม่ถูกต้อง',
  },
  {
    id: 'evt_44a7d2…08', at: h(-1.6), userHash: 'u_1f77…',
    trail: ['RECEIVED'], note: 'ยังไม่ผูกบัญชี — ส่งลิงก์ผูกบัญชีแล้ว',
  },
]

/* ------------------------------------------------------------------ notes -- */

/**
 * Notes fixtures — content copied from the Figma frames rather than invented,
 * so the screens can be compared against 127:1082 / 135:1163 line for line.
 *
 * Note the shape of the credentials block: the note itself carries only labels.
 * The demo plaintexts live in `noteSecrets` below and are loaded into an
 * in-memory map by the store — they never enter the persisted snapshot, and the
 * mask is a fixed width so it says nothing about them. See lib/store.ts.
 */
export const notes: Note[] = [
  {
    id: 'kn1',
    title: 'ปิดงบรายเดือน',
    category: 'WORKFLOW',
    tags: ['ปิดงบ', 'บัญชี', 'รายเดือน'],
    projectId: monthly.id,
    taskIds: ['t3', 't7', 't11'],
    pinned: true,
    reviewAt: d(83),
    version: 4,
    updatedAt: d(-2),
    blocks: [
      { id: 'b1', kind: 'heading', text: 'ก่อนเริ่ม' },
      {
        id: 'b2', kind: 'text',
        text: 'ทำทุกวันที่ 1–5 ของเดือน ถ้าเลยวันที่ 5 ฝ่ายบัญชีจะปิดรอบให้ไม่ทัน',
      },
      { id: 'b3', kind: 'heading', text: 'ขั้นตอน' },
      {
        id: 'b4', kind: 'steps',
        steps: [
          'ดึงรายงานยอดขายจากระบบคลังสินค้า เลือกช่วงวันที่ 1 ถึงวันสุดท้ายของเดือน',
          'กระทบยอดกับใบเสร็จในแฟ้มธนาคาร ยอดต่างเกิน 500 บาทให้หยุดแล้วถามคุณสุดา',
          'กรอกลงแบบฟอร์มสรุป แล้วส่งให้หัวหน้าฝ่ายตรวจก่อนวันที่ 5',
        ],
      },
      { id: 'b5', kind: 'heading', text: 'ตรวจก่อนส่ง' },
      {
        id: 'b6', kind: 'checklist',
        items: [
          { id: 'c1', text: 'ยอดขายตรงกับใบเสร็จทุกใบ', done: true },
          { id: 'c2', text: 'ใส่เลขที่เอกสารครบ', done: true },
          { id: 'c3', text: 'หัวหน้าฝ่ายเซ็นรับแล้ว', done: false },
        ],
      },
      {
        id: 'b7', kind: 'links', title: 'ลิงก์',
        links: [
          { id: 'l1', label: 'ระบบคลังสินค้า — รายงานยอดขาย', href: 'wms.example.co.th/reports' },
          { id: 'l2', label: 'แบบฟอร์มสรุปงบเดือน', href: 'drive · แก้ไขได้' },
        ],
      },
      {
        id: 'b8', kind: 'contacts', title: 'ผู้ติดต่อ',
        contacts: [
          { id: 'ct1', name: 'คุณสุดา วงศ์ไทย · ฝ่ายบัญชี', detail: '02-xxx-1180 · suda@example.co.th' },
          { id: 'ct2', name: 'คุณวิชัย เกษมสุข · ธนาคาร', detail: '081-xxx-4420' },
        ],
      },
      {
        // All four scan states from 147:1333, so the screen shows what BR-KN-04
        // actually looks like instead of only the happy one.
        id: 'b9', kind: 'file', title: 'ไฟล์ตัวอย่าง',
        files: [
          { id: 'f1', name: 'สรุปงบเดือน-สิงหาคม.xlsx', size: '84 KB', scan: 'CLEAN' },
          { id: 'f2', name: 'ใบเสนอราคา-ฉบับร่าง.pdf', size: '1.2 MB', scan: 'SCANNING' },
          { id: 'f3', name: 'แบบฟอร์ม.docx', size: '340 KB', scan: 'INFECTED' },
          { id: 'f4', name: 'วิดีโอสอนงาน.mp4', size: '48 MB', scan: 'TOO_LARGE' },
        ],
      },
    ],
    revisions: [
      { version: 4, summary: 'แก้ขั้นตอนที่ 2 — เพิ่มเกณฑ์ยอดต่าง 500 บาท', at: h(-6), title: 'ปิดงบรายเดือน', blocks: [] },
      { version: 3, summary: 'เพิ่ม Checklist ตรวจก่อนส่ง', at: d(-4), title: 'ปิดงบรายเดือน', blocks: [] },
      { version: 2, summary: 'เพิ่มผู้ติดต่อธนาคาร', at: d(-12), title: 'ปิดงบรายเดือน', blocks: [] },
      { version: 1, summary: 'สร้างบันทึก', at: d(-28), title: 'ปิดงบรายเดือน', blocks: [] },
    ],
  },
  {
    id: 'kn2',
    title: 'ติดต่อฝ่ายบัญชีและธนาคาร',
    category: 'CONTACTS',
    tags: ['ผู้ติดต่อ', 'บัญชี'],
    projectId: general.id,
    taskIds: ['t2'],
    pinned: true,
    version: 2,
    updatedAt: d(-6),
    blocks: [
      {
        id: 'b1', kind: 'contacts',
        contacts: [
          { id: 'ct1', name: 'คุณสุดา ฝ่ายบัญชี — เรื่องใบกำกับภาษี', detail: '02-xxx-1180' },
          { id: 'ct2', name: 'คุณวิชัย ธนาคาร — เรื่องวงเงินและเอกสารค้ำ', detail: '081-xxx-4420' },
          { id: 'ct3', name: 'คุณมานพ จัดซื้อ — เรื่องใบสั่งซื้อ', detail: '02-xxx-1192' },
          { id: 'ct4', name: 'คุณอรทัย คลังสินค้า — เรื่องใบส่งของ', detail: '02-xxx-1205' },
        ],
      },
    ],
    revisions: [
      { version: 2, summary: 'เพิ่มผู้ติดต่อคลังสินค้า', at: d(-6), title: 'ติดต่อฝ่ายบัญชีและธนาคาร', blocks: [] },
      { version: 1, summary: 'สร้างบันทึก', at: d(-40), title: 'ติดต่อฝ่ายบัญชีและธนาคาร', blocks: [] },
    ],
  },
  {
    id: 'kn3',
    title: 'รับงานใหม่เข้าทีม',
    category: 'WORKFLOW',
    tags: ['ทีม', 'สิทธิ์ระบบ'],
    projectId: warehouse.id,
    taskIds: [],
    pinned: true,
    version: 1,
    updatedAt: d(-21),
    blocks: [
      {
        id: 'b1', kind: 'steps',
        steps: [
          'เปิดสิทธิ์ระบบคลังสินค้าและอีเมล',
          'นัดแนะนำทีมภายในสัปดาห์แรก',
        ],
      },
      {
        id: 'b2', kind: 'file',
        files: [{ id: 'f1', name: 'แบบฟอร์มรับพนักงานใหม่.pdf', size: '210 KB', scan: 'CLEAN' }],
      },
    ],
    revisions: [
      { version: 1, summary: 'สร้างบันทึก', at: d(-21), title: 'รับงานใหม่เข้าทีม', blocks: [] },
    ],
  },
  {
    id: 'kn4',
    title: 'ระบบคลังสินค้า — บัญชีผู้ดูแล',
    category: 'CREDENTIALS',
    tags: ['สิทธิ์ระบบ'],
    projectId: warehouse.id,
    taskIds: [],
    pinned: false,
    version: 3,
    updatedAt: d(-34),
    blocks: [
      {
        id: 'b1', kind: 'credentials',
        fields: [
          { id: 'cf1', label: 'ที่อยู่เว็บ', value: 'wms.example.co.th', secret: false },
          { id: 'cf2', label: 'ชื่อผู้ใช้', secret: true },
          { id: 'cf3', label: 'รหัสผ่าน', secret: true },
          { id: 'cf4', label: 'หมายเหตุลับ', secret: true },
        ],
      },
    ],
    revisions: [
      { version: 3, summary: 'แก้หมายเหตุลับ', at: d(-34), title: 'ระบบคลังสินค้า — บัญชีผู้ดูแล', blocks: [] },
      { version: 2, summary: 'เพิ่มที่อยู่เว็บ', at: d(-60), title: 'ระบบคลังสินค้า — บัญชีผู้ดูแล', blocks: [] },
      { version: 1, summary: 'สร้างบันทึก', at: d(-90), title: 'ระบบคลังสินค้า — บัญชีผู้ดูแล', blocks: [] },
    ],
  },
  {
    id: 'kn5',
    title: 'แบบฟอร์มที่ใช้บ่อย',
    category: 'LINKS',
    tags: ['เอกสาร'],
    taskIds: [],
    pinned: false,
    version: 2,
    updatedAt: d(-34),
    blocks: [
      {
        id: 'b1', kind: 'links',
        links: [
          { id: 'l1', label: 'ใบเสนอราคา — เทมเพลตล่าสุด', href: 'drive.example.co.th/f/quote' },
          { id: 'l2', label: 'ใบส่งของ — ฉบับแก้ ก.ค.', href: 'drive.example.co.th/f/delivery' },
          { id: 'l3', label: 'ใบกำกับภาษี — แบบมาตรฐาน', href: 'drive.example.co.th/f/tax' },
          { id: 'l4', label: 'ใบรับสินค้า', href: 'drive.example.co.th/f/receive' },
          { id: 'l5', label: 'แบบฟอร์มเบิกค่าเดินทาง', href: 'drive.example.co.th/f/travel' },
        ],
      },
    ],
    revisions: [
      { version: 2, summary: 'เพิ่มแบบฟอร์มเบิกค่าเดินทาง', at: d(-34), title: 'แบบฟอร์มที่ใช้บ่อย', blocks: [] },
      { version: 1, summary: 'สร้างบันทึก', at: d(-120), title: 'แบบฟอร์มที่ใช้บ่อย', blocks: [] },
    ],
  },
  {
    id: 'kn6',
    title: 'ขอวงเงินเพิ่มกับธนาคาร',
    category: 'WORKFLOW',
    tags: ['ธนาคาร', 'การเงิน'],
    projectId: general.id,
    taskIds: [],
    pinned: false,
    version: 1,
    updatedAt: d(-62),
    blocks: [
      {
        id: 'b1', kind: 'steps',
        steps: [
          'เตรียมงบ 3 ปีย้อนหลัง',
          'นัดผู้จัดการสาขาล่วงหน้า 1 สัปดาห์',
          'ยื่นเอกสารค้ำประกันพร้อมสำเนาทะเบียนบ้าน',
          'ติดตามผลหลังยื่น 10 วันทำการ',
        ],
      },
      {
        id: 'b2', kind: 'file',
        files: [
          { id: 'f1', name: 'งบการเงิน-2568.pdf', size: '1.1 MB', scan: 'CLEAN' },
          { id: 'f2', name: 'หนังสือรับรองบริษัท.pdf', size: '420 KB', scan: 'CLEAN' },
        ],
      },
    ],
    revisions: [
      { version: 1, summary: 'สร้างบันทึก', at: d(-62), title: 'ขอวงเงินเพิ่มกับธนาคาร', blocks: [] },
    ],
  },
]

/**
 * Demo plaintexts for the credentials block, keyed by field id.
 *
 * These are the placeholder values drawn in Figma node 138:2 and nothing else —
 * there is no real account behind them. They live here, apart from the note
 * body, so that the thing the app persists and the thing the app can reveal are
 * two different objects. The store loads them into memory and never writes them
 * anywhere.
 */
export const noteSecrets: Record<string, string> = {
  cf2: 'wms_admin',
  cf3: 'Tr0ng-Kra-Dad-91',
  cf4: 'ต้องต่อ VPN ก่อน',
}
