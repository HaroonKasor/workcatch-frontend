/**
 * /admin/users — Figma node 51:913
 *
 * Counts and connection state only. No task titles, no descriptions, no message
 * bodies. AC-09 makes that a requirement rather than a courtesy, and this screen
 * is the most tempting place to break it, so the omission is stated explicitly
 * at the bottom rather than left for a reader to infer.
 */

interface Row {
  name: string
  email: string
  suspended?: boolean
  line: 'linked' | 'not-linked' | 'blocked'
  tasks: number
  lastSeen: string
  admin?: boolean
}

const USERS: Row[] = [
  { name: 'สมชาย ใจดี', email: 'somchai@company.co.th', line: 'linked', tasks: 48, lastSeen: 'วันนี้ 09:41', admin: true },
  { name: 'สุดา วงศ์ไทย', email: 'suda@company.co.th', line: 'linked', tasks: 31, lastSeen: 'วันนี้ 08:12' },
  { name: 'มานพ ศรีสุข', email: 'manop@company.co.th', line: 'linked', tasks: 27, lastSeen: 'เมื่อวาน 17:44' },
  { name: 'อนงค์ พูนทรัพย์', email: 'anong@company.co.th', line: 'linked', tasks: 19, lastSeen: 'เมื่อวาน 11:03' },
  { name: 'วิชัย เกษมสุข', email: 'wichai@company.co.th', line: 'blocked', tasks: 22, lastSeen: '6 ก.ย. 16:20' },
  { name: 'ปกรณ์ ธนาวัฒน์', email: 'pakorn@company.co.th', line: 'not-linked', tasks: 8, lastSeen: '5 ก.ย. 09:55' },
  { name: 'นภา จันทร์เพ็ญ', email: 'napa@company.co.th', line: 'linked', tasks: 14, lastSeen: '28 ส.ค. 10:31', suspended: true },
  { name: 'ธเนศ พงษ์ไพบูลย์', email: 'thanet@company.co.th', line: 'not-linked', tasks: 3, lastSeen: '24 ส.ค. 14:08' },
]

const LINE_LABEL = { linked: 'เชื่อมแล้ว', 'not-linked': 'ยังไม่เชื่อม', blocked: 'ถูกบล็อก' } as const
const LINE_TONE = { linked: 'text-ink-3', 'not-linked': 'text-time-soon font-medium', blocked: 'text-error font-medium' } as const

export default function AdminUsers() {
  const linked = USERS.filter((u) => u.line === 'linked').length

  return (
    <>
      <p className="t-caption text-ink-3">โหมดผู้ดูแลระบบ</p>
      <h1 className="t-page-title mt-1">ผู้ใช้</h1>
      <p className="t-body mt-2 text-ink-2">{USERS.length} บัญชี · เชื่อม LINE แล้ว {linked}</p>

      <div className="mt-6 overflow-x-auto rounded-sheet border border-rule bg-sheet">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="border-b border-rule">
              <Th>ผู้ใช้</Th>
              <Th>สถานะบัญชี</Th>
              <Th>การเชื่อม LINE</Th>
              <Th>จำนวนงาน</Th>
              <Th>เข้าใช้ล่าสุด</Th>
              <Th>จัดการ</Th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((u, i) => (
              <tr key={u.email} className={i < USERS.length - 1 ? 'border-b border-rule-soft' : ''}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="size-7 shrink-0 rounded-full bg-ink/10" aria-hidden />
                    <span>
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-medium">{u.name}</span>
                        {u.admin && (
                          <span className="t-caption rounded-[3px] bg-ink/[0.08] px-1.5 py-0.5 text-ink-2">ผู้ดูแล</span>
                        )}
                      </span>
                      <span className="t-caption block text-ink-3">{u.email}</span>
                    </span>
                  </div>
                </td>
                <td className={`px-5 py-3 text-[12px] ${u.suspended ? 'font-medium text-error' : 'text-ink-2'}`}>
                  {u.suspended ? 'ถูกระงับ' : 'ใช้งานอยู่'}
                </td>
                <td className={`px-5 py-3 text-[12px] ${LINE_TONE[u.line]}`}>{LINE_LABEL[u.line]}</td>
                <td className="px-5 py-3 font-mono text-[11px] text-ink-2">{u.tasks}</td>
                <td className="px-5 py-3 font-mono text-[10px] text-ink-3">{u.lastSeen}</td>
                <td className="px-5 py-3">
                  <button type="button" className="rounded-control border border-rule px-3 py-1.5 text-[11.5px] font-medium">
                    {u.suspended ? 'เปิดใช้' : 'ระงับ'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-sheet border border-rule px-5 py-4">
        <p className="t-label text-ink-3">สิ่งที่หน้านี้จงใจไม่แสดง</p>
        <p className="t-meta mt-1.5 leading-relaxed text-ink-2">
          ไม่มีชื่องาน รายละเอียด ไฟล์แนบ หรือข้อความเตือนของผู้ใช้ในหน้านี้ มีแต่จำนวนและสถานะการเชื่อมต่อ ·
          ถ้าต้องเปิดดูข้อมูลจริงเพื่อช่วยเหลือ ระบบจะบังคับให้ระบุเหตุผลก่อน และบันทึกลงประวัติผู้ดูแลทุกครั้ง
        </p>
      </div>
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="t-label px-5 py-2.5 font-medium text-ink-3">{children}</th>
}
