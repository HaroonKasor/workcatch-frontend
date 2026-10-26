import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { LineMark } from '../components/LineMark'
import { useMe } from '../lib/api'
import { LINE_OA_ADD_FRIEND_URL, LINE_OA_ID } from '../lib/line'
import { entryDestination } from '../lib/session'
import { BrandMark } from '../components/BrandMark'

/**
 * /login — Figma node 32:3 (1440), 248:1569 (390), states 248:1598
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
    <div className="wc-scale min-h-viewport bg-sheet lg:grid lg:grid-cols-[56%_1fr]">
      <Pitch />
      <SignIn outcome={outcome} />
    </div>
  )
}

/* ------------------------------------------------------------------ pitch -- */

const PROOF = [
  'เตือนล่วงหน้าทาง LINE ตามเวลาที่คุณตั้งเอง',
  'เห็นทั้งวันในหน้าจอเดียว เรียงตามเวลาที่เหลือ',
  'เก็บวิธีทำงานไว้กับงาน คราวหน้าไม่ต้องถามใครซ้ำ',
]

function Pitch() {
  return (
    <>
      {/* Phone: the dark block shrinks to a 300px header — Figma 248:1570. */}
      <header className="flex min-h-[300px] flex-col bg-ink px-5 pt-11 pb-7 text-on-dark lg:hidden">
        <Wordmark />
        <div className="mt-auto">
          <Headline className="text-[28px]" />
          <p className="mt-4 text-[13px] leading-[1.5] opacity-60">
            จดที่เดียว แล้วให้ LINE เตือนก่อนถึงกำหนด
          </p>
        </div>
      </header>

      <aside className="hidden bg-ink px-[72px] pt-16 pb-14 text-on-dark lg:flex lg:flex-col">
        <Wordmark />

        <div className="mt-auto max-w-[600px]">
          <p className="t-eyebrow opacity-50">รับงานจากไลน์ อีเมล ห้องประชุม และคำสั่งปากเปล่า</p>
          <Headline className="mt-3 text-[44px]" />
          <p className="mt-5 text-[15px] leading-[1.5] opacity-65">
            จดที่เดียว แล้วให้ LINE เตือนก่อนถึงกำหนด — ไม่ใช่หลังจากมีคนทวงแล้ว
          </p>

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

        <Preview />
      </aside>
    </>
  )
}

function Wordmark() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <BrandMark />
        <p className="t-wordmark">WorkCatch</p>
      </div>
      <p className="t-meta mt-px pl-8 opacity-50">ไม่ให้งานหล่น</p>
    </div>
  )
}

function Headline({ className = '' }: { className?: string }) {
  return (
    <h1 className={`font-display font-semibold leading-[1.3] tracking-[-1px] ${className}`}>
      <span className="block">งานที่รับปากไว้</span>
      <span className="block">จะไม่หล่นอีก</span>
    </h1>
  )
}

/**
 * The product, not a picture of the product — Figma 246:1586.
 *
 * A white card on the dark panel, drawn with the same tokens the real list uses,
 * so what a visitor is shown and what they get after signing in are the same
 * object. The time colours are the point of the whole screen and are the only
 * colour on it besides the LINE mark.
 */
function Preview() {
  return (
    <div className="mt-14 max-w-[560px] overflow-hidden rounded-sheet bg-sheet text-ink">
      <div className="flex items-center justify-between gap-4 border-b border-rule-soft px-[18px] py-3.5">
        <p className="text-[15px] font-medium">งานวันนี้</p>
        <p className="t-caption text-ink-3">เรียงตามเวลาที่เหลือ</p>
      </div>
      <PreviewRow when="เกิน 3 วัน" tone="text-time-late" em title="ส่งใบเสนอราคา บ.ทรัพย์เจริญ" sub="งานฝากทั่วไป · สั่งโดย คุณนพ" />
      <PreviewRow when="11:00" tone="text-time-today" title="ประชุมสรุป Q3 กับฝ่ายขาย" sub="รายงานประจำเดือน" />
      <PreviewRow when="15:00" tone="text-time-today" title="รีวิวเอกสารสัญญาผู้รับเหมา" sub="งานฝากทั่วไป · สั่งโดย คุณวิชัย" last />
    </div>
  )
}

function PreviewRow({ when, tone, title, sub, em, last }: {
  when: string
  tone: string
  title: string
  sub: string
  em?: boolean
  last?: boolean
}) {
  return (
    <div className={`flex items-center gap-4 px-[18px] py-[13px] ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className={`${em ? 't-time-em' : 't-time'} ${tone} w-[74px] shrink-0`}>{when}</span>
      <span className="min-w-0">
        <span className="block text-[13px] leading-[1.35]">{title}</span>
        <span className="t-caption mt-1 block text-ink-3">{sub}</span>
      </span>
    </div>
  )
}

/* ---------------------------------------------------------------- sign in -- */

function SignIn({ outcome }: { outcome: Outcome }) {
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
    <main className="flex justify-center px-5 py-10 lg:items-center lg:px-6 lg:py-16">
      <div className="w-full max-w-[396px]">
        {/* Written for both kinds of visitor. The landing page's "เริ่มใช้ด้วย
            LINE" lands here, so "ยินดีต้อนรับกลับ" greeted most people as
            returning users they are not. */}
        <p className="t-eyebrow text-ink-3">ใช้งานด้วย LINE</p>
        <h2 className="font-display mt-1 text-[28px] leading-[1.25] font-medium tracking-[-0.5px]">
          เริ่มใช้งานหรือเข้าสู่ระบบ
        </h2>
        <p className="mt-2.5 text-[14px] leading-[1.55] text-ink-2">
          ใช้บัญชี LINE เดิมได้เลย ระบบจะสร้างบัญชีให้เมื่อเข้าครั้งแรก
        </p>

        {outcome !== 'ready' && <Notice outcome={outcome} />}

        {/* Keep the anchor mounted until the browser follows it, including on iOS. */}
        <a
          href="/api/auth/line/start"
          aria-disabled={starting}
          aria-live="polite"
          onClick={(event) => {
            if (starting) event.preventDefault()
            else setStarting(true)
          }}
          className={`wc-lift mt-6 flex h-[54px] w-full items-center justify-center gap-3 rounded-control text-[14px] font-semibold text-ink ${starting ? 'bg-line/35' : 'bg-line'}`}
        >
          <LineMark className="size-[24px]" />
          {label}
        </a>

        <p className="t-note mt-3.5 text-ink-3">
          {starting
            ? 'กำลังเปิด LINE หากไม่เปลี่ยนหน้า โปรดลองอีกครั้ง'
            : 'ไม่ต้องตั้งรหัสผ่านใหม่ และไม่ต้องจำเพิ่มอีกอัน'}
        </p>

        <a
          href="/api/auth/line/start?manual=true"
          className="mt-4 inline-flex min-h-11 items-center text-[13px] text-ink-2 underline underline-offset-2"
        >
          เปิดแอป LINE ไม่ได้? เข้าสู่ระบบผ่านเบราว์เซอร์
        </a>

        <div className="mt-6 h-px w-full bg-rule-soft" />

        <p className="t-label mt-5 text-ink-3">ก่อนกด รู้ไว้สองข้อ</p>
        <ol className="mt-3.5 space-y-3">
          <Fact n="1" title="LINE จะถามว่าอนุญาตให้ WorkCatch เห็นอะไร" titleShort="LINE จะถามว่าอนุญาตให้เห็นอะไร">
            <span className="hidden lg:inline">
              ขอแค่ชื่อและรูปโปรไฟล์ ไม่โพสต์อะไรลงไทม์ไลน์ และไม่อ่านแชทของคุณ
            </span>
            <span className="lg:hidden">ขอแค่ชื่อและรูปโปรไฟล์ ไม่โพสต์อะไร และไม่อ่านแชทของคุณ</span>
          </Fact>
          <Fact n="2" title="ต้องเพิ่มบัญชีทางการเป็นเพื่อน">
            <>
              <span className="hidden lg:inline">
                LINE ยอมให้ส่งข้อความหาเฉพาะคนที่เป็นเพื่อน ถ้าไม่เพิ่ม จะใช้เว็บได้แต่จะไม่มีการเตือน
              </span>
              <span className="lg:hidden">ถ้าไม่เพิ่ม จะใช้เว็บได้แต่จะไม่มีการเตือนส่งถึง</span>
              <span className="-my-3 block">
                <a
                  href={LINE_OA_ADD_FRIEND_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="เพิ่ม WorkCatch เป็นเพื่อนใน LINE (เปิดในแท็บใหม่)"
                  className="flex min-h-11 items-center text-[12.5px] font-medium text-ink underline underline-offset-2"
                >
                  เพิ่มเพื่อน {LINE_OA_ID} <span aria-hidden>↗</span>
                </a>
              </span>
            </>
          </Fact>
        </ol>

        {/* After the sign-in button in the tab order, deliberately: the first
            Tab on this screen has to land on the one action it exists for. */}
        <p className="t-note mt-6 text-ink-3">
          การเข้าสู่ระบบถือว่ายอมรับ
          <Link to="/terms" className="underline underline-offset-2 hover:text-ink">ข้อกำหนดการใช้บริการ</Link>
          {' '}และ
          <Link to="/privacy" className="underline underline-offset-2 hover:text-ink">นโยบายความเป็นส่วนตัว</Link>
        </p>
      </div>
    </main>
  )
}

/**
 * What went wrong, and — more important — what did not.
 *
 * Both messages exist to say that nothing was lost, because that is the actual
 * question a person has when a sign-in bounces them back. The glyph is there so
 * the tone is not carried by colour alone.
 */
function Notice({ outcome }: { outcome: Exclude<Outcome, 'ready'> }) {
  const bad = outcome !== 'expired'
  return (
    <div
      role="alert"
      className={`mt-5 flex gap-3 rounded-sheet border px-3.5 py-3 ${
        bad ? 'border-error/35 bg-error/[0.06]' : 'border-rule bg-ground'
      }`}
    >
      <span
        aria-hidden
        className={`mt-px shrink-0 font-mono text-[12px] ${bad ? 'text-error' : 'text-ink-2'}`}
      >
        {bad ? '✕' : '!'}
      </span>
      <p className="text-[13px] leading-[1.5] text-ink-2">
        {outcome === 'failed' &&
          'ยังเข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง หากยังเข้าไม่ได้ โปรดติดต่อผู้ดูแล'}
        {outcome === 'expired' &&
          'ออกจากระบบอัตโนมัติเพราะไม่ได้ใช้งานนาน งานและบันทึกทั้งหมดยังอยู่ครบ'}
        {outcome === 'suspended' && (
          <>
            บัญชีนี้ถูกระงับการใช้งาน จึงเข้าสู่ระบบไม่ได้ ถ้าคิดว่าเป็นความผิดพลาด{' '}
            <Link to="/contact" className="underline underline-offset-2 hover:text-ink">
              ติดต่อเรา
            </Link>
          </>
        )}
      </p>
    </div>
  )
}

function Fact({ n, title, titleShort, children }: {
  n: string
  title: string
  titleShort?: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span className="t-caption w-3.5 shrink-0 text-ink-3">{n}</span>
      <span className="min-w-0">
        <span className="block text-[13px] leading-[1.3] font-medium">
          {titleShort ? (
            <>
              <span className="hidden lg:inline">{title}</span>
              <span className="lg:hidden">{titleShort}</span>
            </>
          ) : (
            title
          )}
        </span>
        <span className="mt-1 block text-[12px] leading-[1.45] text-ink-3">{children}</span>
      </span>
    </li>
  )
}
