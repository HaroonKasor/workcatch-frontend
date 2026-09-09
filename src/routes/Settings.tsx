import { useState } from 'react'

/**
 * /app/settings — Figma node 42:486
 *
 * Two things here are not decoration:
 *
 * 1. The LINE connection shows its TWO prerequisites separately. Logging in and
 *    being a friend of the bot are different states, and only the second one
 *    allows a push. A user can be perfectly logged in and receive nothing, which
 *    is this product's worst failure mode because it is silent.
 * 2. The quota meter. LINE bills per push, so the notification settings above it
 *    directly decide the monthly cost. Putting the consequence next to the
 *    control is the only honest way to present it.
 */

type LinkState = 'connected' | 'not-friend' | 'blocked'

export default function Settings() {
  const [linkState] = useState<LinkState>('connected')
  const [mode, setMode] = useState<'digest' | 'each' | 'both'>('both')
  const [toggles, setToggles] = useState({ overdue: true, waiting: true, inbox: true })

  // Rough model of what the current settings cost per month. Deliberately
  // approximate and labelled as such: a precise-looking wrong number is worse
  // than an honest estimate.
  const perMonth =
    (mode === 'each' ? 0 : 30) +
    (mode === 'digest' ? 0 : 24) +
    (toggles.overdue ? 5 : 0) +
    (toggles.waiting ? 2 : 0) +
    (toggles.inbox ? 1 : 0)
  const quotaFree = 1000

  return (
    <>
      <p className="t-caption text-ink-3">บัญชีและการเตือน</p>
      <h1 className="t-page-title mt-1">ตั้งค่า</h1>

      <div className="mt-7 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div className="min-w-0 space-y-8">
          <Section title="บัญชี" note="เข้าระบบด้วย LINE">
            <div className="flex items-center gap-3 border-b border-rule-soft px-5 py-3.5">
              <span className="size-9 shrink-0 rounded-full bg-ink/10" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">สมชาย ใจดี</span>
                <span className="t-meta block text-ink-3">เข้าระบบด้วย LINE</span>
              </span>
              <button type="button" className="rounded-control border border-rule px-3.5 py-2 text-[12px] font-medium">
                ออกจากระบบ
              </button>
            </div>
            <KV k="เขตเวลา" v="Asia/Bangkok (UTC+7)" last />
          </Section>

          <Section title="การเชื่อม LINE" note="ต้องครบทั้งสองข้อถึงจะได้รับการเตือน">
            {linkState !== 'connected' && (
              <div className="border-b border-rule-soft bg-error/[0.07] px-5 py-4">
                <p className="text-[14px] font-semibold text-error">
                  {linkState === 'not-friend'
                    ? 'ตอนนี้คุณจะไม่ได้รับการเตือนเลย'
                    : 'การเตือนผ่าน LINE หยุดอยู่'}
                </p>
                <p className="t-body text-ink-2 mt-1.5 leading-relaxed">
                  {linkState === 'not-friend'
                    ? 'ผูกบัญชีแล้วแต่ยังไม่ได้เพิ่ม WorkCatch เป็นเพื่อนใน LINE จึงส่งข้อความหาคุณไม่ได้'
                    : 'WorkCatch ถูกบล็อกหรือถูกลบออกจากรายชื่อเพื่อน ระบบหยุดส่งอัตโนมัติแล้ว งานทั้งหมดยังอยู่ครบ'}
                </p>
              </div>
            )}
            <Condition ok title="ผูกบัญชี LINE กับ WorkCatch แล้ว" why="ระบบรู้ว่าจะส่งหาใคร" state="ผูกแล้ว" />
            <Condition
              ok={linkState === 'connected'}
              title={linkState === 'connected' ? 'เพิ่ม WorkCatch เป็นเพื่อนแล้ว' : 'ยังไม่ได้เพิ่มเป็นเพื่อน'}
              why="LINE อนุญาตให้ส่งข้อความหาเฉพาะคนที่เป็นเพื่อนกับบัญชีทางการ"
              state={linkState === 'connected' ? 'เป็นเพื่อนแล้ว' : 'ยังไม่ครบ'}
            />
            <div className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium">ทดสอบการเตือน</span>
                <span className="t-meta block leading-relaxed text-ink-3">
                  ส่งข้อความจริงหาตัวเองหนึ่งข้อความ ถ้าไม่เข้าแปลว่าตั้งค่ายังไม่ครบ · นับ 1 ข้อความจากโควตา ส่งได้ 3 ครั้งต่อวัน
                </span>
              </span>
              <span className="text-right">
                <button type="button" className="rounded-control border border-rule bg-sheet px-3.5 py-2 text-[12px] font-medium">
                  ส่งข้อความทดสอบ
                </button>
                <span className="t-caption mt-1.5 block text-ink-3">ส่งล่าสุด 09:38 · ถึงแล้ว</span>
              </span>
            </div>
          </Section>

          <Section title="การเตือน" note="ยิ่งเตือนละเอียด ยิ่งใช้โควตา LINE มาก">
            <fieldset className="border-b border-rule-soft px-5 py-4">
              <legend className="t-meta mb-1 text-ink-2">รูปแบบการเตือน</legend>
              <Radio checked={mode === 'digest'} onChange={() => setMode('digest')}
                title="สรุปรวมวันละครั้ง" why="ประหยัดข้อความที่สุด ~30 ข้อความต่อเดือน" />
              <Radio checked={mode === 'each'} onChange={() => setMode('each')}
                title="เตือนแยกทีละงาน" why="ได้ทุกกำหนดส่ง แต่ใช้โควตามากที่สุด" />
              <Radio checked={mode === 'both'} onChange={() => setMode('both')}
                title="ทั้งสองอย่าง" why="สรุปตอนเช้า และเตือนเฉพาะงานที่ตั้งไว้" />
            </fieldset>
            <KV k="เวลาสรุปประจำวัน" v="08:00" />
            <KV k="เตือนก่อนครบกำหนด" v="1 วัน · 2 ชั่วโมง" />
            <Toggle label="เตือนงานที่เกินกำหนด" why="รวบเป็นข้อความเดียวต่อวัน ไม่ยิงทีละงาน"
              on={toggles.overdue} onChange={() => setToggles((t) => ({ ...t, overdue: !t.overdue }))} />
            <Toggle label="เตือนงานที่รอคนอื่นเกิน 3 วัน"
              on={toggles.waiting} onChange={() => setToggles((t) => ({ ...t, waiting: !t.waiting }))} />
            <Toggle label="เตือนงานค้างในกล่องรับงานเกิน 24 ชั่วโมง" last
              on={toggles.inbox} onChange={() => setToggles((t) => ({ ...t, inbox: !t.inbox }))} />
          </Section>

          <Section title="ค่าเริ่มต้นของงาน">
            <KV k="ความสำคัญเริ่มต้น" v="Medium" />
            <KV k="เก็บงานที่ลบไว้" v="30 วัน" />
            <KV k="ขนาดไฟล์แนบสูงสุด" v="10 MB ต่อไฟล์" last />
          </Section>
        </div>

        <aside>
          <h2 className="t-section">โควตาข้อความ LINE</h2>
          <div className="mt-3 rounded-sheet border border-rule bg-sheet px-5 py-5">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-[38px] font-semibold leading-none tracking-tight">~{perMonth}</span>
              <span className="t-body text-ink-2">ข้อความต่อเดือน</span>
            </p>
            <p className="t-meta mt-2 leading-relaxed text-ink-3">
              ประมาณการจากการตั้งค่าปัจจุบัน คิดจากงานเฉลี่ย 12 งานต่อสัปดาห์
            </p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-pill bg-rule-soft">
              <div className="h-full bg-ink" style={{ width: `${Math.min((perMonth / quotaFree) * 100, 100)}%` }} />
            </div>
            <p className="mt-2 flex justify-between">
              <span className="t-caption text-ink-2">ใช้ไป {perMonth}</span>
              <span className="t-caption text-ink-3">แผนฟรี {quotaFree.toLocaleString()}</span>
            </p>
          </div>
          <p className="t-meta mt-3.5 leading-relaxed text-ink-3">
            LINE คิดเงินเฉพาะข้อความที่ระบบเป็นฝ่ายส่ง ข้อความที่บอทตอบกลับเมื่อคุณทักไม่นับโควตา
          </p>
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

function KV({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3.5 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="text-[13px] text-ink-2">{k}</span>
      <span className="font-mono text-[11px]">{v}</span>
    </div>
  )
}

function Condition({ ok, title, why, state }: { ok: boolean; title: string; why: string; state: string }) {
  return (
    <div className="flex items-center gap-3.5 border-b border-rule-soft px-5 py-4">
      <span
        className={`size-4 shrink-0 rounded-[3px] border ${ok ? 'border-ink bg-ink' : 'border-error'}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className={`block text-[13.5px] font-medium ${ok ? '' : 'text-error'}`}>{title}</span>
        <span className="t-meta block leading-relaxed text-ink-3">{why}</span>
      </span>
      <span className={`t-caption shrink-0 ${ok ? 'text-ink-3' : 'text-error'}`}>{state}</span>
    </div>
  )
}

function Radio({ checked, onChange, title, why }: {
  checked: boolean; onChange: () => void; title: string; why: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2.5">
      <input type="radio" name="reminder-mode" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-rule peer-checked:border-[1.5px] peer-checked:border-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
        aria-hidden
      >
        {checked && <span className="size-[7px] rounded-full bg-ink" />}
      </span>
      <span>
        <span className={`block text-[13px] ${checked ? 'font-medium' : ''}`}>{title}</span>
        <span className="t-meta block text-ink-3">{why}</span>
      </span>
    </label>
  )
}

function Toggle({ label, why, on, onChange, last }: {
  label: string; why?: string; on: boolean; onChange: () => void; last?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3.5 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="min-w-0">
        <span className="block text-[13px] text-ink-2">{label}</span>
        {why && <span className="t-meta block text-ink-3">{why}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onChange}
        className={`relative h-5 w-[34px] shrink-0 rounded-pill transition-colors ${on ? 'bg-ink' : 'bg-rule'}`}
      >
        <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${on ? 'left-4' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
