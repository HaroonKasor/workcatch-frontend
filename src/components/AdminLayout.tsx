import { Outlet } from 'react-router-dom'
import { AdminRail } from './AdminRail'

export default function AdminLayout() {
  return (
    <div className="flex min-h-dvh bg-ground">
      <div className="hidden lg:block">
        <AdminRail />
      </div>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-content px-5 py-8 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
