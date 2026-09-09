/**
 * /admin — Figma node 49:891
 *
 * Shows aggregate numbers and service health, never task content. AC-09 requires
 * that an admin cannot read other people's work by default, so failures are
 * identified by task id rather than by title. That constraint is easy to break
 * accidentally on exactly this screen — a "recent failures" list showing the
 * message body would expose every user's task titles at once.
 */

const KPIS = [
  { label: 'ผู้ใช้ทั้งหมด', value: '24', note: 'เดือนนี้ +3' },
  { label: 'เชื่อม LINE แล้ว', value: '21', note: 'คิดเป็น 88%' },
  { label: 'งานในระบบ', value: '1,284', note: 'เปิดอยู่ 412' },
  { label: 'ส่งสำเร็จ 7 วัน', value: '98.4%', note: 'จาก 621 ข้อความ' },
]

const SERVICES = [
  { name: 'ตัวจับเวลา (Scheduler)', state: 'ทำงานปกติ', note: 'รอบล่าสุด 09:40 · ตรงเวลา', warn: false },
  { name: 'ตัวส่งข้อความ (Worker)', state: 'ทำงานปกติ', note: 'คิวค้าง 0 รายการ', warn: false },
  { name: 'LINE Messaging API', state: 'ตอบช้ากว่าปกติ', note: 'เฉลี่ย 820 ms · ปกติ 240 ms', warn: true },
  { name: 'ฐานข้อมูล', state: 'ทำงานปกติ', note: 'สำรองข้อมูลล่าสุด 03:00 วันนี้', warn: false },
]

const FAILURES = [
  { at: 'เมื่อวาน 15:02', taskId: 'tsk_8f21c4', err: 'LINE ตอบข้อผิดพลาดชั่วคราว', act: 'ลองใหม่อัตโนมัติ 2/3', code: '500', hard: false },
  { at: '5 ก.ย. 14:12', taskId: 'tsk_3ac907', err: 'ปัญหาสิทธิ์การส่ง', act: 'ไม่ลองใหม่ · ต้องให้ผู้ใช้เพิ่มเพื่อนอีกครั้ง', code: '403', hard: true },
  { at: '3 ก.ย. 08:00', taskId: 'tsk_71bd55', err: 'เกินโควตารายเดือน', act: 'ไม่ลองใหม่ · รอรอบบิลถัดไป', code: '429', hard: true },
]

export default function AdminOverview() {
  return (
    <>
      <p className="t-caption text-ink-3">โหมดผู้ดูแลระบบ</p>
      <h1 className="t-page-title mt-1">ภาพรวมระบบ</h1>
      <p className="t-body mt-2 text-ink-2">
        หน้านี้ไม่แสดงเนื้อหางานของผู้ใช้ แสดงเฉพาะตัวเลขรวมและสถานะบริการ
      </p>

      {/* One divided sheet, not four floating cards. The dividers do the work a
          box shadow would otherwise be asked to do. */}
      <div className="mt-6 flex flex-wrap overflow-hidden rounded-sheet border border-rule bg-sheet">
        {KPIS.map((k, i) => (
          <div
            key={k.label}
            className={`min-w-[180px] flex-1 px-6 py-5 ${i < KPIS.length - 1 ? 'border-r border-rule-soft' : ''}`}
          >
            <p className="t-meta text-ink-3">{k.label}</p>
            <p className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-[-0.5px]">{k.value}</p>
            <p className="t-caption mt-1 text-ink-3">{k.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div className="min-w-0 space-y-8">
          <section>
            <header className="flex items-center justify-between">
              <h2 className="t-section">สถานะบริการ</h2>
              <p className="t-caption text-ink-3">ตรวจล่าสุด 09:41</p>
            </header>
            <div className="mt-3 rounded-sheet border border-rule bg-sheet">
              {SERVICES.map((s, i) => (
                <div
                  key={s.name}
                  className={`flex items-center gap-3.5 px-5 py-3.5 ${i < SERVICES.length - 1 ? 'border-b border-rule-soft' : ''}`}
                >
                  <span
                    className={`size-[7px] shrink-0 rounded-full ${s.warn ? 'bg-time-soon' : 'bg-time-waiting'}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px]">{s.name}</span>
                    <span className="t-caption block text-ink-3">{s.note}</span>
                  </span>
                  <span className={`t-meta shrink-0 ${s.warn ? 'font-medium text-time-soon' : 'text-ink-3'}`}>
                    {s.state}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <header className="flex items-center justify-between">
              <h2 className="t-section">ต้องตรวจสอบ</h2>
              <p className="t-caption text-ink-3">{FAILURES.length} รายการ</p>
            </header>
            <div className="mt-3 rounded-sheet border border-rule bg-sheet">
              {FAILURES.map((f, i) => (
                <div
                  key={f.taskId}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 ${i < FAILURES.length - 1 ? 'border-b border-rule-soft' : ''}`}
                >
                  <span className="t-caption w-24 shrink-0 text-ink-3">{f.at}</span>
                  {/* Task id, not title. The admin has no business reading the work. */}
                  <span className="t-caption w-24 shrink-0 text-ink-2">{f.taskId}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[12.5px] font-medium ${f.hard ? 'text-error' : 'text-time-soon'}`}>
                      {f.err} · {f.code}
                    </span>
                    <span className="t-meta block text-ink-3">{f.act}</span>
                  </span>
                  <button type="button" className="shrink-0 rounded-control border border-rule px-3 py-1.5 text-[11.5px] font-medium">
                    ส่งใหม่
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <h2 className="t-section">โควตา LINE เดือนนี้</h2>
          <div className="rounded-sheet border border-rule bg-sheet px-5 py-5">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-[34px] font-semibold leading-none tracking-[-0.9px]">1,842</span>
              <span className="t-body text-ink-2">จาก 10,000</span>
            </p>
            <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-pill bg-rule-soft">
              <div className="h-full bg-ink" style={{ width: '18.4%' }} />
            </div>
            <p className="mt-2.5 flex justify-between">
              <span className="t-caption text-ink-2">เหลือ 8,158 ข้อความ</span>
              <span className="t-caption text-ink-3">รีเซ็ต 1 ต.ค.</span>
            </p>
            <p className="t-meta mt-4 leading-relaxed text-ink-3">
              เฉลี่ย 88 ข้อความต่อผู้ใช้ต่อเดือน · ที่อัตรานี้รองรับได้ราว 113 คนก่อนต้องขยับแผน
            </p>
          </div>

          <div className="rounded-sheet border border-rule px-5 py-4">
            <p className="t-label text-ink-3">ความเป็นส่วนตัว</p>
            <p className="t-meta mt-1.5 leading-relaxed text-ink-2">
              ผู้ดูแลเห็นได้แค่รหัสงานกับผลการส่ง ไม่เห็นชื่องานหรือรายละเอียด
              การเปิดดูเพื่อช่วยเหลือต้องระบุเหตุผลและถูกบันทึกไว้ทุกครั้ง
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
