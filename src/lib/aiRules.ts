/**
 * The two rules about AI actions that must not drift, kept pure so `node --test`
 * can hold them to account without a DOM (lib/aiRules.test.ts).
 */

/** What SET_STATUS may carry (backend/docs/ai-api.md) — the app's own words. */
export const AI_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const
export type AiStatusValue = (typeof AI_STATUSES)[number]

/**
 * The task status to write for a SET_STATUS action, or null when the value is
 * not one this app knows. Null means: do not apply, and do not report it as
 * accepted — an unknown status written through would change nothing while the
 * screen claimed it had.
 */
export function statusToApply(value: unknown): AiStatusValue | null {
  return typeof value === 'string' && (AI_STATUSES as readonly string[]).includes(value)
    ? (value as AiStatusValue)
    : null
}

export type AiOutcomeValue = 'ACCEPTED' | 'EDITED' | 'DISMISSED'

export interface AiFinal {
  dueAt?: string | null
  projectId?: string | null
  title?: string
}

/**
 * The outcome body. `final` travels only with EDITED — it is what the person
 * changed the proposal to — and is omitted otherwise.
 */
export function outcomeBody(outcome: AiOutcomeValue, final?: AiFinal): { outcome: AiOutcomeValue; final?: AiFinal } {
  return outcome === 'EDITED' && final ? { outcome, final } : { outcome }
}

const KNOWN_TYPES = ['CREATE_TASK', 'SET_DUE', 'SET_PROJECT', 'SET_STATUS']

/**
 * An action this app cannot carry out as sent: an unknown type, or a status it
 * does not know. Its button is shown but cannot be pressed, and it is never
 * reported as accepted.
 */
export function isUnusable(action: { type: string; status?: unknown }): boolean {
  if (!KNOWN_TYPES.includes(action.type)) return true
  return action.type === 'SET_STATUS' && statusToApply(action.status) === null
}
