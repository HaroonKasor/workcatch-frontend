import { Link } from 'react-router-dom'
import { SkeletonPageHeader, SkeletonRows, SkeletonScreen } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import { ApiError, useAdminOverview, useRetryAdminNotification } from '../../lib/api'
import { clock } from '../../lib/time'
import { LIST, ListLabel, PageTitle, RetryButton } from './ui'
/**
 * /admin — Figma 49:891 (desktop), 479:2408 (phone), 492:4128 (iPad)
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
    { short: 'ผู้ใช้', label: 'ผู้ใช้ทั้งหมด', value: data.users.total.toLocaleString('en-US'), note: `ใช้งานอยู่ ${data.users.active} · ระงับ ${data.users.suspended}` },
    {
      short: 'เชื่อม LINE',
      label: 'เชื่อม LINE แล้ว',
      value: data.users.lineLinked.toLocaleString('en-US'),
      note: data.users.total === 0 ? '' : `${Math.round((data.users.lineLinked / data.users.total) * 100)}%`,
    },
    { short: 'งานในระบบ', label: 'งานในระบบ', value: data.tasks.total.toLocaleString('en-US'), note: `เปิดอยู่ ${data.tasks.open}` },
    { short: 'ส่งสำเร็จ 7 วัน', label: 'ส่งสำเร็จ 7 วัน', value: successRate, note: `จาก ${sentTotal} ข้อความ` },
  ]
  const services = [
    schedulerService('ตัวจับเวลา', data.services.reminderScheduler.lastRunAt),
    schedulerService('ตัวรับข้อความ LINE', data.services.inboundScheduler.lastRunAt),
    configuredService('LINE Messaging API', data.services.lineMessaging.configured),
    configuredService('LINE Login', data.services.lineLogin.configured),
    {
      name: 'ฐานข้อมูล',
      state: data.services.database.ok ? 'ปกติ' : 'ต้องตรวจสอบ',
      note: data.services.database.ok ? 'เชื่อมต่อได้' : 'เชื่อมต่อไม่ได้',
      warn: !data.services.database.ok,
    },
  ]

  return (
    <>
      <PageTitle>ภาพรวมระบบ</PageTitle>

      {/* Under 900px one divided sheet of two columns; from 900px four cards. */}
      <div className="grid grid-cols-2 border-y border-rule bg-sheet min-[900px]:mt-4 min-[900px]:grid-cols-4 min-[900px]:gap-3 min-[900px]:border-0 min-[900px]:bg-transparent">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="border-r border-b border-rule-soft px-4 py-3.5 even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 min-[900px]:rounded-sheet min-[900px]:border min-[900px]:border-rule min-[900px]:bg-sheet min-[900px]:px-4 min-[900px]:py-4"
          >
            <p className="text-[13px] text-ink-3">
              <span className="min-[900px]:hidden">{k.short}</span>
              <span className="hidden min-[900px]:inline">{k.label}</span>
            </p>
            <p className="mt-0.5 font-mono text-[26px] leading-tight font-semibold">{k.value}</p>
            {k.note && <p className="mt-0.5 text-[13px] text-ink-3">{k.note}</p>}
          </div>
        ))}
      </div>

      {data.sendingPaused && (
        <p className="mt-4 border-y border-rule bg-ink/[0.04] px-4 py-3 text-[13px] text-ink min-[900px]:rounded-control min-[900px]:border">
          ระบบหยุดส่งข้อความชั่วคราว ·{' '}
          <Link to="/admin/settings" className="font-medium underline underline-offset-2">
            ไปที่ตั้งค่าระบบ
          </Link>
        </p>
      )}

      <div className="mt-2 grid min-[900px]:mt-6 min-[900px]:grid-cols-2 min-[900px]:items-start min-[900px]:gap-6 xl:grid-cols-[1fr_1fr_280px]">
        <section>
          <ListLabel>สถานะบริการ</ListLabel>
          <div className={LIST}>
            {services.map((s, i) => (
              <div
                key={s.name}
                className={`flex items-center gap-3 px-4 py-3 ${i < services.length - 1 ? 'border-b border-rule-soft' : ''}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] min-[900px]:text-[14px]">{s.name}</span>
                  {s.note && <span className="block text-[13px] text-ink-3">{s.note}</span>}
                </span>
                <span className={`shrink-0 text-[13px] ${s.warn ? 'font-medium text-time-soon-strong' : 'text-ink-3'}`}>
                  {s.state}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <ListLabel className={data.recentFailures.length > 0 ? 'text-time-late' : ''}>
            ต้องตรวจสอบ · {data.recentFailures.length}
          </ListLabel>
          <div className={LIST}>
            {data.recentFailures.length === 0 && (
              <p className="px-4 py-5 text-[14px] text-ink-3">ไม่มีการส่งที่ล้มเหลว</p>
            )}
            {data.recentFailures.map((f, i) => (
              <div
                key={f.notificationId}
                className={`flex flex-col gap-2 px-4 py-3 min-[900px]:flex-row min-[900px]:items-center ${
                  i < data.recentFailures.length - 1 ? 'border-b border-rule-soft' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline justify-between gap-3">
                    {/* Task id, not title. The admin has no business reading the work. */}
                    <span className="font-mono text-[15px] font-medium min-[900px]:text-[14px]">{f.taskId}</span>
                    <span className={`shrink-0 text-[13px] min-[900px]:hidden ${f.retryable ? 'text-time-soon-strong' : 'text-error'}`}>
                      {f.retryable ? `ลองใหม่ ${f.attempts}/${f.maxAttempts}` : 'ล้มเหลว'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-3">
                    <span className="min-[900px]:hidden">{stamp(f.at)} · </span>
                    {f.userDisplayName ?? 'ไม่ทราบชื่อผู้ใช้'} · {f.statusCode ?? '—'}
                    <span className="hidden min-[900px]:inline"> · {f.attempts}/{f.maxAttempts}</span>
                  </p>
                </div>
                <RetryButton
                  label="ส่งใหม่"
                  disabled={!f.retryable || retry.isPending}
                  className={`self-start ${f.retryable ? '' : 'max-[899px]:hidden'}`}
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
                />
              </div>
            ))}
          </div>
        </section>

        {data.quota && (
          <section>
            <ListLabel>โควตา LINE เดือนนี้</ListLabel>
            <div className={`${LIST} px-4 py-4`}>
              <p className="font-mono text-[26px] leading-none font-semibold">
                {data.quota.consumed} / {data.quota.limit}
              </p>
            </div>
          </section>
        )}
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
    state: warn ? 'ต้องตรวจสอบ' : 'ปกติ',
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
    </SkeletonScreen>
  )
}
