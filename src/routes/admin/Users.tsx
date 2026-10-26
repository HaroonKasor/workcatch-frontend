/**
 * /admin/users — account facts only. The API withholds email, work counts and
 * LINE state, so this screen never reconstructs or invents any of them.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useToast } from '../../components/Toast'
import {
  ApiError,
  useAdminUsers,
  useRestoreAdminUser,
  useSuspendAdminUser,
  usingApi,
} from '../../lib/api'

type Tab = 'all' | 'active' | 'suspended'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'active', label: 'ใช้งานอยู่' },
  { key: 'suspended', label: 'ถูกระงับ' },
]

interface Row {
  id: string
  name: string
  role: 'USER' | 'ADMIN'
  status: string
  suspended: boolean
  timezone: string
  createdAt: string
}

const USERS: Row[] = [
  {
    id: 'demo-1', name: 'สมชาย ใจดี', role: 'ADMIN', status: 'ACTIVE', suspended: false,
    createdAt: '2026-02-12T03:00:00.000Z', timezone: 'Asia/Bangkok',
  },
  {
    id: 'demo-2', name: 'สุดา วงศ์ไทย', role: 'USER', status: 'ACTIVE', suspended: false,
    createdAt: '2026-03-03T03:00:00.000Z', timezone: 'Asia/Bangkok',
  },
  {
    id: 'demo-3', name: 'นภา จันทร์เพ็ญ', role: 'USER', status: 'SUSPENDED', suspended: true,
    createdAt: '2026-05-21T03:00:00.000Z', timezone: 'Asia/Bangkok',
  },
]

const THAI_DATE = new Intl.DateTimeFormat('th-TH', {
  timeZone: 'Asia/Bangkok',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function formatCreatedAt(createdAt: string): string {
  return THAI_DATE.format(new Date(createdAt))
}

function isSuspended(user: Row): boolean {
  return user.suspended || user.status === 'SUSPENDED'
}

export default function AdminUsers() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('all')
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<Row | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localSuspended, setLocalSuspended] = useState<Record<string, boolean>>({})
  const apiUsers = useAdminUsers(tab === 'all' ? undefined : tab === 'active' ? 'ACTIVE' : 'SUSPENDED')
  const suspend = useSuspendAdminUser()
  const restore = useRestoreAdminUser()
  const isPending = suspend.isPending || restore.isPending

  const allRows: Row[] = usingApi
    ? (apiUsers.data ?? []).map((user) => {
        const name = user.displayName?.trim()
        return {
          id: user.id,
          name: name || (user.status === 'DELETED' ? 'บัญชีที่ลบแล้ว' : 'ไม่มีชื่อ'),
          role: user.role,
          status: user.status,
          suspended: user.suspended,
          timezone: user.timezone,
          createdAt: user.createdAt,
        }
      })
    : USERS.map((user) => {
        const suspended = localSuspended[user.id] ?? user.suspended
        return { ...user, suspended, status: suspended ? 'SUSPENDED' : 'ACTIVE' }
      })

  const rows = allRows.filter((user) => {
    if (!usingApi && tab === 'active' && isSuspended(user)) return false
    if (!usingApi && tab === 'suspended' && !isSuspended(user)) return false
    return !q || user.name.toLowerCase().includes(q.trim().toLowerCase())
  })

  function setAccountStatus(user: Row, nextSuspended: boolean, undo = false) {
    if (user.status === 'DELETED') return
    setError(null)
    const mutation = nextSuspended ? suspend : restore
    mutation.mutate(user.id, {
      onSuccess: () => {
        if (!usingApi) setLocalSuspended((current) => ({ ...current, [user.id]: nextSuspended }))
        setDetail(null)
        if (!undo) {
          toast({
            title: nextSuspended ? 'ระงับบัญชีแล้ว' : 'เปิดใช้บัญชีแล้ว',
            body: nextSuspended ? `${user.name} จะเข้าระบบไม่ได้` : `${user.name} กลับมาใช้งานได้ตามปกติ`,
            action: {
              label: 'เลิกทำ',
              onAct: () => setAccountStatus(user, !nextSuspended, true),
            },
          })
        }
      },
      onError: (reason) => {
        const failure = reason instanceof ApiError ? reason : null
        setError(
          failure?.code === 'ACCOUNT_DELETED'
            ? 'บัญชีนี้ถูกลบแล้ว จึงไม่สามารถเปิดใช้ได้'
            : failure?.message ?? 'จัดการบัญชีไม่สำเร็จ ลองใหม่อีกครั้ง',
        )
      },
    })
  }

  return (
    <>
      <p className="t-caption text-ink-3">โหมดผู้ดูแลระบบ</p>
      <h1 className="t-page-title mt-1">ผู้ใช้</h1>
      <p className="t-body mt-2 text-ink-2">{allRows.length} บัญชี</p>

      {error && (
        <p role="alert" className="mt-3 rounded-control border border-error px-4 py-3 text-[12px] text-error">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
            className={[
              'wc-lift min-h-11 rounded-pill px-3.5 text-[12px]',
              tab === item.key ? 'bg-ink font-medium text-on-dark' : 'border border-rule bg-sheet text-ink-2',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
        <label className="min-w-0 flex-1 basis-56 sm:max-w-[264px]">
          <span className="sr-only">ค้นหาชื่อ</span>
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="ค้นหาชื่อ"
            className="min-h-11 w-full rounded-control border border-rule bg-sheet px-3 text-[12px] placeholder:text-ink-3"
          />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-sheet border border-rule bg-sheet">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-rule">
              <Th>ผู้ใช้</Th>
              <Th>สถานะบัญชี</Th>
              <Th>เขตเวลา</Th>
              <Th>สร้างบัญชีเมื่อ</Th>
              <Th>จัดการ</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user, index) => (
              <tr
                key={user.id}
                onClick={() => setDetail(user)}
                className={[
                  'cursor-pointer transition-colors hover:bg-ink/[0.025]',
                  index < rows.length - 1 ? 'border-b border-rule-soft' : '',
                ].join(' ')}
              >
                <td className="px-5 py-3">
                  {/* The name is a button as well as the row click: keyboard users need the same detail view. */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setDetail(user)
                    }}
                    className="flex min-h-11 items-center gap-3 rounded-control text-left"
                  >
                    <Avatar user={user} />
                    <span className="text-[13px] font-medium">
                      {user.name}
                      {user.role === 'ADMIN' && (
                        <span className="t-caption ml-2 rounded-[3px] bg-ink/[0.08] px-1.5 py-0.5 text-ink-2">
                          ผู้ดูแล
                        </span>
                      )}
                    </span>
                  </button>
                </td>
                <td className="px-5 py-3"><AccountStatus user={user} /></td>
                <td className="px-5 py-3 font-mono text-[12px] text-ink-3">{user.timezone}</td>
                <td className="px-5 py-3 text-[12px] text-ink-2">{formatCreatedAt(user.createdAt)}</td>
                <td className="px-5 py-3">
                  <Action user={user} disabled={isPending} onChange={setAccountStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {apiUsers.isError && <p role="alert" className="mt-3 text-[12px] text-error">โหลดรายชื่อผู้ใช้ไม่สำเร็จ</p>}
      {rows.length === 0 && (
        <p className="t-body text-ink-2 mt-4 rounded-sheet border border-rule bg-sheet px-5 py-6">
          ไม่มีบัญชีที่ตรงกับตัวกรองนี้
        </p>
      )}

      <UserDetail
        user={detail}
        disabled={isPending}
        onClose={() => setDetail(null)}
        onChange={setAccountStatus}
      />

      <section className="mt-8 rounded-sheet border border-rule bg-ground px-5 py-4">
        <h2 className="t-label text-ink-3">สิ่งที่หน้านี้จงใจไม่แสดง</h2>
        <p className="t-meta mt-2 leading-relaxed text-ink-2">
          ไม่มีอีเมล ชื่องาน จำนวนงาน โน้ต หรือเนื้อหาข้อความ แสดงเฉพาะสถานะบัญชี บทบาท เขตเวลา และวันที่สร้างบัญชี
        </p>
      </section>
    </>
  )
}

function Avatar({ user }: { user: Row }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-mint font-mono text-[12px] text-brand-strong" aria-hidden>
      {user.name.slice(0, 1)}
    </span>
  )
}

function AccountStatus({ user }: { user: Row }) {
  const deleted = user.status === 'DELETED'
  const suspended = isSuspended(user)
  const label = deleted ? 'ลบบัญชีแล้ว' : suspended ? 'ถูกระงับ' : 'ใช้งานอยู่'
  const tone = deleted ? 'bg-ground text-ink-3' : suspended ? 'bg-error/[0.08] text-error' : 'bg-mint text-brand-strong'

  return (
    <span className={`t-caption inline-flex items-center gap-1 rounded-pill px-2 py-0.5 ${tone}`}>
      <span className="font-mono" aria-hidden>{deleted || suspended ? '✕' : '✓'}</span>
      {label}
    </span>
  )
}

function Action({ user, disabled, onChange }: {
  user: Row
  disabled: boolean
  onChange: (user: Row, nextSuspended: boolean) => void
}) {
  if (user.status === 'DELETED') return <span className="text-[12px] text-ink-3">กู้คืนไม่ได้</span>
  const suspended = isSuspended(user)
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onChange(user, !suspended)
      }}
      className={`wc-lift min-h-11 rounded-control border border-rule bg-sheet px-3 text-[12px] font-medium disabled:opacity-45 ${
        suspended ? 'text-ink-2' : 'text-error'
      }`}
    >
      {suspended ? 'เปิดใช้บัญชี' : 'ระงับบัญชี'}
    </button>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th scope="col" className="t-label px-5 py-2.5 font-medium text-ink-3">{children}</th>
}

function UserDetail({ user, disabled, onClose, onChange }: {
  user: Row | null
  disabled: boolean
  onClose: () => void
  onChange: (user: Row, nextSuspended: boolean) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (user && !dialog.open) dialog.showModal()
    if (!user && dialog.open) dialog.close()
  }, [user])

  if (!user) return null
  const deleted = user.status === 'DELETED'
  const suspended = isSuspended(user)

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="user-detail-title"
      className="m-auto w-[480px] max-w-[calc(100vw-40px)] rounded-[10px] border border-rule bg-sheet p-0 shadow-[0_2px_4px_rgba(23,23,23,0.06),0_16px_40px_rgba(23,23,23,0.16)] backdrop:bg-ink/35"
    >
      <div className="flex items-center gap-3.5 px-6 pt-6 pb-5">
        <Avatar user={user} />
        <span className="min-w-0 flex-1">
          <h2 id="user-detail-title" className="font-display text-[18px] font-medium">{user.name}</h2>
          {user.role === 'ADMIN' && <span className="t-caption text-ink-3">ผู้ดูแลระบบ</span>}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="wc-lift grid size-11 place-items-center rounded-control text-ink-2"
        >
          <span aria-hidden className="font-mono text-[13px]">✕</span>
          <span className="sr-only">ปิด</span>
        </button>
      </div>

      <dl className="border-t border-rule-soft">
        <Fact label="บทบาท">{user.role === 'ADMIN' ? 'ผู้ใช้ และผู้ดูแลระบบ' : 'ผู้ใช้'}</Fact>
        <Fact label="สถานะบัญชี"><AccountStatus user={user} /></Fact>
        <Fact label="เขตเวลา"><span className="font-mono text-[12px]">{user.timezone}</span></Fact>
        <Fact label="สร้างบัญชีเมื่อ">{formatCreatedAt(user.createdAt)}</Fact>
      </dl>

      <div className="flex items-center justify-end gap-2 px-6 pt-4 pb-5">
        <button
          type="button"
          onClick={onClose}
          className="wc-lift min-h-11 rounded-control border border-rule px-4 text-[13px] font-medium text-ink-2"
        >
          ปิด
        </button>
        {!deleted && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(user, !suspended)}
            className={`wc-lift min-h-11 rounded-control px-4 text-[13px] font-medium disabled:opacity-45 ${
              suspended ? 'border border-rule bg-sheet text-ink-2' : 'bg-error text-on-dark'
            }`}
          >
            {suspended ? 'เปิดใช้บัญชี' : 'ระงับบัญชี'}
          </button>
        )}
      </div>
    </dialog>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-b border-rule-soft px-6 py-3">
      <dt className="t-body w-[150px] shrink-0 text-ink-3">{label}</dt>
      <dd className="text-[13px]">{children}</dd>
    </div>
  )
}
