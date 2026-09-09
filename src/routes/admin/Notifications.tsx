/**
 * /admin/notifications — Figma node 52:935
 *
 * The operator view shows the RAW state machine names rather than friendly
 * labels. When a reminder does not arrive, the question is which state it is
 * stuck in and why, and translating that into softer wording just costs a
 * lookup. The user-facing history at /app/notifications is the friendly one.
 *
 * Rows carry the task id, never the task title — same privacy rule as the rest
 * of admin. A failure list showing message bodies would leak every user's work.
 */

interface Row {
  at: string
  user: string
  taskId: string
  state: 'SENT' | 'PENDING' | 'CANCELLED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL'
  note: string
  code: string
  attempt: string
}

const LOG: Row[] = [
  { at: 'เมื่อวาน 15:02', user: 'วิชัย เกษมสุข', taskId: 'tsk_8f21c4', state: 'FAILED_RETRYABLE', note: 'กำลังรอลองใหม่รอบที่ 3', code: '500', attempt: '2 / 3' },
  { at: '5 ก.ย. 14:12', user: 'วิชัย เกษมสุข', taskId: 'tsk_3ac907', state: 'FAILED_FINAL', note: 'ปัญหาสิทธิ์การส่ง ไม่ลองใหม่', code: '403', attempt: '1 / 3' },
  { at: '3 ก.ย. 08:00', user: 'ปกรณ์ ธนาวัฒน์', taskId: 'tsk_71bd55', state: 'FAILED_FINAL', note: 'เกินโควตารายเดือน ไม่ลองใหม่', code: '429', attempt: '1 / 3' },
  { at: 'วันนี้ 15:00', user: 'สมชาย ใจดี', taskId: 'tsk_9e04a1', state: 'PENDING', note: 'รอถึงเวลาส่ง', code: '—', attempt: '0 / 3' },
  { at: 'วันนี้ 08:40', user: 'สมชาย ใจดี', taskId: 'tsk_9e04a1', state: 'SENT', note: 'LINE รับคำขอแล้ว', code: '200', attempt: '1 / 3' },
  { at: 'วันนี้ 08:00', user: 'สุดา วงศ์ไทย', taskId: 'tsk_44c1d8', state: 'SENT', note: 'LINE รับคำขอแล้ว', code: '200', attempt: '1 / 3' },
  { at: '6 ก.ย. 17:30', user: 'มานพ ศรีสุข', taskId: 'tsk_0b7742', state: 'CANCELLED', note: 'ปิดงานก่อนถึงเวลาเตือน', code: '—', attempt: '0 / 3' },
]

const TONE: Record<Row['state'], string> = {
  SENT: 'text-ink-2',
  PENDING: 'text-ink-3',
  CANCELLED: 'text-ink-3',
  FAILED_RETRYABLE: 'text-time-soon',
  FAILED_FINAL: 'text-error',
}

export default function AdminNotifications() {
  return (
    <>
      <p className="t-caption text-ink-3">โหมดผู้ดูแลระบบ</p>
      <h1 className="t-page-title mt-1">บันทึกการแจ้งเตือน</h1>
      <p className="t-body mt-2 text-ink-2">
        แสดงรหัสงาน ไม่แสดงชื่องาน · ทุกครั้งที่พยายามส่งถูกบันทึกแยกรายการ
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Filter label="ช่วงเวลา" value="7 วันล่าสุด" />
        <Filter label="ผู้ใช้" value="ทั้งหมด" />
        <Filter label="สถานะ" value="ล้มเหลว + รอส่ง" active />
        <Filter label="รหัสผลลัพธ์" value="ทั้งหมด" />
      </div>

      <div className="mt-4 overflow-x-auto rounded-sheet border border-rule bg-sheet">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-rule">
              <Th>เวลา</Th><Th>ผู้ใช้</Th><Th>รหัสงาน</Th><Th>สถานะ</Th><Th>รหัสผลลัพธ์</Th><Th>ครั้งที่</Th><Th>จัดการ</Th>
            </tr>
          </thead>
          <tbody>
            {LOG.map((r, i) => {
              const retryable = r.state === 'FAILED_RETRYABLE' || r.state === 'FAILED_FINAL'
              return (
                <tr key={`${r.taskId}-${i}`} className={i < LOG.length - 1 ? 'border-b border-rule-soft' : ''}>
                  <td className="t-caption px-5 py-3 text-ink-3">{r.at}</td>
                  <td className="px-5 py-3 text-[12px] text-ink-2">{r.user}</td>
                  <td className="t-caption px-5 py-3 text-ink-2">{r.taskId}</td>
                  <td className="px-5 py-3">
                    <span className={`block font-mono text-[10px] font-medium ${TONE[r.state]}`}>{r.state}</span>
                    <span className="t-meta block text-ink-3">{r.note}</span>
                  </td>
                  <td className={`t-caption px-5 py-3 ${r.code === '200' || r.code === '—' ? 'text-ink-3' : TONE[r.state]}`}>
                    {r.code}
                  </td>
                  <td className="t-caption px-5 py-3 text-ink-3">{r.attempt}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      disabled={!retryable}
                      className={`rounded-control px-3 py-1.5 text-[11px] font-medium ${
                        retryable ? 'border border-rule bg-sheet' : 'text-ink-3 opacity-35'
                      }`}
                    >
                      {retryable ? 'ส่งใหม่' : 'ส่งใหม่ไม่ได้'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-sheet border border-rule px-5 py-4">
        <p className="t-label text-ink-3">กฎการส่งใหม่</p>
        <p className="t-meta mt-1.5 leading-relaxed text-ink-2">
          กดส่งใหม่ได้เฉพาะรายการที่ยังไม่เคยส่งสำเร็จ ระบบใช้ retry key เดิมของรายการนั้น ผู้ใช้จึงไม่มีทางได้รับข้อความซ้ำ
          แม้กดหลายครั้ง · หน้าต่างกันซ้ำของ LINE คือ 24 ชั่วโมงนับจากคำขอแรก เลยจากนั้นการส่งใหม่จะนับเป็นข้อความใหม่จริง
        </p>
      </div>
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="t-label px-5 py-2.5 font-medium text-ink-3">{children}</th>
}

function Filter({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 rounded-control px-3 py-1.5 ${
        active ? 'bg-ink text-on-dark' : 'border border-rule bg-sheet'
      }`}
    >
      <span className={`text-[11px] ${active ? 'opacity-75' : 'text-ink-3'}`}>{label}</span>
      <span className="font-mono text-[10.5px] font-medium">{value}</span>
    </button>
  )
}
