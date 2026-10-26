import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, useDeleteAccount } from '../lib/api'
import { store } from '../lib/store'

/**
 * The account deletion warning is mounted only while visible, so a confirmation
 * phrase is never retained after the person closes it.
 */
export function DeleteAccountDialog({
  displayName,
  onClose,
}: {
  displayName?: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const deletion = useDeleteAccount()
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

  const subtitle = displayName ? `${displayName} · เข้าสู่ระบบด้วย LINE` : 'เข้าสู่ระบบด้วย LINE'

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
        <h2 id="delete-account-title" className="font-display text-[17px] leading-[1.3] font-medium">
          ลบบัญชีถาวร
        </h2>
        <p className="mt-[5px] truncate text-[12px] text-ink-2">{subtitle}</p>
        <p className="mt-3.5 text-[12.5px] leading-[1.45] text-ink-2">
          ออกจากระบบทุกเครื่องทันที และกู้คืนไม่ได้ ถ้าเข้าด้วย LINE เดิมอีกครั้ง จะได้บัญชีใหม่ที่ว่างเปล่า
        </p>

        <div className="mt-4.5 rounded-sheet border border-rule bg-ground px-3.5 py-3">
          <p className="t-label text-ink-3">สิ่งที่จะเกิดขึ้น</p>
          <p className="mt-1.5 font-mono text-[12px] leading-[1.45] text-ink-2">
            ทันที — ข้อมูลลับ การเชื่อม LINE และการเตือนทั้งหมด
          </p>
          <p className="mt-1.5 font-mono text-[12px] leading-[1.45] text-ink-2">
            ภายใน 30 วัน — งาน บันทึก โปรเจกต์ และประวัติทั้งหมด
          </p>
        </div>

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
            เก็บบัญชีไว้
          </button>
          <button
            type="button"
            disabled={confirmation.trim() !== 'ลบบัญชี' || deletion.isPending}
            onClick={submit}
            className="wc-lift min-h-11 flex-1 rounded-control bg-error text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            {deletion.isPending ? 'กำลังลบบัญชี…' : 'ลบบัญชีถาวร'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
