import { useState } from 'react'
import { useLineEvents, useRetryLineEvent } from '../../lib/api'
import { confidenceLabel, NEEDS_REVIEW_BELOW } from '../../lib/tasks'
import { Skeleton as Block, SkeletonPageHeader, SkeletonRows, SkeletonScreen } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import type { LineEvent, LineEventStage } from '../../lib/types'
import { LIST, PageTitle, Pills, RetryButton } from './ui'

/**
 * /admin/line-events — Figma 216:1565 (desktop), 479:2801 (phone), 492:4349 (iPad)
 *
 * "Did the message become a task?" is the only question this screen answers, and
 * it answers it without showing anyone's message. That restraint is the design:
 * an admin debugging a broken webhook does not need the words, only the trail —
 * รับแล้ว → อ่านแล้ว → สร้างร่างแล้ว → ตอบกลับแล้ว — and where it stopped. The
 * page says so by showing none of it.
 *
 * Failures carry a ✕ as well as red, and an error code, because "it failed" is
 * not actionable and "429" is: it says retry later rather than fix the config.
 */

const STAGE: Record<LineEventStage, string> = {
  RECEIVED: 'รับแล้ว',
  PARSED: 'อ่านแล้ว',
  DRAFTED: 'สร้างร่างแล้ว',
  REPLIED: 'ตอบกลับแล้ว',
}

type Tab = 'all' | 'drafted' | 'review' | 'failed'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'drafted', label: 'สร้างงานแล้ว' },
  { key: 'review', label: 'ต้องตรวจ' },
  { key: 'failed', label: 'ล้มเหลว' },
]

/** Seconds matter here: two webhook deliveries a second apart is the symptom. */
const CLOCK = new Intl.DateTimeFormat('th-TH', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function matches(e: LineEvent, tab: Tab): boolean {
  if (tab === 'failed') return !!e.error
  if (tab === 'drafted') return !e.error && e.trail.includes('DRAFTED')
  if (tab === 'review') {
    return !e.error && e.parseConfidence !== undefined && e.parseConfidence < NEEDS_REVIEW_BELOW
  }
  return true
}

export default function AdminLineEvents() {
  const { data, isPending, isError } = useLineEvents()
  const retry = useRetryLineEvent()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('all')

  if (isPending) return <LineEventsSkeleton />
  if (isError) return <p className="t-body text-error">โหลดรายการงานเข้าจาก LINE ไม่ได้</p>

  const rows = (data ?? []).filter((e) => matches(e, tab))
  const failed = (data ?? []).filter((e) => e.error).length

  function retryEvent(e: LineEvent) {
    retry.mutate(e.id, {
      onSuccess: () =>
        toast({
          title: 'ส่งเข้าคิวใหม่แล้ว',
          body: `${e.id} จะถูกประมวลผลอีกครั้งในไม่กี่นาที`,
        }),
    })
  }

  return (
    <>
      <PageTitle>งานเข้าจาก LINE</PageTitle>

      <div className="min-[900px]:mt-4">
        <Pills
          items={TABS.map((t) => (t.key === 'failed' && failed > 0 ? { ...t, label: `${t.label} ${failed}` } : t))}
          value={tab}
          onChange={setTab}
        />
      </div>

      {/* Under 900px: one row per event. */}
      <ul className={`${LIST} min-[900px]:hidden`}>
        {rows.map((e, i) => (
          <li key={e.id} className={`px-4 py-3 ${i < rows.length - 1 ? 'border-b border-rule-soft' : ''}`}>
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[15px] font-medium">
                {CLOCK.format(new Date(e.at))} · {e.id}
              </span>
              <Confidence event={e} />
            </p>
            <p className="mt-0.5 text-[13px]"><Trail event={e} /></p>
            {e.canRetry && (
              <RetryButton label="ลองใหม่" disabled={retry.isPending} onClick={() => retryEvent(e)} className="mt-2" />
            )}
          </li>
        ))}
      </ul>

      {/* From 900px: a table. */}
      <div className={`${LIST} hidden min-[900px]:block`}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-rule">
              <Th>เวลา</Th>
              <Th>เหตุการณ์</Th>
              <Th>สถานะ</Th>
              <Th>ความมั่นใจ</Th>
              <Th><span className="sr-only">การจัดการ</span></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={e.id} className={i < rows.length - 1 ? 'border-b border-rule-soft' : ''}>
                <td className="px-4 py-3 font-mono text-[13px] text-ink-2">{CLOCK.format(new Date(e.at))}</td>
                <td className="px-4 py-3 font-mono text-[13px] text-ink-2">{e.id}</td>
                <td className="px-4 py-3 text-[13px]">
                  <Trail event={e} />
                </td>
                <td className="px-4 py-3 text-[13px]"><Confidence event={e} /></td>
                <td className="px-4 py-2 text-right">
                  {e.canRetry && (
                    <RetryButton label="ลองใหม่" disabled={retry.isPending} onClick={() => retryEvent(e)} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className={`${LIST} mt-4 px-4 py-5 text-[14px] text-ink-2`}>ไม่มีเหตุการณ์ที่ตรงกับตัวกรองนี้</p>
      )}
    </>
  )
}

/** "สูง 0.92" — low confidence is amber, because it is the ones to check. */
function Confidence({ event }: { event: LineEvent }) {
  if (event.parseConfidence === undefined) return <span className="text-[13px] text-ink-3">—</span>
  const low = event.parseConfidence < NEEDS_REVIEW_BELOW
  return (
    <span className={`shrink-0 text-[13px] ${low ? 'font-medium text-time-soon-strong' : 'text-ink-3'}`}>
      {confidenceLabel(event.parseConfidence)} {event.parseConfidence.toFixed(2)}
    </span>
  )
}

/**
 * The status column.
 *
 * A trail rather than a badge: "รับแล้ว → อ่านแล้ว" and "รับแล้ว → อ่านแล้ว →
 * สร้างร่างแล้ว" are two different problems, and one word for both ("ล้มเหลว")
 * would throw away the only diagnostic the row carries.
 */
function Trail({ event }: { event: LineEvent }) {
  const failed = !!event.error
  const stages = event.trail.map((k) => STAGE[k])
  const head = failed && stages.length === 0 ? [event.error?.message ?? ''] : stages
  const tail = [
    ...(failed && stages.length > 0 ? [event.error?.message ?? ''] : []),
    ...(event.info ? [event.info] : []),
    ...(event.note ? [event.note] : []),
  ]

  return (
    <span className={`flex flex-wrap items-baseline gap-1 text-[13px] ${failed ? 'text-error' : 'text-ink-3'}`}>
      {failed && <span className="font-mono" aria-hidden>✕</span>}
      <span>{head.join('  →  ')}</span>
      {tail.length > 0 && <span>· {tail.join(' · ')}</span>}
      {event.error?.code && <span className="font-mono">— {event.error.code}</span>}
    </span>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="t-label px-4 py-2.5 font-medium text-ink-3">{children}</th>
}

/** Header, the four tabs, then the event table beside its two panels. */
function LineEventsSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดงานเข้าจาก LINE">
      <SkeletonPageHeader />
      <div className="mt-6 flex flex-wrap gap-2">
        {[60, 86, 70, 62].map((w) => (
          <Block key={w} w={`${w}px`} h="44px" className="rounded-pill" />
        ))}
      </div>
      <SkeletonRows rows={6} className="mt-4" />
    </SkeletonScreen>
  )
}
