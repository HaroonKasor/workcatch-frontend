/**
 * /admin/audit-logs — Figma node 54:979
 *
 * The interesting column is the reason, not the action. An audit trail that
 * records what happened but not why is only useful for blame; recording the
 * stated reason is what makes it useful for understanding.
 *
 * Entries where an admin opened a user's actual task data are flagged, because
 * that is the one action here that crosses the privacy line the rest of admin is
 * built to hold.
 */

interface Entry {
  at: string
  actor: string
  action: string
  target: string
  reason: string
  result: string
  failed?: boolean
  sensitive?: boolean
}

const ENTRIES: Entry[] = [
  {
    at: 'วันนี้ 09:22', actor: 'สมชาย ใจดี', action: 'ส่งการแจ้งเตือนใหม่',
    target: 'notification · ntf_4b19a2', reason: 'ผู้ใช้แจ้งว่าไม่ได้รับข้อความเตือน', result: 'สำเร็จ',
  },
  {
    at: 'เมื่อวาน 16:40', actor: 'สมชาย ใจดี', action: 'ระงับบัญชีผู้ใช้',
    target: 'user · usr_0091 นภา จันทร์เพ็ญ', reason: 'พนักงานลาออกจากบริษัทแล้ว', result: 'สำเร็จ',
  },
  {
    at: 'เมื่อวาน 11:15', actor: 'สมชาย ใจดี', action: 'แก้แม่แบบข้อความ',
    target: 'template · digest_daily v4 → v5', reason: 'ข้อความยาวเกิน ตัดคำผิดบนมือถือ', result: 'สำเร็จ',
  },
  {
    at: '6 ก.ย. 14:03', actor: 'สมชาย ใจดี', action: 'เปิดดูข้อมูลงานของผู้ใช้',
    target: 'task · tsk_3ac907 ของ วิชัย เกษมสุข', reason: 'ผู้ใช้แจ้งว่าการเตือนไม่เข้า ขอให้ตรวจสอบ',
    result: 'สำเร็จ', sensitive: true,
  },
  {
    at: '6 ก.ย. 09:50', actor: 'สมชาย ใจดี', action: 'ปิดสวิตช์ฟีเจอร์',
    target: 'setting · registration_open เปิด → ปิด', reason: 'ยังอยู่ช่วงทดลองใช้เอง ยังไม่เปิดให้คนอื่น', result: 'สำเร็จ',
  },
  {
    at: '5 ก.ย. 15:20', actor: 'สมชาย ใจดี', action: 'ส่งการแจ้งเตือนใหม่',
    target: 'notification · ntf_3a0917', reason: 'ตรวจสอบเคสที่ผู้ใช้บล็อกบัญชีทางการ',
    result: 'ล้มเหลว · 403', failed: true,
  },
  {
    at: '3 ก.ย. 10:11', actor: 'สมชาย ใจดี', action: 'แก้ค่าเริ่มต้นระบบ',
    target: 'setting · inbox_aging 48 → 24 ชั่วโมง', reason: 'ผู้ใช้ลืมจัดงานในกล่องรับงานบ่อย', result: 'สำเร็จ',
  },
]

export default function AdminAuditLogs() {
  return (
    <>
      <p className="t-caption text-ink-3">โหมดผู้ดูแลระบบ</p>
      <h1 className="t-page-title mt-1">ประวัติผู้ดูแล</h1>
      <p className="t-body mt-2 text-ink-2">บันทึกทุกการกระทำสำคัญพร้อมเหตุผล ลบไม่ได้และแก้ไม่ได้</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {['ทั้งหมด', 'แตะข้อมูลส่วนตัว', 'จัดการผู้ใช้', 'แก้ค่าระบบ', 'ส่งข้อความใหม่'].map((f, i) => (
          <button
            key={f}
            type="button"
            className={`rounded-pill px-3.5 py-1.5 text-[12px] ${
              i === 0 ? 'bg-ink font-medium text-on-dark' : 'border border-rule bg-sheet text-ink-2'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-sheet border border-rule bg-sheet">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-rule">
              <Th>เวลา</Th><Th>ผู้ดูแล</Th><Th>การกระทำและเป้าหมาย</Th><Th>เหตุผลที่บันทึกไว้</Th><Th>ผลลัพธ์</Th>
            </tr>
          </thead>
          <tbody>
            {ENTRIES.map((e, i) => (
              <tr key={`${e.at}-${i}`} className={i < ENTRIES.length - 1 ? 'border-b border-rule-soft' : ''}>
                <td className="t-caption w-28 px-5 py-3.5 align-top text-ink-3">{e.at}</td>
                <td className="w-28 px-5 py-3.5 align-top text-[12px] text-ink-2">{e.actor}</td>
                <td className="px-5 py-3.5 align-top">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-medium">{e.action}</span>
                    {e.sensitive && (
                      <span className="t-caption rounded-[3px] bg-error/10 px-1.5 py-0.5 text-error">
                        แตะข้อมูลส่วนตัว
                      </span>
                    )}
                  </span>
                  <span className="t-caption mt-1 block text-ink-3">{e.target}</span>
                </td>
                <td className="max-w-[260px] px-5 py-3.5 align-top text-[11.5px] leading-relaxed text-ink-2">
                  {e.reason}
                </td>
                <td className={`w-24 px-5 py-3.5 align-top text-[11.5px] ${e.failed ? 'font-medium text-error' : 'text-ink-3'}`}>
                  {e.result}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-sheet border border-rule px-5 py-4">
        <p className="t-label text-ink-3">สิ่งที่บันทึกและไม่บันทึก</p>
        <p className="t-meta mt-1.5 leading-relaxed text-ink-2">
          บันทึก: ผู้ดำเนินการ เวลา การกระทำ เป้าหมาย เหตุผล และผลลัพธ์ ·
          ไม่บันทึก: access token, channel secret, รหัสผ่าน หรือเนื้อหางานของผู้ใช้ ·
          การเปิดดูข้อมูลส่วนตัวจะถูกทำเครื่องหมายไว้เสมอ และผู้ใช้ขอดูรายการที่เกี่ยวกับตัวเองได้
        </p>
      </div>
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="t-label px-5 py-2.5 font-medium text-ink-3">{children}</th>
}
