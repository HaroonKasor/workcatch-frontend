import { useState } from 'react'
import { useLineEvents, useRetryLineEvent } from '../../lib/api'
import { confidenceLabel, NEEDS_REVIEW_BELOW } from '../../lib/tasks'
import { Skeleton as Block, SkeletonPageHeader, SkeletonRows, SkeletonScreen } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import type { LineEvent, LineEventStage } from '../../lib/types'

/**
 * /admin/line-events — Figma 216:1565
 *
 * "Did the message become a task?" is the only question this screen answers, and
 * it answers it without showing anyone's message. That restraint is the design:
 * an admin debugging a broken webhook does not need the words, only the trail —
 * รับแล้ว → อ่านแล้ว → สร้างร่างแล้ว → ตอบกลับแล้ว — and where it stopped. The
 * two panels on the right say so out loud rather than leaving a reader to
 * conclude the content is missing by accident.
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

  return (
    <>
      <p className="t-caption text-ink-3">โหมดผู้ดูแลระบบ</p>
      <h1 className="t-page-title mt-1">งานเข้าจาก LINE</h1>
      <p className="t-body mt-2 max-w-[760px] leading-relaxed text-ink-2">
        ติดตามว่าข้อความที่ผู้ใช้ส่งเข้ามากลายเป็นงานหรือไม่ · หน้านี้แสดงเฉพาะสถานะ รหัสเหตุการณ์
        และรหัสข้อผิดพลาด ไม่แสดงเนื้อหาข้อความ
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
            className={[
              'wc-lift min-h-11 rounded-pill px-3.5 text-[12px]',
              tab === t.key ? 'bg-ink font-medium text-on-dark' : 'border border-rule bg-sheet text-ink-2',
            ].join(' ')}
          >
            {t.label}
            {t.key === 'failed' && failed > 0 && (
              <span className="ml-1.5 font-mono text-[12px] opacity-70">{failed}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-8 xl:grid-cols-[1fr_296px]">
        <div className="min-w-0">
          <div className="overflow-x-auto rounded-sheet border border-rule bg-sheet">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-rule">
                  <Th>เวลา</Th>
                  <Th>รหัสเหตุการณ์</Th>
                  <Th>ผู้ใช้</Th>
                  <Th>สถานะ</Th>
                  <Th>ความมั่นใจ</Th>
                  <Th>การจัดการ</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr key={e.id} className={i < rows.length - 1 ? 'border-b border-rule-soft' : ''}>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink-3">{CLOCK.format(new Date(e.at))}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink-2">{e.id}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink-3">{e.userHash ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Trail event={e} />
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink-2">
                      {e.parseConfidence === undefined
                        ? '—'
                        : `${confidenceLabel(e.parseConfidence)} ${e.parseConfidence.toFixed(2)}`}
                    </td>
                    <td className="px-5 py-3">
                      {e.canRetry ? (
                        <button
                          type="button"
                          disabled={retry.isPending}
                          onClick={() =>
                            retry.mutate(e.id, {
                              onSuccess: () =>
                                toast({
                                  title: 'ส่งเข้าคิวใหม่แล้ว',
                                  body: `${e.id} จะถูกประมวลผลอีกครั้งในไม่กี่นาที`,
                                }),
                            })
                          }
                          className="wc-lift min-h-11 whitespace-nowrap rounded-control border border-rule px-3 text-[12px] font-medium disabled:opacity-45"
                        >
                          ลองใหม่
                        </button>
                      ) : (
                        <span className="t-caption text-ink-3">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <p className="t-body text-ink-2 mt-4 rounded-sheet border border-rule bg-sheet px-5 py-6">
              ไม่มีเหตุการณ์ที่ตรงกับตัวกรองนี้
            </p>
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <Panel title="ข้อมูลที่หน้านี้ไม่แสดง">
            <Bullet>เนื้อหาข้อความที่ผู้ใช้ส่งเข้ามา</Bullet>
            <Bullet>ชื่องาน รายละเอียดงาน และไฟล์แนบ</Bullet>
            <Bullet>เนื้อหาบันทึก และค่าที่ซ่อนไว้ในบันทึก</Bullet>
            <Bullet>LINE user ID เต็ม — แสดงเป็นค่าแฮชเท่านั้น</Bullet>
          </Panel>

          <Panel title="การเก็บข้อมูล">
            <Bullet>เก็บข้อความต้นฉบับไว้ 30 วัน เพื่อให้ผู้ใช้ตรวจย้อนได้ว่าระบบอ่านผิดตรงไหน</Bullet>
            <Bullet>ครบ 30 วันแล้วลบอัตโนมัติ เหลือไว้เฉพาะสถานะและรหัส</Bullet>
            <Bullet>เหตุการณ์ซ้ำที่มีรหัสเดียวกันจะไม่สร้างงานซ้ำ</Bullet>
          </Panel>
        </aside>
      </div>
    </>
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
    <span className={`flex flex-wrap items-baseline gap-1 text-[12px] ${failed ? 'text-error' : 'text-ink-2'}`}>
      {failed && <span className="font-mono" aria-hidden>✕</span>}
      <span>{head.join('  →  ')}</span>
      {tail.length > 0 && <span>· {tail.join(' · ')}</span>}
      {event.error?.code && <span className="font-mono">— {event.error.code}</span>}
    </span>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="t-label px-5 py-2.5 font-medium text-ink-3">{children}</th>
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sheet border border-rule bg-sheet px-5 py-4">
      <h2 className="t-label text-ink-3">{title}</h2>
      <ul className="mt-2 space-y-2">{children}</ul>
    </section>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-1.5 size-[4px] shrink-0 bg-ink-3" aria-hidden />
      <span className="t-meta min-w-0 flex-1 leading-relaxed text-ink-2">{children}</span>
    </li>
  )
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
      <div className="mt-4 grid gap-8 xl:grid-cols-[1fr_296px]">
        <SkeletonRows rows={6} />
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-sheet border border-rule bg-sheet px-5 py-4">
              <Block w="120px" h="10px" />
              {[0, 1, 2].map((j) => (
                <Block key={j} w={`${92 - j * 14}%`} h="11px" className="mt-3" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  )
}
