import { useState } from 'react'
import { SkeletonPageHeader, SkeletonRows, SkeletonScreen } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import { ApiError, useAdminNotifications, useRetryAdminNotification } from '../../lib/api'
import { LIST, PageTitle, Pills, RetryButton } from './ui'

/**
 * /admin/notifications — Figma 52:935 (desktop), 479:2585 (phone), 492:4434 (iPad)
 *
 * The operator view shows the RAW state machine names rather than friendly
 * labels. When a reminder does not arrive, the question is which state it is
 * stuck in and why, and translating that into softer wording just costs a
 * lookup. The user-facing history at /app/notifications is the friendly one.
 *
 * Rows carry the task id, never the task title — same privacy rule as the rest
 * of admin. A failure list showing message bodies would leak every user's work.
 */

const TONE: Record<string, string> = {
  SENT: 'text-ink-2',
  PENDING: 'text-ink-3',
  CANCELLED: 'text-ink-3',
  FAILED_RETRYABLE: 'text-time-soon',
  FAILED_FINAL: 'text-error',
}

type StateFilter = 'all' | 'failedRetryable' | 'failedFinal' | 'sent' | 'pending'

const FILTERS: { key: StateFilter; label: string; state?: string }[] = [
  { key: 'failedRetryable', label: 'ต้องดู', state: 'FAILED_RETRYABLE' },
  { key: 'failedFinal', label: 'ส่งใหม่ไม่ได้', state: 'FAILED_FINAL' },
  { key: 'sent', label: 'ส่งแล้ว', state: 'SENT' },
  { key: 'pending', label: 'รอส่ง', state: 'PENDING' },
  { key: 'all', label: 'ทั้งหมด' },
]

export default function AdminNotifications() {
  const toast = useToast()
  const [filter, setFilter] = useState<StateFilter>('failedRetryable')
  const activeFilter = FILTERS.find((item) => item.key === filter)
  const notifications = useAdminNotifications(activeFilter?.state)
  const retry = useRetryAdminNotification()

  // The default view is "needs attention", because an operator opens this screen
  // when something did not arrive, not to admire the successes.
  if (notifications.isPending) return <NotificationsSkeleton />
  if (notifications.isError || !notifications.data) {
    return <p role="alert" className="t-body text-error">โหลดบันทึกการแจ้งเตือนไม่สำเร็จ</p>
  }

  const rows = notifications.data

  // Retryable failures are automatically retried; only final failures accept a manual retry.
  function retryRow(id: string) {
    retry.mutate(id, {
      onSuccess: () => toast({ title: 'เข้าคิวส่งใหม่แล้ว', tone: 'success' }),
      onError: (error) => toast({
        title: 'ส่งใหม่ไม่สำเร็จ',
        body: error instanceof ApiError ? error.message : undefined,
        tone: 'error',
      }),
    })
  }

  return (
    <>
      <PageTitle>การแจ้งเตือน</PageTitle>

      <div className="min-[900px]:mt-4">
        <Pills items={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {/* Under 900px: one row per attempt. */}
      <ul className={`${LIST} min-[900px]:hidden`}>
        {rows.map((r, i) => {
          const retryable = r.state === 'FAILED_FINAL'
          return (
            <li key={r.id} className={`px-4 py-3 ${i < rows.length - 1 ? 'border-b border-rule-soft' : ''}`}>
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[15px] font-medium">{r.taskId}</span>
                <span className={`font-mono text-[13px] font-medium ${TONE[r.state]}`}>{r.state}</span>
              </p>
              <p className="mt-0.5 text-[13px] text-ink-3">
                {stamp(r.scheduledFor ?? r.updatedAt)} · {r.userDisplayName ?? 'ไม่ทราบชื่อผู้ใช้'} · {r.lastStatusCode ?? '—'} · {r.attempts}/{r.maxAttempts}
              </p>
              {retryable && (
                <RetryButton label="ส่งใหม่" disabled={retry.isPending} onClick={() => retryRow(r.id)} className="mt-2" />
              )}
            </li>
          )
        })}
      </ul>

      {/* From 900px: a table. */}
      <div className={`${LIST} hidden min-[900px]:block`}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-rule">
              <Th>เวลา</Th>
              <Th>ผู้ใช้</Th>
              <Th>งาน</Th>
              <Th>สถานะ</Th>
              <Th>รายละเอียด</Th>
              <Th><span className="sr-only">จัดการ</span></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const retryable = r.state === 'FAILED_FINAL'
              return (
                <tr key={r.id} className={i < rows.length - 1 ? 'border-b border-rule-soft' : ''}>
                  <td className="px-4 py-3 text-[13px] text-ink-2">{stamp(r.scheduledFor ?? r.updatedAt)}</td>
                  <td className="px-4 py-3 text-[13px] text-ink-2">{r.userDisplayName ?? 'ไม่ทราบชื่อผู้ใช้'}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-ink-2">{r.taskId}</td>
                  <td className={`px-4 py-3 font-mono text-[13px] font-medium ${TONE[r.state]}`}>{r.state}</td>
                  <td className="px-4 py-3 text-[13px] text-ink-3">
                    {r.lastStatusCode ?? '—'} · {r.attempts}/{r.maxAttempts}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {retryable && (
                      <RetryButton label="ส่งใหม่" disabled={retry.isPending} onClick={() => retryRow(r.id)} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className={`${LIST} mt-4 px-4 py-5 text-[14px] text-ink-3`}>ไม่มีรายการแจ้งเตือน</p>
      )}
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="t-label px-4 py-2.5 font-medium text-ink-3">{children}</th>
}

function stamp(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value))
}

function NotificationsSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดบันทึกการแจ้งเตือน">
      <SkeletonPageHeader />
      <SkeletonRows rows={7} className="mt-4" />
    </SkeletonScreen>
  )
}
