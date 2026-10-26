import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, useDeleteAccount, useNotes, useTasks } from '../lib/api'
import { Icon } from './mobile/Icon'
import { store } from '../lib/store'

/**
 * The account deletion warning is mounted only while visible, so a confirmation
 * phrase is never retained after the person closes it.
 */
export function DeleteAccountDialog({
  onClose,
}: {
  displayName?: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const deletion = useDeleteAccount()
  const tasks = useTasks()
  const notes = useNotes()
  const navigate = useNavigate()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const close = () => {
    ref.current?.close()
  }

  const submit = () => {
    if (confirmation.trim() !== 'ลบบัญชี' || deletion.isPending) return

    setError(null)
    deletion.mutate(confirmation.trim(), {
      onSuccess: () => {
        store.reset()
        close()
        navigate('/', { replace: true })
      },
      onError: (cause) => {
        setError(
          cause instanceof ApiError && cause.status === 409
            ? 'บัญชีผู้ดูแลระบบลบตัวเองไม่ได้ ต้องโอนสิทธิ์ผู้ดูแลให้คนอื่นก่อน'
            : cause instanceof Error
              ? cause.message
              : 'คำขอไม่สำเร็จ',
        )
      },
    })
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="delete-account-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!deletion.isPending) close()
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget && !deletion.isPending) close()
      }}
      className="m-auto w-[392px] max-w-[calc(100vw-40px)] rounded-[10px] border border-rule bg-sheet p-0 shadow-[0_2px_4px_rgba(23,23,23,0.06),0_16px_40px_rgba(23,23,23,0.16)] backdrop:bg-ink/35"
    >
      <div className="p-5">
        <h2 id="delete-account-title" className="flex items-center gap-2.5 font-display text-[18px] leading-[1.3] font-medium">
          <Icon name="trash" size={22} className="text-error" />
          ลบบัญชีและข้อมูลทั้งหมด
        </h2>
        <dl className="mt-3.5 border-t border-rule-soft text-[14px]">
          {[
            ['งาน', tasks.isPending ? '…' : String(tasks.data?.length ?? 0)],
            ['บันทึก', notes.isPending ? '…' : String(notes.data?.length ?? 0)],
            ['ข้อมูลที่ซ่อนไว้', notes.isPending ? '…' : String((notes.data ?? []).filter((n) => n.blocks.some((b) => b.kind === 'credentials')).length)],
            ['การเชื่อม LINE', 'ยกเลิก'],
          ].map(([k, v]) => (
            <div key={k} className="flex min-h-11 items-center justify-between border-b border-rule-soft">
              <dt className="text-ink-2">{k}</dt>
              <dd className="font-mono font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p role="note" className="mt-3.5 flex items-center gap-2 rounded-control bg-error/[0.09] px-3 py-2.5 text-[14px] font-medium text-error">
          <Icon name="alert" size={18} />ย้อนกลับไม่ได้
        </p>
        <ul className="mt-3 space-y-1 text-[13px] leading-[1.45] text-ink-2">
          <li>ออกจากระบบทุกเครื่องทันที</li>
          <li>เข้าด้วย LINE เดิมอีกครั้ง จะได้บัญชีใหม่ที่ว่างเปล่า</li>
          <li>ทันที: ข้อมูลลับ การเชื่อม LINE และการเตือน</li>
          <li>ภายใน 30 วัน: งาน บันทึก โปรเจกต์ และประวัติ</li>
        </ul>

        <label className="mt-4 block text-[12px] font-medium text-ink-2" htmlFor="delete-account-confirmation">
          พิมพ์ “ลบบัญชี” เพื่อยืนยัน
        </label>
        <input
          id="delete-account-confirmation"
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value)
            setError(null)
          }}
          className="mt-2 h-11 w-full rounded-control border border-rule bg-white px-3 text-[14px] outline-none placeholder:text-ink-3 focus:border-ink focus:ring-2 focus:ring-ink/15"
          type="text"
          autoComplete="off"
          disabled={deletion.isPending}
        />
        {error && <p role="alert" className="mt-2 text-[12px] leading-relaxed text-error">{error}</p>}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            disabled={deletion.isPending}
            onClick={close}
            className="wc-lift min-h-11 flex-1 rounded-control border border-rule text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-55"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={confirmation.trim() !== 'ลบบัญชี' || deletion.isPending}
            onClick={submit}
            className="wc-lift min-h-11 flex-1 rounded-control bg-error text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            {deletion.isPending ? 'กำลังลบบัญชี…' : 'ลบบัญชี'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
