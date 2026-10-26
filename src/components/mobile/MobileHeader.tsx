import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, useLogout, useMe, useNotifications, useProjects } from '../../lib/api'
import { useAiPanel } from '../../lib/aiPanel'
import { store } from '../../lib/store'
import { BottomSheet, SheetItem } from './BottomSheet'
import { Icon, type IconName } from './Icon'

/**
 * The phone's top bar — Figma 457:14. A title (with its count or date beside it),
 * any screen-specific icon buttons, then ถาม AI and the avatar.
 *
 * The AI has no floating button any more: it is always here, at the top, where
 * it cannot sit on top of a row. The avatar opens the profile menu, which now
 * holds what used to have a tab or a rail slot — projects, notifications,
 * settings, plan, sign out. Every button is a 44px target.
 */
export function MobileHeader({ title, count, sub, actions }: {
  title?: string
  count?: number | string
  sub?: string
  actions?: { icon: IconName; label: string; onClick: () => void }[]
}) {
  const ai = useAiPanel()
  const [menu, setMenu] = useState(false)
  const me = useMe()
  const initial = (me.data?.displayName || 'ผ').trim().charAt(0)

  return (
    <header className="flex min-h-[64px] items-center gap-1 px-4 pt-[max(8px,env(safe-area-inset-top))] pb-2 lg:hidden">
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        {title && <h1 className="font-display truncate text-[32px] leading-[1.2] font-semibold tracking-[-0.5px]">{title}</h1>}
        {count !== undefined && <span className="font-mono text-[14px] text-ink-3">{count}</span>}
        {sub && <span className="truncate text-[14px] text-ink-3">{sub}</span>}
      </div>
      {actions?.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          aria-label={a.label}
          className="flex size-11 shrink-0 items-center justify-center"
        >
          <Icon name={a.icon} size={22} />
        </button>
      ))}
      <button
        type="button"
        onClick={ai.open}
        className="wc-lift ml-1 flex h-11 shrink-0 items-center rounded-pill border border-rule bg-sheet px-4 text-[14px] font-medium"
      >
        ถาม AI
      </button>
      <button
        type="button"
        onClick={() => setMenu(true)}
        aria-label="บัญชีและเมนู"
        aria-haspopup="dialog"
        className="flex size-11 shrink-0 items-center justify-center"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-ink text-[14px] font-medium text-on-dark">{initial}</span>
      </button>
      <ProfileSheet open={menu} onClose={() => setMenu(false)} />
    </header>
  )
}

/** Figma 471:1819. */
function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()
  const projects = useProjects()
  const notifications = useNotifications()
  const logout = useLogout()
  const navigate = useNavigate()
  const live = (projects.data ?? []).filter((p) => !p.archivedAt).length
  const failed = (notifications.data ?? []).filter((n) => n.status === 'FAILED_FINAL').length

  const leave = () => {
    store.reset()
    onClose()
    void navigate('/', { replace: true })
  }

  return (
    <BottomSheet open={open} onClose={onClose} label="บัญชีและเมนู">
      <div className="flex items-center gap-3.5 px-4 pb-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-[18px] font-medium text-on-dark">
          {(me.data?.displayName || 'ผ').trim().charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[17px] font-medium">{me.data?.displayName || 'บัญชีของคุณ'}</span>
          <span className="block text-[13px] text-ink-3">LINE · แผนฟรี</span>
        </span>
      </div>
      <div className="border-t border-rule-soft">
        <SheetItem icon="folder" to="/app/projects" onClick={onClose} chevron trailing={live > 0 ? live : undefined}>โปรเจกต์</SheetItem>
        <SheetItem
          icon="bell"
          to="/app/notifications"
          onClick={onClose}
          chevron
          trailing={failed > 0 ? <span className="text-time-late">{failed} ล้มเหลว</span> : undefined}
        >
          การแจ้งเตือน
        </SheetItem>
        <SheetItem icon="gear" to="/app/settings" onClick={onClose} chevron>ตั้งค่า</SheetItem>
        <SheetItem icon="star" to="/app/upgrade" onClick={onClose} chevron trailing="ฟรี">แผนการใช้งาน</SheetItem>
        <SheetItem
          icon="logout"
          onClick={() => {
            logout.mutate(undefined, {
              onSuccess: leave,
              onError: (e) => { if (e instanceof ApiError && e.status === 401) leave() },
            })
          }}
        >
          ออกจากระบบ
        </SheetItem>
      </div>
    </BottomSheet>
  )
}

/** "‹ เมนู" — the way back from a screen that sits under another one, above its title. */
export function MobileBack({ to, label, children }: { to: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pl-2 pr-1 pt-[max(8px,env(safe-area-inset-top))] lg:hidden">
      <Link to={to} className="flex min-h-11 items-center gap-1 px-1 text-[17px]">
        <Icon name="chevronLeft" size={22} />{label}
      </Link>
      {children}
    </div>
  )
}
