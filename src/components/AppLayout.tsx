import { Navigate, Outlet } from 'react-router-dom'
import { AppRail } from './AppRail'
import { QuickAddProvider } from './QuickAdd'
import { AiPanelProvider } from './AiPanel'
import { SearchPalette } from './SearchPalette'
import { ToastProvider } from './Toast'
import { MobileTabs } from './MobileTabs'
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
            <div className="mx-auto max-w-content px-5 pt-8 pb-[86px] lg:px-10 lg:pt-[48px] lg:pb-14">
              <Outlet />
            </div>
          </main>
          <MobileTabs inbox={counts.inbox} overdue={counts.overdue} />
        </div>
        </AiPanelProvider>
      </QuickAddProvider>
    </ToastProvider>
  )
}
