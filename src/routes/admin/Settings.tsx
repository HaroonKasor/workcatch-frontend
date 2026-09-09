/**
 * /admin/settings — Figma node 53:957
 *
 * The message preview is the part that earns its place. FR-ADM-07 asks for a
 * preview before activating a template, and the reason is practical: Thai text
 * wraps differently from English, and LINE only shows the first line in a phone
 * notification. Seeing the rendered bubble is the only way to catch a template
 * that reads fine in the editor and badly on a phone.
 */

const DEFAULTS = [
  ['เขตเวลา', 'Asia/Bangkok (UTC+7)'],
  ['เตือนก่อนครบกำหนด', '1 วัน และ 2 ชั่วโมง'],
  ['เวลาสรุปประจำวัน', '08:00'],
  ['วันติดตามงานที่รอคนอื่น', '3 วัน'],
  ['เตือนงานค้างในกล่องรับงาน', '24 ชั่วโมง'],
  ['นโยบายลองส่งใหม่', '1, 5, 30 นาที · สูงสุด 3 ครั้ง'],
  ['เก็บงานที่ลบไว้', '30 วัน'],
  ['ขนาดไฟล์แนบสูงสุด', '10 MB ต่อไฟล์'],
]

const TEMPLATES = [
  { code: 'reminder_before', desc: 'ก่อนถึงกำหนดส่ง', ver: 'v4', on: true },
  { code: 'reminder_due', desc: 'ถึงกำหนดส่งแล้ว', ver: 'v3', on: true },
  { code: 'digest_overdue', desc: 'สรุปงานเกินกำหนดรายวัน', ver: 'v2', on: true },
  { code: 'digest_daily', desc: 'สรุปงานประจำวัน', ver: 'v5', on: true },
  { code: 'waiting_followup', desc: 'ถึงวันติดตามงานที่รอ', ver: 'v1', on: true },
  { code: 'inbox_aging', desc: 'งานค้างในกล่องรับงาน', ver: 'v2', on: false },
]

const FLAGS = [
  { name: 'เปิดรับสมัครผู้ใช้ใหม่', why: 'ปิดไว้ระหว่างทดลองใช้เอง', on: false },
  { name: 'ให้บอทตอบเมื่อผู้ใช้ทัก', why: 'ข้อความตอบกลับไม่นับโควตา LINE', on: true },
  { name: 'เตือนผ่านเว็บ (Web Push)', why: 'ใช้แทน LINE ได้ฟรี ลดโควตา', on: true },
  { name: 'โหมดหยุดส่งชั่วคราว', why: 'เปิดเมื่อโควตาใกล้หมดหรือ LINE ล่ม', on: false },
  { name: 'billing_enabled', why: 'เปิดหน้าอัปเกรดให้กดได้จริง', on: false },
]

export default function AdminSettings() {
  return (
    <>
      <p className="t-caption text-ink-3">โหมดผู้ดูแลระบบ</p>
      <h1 className="t-page-title mt-1">ตั้งค่าระบบ</h1>
      <p className="t-body mt-2 text-ink-2">
        ค่าเหล่านี้เป็นค่าเริ่มต้นของผู้ใช้ใหม่ ผู้ใช้เดิมที่แก้เองไว้แล้วจะไม่ถูกเขียนทับ
      </p>

      <div className="mt-7 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div className="min-w-0 space-y-8">
          <Section title="ค่าเริ่มต้นของระบบ">
            {DEFAULTS.map(([k, v], i) => (
              <div key={k} className={`flex items-center justify-between gap-4 px-5 py-3 ${i < DEFAULTS.length - 1 ? 'border-b border-rule-soft' : ''}`}>
                <span className="text-[13px] text-ink-2">{k}</span>
                <span className="font-mono text-[11px]">{v}</span>
              </div>
            ))}
          </Section>

          <Section title="แม่แบบข้อความ" note="แก้แล้วเวอร์ชันเพิ่มขึ้นอัตโนมัติ">
            {TEMPLATES.map((t, i) => (
              <div key={t.code} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 ${i < TEMPLATES.length - 1 ? 'border-b border-rule-soft' : ''}`}>
                <span className="t-caption w-36 shrink-0 text-ink-2">{t.code}</span>
                <span className="min-w-0 flex-1 text-[12.5px]">{t.desc}</span>
                <span className="t-caption shrink-0 text-ink-3">LINE</span>
                <span className="t-caption w-6 shrink-0 text-ink-3">{t.ver}</span>
                <button type="button" className="shrink-0 rounded-control border border-rule px-2.5 py-1.5 text-[11px] font-medium">
                  ดูตัวอย่าง
                </button>
                <Switch on={t.on} label={t.code} />
              </div>
            ))}
          </Section>

          <Section title="สวิตช์ฟีเจอร์">
            {FLAGS.map((f, i) => (
              <div key={f.name} className={`flex items-center justify-between gap-4 px-5 py-3.5 ${i < FLAGS.length - 1 ? 'border-b border-rule-soft' : ''}`}>
                <span className="min-w-0">
                  <span className="block text-[13px] text-ink-2">{f.name}</span>
                  <span className="t-meta block text-ink-3">{f.why}</span>
                </span>
                <Switch on={f.on} label={f.name} />
              </div>
            ))}
          </Section>
        </div>

        <aside className="min-w-0 space-y-4">
          <header className="flex items-center justify-between">
            <h2 className="t-section">ตัวอย่างข้อความ</h2>
            <span className="t-caption text-ink-3">reminder_before v4</span>
          </header>

          {/* A mock LINE chat. The bubble uses a chat radius rather than the app's
              own 2px sheet radius, because it is simulating someone else's UI. */}
          <div className="rounded-sheet border border-rule p-4" style={{ background: '#93A9B8' }}>
            <div className="flex items-start gap-2">
              <span className="size-7 shrink-0 rounded-full bg-ink" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-white/90">WorkCatch</p>
                <div className="mt-1 rounded-[12px] bg-white px-3.5 py-3">
                  <p className="text-[12.5px] font-medium text-time-today">ใกล้ถึงกำหนดส่งในอีก 2 ชั่วโมง</p>
                  <p className="mt-2 text-[13.5px] font-semibold leading-snug">สรุปรายงานยอดขาย Q3 ส่งหัวหน้าฝ่าย</p>
                  <p className="mt-2 font-mono text-[10.5px] leading-[1.8] text-ink-2">
                    กำหนดส่ง   วันนี้ 17:00<br />ความสำคัญ  Urgent<br />โปรเจกต์    รายงานประจำเดือน
                  </p>
                  <div className="my-2.5 h-px bg-rule-soft" />
                  <p className="font-mono text-[10.5px] text-project-blue">เปิดงาน  wc.app/t/9e04a1</p>
                </div>
                <p className="mt-1 font-mono text-[9px] text-white/70">16:59</p>
              </div>
            </div>
          </div>

          <div className="rounded-sheet border border-rule px-5 py-4">
            <p className="t-label text-ink-3">ตัวแปรที่ใช้ได้</p>
            <p className="mt-1.5 font-mono text-[10px] leading-[1.8] text-ink-2">
              {'{{task_title}} · {{due_at}} · {{priority}} · {{project}} · {{requester}} · {{link}} · {{days_overdue}}'}
            </p>
            <p className="t-meta mt-2.5 leading-relaxed text-ink-3">
              ตัวอย่างนี้เรนเดอร์จากงานจริงในระบบ เพื่อให้เห็นว่าข้อความยาวเกินไปหรือตัดคำผิดตรงไหน ก่อนกดเปิดใช้
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="t-section">{title}</h2>
        {note && <p className="t-caption text-ink-3">{note}</p>}
      </header>
      <div className="mt-3 rounded-sheet border border-rule bg-sheet">{children}</div>
    </section>
  )
}

function Switch({ on, label }: { on: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative h-5 w-[34px] shrink-0 rounded-pill ${on ? 'bg-ink' : 'bg-rule'}`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-white ${on ? 'left-4' : 'left-0.5'}`} />
    </button>
  )
}
