import { Link } from 'react-router-dom'
import { gutterLabel, timeStateOf } from '../lib/time'
import { priorityTitle, projectDot, statusLabel, timeBar, timeText, timeWeight } from '../lib/style'
import type { Task } from '../lib/types'

/**
 * The ledger row — the single most repeated element in the product.
 *
 * Shape: [state bar][time gutter][rule][what][status]
 * Everything in this app is "what + when", so the when gets a fixed monospace
 * column at the left edge where the eye lands first, and the numbers line up
 * down the page instead of jittering.
 */
export function TaskRow({ task, now, last }: { task: Task; now: Date; last?: boolean }) {
  const state = timeStateOf(task, now)
  const dim = state === 'done'

  return (
    <Link
      to={`/app/tasks/${task.id}`}
      className={[
        'flex items-center h-row transition-colors hover:bg-ink/[0.02]',
        last ? '' : 'border-b border-rule-soft',
        // Completed work recedes instead of celebrating. It has had its turn.
        dim ? 'opacity-55' : '',
      ].join(' ')}
    >
      <span className={`w-hair self-stretch shrink-0 ${timeBar[state]}`} aria-hidden />

      <span className="w-[78px] shrink-0 pl-2.5 pr-3 text-right sm:w-gutter sm:pl-3 sm:pr-4">
        <span className={`${timeWeight[state]} ${timeText[state]}`}>
          {gutterLabel(task, now)}
        </span>
      </span>

      <span className="w-px self-stretch bg-rule-soft shrink-0" aria-hidden />

      <span className="min-w-0 flex-1 px-4 py-2">
        <span className={`block truncate ${priorityTitle[task.priority]}`}>{task.title}</span>
        <span className="t-meta text-ink-3 mt-1 flex items-center gap-2 truncate">
          {task.project && (
            <>
              <span className={`inline-block size-1.5 shrink-0 rounded-full ${projectDot[task.project.color]}`} aria-hidden />
              <span className="truncate">{task.project.name}</span>
            </>
          )}
          {task.requester && <span className="truncate">· สั่งโดย {task.requester}</span>}
          {task.waitingFor && <span className="truncate">· รอ {task.waitingFor}</span>}
        </span>
      </span>

      <span className="t-meta text-ink-3 hidden shrink-0 pr-5 sm:block">
        {statusLabel[task.status]}
      </span>
    </Link>
  )
}
