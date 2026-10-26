import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DeleteAccountDialog } from '../components/DeleteAccountDialog'
import { Skeleton, SkeletonPageHeader, SkeletonScreen } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import {
  ApiError,
  useAiPreferences,
  useAiStatus,
  useLineStatus,
  useLogout,
  useMe,
  useNotificationPreferences,
  useTestLineMessage,
  useUpdateAiPreferences,
  type AiPreferences,
} from '../lib/api'
import { LINE_OA_ADD_FRIEND_URL, LINE_OA_ID } from '../lib/line'
import { priorityLabel } from '../lib/style'
import { store } from '../lib/store'

/**
 * /app/settings — Figma node 42:486
 *
 * Three things here are not decoration:
 *
 * 1. The LINE connection is THREE separate rows, not one switch — Figma 42:486.
 *    Signing in with LINE, agreeing to be messaged, and being a friend of the
 *    bot are three different facts, and only the third one actually allows a
 *    push. A user can be perfectly signed in, with notifications on, and receive
 *    nothing; that is this product's worst failure mode because it is silent, so
 *    the screen refuses to collapse the three into one green tick.
 *
 *    The unlink button is disabled on purpose and says why. LINE is currently
 *    the only way into this account, so unlinking would lock the user out of the
 *    product — a button that does that on one press is not a feature.
 * 2. The quota meter. LINE bills per push, so the notification settings above it
 *    directly decide the monthly cost. Putting the consequence next to the
 *    control is the only honest way to present it.
 * 3. The delete-account section distinguishes irreversible account deletion
 *    from disconnecting LINE or merely turning notifications off.
 */

export default function Settings() {
  const toast = useToast()
  const navigate = useNavigate()
  const me = useMe()
  const logout = useLogout()
  const line = useLineStatus()
  const updatePreferences = useNotificationPreferences()
  const testMessage = useTestLineMessage()
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  if (me.isPending || line.isPending) return <SettingsSkeleton />
  if (line.isError || !line.data) {
    return <SettingsUnavailable />
  }

  const lineStatus = line.data
  const { preferences, testMessages, usage } = lineStatus
  const canTest = lineStatus.linked && testMessages.leftToday > 0

  function updatePreference(key: keyof typeof preferences) {
    const next = { ...preferences, [key]: !preferences[key] }
    updatePreferences.mutate(next, {
      onError: () => toast({
        title: 'บันทึกการตั้งค่าการเตือนไม่สำเร็จ',
        body: 'ลองใหม่อีกครั้ง',
        tone: 'error',
      }),
    })
  }

  function sendTestMessage() {
    testMessage.mutate(undefined, {
      onSuccess: (result) => {
        if (result.status === 'SENT') {
          toast({ title: 'ส่งข้อความทดสอบแล้ว', body: 'ตรวจในแชท LINE', tone: 'success' })
          return
        }
        toast({ title: 'ส่งข้อความทดสอบไม่สำเร็จ', body: 'ลองใหม่อีกครั้ง', tone: 'error' })
      },
      onError: (error) => {
        const failure = error instanceof ApiError ? error : null
        const title = failure?.code === 'LINE_NOT_LINKED'
          ? 'ยังไม่ได้เชื่อม LINE'
          : failure?.code === 'TEST_MESSAGE_LIMIT'
            ? 'ส่งทดสอบครบ 3 ครั้งแล้ววันนี้'
            : failure?.code === 'SENDING_PAUSED'
              ? 'ระบบหยุดส่งข้อความชั่วคราว'
              : 'ส่งข้อความทดสอบไม่สำเร็จ'
        toast({ title, body: failure?.message, tone: 'error' })
      },
    })
  }

  return (
    <>
      <p className="t-caption text-ink-3">บัญชีและการเตือน</p>
      <h1 className="t-page-title mt-1">ตั้งค่า</h1>
      {me.isError && (
        <p role="alert" className="mt-3 text-[12px] text-error">โหลดข้อมูลบัญชีบางส่วนไม่สำเร็จ</p>
      )}

      <div className="mt-7 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div className="min-w-0 space-y-8">
          <Section title="บัญชี" note="เข้าระบบด้วย LINE">
            <div className="flex items-center gap-3 border-b border-rule-soft px-5 py-3.5">
              <span className="size-9 shrink-0 rounded-full bg-ink/10" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{me.data?.displayName || 'บัญชีของคุณ'}</span>
                <span className="t-meta block text-ink-3">เข้าระบบด้วย LINE</span>
              </span>
              <button
                type="button"
                disabled={logout.isPending}
                  onClick={() => {
                    setLogoutError(null)
                    logout.mutate(undefined, {
                      onSuccess: () => {
                        store.reset()
                        navigate('/', { replace: true })
                      },
                      onError: (error) => {
                        const failure = error instanceof ApiError ? error : null
                        if (failure?.status === 401) {
                          store.reset()
                          navigate('/', { replace: true })
                          return
                        }
                        setLogoutError(failure?.message ?? 'ออกจากระบบไม่สำเร็จ ลองใหม่อีกครั้ง')
                      },
                    })
                  }}
                className="wc-lift min-h-11 rounded-control border border-rule px-3.5 py-2 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-55"
              >
                {logout.isPending ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}
              </button>
            </div>
            {logoutError && <p role="alert" className="border-b border-rule-soft px-5 py-3 text-[12px] text-error">{logoutError}</p>}
            <KV k="เขตเวลา" v={me.data?.timezone ?? 'โหลดเขตเวลาไม่สำเร็จ'} last />
          </Section>

          <AiSettings />

          <Section title="การเชื่อม LINE" note="ต้องครบทั้งสามข้อถึงจะได้รับการเตือน">
            {(!lineStatus.linked || lineStatus.friendState === 'BLOCKED') && (
              <div className="border-b border-rule-soft bg-error/[0.07] px-5 py-4">
                <p className="text-[14px] font-semibold text-error">
                  {!lineStatus.linked ? 'ตอนนี้คุณจะไม่ได้รับการเตือนเลย' : 'การเตือนผ่าน LINE หยุดอยู่'}
                </p>
                <p className="t-body text-ink-2 mt-1.5 leading-relaxed">
                  {!lineStatus.linked
                    ? 'ยังไม่ได้เชื่อมบัญชี LINE จึงส่งข้อความหาคุณไม่ได้'
                    : 'WorkCatch ถูกบล็อก ระบบหยุดส่งอัตโนมัติแล้ว งานทั้งหมดยังอยู่ครบ'}
                </p>
              </div>
            )}

            <LineRow
              title="บัญชีที่ใช้เข้าสู่ระบบ"
              chip={lineStatus.linked ? { ok: true, label: 'เชื่อมอยู่' } : { ok: false, label: 'ยังไม่เชื่อม' }}
              why="ตอนนี้ LINE เป็นวิธีเดียวที่ใช้เข้าสู่ระบบได้ ถ้ายกเลิกการเชื่อมตอนนี้จะกลับเข้าบัญชีไม่ได้อีก · ตั้งอีเมลสำรองก่อน แล้วปุ่มนี้จะกดได้"
            >
              {/* Disabled, and the sentence above says why. Greying a control
                  without a reason teaches people the page is broken; this one is
                  not broken, it is refusing to lock them out of their own account. */}
              <button
                type="button"
                disabled
                title="ตั้งอีเมลสำรองก่อนจึงจะยกเลิกการเชื่อมได้"
                className="min-h-11 shrink-0 cursor-not-allowed rounded-control border border-rule bg-sheet px-3.5 text-[12px] font-medium text-ink-3 opacity-55"
              >
                ยกเลิกการเชื่อม
              </button>
            </LineRow>

            <LineRow
              title="รับการเตือนทาง LINE"
              chip={preferences.lineNotify ? { ok: true, label: 'เปิดอยู่' } : { ok: false, label: 'ปิดอยู่' }}
              why="ปิดได้ทุกเมื่อ งานและเวลาเตือนยังอยู่ครบ เพียงแต่จะไม่มีข้อความส่งถึงคุณจนกว่าจะเปิดใหม่"
            >
              <button
                type="button"
                role="switch"
                aria-checked={preferences.lineNotify}
                aria-label="รับการเตือนทาง LINE"
                disabled={updatePreferences.isPending}
                onClick={() => updatePreference('lineNotify')}
                className="relative -my-3 -mx-[5px] size-11 shrink-0 focus-visible:[&>span]:outline-2 focus-visible:[&>span]:outline-offset-2 focus-visible:[&>span]:outline-ink"
              >
                <span
                  aria-hidden
                  className={`absolute left-[5px] top-[12px] h-5 w-[34px] rounded-pill transition-colors ${
                    preferences.lineNotify ? 'bg-brand' : 'bg-rule'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                      preferences.lineNotify ? 'left-4' : 'left-0.5'
                    }`}
                  />
                </span>
              </button>
            </LineRow>

            {/*
              Not on the frame, and kept anyway. Every other row on this screen
              reports a state the server believes; this is the only control that
              tests the belief end to end, which is the whole point when the
              failure mode is silent. It sits under the connection rows because
              that is the route it proves.
            */}
            <div className="flex flex-wrap items-center gap-4 border-b border-rule-soft px-5 py-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium">ทดสอบการเตือน</span>
                <span className="t-meta block leading-relaxed text-ink-3">
                  ส่งข้อความจริงหาตัวเองหนึ่งข้อความ ถ้าไม่เข้าแปลว่าตั้งค่ายังไม่ครบ · นับ 1 ข้อความจากโควตา ส่งได้ 3 ครั้งต่อวัน
                </span>
              </span>
              <span className="text-right">
                <button
                  type="button"
                  disabled={!canTest || testMessage.isPending}
                  onClick={sendTestMessage}
                  className="wc-lift min-h-11 rounded-control border border-rule bg-sheet px-3.5 text-[12px] font-medium disabled:opacity-45"
                >
                  ส่งข้อความทดสอบ
                </button>
                <span className="t-caption mt-1.5 block text-ink-3">
                  {testMessageCaption(testMessages)}
                </span>
              </span>
            </div>

            <LineRow
              title="เพิ่ม WorkCatch เป็นเพื่อนใน LINE"
              chip={
                lineStatus.friendState === 'FRIEND'
                  ? { ok: true, label: 'เป็นเพื่อนแล้ว' }
                  : { ok: false, label: lineStatus.friendState === 'BLOCKED' ? 'ถูกบล็อก' : 'ยังไม่ทราบ' }
              }
              why={lineStatus.friendState === 'UNKNOWN'
                ? 'กดส่งข้อความทดสอบเพื่อยืนยันว่าเพิ่มเพื่อนแล้ว'
                : 'LINE ยอมให้ส่งข้อความหาเฉพาะคนที่เป็นเพื่อนกับบัญชีทางการ ถ้าบล็อกหรือลบเพื่อน การเตือนจะหยุดทันทีโดยที่ระบบไม่รู้'}
              hint={`หรือค้นหา ${LINE_OA_ID} ในแอป LINE`}
              mobileHint={`ถ้าเคยบล็อกหรือลบเพื่อน กดเพื่อเพิ่มกลับ · ${LINE_OA_ID}`}
              last
            >
              <a
                href={LINE_OA_ADD_FRIEND_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="เพิ่ม WorkCatch เป็นเพื่อนใน LINE (เปิดในแท็บใหม่)"
                className="wc-lift inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-control border border-rule bg-sheet px-3.5 text-[12px] font-medium lg:w-auto"
              >
                เพิ่มเพื่อนใน LINE <span aria-hidden>↗</span>
              </a>
            </LineRow>
          </Section>

          <Section title="การเตือน" note="ยิ่งเตือนละเอียด ยิ่งใช้โควตา LINE มาก">
            {/* The daily inbox digest has its own switch, but it only ever goes
                over LINE, so "รับการเตือนทาง LINE" off silences it too. */}
            <Toggle
              label="เตือนแยกทีละงาน"
              why="เตือน 1 วันก่อน 2 ชั่วโมงก่อน และตอนถึงกำหนด"
              on={preferences.eachTask}
              onChange={() => updatePreference('eachTask')}
              pending={updatePreferences.isPending}
            />
            <Toggle
              label="สรุปงานค้างในกล่องรับงาน วันละครั้ง"
              why="09:00 ทาง LINE · ส่งเฉพาะวันที่มีงานค้างเกิน 24 ชั่วโมง"
              on={preferences.digest}
              onChange={() => updatePreference('digest')}
              pending={updatePreferences.isPending}
            />
            <KV k="เตือนก่อนครบกำหนด" v="1 วัน · 2 ชั่วโมง" />
            <Toggle
              label="เตือนงานที่เกินกำหนด"
              why="ยังไม่เปิดใช้งาน"
              on={false}
              onChange={() => {}}
              disabled
            />
            <Toggle
              label="เตือนงานที่รอคนอื่นเมื่อถึงวันติดตาม"
              on={preferences.waitingFollowUp}
              onChange={() => updatePreference('waitingFollowUp')}
              pending={updatePreferences.isPending}
            />

          </Section>

          <Section title="ค่าเริ่มต้นของงาน">
            <KV k="ความสำคัญเริ่มต้น" v={priorityLabel.MEDIUM} />
            {/* The product has no file upload, so attachment size has no setting here. */}
            <KV k="เก็บงานที่ลบไว้" v="30 วัน" last />
          </Section>

          <Section title="ลบบัญชี" note="ต่างจากการยกเลิกการเชื่อม LINE">
            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start">
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold">ลบบัญชีและข้อมูลทั้งหมด</span>
                <span className="t-meta mt-1 block leading-relaxed text-ink-2">
                  ออกจากระบบทุกเครื่องทันที ข้อมูลเข้าสู่ระบบที่ซ่อนไว้และการเชื่อม LINE ถูกลบทันที ส่วนงาน บันทึก และโปรเจกต์ถูกลบถาวรภายใน 30 วัน กู้คืนไม่ได้
                </span>
                <span className="mt-2 block text-[12px] leading-relaxed text-ink-3">
                  ถ้าแค่ไม่อยากรับการเตือน ปิด “รับการเตือนทาง LINE” ข้างบนแทนได้ งานทั้งหมดยังอยู่
                </span>
              </span>
              <button
                type="button"
                onClick={() => setDeleteAccountOpen(true)}
                className="wc-lift inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-control border border-error bg-white px-3.5 text-[12px] font-medium text-error lg:w-auto"
              >
                ลบบัญชี…
              </button>
            </div>
          </Section>

          {/*
            The way into the admin area on a phone.

            It existed only in the desktop rail, which is `hidden lg:block` — so
            at 390px the link was in the DOM and unreachable, and the one person
            who holds both roles is also the one who runs this product from a
            phone. `lg:hidden` because above that width the rail is showing the
            same entry two columns to the left, and the wording is the rail's own
            so the two cannot drift apart.

            Shown only to accounts that hold the role, exactly as the rail does.
            This is a hint, not a permission: the API enforces the role on every
            /api/admin/** request.
          */}
          {me.data?.admin && (
            <div className="lg:hidden">
              <Section title="ผู้ดูแลระบบ" note="บัญชีนี้มีสิทธิ์ดูแลระบบ">
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium">โหมดผู้ดูแลระบบ</span>
                    <span className="t-meta block leading-relaxed text-ink-3">
                      ดูสถานะการส่ง งานเข้าจาก LINE และผู้ใช้ทั้งหมด · เป็นคนละหน้ากับการตั้งค่าของบัญชีคุณเอง
                    </span>
                  </span>
                  <Link
                    to="/admin"
                    className="wc-lift flex min-h-11 shrink-0 items-center rounded-control border border-rule bg-sheet px-3.5 text-[12px] font-medium"
                  >
                    เปิดโหมดผู้ดูแลระบบ
                  </Link>
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Sticky where there is a second column to be sticky in: on a desktop
            the actual usage then stays beside whatever control is being pressed,
            instead of scrolling away above it. `self-start`, or the grid item
            stretches to the row height and never sticks to anything. */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <h2 className="t-section">การเตือนทาง LINE ของคุณ</h2>
          <div className="mt-3 rounded-sheet border border-rule bg-sheet px-5 py-5">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-[38px] font-semibold leading-none tracking-tight">
                {usage.scheduledNext30Days}
              </span>
              <span className="t-body text-ink-2">การเตือนที่ตั้งไว้ใน 30 วันข้างหน้า</span>
            </p>
            <p className="t-meta mt-2 leading-relaxed text-ink-3">
              ส่งไปแล้ว 30 วันที่ผ่านมา {usage.sentLast30Days}
            </p>
          </div>
          <p className="t-meta mt-3.5 leading-relaxed text-ink-3">
            แสดงเฉพาะการเตือนของบัญชีนี้จากข้อมูลที่ระบบบันทึกไว้
          </p>
        </aside>
      </div>
      {deleteAccountOpen && (
        <DeleteAccountDialog
          displayName={me.data?.displayName}
          onClose={() => setDeleteAccountOpen(false)}
        />
      )}
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

function SettingsSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดการตั้งค่า">
      <SkeletonPageHeader standfirst={false} />
      <div className="mt-7 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div className="space-y-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-sheet border border-rule bg-sheet px-5 py-5">
              <Skeleton w="132px" h="18px" />
              <Skeleton w="100%" h="48px" className="mt-4" />
              <Skeleton w="100%" h="48px" className="mt-2" />
            </div>
          ))}
        </div>
        <Skeleton w="100%" h="192px" className="rounded-sheet" />
      </div>
    </SkeletonScreen>
  )
}

function SettingsUnavailable() {
  return (
    <>
      <p className="t-caption text-ink-3">บัญชีและการเตือน</p>
      <h1 className="t-page-title mt-1">ตั้งค่า</h1>
      <p role="alert" className="mt-4 rounded-control border border-error px-4 py-3 text-[12px] text-error">
        โหลดสถานะ LINE ไม่สำเร็จ ลองใหม่อีกครั้ง
      </p>
    </>
  )
}

function testMessageCaption(testMessages: {
  leftToday: number
  lastSentAt: string | null
  lastStatus: 'SENT' | 'FAILED' | null
}) {
  const sent = testMessages.lastSentAt
    ? `ส่งล่าสุด ${new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(testMessages.lastSentAt))} · ${testMessages.lastStatus === 'SENT' ? 'ส่งแล้ว' : 'ส่งไม่สำเร็จ'}`
    : 'ยังไม่เคยส่ง'
  return `${sent} · เหลือวันนี้ ${testMessages.leftToday}`
}

function KV({ k, v, last, disabled }: { k: string; v: string; last?: boolean; disabled?: boolean }) {
  return (
    <div
      aria-disabled={disabled || undefined}
      className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
        last ? '' : 'border-b border-rule-soft'
      } ${disabled ? 'opacity-55' : ''}`}
    >
      <span className="text-[13px] text-ink-2">{k}</span>
      <span className="font-mono text-[12px]">{v}</span>
    </div>
  )
}

/**
 * The state chip beside a LINE row.
 *
 * The glyph is the point. Green-versus-red is not a distinction every reader can
 * make, so the tick and the exclamation carry the verdict and the colour only
 * reinforces it. The chip pairs brand/strong with the mint wash rather than
 * white on emerald, which measures 4.02:1 and fails.
 */
function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`t-caption inline-flex shrink-0 items-center gap-1 rounded-pill px-2 py-0.5 ${
        ok ? 'bg-mint text-brand-strong' : 'bg-error/[0.08] text-error'
      }`}
    >
      <span className="font-mono" aria-hidden>{ok ? '✓' : '!'}</span>
      {label}
    </span>
  )
}

/** One of the three prerequisites, with whatever control belongs to it. */
function LineRow({ title, chip, why, hint, mobileHint, last, children }: {
  title: string
  chip: { ok: boolean; label: string }
  why: string
  hint?: string
  mobileHint?: string
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-wrap items-start gap-4 px-5 py-4 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-medium">{title}</span>
          <StatusChip {...chip} />
        </span>
        <span className="t-meta mt-1 block leading-relaxed text-ink-3">{why}</span>
        {hint && !mobileHint && (
          <span className="t-meta mt-1 block leading-relaxed text-ink-3">
            {hint}
          </span>
        )}
        {hint && mobileHint && <span className="t-meta mt-1 hidden leading-relaxed text-ink-3 lg:block">{hint}</span>}
      </span>
      {children}
      {mobileHint && <span className="t-meta w-full leading-relaxed text-ink-3 lg:hidden">{mobileHint}</span>}
    </div>
  )
}

function Toggle({ label, why, cost, on, onChange, last, disabled, pending }: {
  label: string
  why?: string
  cost?: string
  on: boolean
  onChange: () => void
  last?: boolean
  disabled?: boolean
  pending?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3.5 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="min-w-0">
        <span className="block text-[13px] text-ink-2">{label}</span>
        {why && <span className="t-meta block text-ink-3">{why}</span>}
        {cost && <span className="mt-0.5 block font-mono text-[12px] text-ink-3">{cost}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onChange}
        disabled={disabled || pending}
        className="relative -my-3 -mx-[5px] size-11 shrink-0 disabled:cursor-not-allowed disabled:opacity-45
          focus-visible:[&>span]:outline-2 focus-visible:[&>span]:outline-offset-2 focus-visible:[&>span]:outline-ink"
      >
        <span
          aria-hidden
          className={`absolute left-[5px] top-[12px] h-5 w-[34px] rounded-pill transition-colors ${
            on ? 'bg-brand' : 'bg-rule'
          }`}
        >
          <span
            className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
              on ? 'left-4' : 'left-0.5'
            }`}
          />
        </span>
      </button>
    </div>
  )
}

/**
 * ผู้ช่วย AI — Figma 442:4263. The two switches (AI at all, and whether it may
 * use what it has learned about how this person works), exactly what is sent and
 * what never is, the free-tier warning, and today's quota.
 *
 * The Figma frame drew a switch for sending note contents; the API contract
 * never sends notes, so that row states it instead of offering a switch that
 * would do nothing.
 */
function AiSettings() {
  const toast = useToast()
  const status = useAiStatus()
  const prefs = useAiPreferences()
  const update = useUpdateAiPreferences()
  const available = status.data?.available ?? false
  const p = prefs.data ?? { enabled: true, useHabits: true }

  const set = (next: AiPreferences) => update.mutate(next, {
    onError: () => toast({ title: 'บันทึกการตั้งค่า AI ไม่สำเร็จ', body: 'ลองใหม่อีกครั้ง', tone: 'error' }),
  })

  const used = status.data?.usedToday ?? 0
  const limit = status.data?.dailyLimit ?? 0

  return (
    <div id="ai" className="scroll-mt-8">
      <Section title="ผู้ช่วย AI" note="ใช้ Google Gemini">
        {status.isPending || prefs.isPending ? (
          <div className="px-5 py-4"><Skeleton w="100%" h="40px" /><Skeleton w="100%" h="40px" className="mt-2" /></div>
        ) : status.isError || prefs.isError ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-4">
            <p className="text-[13px] text-error">โหลดการตั้งค่า AI ไม่สำเร็จ</p>
            <button type="button" onClick={() => { void status.refetch(); void prefs.refetch() }} className="wc-lift min-h-9 rounded-control border border-rule px-3 text-[13px] font-medium">
              ลองใหม่
            </button>
          </div>
        ) : (
          <>
            {!available && (
              <p className="border-b border-rule-soft px-5 py-3.5 text-[13px] text-ink-2">
                ผู้ดูแลระบบยังไม่ได้เปิดใช้ AI · ตั้งค่าไว้ล่วงหน้าได้ จะมีผลเมื่อเปิดใช้
              </p>
            )}
            <Toggle
              label="ใช้ผู้ช่วย AI"
              why="แนะนำงานที่ควรทำก่อนในหน้าภาพรวม และตอบคำถามเรื่องงานของคุณ"
              on={p.enabled}
              onChange={() => set({ ...p, enabled: !p.enabled })}
              pending={update.isPending}
            />
            <Toggle
              label="ใช้นิสัยการใช้งาน"
              why="ให้ AI รู้ว่าคุณมักเก็บงานแบบไหนไว้โปรเจกต์ไหน ตั้งเวลาเตือนกี่โมง และเคยแก้คำแนะนำแบบไหน · ปิดแล้วจะไม่ส่งและไม่เก็บเพิ่ม"
              on={p.useHabits}
              onChange={() => set({ ...p, useHabits: !p.useHabits })}
              pending={update.isPending}
              disabled={!p.enabled}
            />
            <div className="border-b border-rule-soft px-5 py-3.5">
              <p className="text-[13px] font-medium">ข้อมูลที่ส่งให้ AI</p>
              <dl className="mt-2 space-y-2 text-[13px]">
                <SentRow what="ชื่องาน กำหนดส่ง สถานะ และชื่อโปรเจกต์" when="ส่งเมื่อเปิด AI" />
                <SentRow what="เนื้อหาบันทึก" when="ไม่ส่งเลย" />
                <SentRow what="ข้อมูลลับในบันทึก (รหัส บัญชีผู้ใช้)" when="ไม่ส่งเลย" />
                <SentRow what="ข้อความต้นฉบับจาก LINE" when="ไม่ส่งเลย" />
              </dl>
            </div>
            <div className="border-b border-rule-soft px-5 py-3.5">
              <div className="rounded-control bg-time-soon-wash px-4 py-3.5">
                <p className="text-[14px] font-semibold text-time-soon-strong">อ่านก่อนเปิดใช้</p>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-ink">
                  WorkCatch ใช้ Google Gemini รุ่นฟรี ข้อความที่ส่งไปอาจถูก Google นำไปปรับปรุงบริการของ Google ได้ อย่าถามหรือใส่ข้อมูลส่วนตัว รหัสผ่าน หรือความลับของลูกค้าในงานที่ส่งให้ AI · เนื้อหาบันทึก ข้อมูลลับ และข้อความต้นฉบับจาก LINE ไม่ถูกส่งเลย
                </p>
                <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[13px] font-medium text-brand-strong underline underline-offset-2">
                  นโยบายข้อมูลของ Google Gemini ↗
                </a>
              </div>
            </div>
            <div className="px-5 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-medium">ใช้ไปวันนี้</p>
                <p className="font-mono text-[12.5px] font-medium">{limit > 0 ? `${used} / ${limit} คำถาม` : '—'}</p>
              </div>
              <div className="mt-2 h-1 w-full rounded-pill bg-rule-soft">
                <div className="h-full rounded-pill bg-ink" style={{ width: `${limit > 0 ? Math.min(used / limit, 1) * 100 : 0}%` }} />
              </div>
              <p className="t-meta mt-2 text-ink-3">
                นับใหม่ทุกเที่ยงคืน{limit > 0 ? ` · เมื่อครบ ${limit} คำถาม ค้นหาแบบปกติยังใช้ได้` : ''}
              </p>
            </div>
          </>
        )}
      </Section>
    </div>
  )
}

function SentRow({ what, when }: { what: string; when: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="min-w-0 text-ink-2">{what}</dt>
      <dd className="shrink-0 text-[12.5px] text-ink-3">{when}</dd>
    </div>
  )
}
