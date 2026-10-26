import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ApiError, attachmentDownloadUrl, attachmentPreviewUrl, uploadAttachment, useDeleteAttachment,
} from '../lib/api'
import { ACCEPT, isPreviewable, precheck, uploadErrorMessage } from '../lib/attachments'
import type { TaskAttachment } from '../lib/types'
import { ConfirmDialog } from './ConfirmDialog'
import { useToast } from './Toast'

/**
 * ไฟล์แนบ on a task — Figma 147:1333, contract backend/docs/attachments-api.md.
 *
 * แนบไฟล์, or drop files anywhere on the section. One upload at a time, with a
 * progress bar; several dropped together wait their turn. A new file is
 * SCANNING until the server's virus scan answers, and the list re-reads every
 * 3 s while anything is, for at most two minutes.
 *
 * What never happens here, by the threat model: the picked bytes are never
 * shown (no blob: URL, no FileReader preview), a file name is only ever text,
 * and a download is an <a href download> to the server endpoint, which decides
 * whether the file may be had at all.
 */

const POLL_MS = 3000
const POLL_FOR_MS = 2 * 60_000

interface Uploading {
  file: File
  progress: number
}

export function Attachments({ taskId, files, pickerRef, quiet }: {
  taskId: string
  files: TaskAttachment[]
  /** Lets a button elsewhere (the empty state's แนบไฟล์) open the file picker. */
  pickerRef?: React.RefObject<HTMLInputElement | null>
  /** Draws nothing but the picker while there is no file, for a screen that says it another way. */
  quiet?: boolean
}) {
  const qc = useQueryClient()
  const toast = useToast()
  const remove = useDeleteAttachment(taskId)
  const ownPicker = useRef<HTMLInputElement>(null)
  const picker = pickerRef ?? ownPicker
  const [current, setCurrent] = useState<Uploading | null>(null)
  const [dragging, setDragging] = useState(false)
  const [confirming, setConfirming] = useState<TaskAttachment | null>(null)
  const [pollToken, setPollToken] = useState(0)
  const [stalled, setStalled] = useState(false)
  const abort = useRef<AbortController | null>(null)

  const scanning = files.some((f) => f.scan === 'SCANNING')

  // Re-read the list while a scan is pending; give up after two minutes and
  // offer a manual re-check, rather than polling a stuck scanner forever.
  useEffect(() => {
    if (!scanning) return
    const started = Date.now()
    const id = setInterval(() => {
      if (Date.now() - started > POLL_FOR_MS) {
        clearInterval(id)
        setStalled(true)
        return
      }
      void qc.invalidateQueries({ queryKey: ['tasks', taskId] })
    }, POLL_MS)
    return () => {
      clearInterval(id)
      setStalled(false)
    }
  }, [scanning, taskId, qc, pollToken])

  // One upload at a time. Files wait in a ref, not state: the next one is
  // started from the previous upload's own settle, never from an effect.
  const queue = useRef<File[]>([])
  const busy = useRef(false)
  const [waiting, setWaiting] = useState(0)

  const pump = () => {
    if (busy.current) return
    const file = queue.current.shift()
    setWaiting(queue.current.length)
    if (!file) return
    busy.current = true
    setCurrent({ file, progress: 0 })
    const controller = new AbortController()
    abort.current = controller
    uploadAttachment(taskId, file, (p) => setCurrent((c) => (c ? { ...c, progress: p } : c)), controller.signal)
      .then(() => {
        setPollToken((n) => n + 1)
        void qc.invalidateQueries({ queryKey: ['tasks', taskId] })
        toast({ title: 'แนบไฟล์แล้ว', body: `${file.name} · กำลังตรวจไวรัส` })
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        const code = e instanceof ApiError ? e.code : undefined
        const why = code ? uploadErrorMessage(code) : e instanceof Error ? e.message : uploadErrorMessage(undefined)
        toast({ title: 'แนบไฟล์ไม่สำเร็จ', body: `${file.name} · ${why}`, tone: 'error' })
      })
      .finally(() => {
        busy.current = false
        setCurrent(null)
        pump()
      })
  }

  const add = (list: FileList | File[]) => {
    const accepted: File[] = []
    for (const file of Array.from(list)) {
      const refusal = precheck(file)
      if (refusal) {
        toast({ title: 'แนบไฟล์นี้ไม่ได้', body: `${file.name} · ${uploadErrorMessage(refusal)}`, tone: 'error' })
      } else {
        accepted.push(file)
      }
    }
    if (accepted.length === 0) return
    queue.current.push(...accepted)
    setWaiting(queue.current.length)
    pump()
  }

  return (
    <section
      aria-labelledby="attachments-heading"
      className="mt-8 max-lg:mt-0"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return
        e.preventDefault()
        setDragging(false)
        add(e.dataTransfer.files)
      }}
    >
      <input
        ref={picker}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files) add(e.target.files)
          e.target.value = ''
        }}
      />

      {!(quiet && files.length === 0 && !current) && (
      <>
      <header className="flex flex-wrap items-center justify-between gap-2 max-lg:bg-ground max-lg:px-4 max-lg:pt-3 max-lg:pb-1">
        <h2 id="attachments-heading" className="t-section max-lg:font-sans max-lg:text-[14px] max-lg:font-medium max-lg:text-ink-2">ไฟล์แนบ</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => picker.current?.click()}
            className="wc-lift min-h-11 rounded-control border border-rule bg-sheet px-3.5 text-[12.5px] font-medium lg:min-h-9"
          >
            แนบไฟล์
          </button>
        </div>
      </header>


      {(files.length > 0 || current) && (
        <div className="mt-3 rounded-sheet border border-rule bg-sheet px-5 py-1 max-lg:mt-0 max-lg:rounded-none max-lg:border-x-0 max-lg:px-4">
          {files.map((f, i) => (
            <AttachmentRow
              key={f.id}
              file={f}
              last={i === files.length - 1 && !current}
              onDelete={() => setConfirming(f)}
            />
          ))}
          {current && (
            <div className="py-4" role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 truncate text-[13px]">{current.file.name}</p>
                <span className="font-mono text-[12px] text-ink-2">{Math.round(current.progress * 100)}%</span>
                <button type="button" onClick={() => abort.current?.abort()} className="min-h-11 px-2 text-[12px] text-ink-2 hover:text-ink lg:min-h-9">
                  ยกเลิก
                </button>
              </div>
              <div className="mt-2 h-1 w-full rounded-pill bg-rule-soft" role="progressbar" aria-label={`กำลังอัปโหลด ${current.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(current.progress * 100)}>
                <div className="h-full rounded-pill bg-brand transition-[width]" style={{ width: `${current.progress * 100}%` }} />
              </div>
              <p className="t-meta mt-1.5 text-ink-3">
                กำลังอัปโหลด{waiting > 0 ? ` · รออีก ${waiting} ไฟล์` : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {stalled && scanning && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
          การตรวจไวรัสใช้เวลานานกว่าปกติ
          <button
            type="button"
            onClick={() => {
              setPollToken((n) => n + 1)
              void qc.invalidateQueries({ queryKey: ['tasks', taskId] })
            }}
            className="min-h-11 font-medium text-brand-strong underline underline-offset-2"
          >
            เช็กอีกครั้ง
          </button>
        </p>
      )}

      {/* The dropzone of 147:1333 — and the empty state's one action. */}
      <button
        type="button"
        onClick={() => picker.current?.click()}
        className={`mt-3 flex w-full flex-col items-center rounded-sheet border border-dashed px-6 py-[26px] text-center max-lg:hidden ${
          dragging ? 'border-ink bg-selected' : 'border-ink-3 hover:bg-ink/[0.02]'
        }`}
      >
        <span className="text-[13px] font-medium text-ink-2">{dragging ? 'วางเพื่อแนบไฟล์' : 'ลากไฟล์มาวาง หรือกดเพื่อเลือก'}</span>
        <span className="mt-1.5 font-mono text-[12px] tracking-[0.5px] text-ink-3">สูงสุด 10 MB ต่อไฟล์</span>
      </button>

      </>
      )}

      <ConfirmDialog
        open={!!confirming}
        title="ลบไฟล์นี้"
        subject={confirming?.name ?? ''}
        body="ไฟล์จะถูกลบจากระบบทันที กู้คืนไม่ได้"
        consequences={['ลบทั้งรายการและตัวไฟล์ที่เก็บไว้']}
        confirmLabel="ลบไฟล์"
        cancelLabel="ไม่ลบ"
        destructive
        onConfirm={() => {
          if (!confirming) return
          const name = confirming.name
          remove.mutate(confirming.id, {
            onSuccess: () => toast({ title: 'ลบไฟล์แล้ว', body: name }),
            onError: (e) => toast({ title: 'ลบไฟล์ไม่สำเร็จ', body: e.message, tone: 'error' }),
          })
        }}
        onClose={() => setConfirming(null)}
      />
    </section>
  )
}

/** The four verdicts of 147:1333, in the contract's words. */
const VERDICT: Record<TaskAttachment['scan'], { badge: string; note: string; badgeTone: string; noteTone: string }> = {
  CLEAN: { badge: 'ปลอดภัย', note: 'ตรวจไฟล์แล้ว', badgeTone: 'bg-ground text-ink', noteTone: 'text-ink-3' },
  SCANNING: { badge: 'กำลังตรวจ', note: 'กำลังตรวจไวรัส…', badgeTone: 'bg-ground text-time-soon-strong', noteTone: 'text-ink-2' },
  INFECTED: { badge: 'ไม่ปลอดภัย', note: 'พบไฟล์อันตราย ระบบลบไฟล์แล้ว', badgeTone: 'bg-time-late/[0.08] text-time-late', noteTone: 'text-time-late' },
  TOO_LARGE: { badge: 'ใหญ่เกินไป', note: 'ไฟล์ใหญ่เกินกว่าที่ตรวจได้', badgeTone: 'bg-time-late/[0.08] text-time-late', noteTone: 'text-time-late' },
}

function AttachmentRow({ file, last, onDelete }: { file: TaskAttachment; last: boolean; onDelete: () => void }) {
  const v = VERDICT[file.scan]
  const clean = file.scan === 'CLEAN' && file.downloadable !== false
  const [thumb, setThumb] = useState(true)

  return (
    <div className={`flex items-center gap-3.5 py-4 ${last ? '' : 'border-b border-rule-soft'}`}>
      {/* A thumbnail only from the server's /preview, only for a CLEAN PNG or
          JPEG — never from the picked bytes. Hidden if it does not load. */}
      {clean && isPreviewable(file.contentType) && thumb && (
        <img
          src={attachmentPreviewUrl(file.id)}
          width={40}
          height={40}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setThumb(false)}
          className="size-10 shrink-0 rounded-[3px] border border-rule-soft object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {clean ? (
            <a href={attachmentDownloadUrl(file.id)} download className="min-w-0 break-all text-[13px] leading-[1.45] underline-offset-2 hover:underline">
              {file.name}
            </a>
          ) : (
            <p className="min-w-0 break-all text-[13px] leading-[1.45]">{file.name}</p>
          )}
          <span className={`shrink-0 rounded-[3px] px-[7px] py-[2px] font-mono text-[12px] font-medium tracking-[1.1px] ${v.badgeTone}`}>
            {v.badge}
          </span>
        </div>
        <p className={`mt-1 font-mono text-[12px] tracking-[0.5px] ${v.noteTone}`}>
          {file.size} · {v.note}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
        {clean ? (
          <>
            <a
              href={attachmentDownloadUrl(file.id)}
              download
              className="wc-lift inline-flex min-h-11 items-center rounded-control border border-rule bg-ground px-3 text-[12px] lg:min-h-9"
            >
              ดาวน์โหลด
            </a>
            <button type="button" onClick={onDelete} className="min-h-11 px-2 text-[12px] text-ink-3 hover:text-ink lg:min-h-9">
              ลบ<span className="sr-only"> {file.name}</span>
            </button>
          </>
        ) : file.scan === 'SCANNING' ? (
          <button type="button" disabled className="inline-flex min-h-11 items-center rounded-control border border-rule bg-ground px-3 text-[12px] opacity-45 lg:min-h-9">
            รอตรวจเสร็จ
          </button>
        ) : (
          <button
            type="button"
            onClick={onDelete}
            className="wc-lift inline-flex min-h-11 items-center rounded-control border border-error bg-ground px-3 text-[12px] text-error lg:min-h-9"
          >
            ลบไฟล์<span className="sr-only"> {file.name}</span>
          </button>
        )}
      </div>
    </div>
  )
}
