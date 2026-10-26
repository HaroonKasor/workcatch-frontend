import { Link } from 'react-router-dom'
import { Skeleton, SkeletonPageHeader, SkeletonRows, SkeletonScreen } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import { ApiError, useAdminOverview, useRetryAdminNotification } from '../../lib/api'
import { clock } from '../../lib/time'
/**
 * /admin — Figma node 49:891
 *
 * Shows aggregate numbers and service health, never task content. AC-09 requires
 * that an admin cannot read other people's work by default, so failures are
 * identified by task id rather than by title. That constraint is easy to break
 * accidentally on exactly this screen — a "recent failures" list showing the
 * message body would expose every user's task titles at once.
 */

export default function AdminOverview() {
  const toast = useToast()
  const overview = useAdminOverview()
  const retry = useRetryAdminNotification()

  if (overview.isPending) return <OverviewSkeleton />
  if (overview.isError || !overview.data) {
    return <p role="alert" className="t-body text-error">โหลดภาพรวมระบบไม่สำเร็จ</p>
  }

  const data = overview.data
  const sentTotal = data.notifications7d.sent + data.notifications7d.failed
  const successRate = sentTotal === 0 ? '—' : `${((data.notifications7d.sent / sentTotal) * 100).toFixed(1)}%`
  const kpis = [
    { label: 'ผู้ใช้ทั้งหมด', value: data.users.total, note: `ใช้งานอยู่ ${data.users.active} · ระงับ ${data.users.suspended}` },
    {
      label: 'เชื่อม LINE แล้ว',
      value: data.users.lineLinked,
      note: data.users.total === 0 ? '' : `คิดเป็น ${Math.round((data.users.lineLinked / data.users.total) * 100)}%`,
    },
    { label: 'งานในระบบ', value: data.tasks.total, note: `เปิดอยู่ ${data.tasks.open}` },
    { label: 'ส่งสำเร็จ 7 วัน', value: successRate, note: `จาก ${sentTotal} ข้อความ` },
  ]
  const services = [
    schedulerService('ตัวจับเวลา', data.services.reminderScheduler.lastRunAt),
    schedulerService('ตัวรับข้อความ LINE', data.services.inboundScheduler.lastRunAt),
    configuredService('LINE Messaging API', data.services.lineMessaging.configured),
    configuredService('LINE Login', data.services.lineLogin.configured),
    {
      name: 'ฐานข้อมูล',
      state: data.services.database.ok ? 'ทำงานปกติ' : 'ต้องตรวจสอบ',
      note: data.services.database.ok ? 'เชื่อมต่อได้' : 'เชื่อมต่อไม่ได้',
      warn: !data.services.database.ok,
    },
  ]

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
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className={`min-w-[180px] flex-1 px-6 py-5 ${i < kpis.length - 1 ? 'border-r border-rule-soft' : ''}`}
          >
            <p className="t-meta text-ink-3">{k.label}</p>
            <p className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-[-0.5px]">{k.value}</p>
            {k.note && <p className="t-caption mt-1 text-ink-3">{k.note}</p>}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_344px]">
        <div className="min-w-0 space-y-8">
          {data.sendingPaused && (
            <p className="rounded-control border border-rule bg-ink/[0.04] px-4 py-3 text-[12px] text-ink">
              ระบบหยุดส่งข้อความชั่วคราว ·{' '}
              <Link to="/admin/settings" className="font-medium underline underline-offset-2">
                ไปที่ตั้งค่าระบบ
              </Link>
            </p>
          )}
          <section>
            <header className="flex items-center justify-between">
              <h2 className="t-section">สถานะบริการ</h2>
              <p className="t-caption text-ink-3">สถานะจากระบบ</p>
            </header>
            <div className="mt-3 rounded-sheet border border-rule bg-sheet">
              {services.map((s, i) => (
                <div
                  key={s.name}
                  className={`flex items-center gap-3.5 px-5 py-3.5 ${i < services.length - 1 ? 'border-b border-rule-soft' : ''}`}
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
              <p className="t-caption text-ink-3">{data.recentFailures.length} รายการ</p>
            </header>
            <div className="mt-3 rounded-sheet border border-rule bg-sheet">
              {data.recentFailures.length === 0 && (
                <p className="px-5 py-6 text-[12.5px] text-ink-3">ไม่มีการส่งที่ล้มเหลว</p>
              )}
              {data.recentFailures.map((f, i) => (
                <div
                  key={f.notificationId}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 ${
                    i < data.recentFailures.length - 1 ? 'border-b border-rule-soft' : ''
                  }`}
                >
                  <span className="t-caption w-24 shrink-0 text-ink-3">{stamp(f.at)}</span>
                  {/* Task id, not title. The admin has no business reading the work. */}
                  <span className="t-caption w-24 shrink-0 text-ink-2">{f.taskId}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[12.5px] font-medium ${f.retryable ? 'text-time-soon' : 'text-error'}`}>
                      {f.userDisplayName ?? 'ไม่ทราบชื่อผู้ใช้'} · {f.statusCode ?? '—'}
                    </span>
                    <span className="t-meta block text-ink-3">{f.attempts} / {f.maxAttempts}</span>
                  </span>
                  <button
                    type="button"
                    disabled={!f.retryable || retry.isPending}
                    onClick={() => {
                      retry.mutate(f.notificationId, {
                        onSuccess: () => toast({ title: 'เข้าคิวส่งใหม่แล้ว', tone: 'success' }),
                        onError: (error) => toast({
                          title: 'ส่งใหม่ไม่สำเร็จ',
                          body: error instanceof ApiError ? error.message : undefined,
                          tone: 'error',
                        }),
                      })
                    }}
                    className={`shrink-0 rounded-control px-3 py-1.5 text-[12px] font-medium ${
                      !f.retryable || retry.isPending
                        ? 'text-ink-3 opacity-40'
                        : 'border border-rule bg-sheet'
                    }`}
                  >
                    {f.retryable ? 'ส่งใหม่' : 'ส่งใหม่ไม่ได้'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          {data.quota && (
            <>
              <h2 className="t-section">โควตา LINE เดือนนี้</h2>
              <div className="rounded-sheet border border-rule bg-sheet px-5 py-5">
                <p className="font-display text-[34px] font-semibold leading-none tracking-[-0.9px]">
                  {data.quota.consumed} / {data.quota.limit}
                </p>
              </div>
            </>
          )}

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

function schedulerService(name: string, lastRunAt: string | null) {
  if (!lastRunAt) return { name, state: 'ต้องตรวจสอบ', note: 'ยังไม่ทำงานตั้งแต่เปิดระบบ', warn: true }
  const minutes = Math.floor((Date.now() - new Date(lastRunAt).getTime()) / 60_000)
  const warn = minutes > 5
  return {
    name,
    state: warn ? 'ต้องตรวจสอบ' : 'ทำงานปกติ',
    note: warn ? `ไม่ได้ทำงานมา ${minutes} นาที` : `รอบล่าสุด ${clock(lastRunAt)}`,
    warn,
  }
}

function configuredService(name: string, configured: boolean) {
  return { name, state: configured ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งค่า', note: '', warn: !configured }
}

function stamp(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value))
}

function OverviewSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดภาพรวมระบบ">
      <SkeletonPageHeader />
      <SkeletonRows rows={4} className="mt-6" />
      <SkeletonRows rows={5} className="mt-8" />
      <Skeleton w="100%" h="160px" className="mt-8 rounded-sheet" />
    </SkeletonScreen>
  )
}
