import { useState } from 'react'
import type { AiAction } from './api'
import type { Task } from './types'

/**
 * What the person decided about each AI action in this tab — applied or not
 * used — so a button that has been answered stays answered across the panel,
 * the overview card and a reload.
 */
export type Decision = 'applied' | 'dismissed'
const DECIDED_KEY = 'wc.ai.decided'

function readDecided(): Record<string, Decision> {
  try {
    return JSON.parse(sessionStorage.getItem(DECIDED_KEY) ?? '{}') as Record<string, Decision>
  } catch {
    return {}
  }
}

export function useDecisions() {
  const [decided, setDecided] = useState<Record<string, Decision>>(readDecided)
  const decide = (id: string, decision: Decision) => {
    try {
      sessionStorage.setItem(DECIDED_KEY, JSON.stringify({ ...readDecided(), [id]: decision }))
    } catch {
      // Forgetting only means the button is offered again after a reload.
    }
    setDecided((d) => ({ ...d, [id]: decision }))
  }
  return { decided, decide }
}

/** The task an action is about, or the title it would create. */
export function actionSubject(action: AiAction, tasks: Task[]): string | null {
  if (action.type === 'CREATE_TASK') return action.title ?? null
  return tasks.find((t) => t.id === action.taskId)?.title ?? null
}
