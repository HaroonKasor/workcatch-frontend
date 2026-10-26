import { useState } from 'react'
import { useUpdateTask } from '../../lib/api'
import type { Task } from '../../lib/types'
import { useToast } from '../Toast'
import { PostponeSheet } from './PostponeSheet'

/** The two row actions, plus the one postpone sheet a list shares between its rows. */
export function useRowActions() {
  const update = useUpdateTask()
  const toast = useToast()
  const [postponing, setPostponing] = useState<Task | null>(null)

  const close = (task: Task) => {
    const was = task.status
    update.mutate({ id: task.id, patch: { status: 'DONE' } })
    toast({
      title: 'ปิดงานแล้ว',
      body: task.title,
      action: { label: 'เลิกทำ', onAct: () => update.mutate({ id: task.id, patch: { status: was } }) },
    })
  }

  return {
    close,
    postpone: setPostponing,
    sheet: <PostponeSheet task={postponing} onClose={() => setPostponing(null)} />,
  }
}
