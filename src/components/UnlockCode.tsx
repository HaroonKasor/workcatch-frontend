import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ApiError, useResetUnlockCode, useSetUnlockCode, useStepUp } from '../lib/api'

type View = 'enter' | 'set' | 'reset'

/**
 * The code only ever exists in state while this mounted dialog is open. Callers
 * unmount it on close, which is the important part of clearing it promptly.
 */
export function UnlockCodeDialog({
  subject,
  initial = 'enter',
  onUnlocked,
  onSet,
  onClose,
}: {
  subject?: string
  initial?: 'enter' | 'set'
  onUnlocked?: (expiresAt: string) => void
  onSet?: (expiresAt: string) => void
  onClose: () => void
}) {
  const [view, setView] = useState<View>(initial)
  const [code, setCode] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)
  const [now, setNow] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)
  const setCodeMutation = useSetUnlockCode()
  const resetCodeMutation = useResetUnlockCode()
  const stepUp = useStepUp()

  useEffect(() => {
    const timer = setTimeout(() => codeRef.current?.focus(), 0)
    return () => clearTimeout(timer)
  }, [view])

  useEffect(() => {
    if (!lockedUntil) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [lockedUntil])

  const locked = lockedUntil !== null && new Date(lockedUntil).getTime() > now

  function clean(value: string) {
    return value.replace(/\D/g, '').slice(0, 6)
  }

  function showSet() {
    setCode('')
    setConfirmation('')
    setMessage(null)
    setLockedUntil(null)
    setView('set')
  }

  function submitEnter() {
    if (code.length !== 6 || locked || stepUp.isPending) return
    setMessage(null)
    stepUp.mutate(code, {
      onSuccess: ({ expiresAt }) => {
        onUnlocked?.(expiresAt)
        onClose()
      },
      onError: (error) => {
        const failure = error instanceof ApiError ? error : null
        if (failure?.code === 'UNLOCK_CODE_REQUIRED') {
          showSet()
          return
        }
        if (failure?.code === 'UNLOCK_CODE_LOCKED') {
          const until = typeof failure.body?.lockedUntil === 'string' ? failure.body.lockedUntil : null
          setCode('')
          setLockedUntil(until)
          setNow(Date.now())
          setMessage(until ? `ใส่ผิดครบ 5 ครั้ง ลองใหม่ได้ตอน ${bangkokTime(until)}` : 'ใส่ผิดครบ 5 ครั้ง ลองใหม่อีกครั้งภายหลัง')
          return
        }
        if (failure?.code === 'UNLOCK_CODE_WRONG') {
          const attempts = typeof failure.body?.attemptsLeft === 'number' ? failure.body.attemptsLeft : 0
          setCode('')
          setMessage(`✕ รหัสไม่ถูกต้อง · ใส่ได้อีก ${attempts} ครั้ง ก่อนล็อก 15 นาที`)
          setTimeout(() => codeRef.current?.focus(), 0)
          return
        }
        setMessage(failure?.message ?? 'ปลดล็อกไม่สำเร็จ ลองใหม่อีกครั้ง')
      },
    })
  }

  function submitSet() {
    if (code.length !== 6 || confirmation.length !== 6 || setCodeMutation.isPending) return
    if (code !== confirmation) {
      setMessage('รหัสสองช่องไม่ตรงกัน')
      return
    }
    setMessage(null)
    setCodeMutation.mutate(code, {
      onSuccess: () => {
        // Setting a code does not grant access by itself. Step up with the same
        // in-memory value before allowing the action that opened this dialog.
        stepUp.mutate(code, {
          onSuccess: ({ expiresAt }) => {
            onSet?.(expiresAt)
            onClose()
          },
          onError: (error) => {
            const failure = error instanceof ApiError ? error : null
            setMessage(failure?.message ?? 'ตั้งรหัสแล้ว แต่ปลดล็อกไม่สำเร็จ ลองใหม่อีกครั้ง')
          },
        })
      },
      onError: (error) => {
        const failure = error instanceof ApiError ? error : null
        if (failure?.status === 409) {
          setView('enter')
          setMessage(null)
          return
        }
        setMessage(failure?.message ?? 'ตั้งรหัสไม่สำเร็จ ลองใหม่อีกครั้ง')
      },
    })
  }

  function reset() {
    if (resetCodeMutation.isPending) return
    resetCodeMutation.mutate(undefined, { onSuccess: showSet })
  }

  const busy = stepUp.isPending || setCodeMutation.isPending || resetCodeMutation.isPending
  const title = view === 'enter' ? 'ใส่รหัสปลดล็อก' : view === 'set' ? 'ตั้งรหัสปลดล็อก' : 'ตั้งรหัสปลดล็อกใหม่'

  return (
    <NativeDialog title={title} onClose={onClose}>
      {view === 'enter' && (
        <form onSubmit={(event) => { event.preventDefault(); submitEnter() }}>
          <p className="mt-[5px] truncate text-[12px] text-ink-2">{subject}</p>
          <p className="mt-3.5 text-[12.5px] leading-[1.45] text-ink-2">
            รหัส 6 หลักที่คุณตั้งไว้ตอนเก็บข้อมูลลับครั้งแรก ไม่ใช่รหัสผ่านที่เก็บไว้ในบันทึก · ปลดล็อกครั้งเดียว เปิดดูรายการอื่นได้ 15 นาที
          </p>
          <CodeInput value={code} inputRef={codeRef} error={message?.startsWith('✕') ?? false} disabled={busy || locked} label="รหัสปลดล็อก 6 หลัก" onChange={(value) => { setCode(clean(value)); setMessage(null) }} />
          {message && <p role="alert" className="mt-3 text-[12px] leading-[1.45] text-error">{message}</p>}
          <button type="button" onClick={() => setView('reset')} disabled={busy} className="mt-3 min-h-11 text-[12px] font-medium text-brand-strong underline underline-offset-2 disabled:opacity-55">
            ลืมรหัสปลดล็อก?
          </button>
          <InfoBox heading="สิ่งที่จะถูกบันทึก" lines={['เวลาและรายการที่เปิดดู', 'ไม่บันทึกค่าจริงที่เปิดดู']} />
          <Actions onClose={onClose} busy={busy} disabled={code.length !== 6 || locked} label={stepUp.isPending ? 'กำลังปลดล็อก…' : 'ปลดล็อกและเปิดดู'} />
        </form>
      )}

      {view === 'set' && (
        <form onSubmit={(event) => { event.preventDefault(); submitSet() }}>
          <p className="mt-[5px] text-[12px] text-ink-2">ก่อนเก็บข้อมูลเข้าสู่ระบบครั้งแรก</p>
          <p className="mt-3.5 text-[12.5px] leading-[1.45] text-ink-2">
            ตั้งรหัส 6 หลักไว้ใช้เปิดดูข้อมูลลับทุกครั้ง ระบบไม่ส่งรหัสนี้ทาง LINE และเปิดข้อมูลให้แทนไม่ได้ ถ้าลืมต้องตั้งใหม่ และข้อมูลลับเดิมจะถูกลบ
          </p>
          <p className="mt-4 text-[12px] font-medium text-ink-2">รหัส 6 หลัก</p>
          <CodeInput value={code} inputRef={codeRef} error={!!message} disabled={busy} label="รหัสปลดล็อก 6 หลัก" onChange={(value) => { setCode(clean(value)); setMessage(null) }} />
          <p className="mt-4 text-[12px] font-medium text-ink-2">ใส่อีกครั้งเพื่อยืนยัน</p>
          <CodeInput value={confirmation} error={!!message} disabled={busy} label="ยืนยันรหัสปลดล็อก 6 หลัก" onChange={(value) => { setConfirmation(clean(value)); setMessage(null) }} />
          {message && <p role="alert" className="mt-3 text-[12px] leading-[1.45] text-error">{message}</p>}
          <InfoBox heading="ข้อควรรู้" lines={['ห้ามใช้เลขเรียงหรือซ้ำกัน เช่น 123456, 000000', 'ใส่ผิด 5 ครั้งติดกัน ระบบจะล็อก 15 นาที']} />
          <Actions onClose={onClose} busy={busy} disabled={code.length !== 6 || confirmation.length !== 6} label={setCodeMutation.isPending ? 'กำลังตั้งรหัส…' : 'ตั้งรหัส'} />
        </form>
      )}

      {view === 'reset' && (
        <div>
          <p className="mt-[5px] text-[12px] text-ink-2">ข้อมูลเข้าสู่ระบบที่เก็บไว้ทั้งหมดจะถูกลบ</p>
          <p className="mt-3.5 text-[12.5px] leading-[1.45] text-ink-2">
            ถ้าไม่มีรหัส ระบบเปิดข้อมูลลับเดิมให้ไม่ได้ เพื่อไม่ให้คนที่ถือเครื่องคุณอยู่ตั้งรหัสใหม่แล้วเปิดดูได้ การตั้งรหัสใหม่จึงต้องลบข้อมูลลับเดิมก่อน
          </p>
          <InfoBox heading="สิ่งที่จะถูกลบ" lines={['ชื่อผู้ใช้ รหัสผ่าน และหมายเหตุลับทุกรายการ', 'เนื้อหาอื่นในบันทึกยังอยู่ครบ']} />
          <div className="mt-5 flex gap-2.5">
            <button type="button" onClick={onClose} disabled={busy} className="wc-lift min-h-11 flex-1 rounded-control border border-rule text-[13px] font-medium disabled:opacity-55">ยกเลิก</button>
            <button type="button" autoFocus onClick={reset} disabled={busy} className="wc-lift min-h-11 flex-1 rounded-control bg-error text-[13px] font-medium text-white disabled:opacity-55">
              {resetCodeMutation.isPending ? 'กำลังลบ…' : 'ลบและตั้งรหัสใหม่'}
            </button>
          </div>
        </div>
      )}
    </NativeDialog>
  )
}

function NativeDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="unlock-code-title" className="m-auto w-[348px] max-w-[calc(100vw-40px)] rounded-[10px] border border-rule bg-sheet p-0 shadow-[0_2px_4px_rgba(23,23,23,0.06),0_16px_40px_rgba(23,23,23,0.16)] backdrop:bg-ink/35">
      <div className="p-5">
        <h2 id="unlock-code-title" className="font-display text-[17px] leading-[1.3] font-medium">{title}</h2>
        {children}
      </div>
    </dialog>
  )
}

function CodeInput({ value, inputRef, error, disabled, label, onChange }: {
  value: string; inputRef?: RefObject<HTMLInputElement | null>; error: boolean; disabled: boolean; label: string; onChange: (value: string) => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <label className="relative mt-2.5 block">
      <span className="sr-only">{label}</span>
      <input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]*" disabled={disabled} className="absolute inset-0 z-10 size-full cursor-text opacity-0 disabled:cursor-not-allowed" />
      <span aria-hidden className="flex gap-1.5">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className={`flex h-[52px] w-[42px] items-center justify-center rounded-control border bg-sheet font-mono text-[20px] ${error ? 'border-error' : focused && index === value.length ? 'border-2 border-ink' : 'border-rule'}`}>
            {value[index] ? '•' : ''}
          </span>
        ))}
      </span>
    </label>
  )
}

function InfoBox({ heading, lines }: { heading: string; lines: string[] }) {
  return <div className="mt-4.5 rounded-sheet border border-rule bg-ground px-3.5 py-3"><p className="t-label text-ink-3">{heading}</p>{lines.map((line) => <p key={line} className="mt-1.5 font-mono text-[12px] leading-[1.45] text-ink-2">{line}</p>)}</div>
}

function Actions({ onClose, busy, disabled, label }: { onClose: () => void; busy: boolean; disabled: boolean; label: string }) {
  return <div className="mt-5 flex gap-2.5"><button type="button" onClick={onClose} disabled={busy} className="wc-lift min-h-11 flex-1 rounded-control border border-rule text-[13px] font-medium disabled:opacity-55">ยกเลิก</button><button type="submit" disabled={busy || disabled} className="wc-lift min-h-11 flex-1 rounded-control bg-brand-strong text-[13px] font-medium text-white disabled:opacity-55">{label}</button></div>
}

function bangkokTime(value: string): string {
  return new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
