import { Navigate, Outlet } from 'react-router-dom'
import { AdminPageSwitcher, AdminRail, AdminRailCompact, AdminTopBar } from './AdminRail'
import { ToastProvider } from './Toast'
import { useMe } from '../lib/api'

/**
 * The admin shell, and the gate in front of it.
 *
 * The gate is a courtesy, not a security boundary. Every /api/admin/** request
 * is checked server-side against ROLE_ADMIN, so a non-admin who typed the URL
 * would already see nothing but empty tables and 403s. What this adds is an
 * answer instead of a broken screen: it sends them back where they came from.
 * Anyone tempted to remove it should remove the courtesy, never the server check.
 */
export default function AdminLayout() {
  const me = useMe()

  // Deciding while the answer is still loading would bounce an admin out of
  // their own screen on every hard refresh.
  if (me.isPending) {
    return (
      <div className="wc-scale min-h-viewport bg-ground" aria-busy="true">
        <span className="sr-only">กำลังตรวจสอบสิทธิ์</span>
      </div>
    )
  }
  if (!me.data?.admin) {
    return <Navigate to="/app/dashboard" replace />
  }

  return (
    <ToastProvider>
      <div className="wc-scale min-h-viewport flex flex-col bg-ground min-[900px]:flex-row">
        <AdminTopBar />
        <div className="hidden min-[900px]:block xl:hidden">
          <AdminRailCompact />
        </div>
        <div className="hidden xl:block">
          <AdminRail />
        </div>
        <main className="min-w-0 flex-1">
          <AdminPageSwitcher />
          <div className="mx-auto max-w-content pb-8 min-[900px]:px-6 min-[900px]:py-6 xl:px-10 xl:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
