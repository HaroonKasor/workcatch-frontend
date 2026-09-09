import { useEffect, useState } from 'react'

/**
 * A clock that actually ticks.
 *
 * Reading `new Date()` inline during render looks fine and is quietly broken:
 * leave a tab open across 17:00 and the task due at 17:00 never turns red,
 * because nothing re-renders. For an app whose whole promise is showing you what
 * is about to be late, that is the worst possible bug — it fails silently and
 * looks correct.
 *
 * Thirty seconds is fine. Deadlines are minute-grained, and a tighter interval
 * would re-render the whole ledger for no visible gain.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    // A laptop waking from sleep fires no interval for the time it was asleep,
    // so re-read the clock when the tab becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])

  return now
}
