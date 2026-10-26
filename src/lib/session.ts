/**
 * Where an arriving visitor belongs.
 *
 * Pulled out of the components so the rule reads as one decision in one place,
 * shared by the front door and the app shell. It is the kind of rule that fails
 * quietly — send a signed-in person to the login screen and they simply see the
 * wrong page, with nothing thrown and nothing logged.
 */
export type Session = { pending: boolean; signedIn: boolean }

/** `null` means "not yet" — render nothing rather than guessing. */
export function entryDestination(s: Session): '/login' | '/app/dashboard' | null {
  // Answering early is the bug this exists to prevent: while the answer is in
  // flight, both destinations are wrong, and a redirect cannot be taken back.
  if (s.pending) return null
  return s.signedIn ? '/app/dashboard' : '/login'
}

/** The app shell asks a narrower question: may this person stay here? */
export function appShellDestination(s: Session): '/login' | null {
  if (s.pending) return null
  return s.signedIn ? null : '/login'
}
