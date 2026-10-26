import { Navigate } from 'react-router-dom'
import { useMe } from '../lib/api'
import { entryDestination } from '../lib/session'

/**
 * Where an unknown URL lands, and the one place that decides where that visitor
 * belongs: the dashboard if signed in, the login screen if not. The question is
 * asked once, here, and the answer is the destination rather than another guess.
 *
 * "/" used to come through here too. It is the landing page now (Landing.tsx),
 * which is shown to everyone and so has nothing to decide.
 */
export default function Entry() {
  const me = useMe()

  const to = entryDestination({ pending: me.isPending, signedIn: !!me.data })
  // null means the answer has not arrived. Rendering nothing is the only honest
  // option: both destinations would be a guess.
  if (!to) return <div className="min-h-viewport bg-ground" aria-busy="true" />
  return <Navigate to={to} replace />
}
