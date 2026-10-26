import { Navigate, Outlet } from 'react-router-dom'
import { AdminRail } from './AdminRail'
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
      <div className="wc-scale min-h-viewport flex bg-ground">
        <div className="hidden lg:block">
          <AdminRail />
        </div>
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-content px-5 py-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
