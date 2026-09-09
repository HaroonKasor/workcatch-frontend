import { useQuery } from '@tanstack/react-query'
import { notifications as mockNotifications, projects as mockProjects, tasks as mockTasks } from './fixtures'
import type { NotificationRecord, Project, Task } from './types'

/**
 * Data layer. Today it serves fixtures; when the API lands, only the two
 * fetchers below change and every screen keeps working. Screens must never call
 * fetch directly, or swapping the source becomes a hunt through the codebase.
 */
const USE_FIXTURES = true

async function get<T>(path: string, fallback: T): Promise<T> {
  if (USE_FIXTURES) return fallback
  const res = await fetch(`/api${path}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => get<Task[]>('/tasks', mockTasks),
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', id],
    enabled: !!id,
    queryFn: () => get<Task>(`/tasks/${id}`, mockTasks.find((t) => t.id === id)!),
  })
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => get<Project[]>('/projects', mockProjects),
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => get<NotificationRecord[]>('/notifications', mockNotifications),
  })
}
