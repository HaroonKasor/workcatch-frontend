import { useUpdateTask } from '../../lib/api'
import { stamp } from '../../lib/time'
import type { Task } from '../../lib/types'
import { useToast } from '../Toast'

export function usePostpone() {
  const update = useUpdateTask()
  const toast = useToast()
  return (task: Task, at: string) => {
    const before = task.dueAt
    update.mutate({ id: task.id, patch: { dueAt: at } })
    toast({
      title: `เลื่อนไป ${stamp(at)}`,
      action: { label: 'เลิกทำ', onAct: () => update.mutate({ id: task.id, patch: { dueAt: before } }) },
    })
  }
}
