import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { LineMark } from '../components/LineMark'
import { useMe } from '../lib/api'
import { entryDestination } from '../lib/session'
import { BrandMark } from '../components/BrandMark'

/**
 * /login — Figma 32:3 (1440), 473:2272 (390), 491:2908 / 491:2954 (iPad), error states 473:2324 / 473:2382 / 473:2439
 *
 * The left panel shows three real task rows rather than a feature list. What
 * this product does is make lateness visible; showing that is more honest than
 * describing it, and it is the only screenshot on the page that is not a claim.
 *
 * The LINE green is the ONE documented exception to "colour belongs to time".
 * It is a vendor mark, like a Google sign-in button, and this screen has no task
 * ledger for it to compete with. Its label is charcoal, not white: white on
 * #06C755 measures 2.26:1 and fails, and a sign-in button nobody can read is a
 * worse brand violation than a dark label on green.
 */

/**
 * Why the flow can come back unhappy.
 *
 * The backend owns the redirect and puts its reason in the query string. The
 * values below are the ones it sends plus the OAuth spellings LINE itself uses,
 * because a reason this screen does not recognise must still not render as
 * silence — anything unknown falls through to the cancelled copy, which is the
 * safe thing to say: it claims nothing was changed, and nothing was.
 */
type Outcome = 'ready' | 'failed' | 'expired' | 'suspended'

function outcomeOf(reason: string | null): Outcome {
  if (!reason) return 'ready'
  if (reason === 'session_expired' || reason === 'expired') return 'expired'
  // LineAccountService.ACCOUNT_SUSPENDED. Its own message, because "you pressed
  // cancel at LINE" would send the person round the same loop forever.
  if (reason === 'account_suspended') return 'suspended'
  return 'failed'
}


export default function Login() {
  const me = useMe()
  const [params] = useSearchParams()
  const outcome = outcomeOf(params.get('error'))

  // A failed return from LINE is an outcome to read, not a fresh attempt to
  // route the person somewhere else. In every other case, wait for the answer
  // before deciding whether this card belongs here at all.
  if (!params.has('error')) {
    const to = entryDestination({ pending: me.isPending, signedIn: !!me.data })
    if (!to) return <div className="min-h-viewport bg-ground" aria-busy="true" />
    if (to !== '/login') return <Navigate to={to} replace />
  }

  return (
    <div className="wc-scale">
      {/* Phone and iPad (below 1280): the preview on grey, the sign-in on a white
          sheet — under it on a phone and an iPad held upright, beside it when the
          iPad is turned. */}
      <div className="flex min-h-viewport flex-col bg-ground min-[900px]:grid min-[900px]:grid-cols-2 xl:hidden">
        <section className="flex flex-1 flex-col items-center px-5 pt-3 pb-8 md:justify-center md:px-12">
          <BackHome className="self-start md:hidden" />
          <div className="mt-4 w-full max-w-[350px] md:mt-0 md:max-w-[340px]">
            <Brand />
            <Preview />
          </div>
        </section>
        <main className="rounded-t-[20px] bg-sheet px-5 pt-7 pb-8 md:px-12 md:pt-8 min-[900px]:flex min-[900px]:flex-col min-[900px]:justify-center min-[900px]:rounded-none">
          <BackHome className="mb-3 hidden md:inline-flex" />
          <SignInPanel outcome={outcome} />
        </main>
      </div>

      <div className="hidden min-h-viewport bg-sheet xl:grid xl:grid-cols-[56%_1fr]">
        <Pitch />
        <main className="flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-[396px]">
            <SignInPanel outcome={outcome} />
          </div>
        </main>
      </div>
    </div>
  )
}

function BackHome({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex min-h-11 items-center gap-1 text-[13px] text-ink-2 hover:text-ink ${className}`}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      หน้าแรก
    </Link>
  )
}

function Brand() {
  return (
    <div className="mb-5 flex items-center justify-center gap-2.5">
      <BrandMark size={30} className="text-ink" />
      <p className="t-wordmark">WorkCatch</p>
    </div>
  )
}

/* ------------------------------------------------------------------ pitch -- */

const PROOF = [
  'เตือนล่วงหน้าทาง LINE ตามเวลาที่คุณตั้งเอง',
  'เห็นทั้งวันในหน้าจอเดียว เรียงตามเวลาที่เหลือ',
  'เก็บวิธีทำงานไว้กับงาน คราวหน้าไม่ต้องถามใครซ้ำ',
]

/** Desktop only: the dark panel beside the sign-in. */
function Pitch() {
  return (
    <aside className="flex flex-col bg-ink px-[72px] pt-16 pb-14 text-on-dark">
      <div className="flex items-center gap-2">
        <BrandMark />
        <p className="t-wordmark">WorkCatch</p>
      </div>

      <div className="mt-auto max-w-[600px]">
        <h1 className="font-display mt-3 text-[44px] leading-[1.3] font-semibold tracking-[-1px]">
          <span className="block">งานที่รับปากไว้</span>
          <span className="block">จะไม่หล่นอีก</span>
        </h1>

        <ul className="mt-8 space-y-2.5">
          {PROOF.map((p) => (
            <li key={p} className="flex items-start gap-[10px]">
              {/* brand/on-dark, not brand/emerald: this tick sits on ink. */}
              <span className="mt-[3px] shrink-0 font-mono text-[12px] text-brand-on-dark" aria-hidden>✓</span>
              <span className="text-[13px] leading-[1.45] opacity-90">{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-14 max-w-[560px] overflow-hidden rounded-sheet bg-sheet text-ink">
        <PreviewRows />
      </div>
    </aside>
  )
}

/**
 * The product, not a picture of the product — three real task rows drawn with the
 * same tokens the list uses, so what a visitor is shown and what they get after
 * signing in are the same object. The time colours are the only colour on it.
 */
const PREVIEW = [
  { when: '3 วัน', tone: 'text-time-late', em: true, title: 'ส่งใบเสนอราคา บ.ทรัพย์เจริญ', sub: 'งานฝากทั่วไป' },
  { when: '11:00', tone: 'text-time-today', title: 'ประชุมสรุป Q3 กับฝ่ายขาย', sub: 'รายงานประจำเดือน' },
  { when: '15:00', tone: 'text-time-soon', title: 'รีวิวเอกสารสัญญาผู้รับเหมา', sub: 'งานฝากทั่วไป' },
]

function PreviewRows() {
  return (
    <>
      {PREVIEW.map((r, i) => (
        <div key={r.title} className={`flex items-start gap-4 px-[18px] py-3.5 ${i > 0 ? 'border-t border-rule-soft' : ''}`}>
          <span className={`${r.em ? 't-time-em' : 't-time'} ${r.tone} w-[52px] shrink-0 pt-0.5`}>{r.when}</span>
          <span className="min-w-0">
            <span className="block text-[15px] leading-[1.35] font-medium">{r.title}</span>
            <span className="mt-0.5 block text-[13px] text-ink-3">{r.sub}</span>
          </span>
        </div>
      ))}
    </>
  )
}

function Preview() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-rule-soft bg-sheet">
      <PreviewRows />
    </div>
  )
}

/* ---------------------------------------------------------------- sign in -- */

const TITLE: Record<Outcome, string> = {
  ready: 'เริ่มใช้งานหรือเข้าสู่ระบบ',
  failed: 'เริ่มใช้งานหรือเข้าสู่ระบบ',
  expired: 'ยินดีต้อนรับกลับ',
  suspended: 'เข้าสู่ระบบไม่ได้',
}

function SignInPanel({ outcome }: { outcome: Outcome }) {
  /**
   * Pressing the button navigates away, so the page stays mounted and visible
   * for as long as the redirect takes. Without this the screen looks like the
   * press did not register, and the second press opens a second OAuth window —
   * which is why the button also becomes unclickable, not merely relabelled.
   */
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    const onPageShow = () => setStarting(false)
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  useEffect(() => {
    if (!starting) return
    const timer = window.setTimeout(() => setStarting(false), 8000)
    return () => window.clearTimeout(timer)
  }, [starting])

  const label =
    starting ? 'กำลังพาไปที่ LINE…'
    : outcome === 'failed' ? 'ลองเข้าสู่ระบบอีกครั้ง'
    : outcome === 'expired' ? 'เข้าสู่ระบบอีกครั้ง'
    : 'เข้าสู่ระบบด้วย LINE'

  return (
    <div>
      <h1 className="font-display text-[24px] leading-[1.3] font-semibold tracking-[-0.4px]">{TITLE[outcome]}</h1>

      {outcome !== 'ready' && <Notice outcome={outcome} />}

      {outcome === 'suspended' ? (
        <Link
          to="/contact"
          className="wc-lift mt-4 flex h-[52px] w-full items-center justify-center rounded-control bg-ink text-[15px] font-medium text-on-dark"
        >
          ติดต่อเรา
        </Link>
      ) : (
        // Keep the anchor mounted until the browser follows it, including on iOS.
        // The LINE green, charcoal label: white on #06C755 measures 2.26:1.
        <a
          href="/api/auth/line/start"
          aria-disabled={starting}
          aria-live="polite"
          onClick={(event) => {
            if (starting) event.preventDefault()
            else setStarting(true)
          }}
          className={`wc-lift mt-4 flex h-[52px] w-full items-center justify-center gap-3 rounded-control text-[15px] font-semibold text-ink ${starting ? 'bg-line/35' : 'bg-line'} ${outcome === 'ready' ? 'mt-5' : ''}`}
        >
          <LineMark className="size-[24px]" />
          <span aria-hidden className="h-6 w-px bg-ink/20" />
          {label}
        </a>
      )}

      <a
        href="/api/auth/line/start?manual=true"
        className="mt-2 flex min-h-11 items-center justify-center gap-1.5 text-[14px] text-ink-2 hover:text-ink"
      >
        เข้าสู่ระบบผ่านเบราว์เซอร์
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1H6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>

      {/* After the sign-in button in the tab order, deliberately: the first
          Tab on this screen has to land on the one action it exists for. */}
      <p className="mt-4 text-center text-[13px] leading-[1.6] text-ink-3">
        การเข้าสู่ระบบถือว่ายอมรับ{' '}
        <Link to="/terms" className="underline underline-offset-2 hover:text-ink">ข้อกำหนดการใช้บริการ</Link>
        {' '}และ{' '}
        <Link to="/privacy" className="underline underline-offset-2 hover:text-ink">นโยบายความเป็นส่วนตัว</Link>
      </p>
    </div>
  )
}

/**
 * What went wrong, and — more important — what did not. The glyph is there so
 * the tone is not carried by colour alone.
 */
const NOTICE = {
  expired: {
    box: 'bg-ground text-ink-2',
    text: 'ออกจากระบบอัตโนมัติเพราะไม่ได้ใช้งานนาน งานทั้งหมดยังอยู่ครบ',
    icon: (
      <>
        <circle cx="8" cy="8" r="6.25" />
        <path d="M8 4.5V8l2.5 1.5" />
      </>
    ),
  },
  failed: {
    box: 'bg-time-soon-wash text-time-soon-strong',
    text: 'ยกเลิกที่หน้า LINE จึงยังไม่ได้เข้าสู่ระบบ',
    icon: <path d="m3.5 3.5 9 9m0-9-9 9" />,
  },
  suspended: {
    box: 'bg-error/[0.08] text-error',
    text: 'บัญชีนี้ถูกระงับการใช้งาน',
    icon: (
      <>
        <path d="M8 2 14.5 13.5h-13L8 2Z" />
        <path d="M8 6.5v3M8 11.5v.01" />
      </>
    ),
  },
} as const

function Notice({ outcome }: { outcome: Exclude<Outcome, 'ready'> }) {
  const n = NOTICE[outcome]
  return (
    <div role="alert" className={`mt-4 flex items-start gap-3 rounded-control px-3.5 py-3 ${n.box}`}>
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
        {n.icon}
      </svg>
      <p className="text-[14px] leading-[1.5]">{n.text}</p>
    </div>
  )
}
