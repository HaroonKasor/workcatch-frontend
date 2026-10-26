import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LineMark } from '../components/LineMark'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import { useMe } from '../lib/api'
import { LINE_OA_ADD_FRIEND_URL, LINE_OA_ID } from '../lib/line'

/**
 * / — Figma 284:1638 (1440), 289:1729 (390)
 *
 * The front door for somebody who has never heard of WorkCatch. It is shown to
 * everyone, signed in or not: a person who shares the link with a colleague has
 * to be able to see what the colleague will see. The only thing that changes for
 * a signed-in visitor is the top-right button.
 *
 * Every signed-out "start" button goes to /login rather than straight to LINE.
 * That screen carries the two things worth knowing before the press (what LINE
 * will ask, and the friend step) and it guards against the double press that
 * opens a second OAuth window. Signed-in visitors instead keep moving in the app.
 */
export default function Landing() {
  const me = useMe()
  const signedIn = !!me.data
  const { hash } = useLocation()

  // The legal pages' header links here as /#pricing and the like. A client-side
  // navigation does not scroll to a hash on its own, so this does.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef)

  return (
    <div ref={rootRef} className="wc-page-enter wc-scale min-h-viewport bg-sheet text-ink">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-10">
        <SiteHeader signedIn={signedIn} onLanding />
        <main>
          <Hero signedIn={signedIn} />
          <LineFlow />
          <ProductShot />
          <Problems />
          <Features />
          <HowTo />
          <Pricing signedIn={signedIn} />
          <Trust />
          <Closing signedIn={signedIn} />
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- motion -- */

/** The stagger step for one element, read by .wc-rise and [data-reveal]. */
function delay(ms: number): CSSProperties {
  return { '--wc-delay': `${ms}ms` } as CSSProperties
}

/**
 * Marks each [data-reveal] inside the page as shown once it scrolls into view,
 * then stops watching it: a section settles in once, not every time it passes.
 *
 * .wc-motion goes on the root only here, after mount and only when motion is
 * allowed, so the hidden starting state exists only where something is going
 * to reveal it. Anything already on screen at mount is reported straight away
 * by the observer's first callback, including a section a /#pricing link
 * scrolled to.
 */
function useReveal(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.classList.add('wc-motion')
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-shown', '')
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    el.querySelectorAll('[data-reveal]').forEach((node) => io.observe(node))
    return () => io.disconnect()
  }, [root])
}

/* ------------------------------------------------------------------- hero -- */

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="pt-14 lg:pt-[92px]">
      <p className="wc-rise t-eyebrow text-ink-3" style={delay(60)}>
        สำหรับคนที่รับงานจากหลายทางแล้วต้องจำเองทั้งหมด
      </p>
      <h1 className="font-display mt-3 text-[40px] leading-[1.3] font-semibold tracking-[-1px] lg:mt-4 lg:text-[60px] lg:tracking-[-1.5px]">
        <span className="wc-rise block" style={delay(140)}>งานที่รับปากไว้</span>
        <span className="wc-rise block" style={delay(220)}>จะไม่หล่นอีก</span>
      </h1>
      <p className="wc-rise mt-4 max-w-[720px] text-[15px] leading-[1.75] text-ink-2 lg:mt-6 lg:text-[17px]" style={delay(320)}>
        งานเข้ามาจากไลน์ อีเมล ห้องประชุม และคำสั่งปากเปล่า — WorkCatch รับไว้ที่เดียว
        แล้วเตือนผ่าน LINE ก่อนถึงกำหนด ไม่ใช่หลังจากมีคนทวง
      </p>
      <div className="wc-rise mt-6 flex flex-col gap-3 lg:flex-row lg:items-center" style={delay(400)}>
        <LineStart signedIn={signedIn} />
        <p className="t-note text-ink-3 lg:text-[12px]">ฟรี ไม่ต้องใส่บัตร · เข้าครั้งแรกสร้างบัญชีให้อัตโนมัติ</p>
      </div>
    </section>
  )
}

/**
 * The LINE green, charcoal label — the same documented exception Login.tsx
 * makes, for the same reason: white on #06C755 measures 2.26:1.
 */
function LineStart({ signedIn, className = '' }: { signedIn: boolean; className?: string }) {
  return (
    <Link
      to={signedIn ? '/app/dashboard' : '/login'}
      className={`wc-lift flex h-[54px] items-center justify-center gap-3 rounded-control bg-line px-[22px] text-[15px] font-semibold text-ink ${className}`}
    >
      <LineMark className="size-[24px]" />
      {signedIn ? 'เข้าแอป' : 'เริ่มใช้ด้วย LINE'}
    </Link>
  )
}

/* -------------------------------------------------------------- LINE flow -- */

/**
 * What makes this product different, shown instead of claimed — Figma 312:1730
 * (1440), 315:1791 (390). The dashboard below says "a task list"; this says
 * "and you never had to open it": a message typed in LINE becomes a task, and
 * LINE brings it back before it is due.
 *
 * The chat surfaces use LINE's own green and chat background because they are
 * pictures of LINE. That is the same single exception the sign-in button makes.
 */
function LineFlow() {
  return (
    <div role="list" aria-label="ใช้งานผ่าน LINE ในสามขั้น"
      className="mt-8 grid gap-1.5 lg:mt-10 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:gap-4">
      <FlowStep n={1} label="พิมพ์หาบอทใน LINE" at={0}>
        <div className="flex min-h-24 items-center justify-end rounded-control bg-line-chat p-3.5">
          <p className="wc-pop rounded-[16px] bg-line px-3.5 py-2 text-[14px] text-ink" style={popAfter(260)}>
            เตือนส่งรายงานพรุ่งนี้ 10 โมง
          </p>
        </div>
      </FlowStep>
      <FlowArrow at={180} />
      <FlowStep n={2} label="ระบบสร้างเป็นงาน" at={260}>
        <div className="flex min-h-24 items-center rounded-control bg-ground p-3.5">
          <div className="flex w-full items-center gap-3 bg-sheet px-3.5 py-3">
            <span className="t-time shrink-0 text-time-soon">พรุ่งนี้ 10:00</span>
            <span className="min-w-0 flex-1 truncate text-[14px]">ส่งรายงาน</span>
            <span className="t-caption shrink-0 rounded-pill bg-mint px-2 py-0.5 text-brand-strong">
              จาก LINE
            </span>
          </div>
        </div>
      </FlowStep>
      <FlowArrow at={440} />
      <FlowStep n={3} label="LINE เตือนก่อนถึงกำหนด" at={520}>
        <div className="flex min-h-24 items-center rounded-control bg-line-chat p-3.5">
          <p className="wc-pop rounded-[16px] bg-sheet px-3.5 py-2" style={popAfter(900)}>
            <span className="block text-[14px] font-medium">อีก 1 ชั่วโมงถึงกำหนด</span>
            <span className="block text-[13px] text-ink-2">ส่งรายงาน · วันนี้ 10:00</span>
          </p>
        </div>
      </FlowStep>
    </div>
  )
}

/** The bubble lands this long after its card starts to settle. */
function popAfter(ms: number): CSSProperties {
  return { '--wc-pop-delay': `${ms}ms` } as CSSProperties
}

/**
 * Each step settles in after the one before it, so the three read as a
 * sequence — typed, filed, reminded — rather than a row of cards.
 */
function FlowStep({ n, label, at, children }: { n: number; label: string; at: number; children: React.ReactNode }) {
  return (
    <div role="listitem" data-reveal style={delay(at)} className="rounded-sheet border border-rule-soft bg-sheet p-[18px]">
      <p className="text-[13px] font-medium text-ink-2">{n} · {label}</p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function FlowArrow({ at }: { at: number }) {
  return (
    <div aria-hidden data-reveal style={delay(at)} className="grid place-items-center text-[18px] text-ink-3">
      <span className="lg:hidden">↓</span>
      <span className="hidden lg:inline">→</span>
    </div>
  )
}

/* ----------------------------------------------------------- product shot -- */

type Row = { when: string; tone: string; em?: boolean; title: string; sub: string }

const ROWS: Row[] = [
  { when: 'เกิน 3 วัน', tone: 'text-time-late', em: true, title: 'ส่งใบเสนอราคา บ.ทรัพย์เจริญ', sub: 'งานฝากทั่วไป · สั่งโดย คุณนพ' },
  { when: '11:00', tone: 'text-time-today', title: 'ประชุมสรุป Q3 กับฝ่ายขาย', sub: 'รายงานประจำเดือน' },
  { when: '15:00', tone: 'text-time-today', title: 'รีวิวเอกสารสัญญาผู้รับเหมา', sub: 'งานฝากทั่วไป · สั่งโดย คุณวิชัย' },
  { when: 'รอ 2 วัน', tone: 'text-time-waiting', title: 'รออนุมัติงบจากฝ่ายการเงิน', sub: 'ระบบคลังสินค้า · รอ คุณอนงค์' },
  { when: 'พรุ่งนี้ 09:00', tone: 'text-time-soon', title: 'เตรียมสไลด์ประชุมคณะกรรมการ', sub: 'รายงานประจำเดือน' },
]

/**
 * Drawn with the app's own tokens rather than pasted in as an image, so the
 * picture and the product cannot drift apart. It is a picture all the same: the
 * fake "เพิ่มงาน" button and nav would be controls that do nothing if a screen
 * reader met them, so the whole thing is one image with a description.
 */
function ProductShot() {
  const label = 'ตัวอย่างหน้างานวันนี้: งานเรียงตามเวลาที่เหลือ งานที่เกินกำหนดขึ้นก่อน'
  return (
    <>
      <figure
        role="img"
        aria-label={label}
        data-reveal
        className="mt-10 hidden overflow-hidden rounded-control border border-rule bg-ground shadow-[0_24px_60px_rgba(20,24,26,0.10)] lg:block"
      >
        <div className="flex h-[37px] items-center gap-2 border-b border-rule-soft px-4">
          {['bg-[#ff5f57]', 'bg-[#febc2e]', 'bg-[#28c840]'].map((color, i) => (
            <span key={i} className={`size-[9px] rounded-full ${color}`} />
          ))}
          <span className="t-caption ml-2 text-ink-3">workcatch.app</span>
        </div>
        <div className="grid h-[560px] grid-cols-[232px_1fr]">
          <MiniRail />
          <div className="px-7 pt-[26px]">
            <p className="font-display text-[22px] font-medium">งานวันนี้</p>
            <div className="mt-3.5 bg-sheet">
              {ROWS.map((r, i) => (
                <div
                  key={r.title}
                  // The list fills in from the top, overdue first — the order
                  // the product sorts in, shown as it happens.
                  data-reveal
                  style={delay(220 + i * 80)}
                  className={`flex h-[63px] items-center px-4 ${i < ROWS.length - 1 ? 'border-b border-rule-soft' : ''}`}
                >
                  <span className={`${r.em ? 't-time-em' : 't-time'} ${r.tone} w-[122px] shrink-0`}>{r.when}</span>
                  <span className="min-w-0">
                    <span className="block text-[14px] leading-[1.3]">{r.title}</span>
                    <span className="t-meta mt-[3px] block text-ink-3">{r.sub}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </figure>

      {/* Phone: no rail, four rows, time and title only — Figma 289:1729. */}
      <figure
        role="img"
        aria-label={label}
        data-reveal
        className="mt-8 overflow-hidden rounded-sheet border border-rule lg:hidden"
      >
        <div className="flex items-center justify-between bg-ground px-3.5 py-3">
          <span className="text-[13px] font-medium">งานวันนี้</span>
          <span className="t-caption text-ink-3">เรียงตามเวลาที่เหลือ</span>
        </div>
        {ROWS.slice(0, 4).map((r) => (
          <div key={r.title} className="flex items-center gap-4 border-t border-rule-soft px-3.5 py-3">
            <span className={`${r.em ? 't-time-em' : 't-time'} ${r.tone} w-[74px] shrink-0`}>{r.when}</span>
            <span className="min-w-0 truncate text-[13px]">{r.title}</span>
          </div>
        ))}
      </figure>
    </>
  )
}

const RAIL_GROUPS: { label: string; items: { name: string; count?: string; late?: boolean; on?: boolean }[] }[] = [
  { label: 'วันนี้', items: [{ name: 'ภาพรวม' }, { name: 'กล่องรับงาน', count: '6' }, { name: 'เกินกำหนด', count: '2', late: true }] },
  {
    label: 'งานของฉัน',
    items: [
      { name: 'รายการงาน', count: '48', on: true },
      { name: 'บอร์ด' },
      { name: 'ปฏิทิน' },
      { name: 'รอคนอื่น', count: '5' },
      { name: 'บันทึก', count: '12' },
    ],
  },
  { label: 'โปรเจกต์', items: [{ name: 'รายงานประจำเดือน', count: '18' }] },
]

function MiniRail() {
  return (
    <div className="overflow-hidden border-r border-rule-soft bg-sheet px-5 pt-7">
      <p className="t-wordmark">WorkCatch</p>
      <p className="t-meta mt-px text-ink-3">ไม่ให้งานหล่น</p>
      <div className="mt-6 flex h-[43px] items-center rounded-control bg-brand-strong px-5 text-[13px] font-medium text-white">
        เพิ่มงาน
      </div>
      {RAIL_GROUPS.map((g) => (
        <div key={g.label} className="mt-6">
          <p className="t-label px-3 text-ink-3">{g.label}</p>
          <div className="mt-1.5">
            {g.items.map((it) => (
              <div
                key={it.name}
                className={`flex h-[35px] items-center justify-between rounded-control px-3 text-[13px] ${
                  it.on ? 'bg-selected font-medium text-ink' : 'text-ink-2'
                }`}
              >
                <span>{it.name}</span>
                {it.count && (
                  <span className={`t-caption ${it.late ? 'font-semibold text-time-late' : 'text-ink-3'}`}>{it.count}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- content -- */

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: React.ReactNode; lead?: string }) {
  return (
    <div data-reveal>
      <p className="t-eyebrow text-ink-3">{eyebrow}</p>
      <h2 className="font-display mt-3 max-w-[900px] text-[28px] leading-[1.3] font-semibold tracking-[-0.6px] lg:mt-7 lg:text-[40px] lg:tracking-[-1px]">
        {title}
      </h2>
      {lead && (
        <p className="mt-4 max-w-[760px] text-[14px] leading-[1.7] text-ink-2 lg:mt-6 lg:text-[16px]">{lead}</p>
      )}
    </div>
  )
}

/** Grey paper cards: a statement, not a control, so no border and no lift. */
function Statements({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div className="mt-8 grid gap-3 lg:mt-12 lg:grid-cols-3 lg:gap-6">
      {items.map((it, i) => (
        <div key={it.title} data-reveal style={delay(i * 90)} className="rounded-sheet bg-ground p-[18px] lg:p-6">
          <p className="text-[15px] font-medium leading-[1.35]">{it.title}</p>
          <p className="mt-2 text-[13px] leading-[1.7] text-ink-2">{it.body}</p>
        </div>
      ))}
    </div>
  )
}

function Problems() {
  return (
    <section className="mt-16 lg:mt-32">
      <SectionHead
        eyebrow="ปัญหาที่เจอทุกวัน"
        title={
          <>
            <span className="lg:block">งานไม่ได้หายเพราะขี้เกียจ </span>
            <span className="lg:block">แต่หายเพราะไม่มีใครเห็นมันพร้อมกัน</span>
          </>
        }
      />
      <Statements
        items={[
          { title: 'รับงานจากสี่ทาง จำไว้ในหัวทางเดียว', body: 'ไลน์ อีเมล ห้องประชุม และคนเดินมาบอก — สุดท้ายไปกองอยู่ในความจำ' },
          { title: 'รู้ตัวอีกทีตอนถูกทวง', body: 'ไม่มีอะไรเตือนก่อน มีแต่คนทวงทีหลัง ซึ่งสายไปแล้ว' },
          { title: 'ทำงานเดิมซ้ำโดยไม่ต้อง', body: 'ครั้งก่อนทำยังไงก็ลืม ต้องไปถามคนเดิมใหม่ทุกครั้ง' },
        ]}
      />
    </section>
  )
}

const FEATURES = [
  {
    n: '01',
    title: 'จดได้ใน 5 วินาที',
    body: 'กด N ที่ไหนก็ได้ พิมพ์ชื่องาน กด Enter — กำหนดส่งค่อยใส่ทีหลังตอนที่รู้ ไม่ต้องกรอกฟอร์มตอนที่ยังไม่รู้อะไรเลย',
  },
  {
    n: '02',
    title: 'เตือนผ่าน LINE ก่อนถึงกำหนด',
    body: 'ไม่ต้องเปิดเว็บมาดู ระบบทักไปหาในแอปที่คุณเปิดอยู่แล้วทั้งวัน ตั้งได้ว่าจะเตือนล่วงหน้าเท่าไหร่',
  },
  {
    n: '03',
    title: 'ทักบอทแล้วกลายเป็นงาน',
    body: 'พิมพ์ “เตือนส่งรายงานพรุ่งนี้ 10 โมง” หาบอท ระบบอ่านวันเวลาให้ แล้วสร้างเป็นร่างรอไว้ ถ้าอ่านไม่ชัดจะถามก่อน ไม่เดาเอง',
  },
  {
    n: '04',
    title: 'เก็บวิธีทำงานไว้กับงาน',
    body: 'ขั้นตอน เช็คลิสต์ ลิงก์ ผู้ติดต่อ และข้อมูลเข้าสู่ระบบที่เข้ารหัสไว้ — คราวหน้าเปิดงานก็เจอวิธีทำทันที',
  },
]

function Features() {
  return (
    <section id="features" className="mt-16 scroll-mt-8 lg:mt-32">
      <SectionHead
        eyebrow="ทำอะไรได้"
        title="สี่อย่าง ไม่มีอย่างที่ห้า"
        lead="เครื่องมือจัดการงานส่วนใหญ่พังเพราะพยายามทำทุกอย่าง จนต้องใช้เวลาดูแลตัวมันเองมากกว่าทำงานจริง"
      />
      <div className="mt-8 grid gap-3 lg:mt-12 lg:grid-cols-2 lg:gap-6">
        {FEATURES.map((f, i) => (
          <div key={f.n} data-reveal style={delay((i % 2) * 90)} className="rounded-sheet border border-rule-soft p-5 lg:p-7">
            <p className="t-caption text-brand-strong">{f.n}</p>
            <h3 className="font-display mt-2 text-[19px] leading-[1.4] font-medium lg:mt-2.5 lg:text-[22px]">{f.title}</h3>
            <p className="mt-2 text-[13px] leading-[1.75] text-ink-2 lg:mt-2.5 lg:text-[14px]">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

type Step = {
  title: string
  body: string
  link?: true
}

const STEPS: Step[] = [
  { title: 'เข้าด้วยบัญชี LINE', body: 'ไม่ต้องตั้งรหัสผ่านใหม่ ไม่ต้องจำเพิ่มอีกอัน' },
  { title: 'เพิ่มบอทเป็นเพื่อน', body: 'LINE ส่งข้อความหาได้เฉพาะคนที่เป็นเพื่อน ขั้นนี้ข้ามไม่ได้', link: true },
  { title: 'จดงานแรก', body: 'พิมพ์ชื่องานแล้วกด Enter ที่เหลือค่อยเติมทีหลัง' },
]

function HowTo() {
  return (
    <section id="how" data-reveal className="mt-16 scroll-mt-8 rounded-sheet bg-ink px-6 py-8 text-on-dark lg:mt-32 lg:p-14">
      <p className="t-eyebrow opacity-60">วิธีใช้</p>
      <h2 className="font-display mt-2 text-[26px] leading-[1.3] font-medium tracking-[-0.5px] lg:mt-3.5 lg:text-[36px]">
        สามขั้น จบใน 2 นาที
      </h2>
      <ol className="mt-6 grid gap-5 lg:mt-9 lg:grid-cols-3 lg:gap-6">
        {STEPS.map((s, i) => (
          <li key={s.title} data-reveal style={delay(240 + i * 120)}>
            {/* brand/on-dark, not brand/emerald: these numbers sit on ink. */}
            <span className="t-time text-brand-on-dark">{i + 1}</span>
            <p className="mt-1.5 text-[15px] leading-[1.45] font-medium lg:mt-2 lg:text-[16px]">{s.title}</p>
            <p className="mt-1 text-[13px] leading-[1.6] opacity-70 lg:mt-2">{s.body}</p>
            {s.link && (
              <a
                href={LINE_OA_ADD_FRIEND_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="เพิ่ม WorkCatch เป็นเพื่อนใน LINE (เปิดในแท็บใหม่)"
                className="-my-3 flex min-h-11 items-center text-[12.5px] font-medium underline underline-offset-2 lg:text-[13px]"
              >
                เพิ่มเพื่อน {LINE_OA_ID} <span aria-hidden>↗</span>
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

type Plan = {
  name: string
  price: string
  per: string
  items: string[]
  cta: string
  to: string
  recommended?: boolean
  /** Not on sale yet. Rendered as a statement, not as a button that does nothing. */
  soon?: boolean
}

function Pricing({ signedIn }: { signedIn: boolean }) {
  const plans: Plan[] = [
    {
      name: 'ฟรี',
      price: '฿0',
      per: 'ตลอดไป',
      // No Web Push: it is not built, and a pricing table is a promise.
      items: ['งานและโปรเจกต์ไม่จำกัด', 'แจ้งเตือนในแอปไม่จำกัด', 'LINE สรุปงานวันละครั้ง', 'บันทึกและคู่มือไม่จำกัด'],
      cta: 'เริ่มใช้ฟรี',
      to: signedIn ? '/app/dashboard' : '/login',
    },
    {
      name: 'Plus',
      price: '฿99',
      per: 'ต่อเดือน · ฿990 ต่อปี',
      items: ['ทุกอย่างในแผนฟรี', 'LINE เตือนทุกงานตามเวลาที่ตั้งเอง', 'เลื่อนเตือนและปิดงานจากในแชท', 'ประวัติแจ้งเตือนย้อนหลัง 12 เดือน'],
      cta: 'อัปเกรดเป็น Plus',
      to: signedIn ? '/app/upgrade' : '/login',
      recommended: true,
      // Payment is not open. The terms say so, and this has to say the same.
      soon: true,
    },
  ]

  return (
    <section id="pricing" className="mt-16 scroll-mt-8 lg:mt-32">
      <SectionHead
        eyebrow="ราคา"
        title="ใช้ฟรีได้จริง ไม่ใช่ทดลอง 14 วัน"
        lead="ส่วนที่คิดเงินคือการเตือนผ่าน LINE เพราะ LINE คิดค่าส่งต่อข้อความ ส่วนการแจ้งเตือนในแอปฟรีไม่จำกัด ไม่ว่าจะใช้แผนไหน"
      />
      <div className="mt-8 grid gap-4 lg:mt-12 lg:grid-cols-2 lg:gap-6">
        {plans.map((p, i) => (
          // The reveal sits on a wrapper: the card's own wc-lift owns its
          // transform and transition for the hover, and two rules fighting
          // over one transform would make the lift stutter.
          <div key={p.name} data-reveal style={delay(i * 120)}>
          <div
            className="wc-lift h-full rounded-sheet border border-rule bg-sheet p-[22px] hover:border-brand lg:p-8"
          >
            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-[22px] font-medium lg:text-[24px]">{p.name}</h3>
              {p.recommended && (
                <span className="t-caption rounded-pill bg-mint px-2 py-0.5 text-brand-strong">แนะนำ</span>
              )}
            </div>
            <p className="font-display mt-3 text-[40px] leading-[1.3] font-semibold lg:text-[46px]">{p.price}</p>
            <p className="t-meta text-ink-3">{p.per}</p>
            <ul className="mt-5 space-y-2 lg:mt-6">
              {p.items.map((it) => (
                <li key={it} className="flex items-start gap-2.5 text-[13px] leading-[1.45]">
                  <span aria-hidden className="mt-[2px] shrink-0 font-mono text-[12px] text-brand-strong">✓</span>
                  {it}
                </li>
              ))}
            </ul>
            {p.soon ? (
              <p className="mt-6 flex h-[46px] w-full items-center justify-center rounded-control bg-ground text-[14px] font-medium text-ink-3">
                เปิดให้สมัครเร็ว ๆ นี้
              </p>
            ) : (
              <Link
                to={p.to}
                className={`wc-lift mt-6 flex h-[46px] w-full items-center justify-center rounded-control text-[14px] font-medium ${
                  p.recommended ? 'bg-brand-strong text-white' : 'border border-rule bg-sheet text-ink'
                }`}
              >
                {p.cta}
              </Link>
            )}
          </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Trust() {
  return (
    <section className="mt-16 lg:mt-32">
      <SectionHead eyebrow="ข้อมูลของคุณ" title="สิ่งที่เราไม่ทำ" />
      <Statements
        items={[
          { title: 'ไม่โพสต์อะไรลง LINE ของคุณ', body: 'ขอสิทธิ์แค่ชื่อกับรูปโปรไฟล์ และไม่อ่านแชทของคุณ' },
          {
            title: 'ข้อมูลลับเข้ารหัสก่อนบันทึก',
            body: 'รหัสผ่านที่เก็บไว้ถูกเข้ารหัส แสดงเป็นจุด และไม่เข้าดัชนีค้นหา ไม่อยู่ใน log ไม่ถูกส่งทาง LINE',
          },
          {
            title: 'ผู้ดูแลระบบไม่เห็นงานคุณ',
            body: 'หน้าหลังบ้านเห็นแค่ตัวเลขรวมกับสถานะ ไม่เห็นชื่องาน เนื้อหาบันทึก หรือค่าที่ซ่อนไว้',
          },
        ]}
      />
    </section>
  )
}

function Closing({ signedIn }: { signedIn: boolean }) {
  return (
    <section data-reveal className="mt-16 rounded-sheet bg-ground px-6 py-10 text-center lg:mt-32 lg:py-16">
      <h2 className="font-display text-[22px] leading-[1.35] font-medium tracking-[-0.4px] lg:text-[36px]">
        เริ่มจากงานเดียวที่กลัวว่าจะลืม
      </h2>
      <p className="mt-2.5 text-[13px] leading-[1.5] text-ink-2 lg:mt-3 lg:text-[15px]">
        ใช้เวลาไม่ถึงสองนาที
        <span className="hidden lg:inline"> และไม่ต้องย้ายงานเก่าทั้งหมดมาก่อน</span>
      </p>
      <LineStart signedIn={signedIn} className="mx-auto mt-7 w-full lg:w-fit" />
    </section>
  )
}
