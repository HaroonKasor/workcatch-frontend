import { useState } from 'react'
import { SkeletonPageHeader, SkeletonRows, SkeletonScreen } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import { ApiError, useAdminNotifications, useRetryAdminNotification } from '../../lib/api'

/**
 * /admin/notifications — Figma node 52:935
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

  return (
    <>
      <p className="t-caption text-ink-3">โหมดผู้ดูแลระบบ</p>
      <h1 className="t-page-title mt-1">บันทึกการแจ้งเตือน</h1>
      <p className="t-body mt-2 text-ink-2">
        แสดงรหัสงาน ไม่แสดงชื่องาน · ทุกครั้งที่พยายามส่งถูกบันทึกแยกรายการ
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Filter
            key={item.key}
            label={item.label}
            active={filter === item.key}
            onClick={() => setFilter(item.key)}
          />
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-sheet border border-rule bg-sheet">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-rule">
              <Th>เวลา</Th>
              <Th>ผู้ใช้</Th>
              <Th>รหัสงาน</Th>
              <Th>สถานะ</Th>
              <Th>รหัสผลลัพธ์</Th>
              <Th>ครั้งที่</Th>
              <Th>จัดการ</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              // Retryable failures are automatically retried; only final failures accept a manual retry.
              const retryable = r.state === 'FAILED_FINAL'
              return (
                <tr key={r.id} className={i < rows.length - 1 ? 'border-b border-rule-soft' : ''}>
                  <td className="t-caption px-5 py-3 text-ink-3">{stamp(r.scheduledFor ?? r.updatedAt)}</td>
                  <td className="px-5 py-3 text-[12px] text-ink-2">{r.userDisplayName ?? 'ไม่ทราบชื่อผู้ใช้'}</td>
                  <td className="t-caption px-5 py-3 text-ink-2">{r.taskId}</td>
                  <td className="px-5 py-3">
                    <span className={`block font-mono text-[12px] font-medium ${TONE[r.state]}`}>{r.state}</span>
                  </td>
                  <td className={`t-caption px-5 py-3 ${r.lastStatusCode === null ? 'text-ink-3' : TONE[r.state]}`}>
                    {r.lastStatusCode ?? '—'}
                  </td>
                  <td className="t-caption px-5 py-3 text-ink-3">{r.attempts} / {r.maxAttempts}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      disabled={!retryable || retry.isPending}
                      onClick={() => {
                        retry.mutate(r.id, {
                          onSuccess: () => toast({ title: 'เข้าคิวส่งใหม่แล้ว', tone: 'success' }),
                          onError: (error) => toast({
                            title: 'ส่งใหม่ไม่สำเร็จ',
                            body: error instanceof ApiError ? error.message : undefined,
                            tone: 'error',
                          }),
                        })
                      }}
                      className={`rounded-control px-3 py-1.5 text-[12px] font-medium ${
                        retryable && !retry.isPending ? 'border border-rule bg-sheet' : 'text-ink-3 opacity-35'
                      }`}
                    >
                      {retryable ? 'ส่งใหม่' : 'ส่งใหม่ไม่ได้'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-5 py-6 text-[12.5px] text-ink-3">ไม่มีรายการแจ้งเตือน</p>}
      </div>

      <div className="mt-4 rounded-sheet border border-rule px-5 py-4">
        <p className="t-label text-ink-3">กฎการส่งใหม่</p>
        <p className="t-meta mt-1.5 leading-relaxed text-ink-2">
          กดส่งใหม่ได้เฉพาะรายการที่ล้มเหลว ระบบจะนำรายการกลับเข้าคิวด้วยจำนวนครั้งลองส่งใหม่
          และบันทึกการกระทำนี้ไว้ในประวัติผู้ดูแล
        </p>
      </div>
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="t-label px-5 py-2.5 font-medium text-ink-3">{children}</th>
}

function Filter({ label, active, onClick }: {
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-control px-3 py-1.5 ${
        active ? 'bg-ink text-on-dark' : 'border border-rule bg-sheet'
      }`}
    >
      <span className={`text-[12px] ${active ? 'opacity-75' : 'text-ink-3'}`}>{label}</span>
    </button>
  )
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
      <SkeletonRows rows={7} className="mt-6" />
    </SkeletonScreen>
  )
}
