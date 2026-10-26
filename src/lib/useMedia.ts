import { useSyncExternalStore } from 'react'

/** Whether a CSS media query currently matches; re-renders when it flips. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind's `lg`: the phone layouts end here and the desktop ones begin. */
export function useIsDesktop(): boolean {
  return useMedia('(min-width: 1024px)')
}
