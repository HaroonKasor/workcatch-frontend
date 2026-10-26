import { useEffect, useRef, useState } from 'react'
import { UnlockCodeDialog } from './UnlockCode'
import { useRevealSecret, useUnlockCodeStatus } from '../lib/api'
import { maskOf } from '../lib/notes'
import type { CredentialField, NoteBlock } from '../lib/types'

/**
 * The credentials block — Figma 131:1165 (masked, on a card), 138:2 (step-up and
 * the revealed state).
 *
 * The rules this component exists to enforce, none of them negotiable:
 *
 *  1. A secret renders as bullets. Always. The masked state is not a "before"
 *     state you can skip past; it is what the value looks like.
 *  2. Revealing costs a step-up confirmation. The design's own note is that
 *     opening a secret must have a visible price — one click and it appears is
 *     how people end up screen-sharing a password they forgot was open.
 *  3. The revealed state closes itself after 30 seconds, because people do not
 *     close it. The countdown is shown so the close is not a surprise.
 *  4. A secret value never goes into a URL, a document title, localStorage, an
 *     analytics call or a console line. It is read from the store on demand,
 *     lives in component state for at most 30 seconds, and is dropped.
 *
 * WHAT IS NOT HERE, ON PURPOSE: any cryptography, and any real verification of
 * the person. Both are the server's job — see the `secrets` note in lib/store.ts.
 * The dialog below collects an unlock code and sends it to the server; there is
 * nothing on this client that could check it honestly. The server is the source
 * of truth for verification and for the step-up window.
 */

/** How long a revealed value stays on screen. People do not close it themselves. */
const REVEAL_SECONDS = 30

/**
 * After one step-up, further reveals are free for 15 minutes — the design says
 * so, and re-typing an unlock code per field trains people to type it without
 * looking. Module scope, so the grace is per session and not per component.
 */
let graceUntil = 0

export function CredentialsBlock({
  block,
  subject,
  compact,
}: {
  block: Extract<NoteBlock, { kind: 'credentials' }>
  /** The note's title. Shown in the dialog so it is clear what is being opened. */
  subject: string
  /** Card layout: no copy row, tighter type. */
  compact?: boolean
}) {
  const [revealed, setRevealed] = useState<Record<string, string> | null>(null)
  const [left, setLeft] = useState(REVEAL_SECONDS)
  const [unlockDialog, setUnlockDialog] = useState<'enter' | 'set' | null>(null)
  const [copied, setCopied] = useState<Record<string, true>>({})
  const [revealError, setRevealError] = useState<string | null>(null)
  const copyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const unlockStatus = useUnlockCodeStatus()
  const revealSecret = useRevealSecret()

  // The auto-hide. Runs off a single interval so the countdown a person reads
  // and the moment the values disappear cannot drift apart.
  useEffect(() => {
    if (!revealed) return
    const started = Date.now()
    const tick = setInterval(() => {
      const remaining = REVEAL_SECONDS - Math.floor((Date.now() - started) / 1000)
      if (remaining <= 0) {
        setRevealed(null)
        clearCopied()
      } else {
        setLeft(remaining)
      }
    }, 250)
    return () => clearInterval(tick)
  }, [revealed])

  // Explicitly clear the only plaintext-bearing state when this card leaves the
  // tree as well as when the 30-second timer closes it.
  useEffect(() => () => {
    setRevealed(null)
    clearCopied()
  }, [])

  function clearCopied() {
    for (const timer of Object.values(copyTimers.current)) clearTimeout(timer)
    copyTimers.current = {}
    setCopied({})
  }

  function open() {
    setRevealError(null)
    if (Date.now() < graceUntil) void reveal()
    else setUnlockDialog(unlockStatus.data?.set === false ? 'set' : 'enter')
  }

  async function reveal() {
    // Read at the moment of reveal and hold nowhere else. `revealed` is dropped
    // by the timer above, and nothing writes it anywhere.
    const values: Record<string, string> = {}
    try {
      for (const f of block.fields) {
        if (!f.secret) continue
        const secret = await revealSecret.mutateAsync(f.id)
        values[f.id] = secret.password ?? secret.username ?? secret.notes ?? ''
      }
    } catch (error) {
      // The endpoint is authoritative. A refusal reveals nothing, including in
      // the brief period before a step-up grant or a reset has settled. A 403 is
      // actionable (the step-up expired), so it must never disappear silently.
      setRevealError(error instanceof Error ? error.message : 'เปิดดูข้อมูลลับไม่สำเร็จ')
      return
    }
    setRevealed(values)
    setLeft(REVEAL_SECONDS)
  }

  function unlocked(expiresAt: string) {
    // The server grants this session the fifteen-minute window. Keep its expiry
    // in module scope so another credentials card does not ask again locally.
    graceUntil = new Date(expiresAt).getTime()
    void reveal()
  }

  function codeSet(expiresAt: string) {
    // A just-set code continues the action that required it.
    graceUntil = new Date(expiresAt).getTime()
    void reveal()
  }

  async function copy(field: CredentialField) {
    const value = revealed?.[field.id]
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      // The label, never the value. Nothing about the value is written down.
      setCopied((current) => ({ ...current, [field.id]: true }))
      clearTimeout(copyTimers.current[field.id])
      copyTimers.current[field.id] = setTimeout(() => {
        setCopied((current) => {
          const { [field.id]: _copied, ...remaining } = current
          return remaining
        })
        delete copyTimers.current[field.id]
      }, 2_000)
    } catch {
      setCopied((current) => {
        const { [field.id]: _copied, ...remaining } = current
        return remaining
      })
    }
  }
  const copiedField = block.fields.find((f) => copied[f.id])

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <p className="t-label text-ink-3">ข้อมูลเข้าสู่ระบบ</p>
        {!revealed && (
          <span className="rounded-[3px] bg-mint px-2 py-[3px] font-mono text-[12px] tracking-[0.6px] text-brand-strong">
            ซ่อนค่าไว้
          </span>
        )}
      </div>

      {/*
        The countdown is a banner, not a chip — Figma 235:1661. While a secret is
        on screen the fact that it is on screen is the most important thing in
        the block, and it has to be readable without hunting for it. `aria-live`
        is off: a screen reader announcing every second would be unusable, and
        the deadline is stated once when the values appear.
      */}
      {revealed && (
        <p className="mt-3 flex items-center gap-2.5 rounded-control bg-ground px-3 py-2.5 text-[12px] text-ink-2">
          <span aria-hidden>⏱</span>
          เปิดดูอยู่ · ซ่อนอัตโนมัติใน {left} วินาที
        </p>
      )}

      <dl className={compact ? 'mt-3 space-y-2' : 'mt-3.5 space-y-2.5'}>
        {block.fields.map((f) => (
          <div key={f.id} className={compact ? 'flex items-start gap-3' : 'flex min-h-11 items-center gap-3'}>
            <dt className="w-[90px] shrink-0 text-[12px] leading-[1.45] text-ink-3">{f.label}</dt>
            <dd
              className={`min-w-0 flex-1 font-mono text-[13px] leading-[1.45] break-all ${
                f.secret ? 'text-ink' : 'text-ink-2'
              }`}
            >
              {f.secret
                ? revealed
                  // A restored note has no values behind it: deleting purged them
                  // and undo does not bring a secret back. Say so rather than
                  // rendering an empty row that reads as a bug.
                  ? (revealed[f.id] || '— ไม่มีค่าที่เก็บไว้')
                  : maskOf()
                : f.value}
            </dd>
            {revealed && !compact && f.secret && revealed[f.id] && (
              <button
                type="button"
                onClick={() => void copy(f)}
                aria-label={`คัดลอก${f.label}`}
                className="wc-lift min-h-11 shrink-0 rounded-control border border-rule bg-sheet px-3 text-[13px] font-medium text-ink-2"
              >
                {copied[f.id] ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            )}
          </div>
        ))}
      </dl>

      {revealed ? (
        <>
          {!compact && (
            <>
              {/* Its own row — Figma 235:1682. Hiding is not another way of
                  copying, and a row of look-alike buttons is how you press the
                  wrong one. */}
              <button
                type="button"
                onClick={() => {
                  setRevealed(null)
                  clearCopied()
                }}
                className="wc-lift mt-4 min-h-11 rounded-control border border-rule bg-sheet px-3 text-[12px] font-medium"
              >
                ซ่อนเดี๋ยวนี้
              </button>
            </>
          )}
          <p className="mt-3 text-[12px] leading-[1.45] text-ink-3" role="status">
            {copiedField
              ? `คัดลอก${copiedField.label}แล้ว · ระบบบันทึกว่าใครเปิดดูเมื่อไหร่ แต่ไม่บันทึกค่าที่คัดลอก`
              : 'ออกจากหน้านี้เมื่อไหร่ ค่าจะกลับไปซ่อนทันทีโดยไม่ต้องรอครบเวลา'}
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={open}
            className="wc-lift mt-4 min-h-11 w-full rounded-control border border-rule bg-ground text-[12px] font-medium"
          >
            เปิดดู — ต้องยืนยันตัวตน<span className="hidden lg:inline">อีกครั้ง</span>
          </button>
          <p className="mt-2.5 text-[12px] leading-[1.45] text-ink-3">ไม่ถูกนำไปค้นหา ไม่ส่งทาง LINE ไม่ปรากฏใน log</p>
          {revealError && <p role="alert" className="mt-2 text-[12px] leading-[1.45] text-error">{revealError}</p>}
        </>
      )}

      {/* Mounted only while open. Unmounting is what destroys the unlock-code
          field's contents — clearing it by hand would leave a window where the
          value is still in React state. */}
      {unlockDialog && (
        <UnlockCodeDialog
          subject={subject}
          initial={unlockDialog}
          onUnlocked={unlocked}
          onSet={codeSet}
          onClose={() => setUnlockDialog(null)}
        />
      )}
    </div>
  )
}

