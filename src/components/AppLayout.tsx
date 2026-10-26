import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppRail } from './AppRail'
import { QuickAddProvider } from './QuickAdd'
import { AiPanelProvider } from './AiPanel'
import { SearchPalette } from './SearchPalette'
import { ToastProvider } from './Toast'
import { MobileTabs } from './MobileTabs'
import { MobileHeader } from './mobile/MobileHeader'
import { useMe, useNotes, useProjects, useTasks } from '../lib/api'
import { appShellDestination } from '../lib/session'
import { timeStateOf } from '../lib/time'
import { useNow } from '../lib/useNow'

export default function AppLayout() {
  // Typing /app/tasks straight into the address bar must ask the same question
  // the front door asks, or the guard is only on the door people already use.
  const me = useMe()
  const tasks = useTasks()
  const projects = useProjects()
  const notes = useNotes()
  const now = useNow()
  const { pathname } = useLocation()
  // The phase-1 phone screens draw their own top bar and run edge to edge; every
  // other screen gets a bare one (ถาม AI and the profile menu) above its content.
  const ownsChrome = /^\/app(\/(dashboard|inbox|tasks(\/[^/]+)?|board|calendar|projects|notes|notifications|settings|upgrade|connect-line))?\/?$/.test(pathname)
  const all = tasks.data ?? []

  const counts = {
    inbox: all.filter((t) => t.status === 'INBOX').length,
    overdue: all.filter((t) => timeStateOf(t, now) === 'late').length,
    open: all.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED').length,
    waiting: all.filter((t) => t.status === 'WAITING').length,
    notes: (notes.data ?? []).length,
  }

  const leave = appShellDestination({ pending: me.isPending, signedIn: !!me.data })
  if (me.isPending) {
    return <div className="wc-scale min-h-viewport bg-ground" aria-busy="true" />
  }
  if (leave) return <Navigate to={leave} replace />

  return (
    <ToastProvider>
      <QuickAddProvider>
        <AiPanelProvider>
        <SearchPalette />
        <div className="wc-scale min-h-viewport flex bg-ground">
          {/* The rail is desktop only; below lg the bottom tab bar navigates. */}
          <div className="hidden lg:block">
            {/* Archived projects are reachable from /app/projects, where the
                card says they are archived. The rail is a list of places work
                goes, and no work goes into an archived project. */}
            <AppRail
              counts={counts}
              projects={(projects.data ?? []).filter((p) => !p.archivedAt)}
              projectCounts={all.reduce<Record<string, number>>((acc, t) => {
                if (t.project && t.status !== 'DONE' && t.status !== 'CANCELLED') acc[t.project.id] = (acc[t.project.id] ?? 0) + 1
                return acc
              }, {})}
            />
          </div>
          <main className="min-w-0 flex-1">
            {/* Bottom padding clears the tab bar; without it the last row of
                every list sits underneath it and cannot be tapped. */}
            {!ownsChrome && !/^\/app\/(notes|projects)\/./.test(pathname) && <MobileHeader />}
            <div className={`mx-auto max-w-content pb-[86px] lg:px-10 lg:pt-[48px] lg:pb-14 ${ownsChrome ? '' : 'px-5 pt-3'}`}>
              <Outlet />
            </div>
          </main>
          <MobileTabs inbox={counts.inbox} />
        </div>
        </AiPanelProvider>
      </QuickAddProvider>
    </ToastProvider>
  )
}
