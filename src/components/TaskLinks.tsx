import { useRef, useState } from 'react'
import { ApiError, useAddLink, useDeleteLink } from '../lib/api'
import { LINK_REL, MAX_LINKS, safeHttpUrl } from '../lib/links'
import type { Task, TaskLink } from '../lib/types'
import { Attachments } from './Attachments'
import { useToast } from './Toast'
import { BottomSheet, SheetItem } from './mobile/BottomSheet'
import { Icon } from './mobile/Icon'

/**
 * ลิงก์ on a task, beside ไฟล์แนบ — Figma 469:1418 (add), 469:1654 (error),
 * 469:1895 (the menu) and 469:2044 (nothing yet). Contract: backend/docs/links-api.md.
 *
 * A row is a plain <a target="_blank" rel="noopener noreferrer nofollow">: the
 * client never fetches the address, never previews it, and shows the host under
 * the title so a look-alike domain is read for what it is. The ··· menu is a
 * sibling of the link, not inside it. Delete is undone from its toast (it adds
 * the same link back) rather than confirmed first.
 */

export function LinksAndFiles({ task }: { task: Task }) {
  const links = task.links ?? []
  const files = task.attachments ?? []
  const [adding, setAdding] = useState(false)
  const picker = useRef<HTMLInputElement>(null)
  const nothing = links.length === 0 && files.length === 0

  return (
    <>
      {nothing ? (
        <section aria-labelledby="links-files-heading" className="max-lg:mt-0 mt-8">
          <h2 id="links-files-heading" className="t-section max-lg:bg-ground max-lg:px-4 max-lg:pt-5 max-lg:pb-2.5 max-lg:font-sans max-lg:text-[14px] max-lg:font-medium max-lg:text-ink-2">
            ลิงก์และไฟล์
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 max-lg:border-t max-lg:border-rule max-lg:bg-ground max-lg:px-4 max-lg:pt-3 max-lg:pb-4 lg:max-w-[420px]">
            <AddButton icon="link" onClick={() => setAdding(true)}>วางลิงก์</AddButton>
            <AddButton icon="clip" onClick={() => picker.current?.click()}>แนบไฟล์</AddButton>
          </div>
        </section>
      ) : (
        <LinksSection taskId={task.id} links={links} onAdd={() => setAdding(true)} />
      )}
      <Attachments taskId={task.id} files={files} pickerRef={picker} quiet={nothing} />
      <AddLinkSheet taskId={task.id} open={adding} onClose={() => setAdding(false)} />
    </>
  )
}

function AddButton({ icon, onClick, children }: { icon: 'link' | 'clip'; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="wc-lift flex min-h-12 items-center justify-center gap-2.5 rounded-control border border-rule bg-sheet text-[16px] font-medium lg:min-h-11 lg:text-[13px]">
      <Icon name={icon} size={20} />{children}
    </button>
  )
}

function LinksSection({ taskId, links, onAdd }: { taskId: string; links: TaskLink[]; onAdd: () => void }) {
  const [menu, setMenu] = useState<TaskLink | null>(null)
  return (
    <section aria-labelledby="links-heading" className="mt-8 max-lg:mt-0">
      <header className="flex items-center justify-between max-lg:bg-ground max-lg:px-4 max-lg:pt-5 max-lg:pb-2.5">
        <h2 id="links-heading" className="t-section max-lg:font-sans max-lg:text-[14px] max-lg:font-medium max-lg:text-ink-2">
          ลิงก์ {links.length > 0 && <span className="font-mono">{links.length}</span>}
        </h2>
      </header>
      <div className="mt-3 rounded-sheet border border-rule bg-sheet max-lg:mt-0 max-lg:rounded-none max-lg:border-x-0">
        {links.map((l) => (
          <div key={l.id} className="flex items-center border-b border-rule-soft pl-4 lg:pl-5">
            <LinkBody link={l} />
            <button type="button" onClick={() => setMenu(l)} aria-haspopup="dialog" aria-label={`เมนูของลิงก์ ${l.title || l.host}`} className="flex size-12 shrink-0 items-center justify-center text-ink-2">
              <Icon name="dots" size={22} />
            </button>
          </div>
        ))}
        {links.length < MAX_LINKS && (
          <button type="button" onClick={onAdd} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[16px] text-ink-2 lg:px-5 lg:text-[13px]">
            <Icon name="link" size={20} />เพิ่มลิงก์
          </button>
        )}
      </div>
      <LinkMenu taskId={taskId} link={menu} onClose={() => setMenu(null)} />
    </section>
  )
}

/** A row's text, and the link around it only when the address passes the same http(s) check the server applies. */
function LinkBody({ link: l }: { link: TaskLink }) {
  const href = safeHttpUrl(l.url)
  const inner = (
    <>
      <span className="block truncate text-[16px] leading-[1.4] lg:text-[14px]">{l.title || l.host}</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-ink-3">
        <Icon name="open" size={14} />
        <span className="truncate font-mono text-[13px]">{l.host}</span>
      </span>
    </>
  )
  return href ? (
    <a href={href} target="_blank" rel={LINK_REL} className="min-w-0 flex-1 py-3">{inner}</a>
  ) : (
    <span className="min-w-0 flex-1 py-3">{inner}</span>
  )
}

function LinkMenu({ taskId, link, onClose }: { taskId: string; link: TaskLink | null; onClose: () => void }) {
  const remove = useDeleteLink(taskId)
  const add = useAddLink(taskId)
  const toast = useToast()

  return (
    <BottomSheet
      open={!!link}
      onClose={onClose}
      label="เมนูลิงก์"
    >
      {link && (
        <>
          <div className="px-4 pb-3">
            <p className="text-[17px] leading-[1.35] font-medium break-words">{link.title || link.host}</p>
            <p className="mt-1 font-mono text-[13px] break-all text-ink-3">{link.url}</p>
          </div>
          <div className="border-t border-rule-soft">
            {safeHttpUrl(link.url) && (
              <a
                href={safeHttpUrl(link.url) ?? undefined}
                target="_blank"
                rel={LINK_REL}
                onClick={onClose}
                className="flex min-h-[52px] w-full items-center gap-3.5 border-t border-rule-soft px-4 first:border-t-0"
              >
                <Icon name="open" size={22} /><span className="text-[16px]">เปิดลิงก์</span>
              </a>
            )}
            <SheetItem
              icon="copy"
              onClick={() => {
                void navigator.clipboard?.writeText(link.url).then(
                  () => toast({ title: 'คัดลอกลิงก์แล้ว' }),
                  () => toast({ title: 'คัดลอกไม่สำเร็จ', tone: 'error' }),
                )
                onClose()
              }}
            >
              คัดลอกลิงก์
            </SheetItem>
            <SheetItem
              icon="trash"
              tone="late"
              onClick={() => {
                const gone = link
                remove.mutate(gone.id, {
                  onSuccess: () =>
                    toast({
                      title: 'ลบลิงก์แล้ว',
                      body: gone.title || gone.host,
                      action: { label: 'เลิกทำ', onAct: () => add.mutate({ url: gone.url, title: gone.title ?? undefined }) },
                    }),
                  onError: (e) => toast({ title: 'ลบลิงก์ไม่สำเร็จ', body: e.message, tone: 'error' }),
                })
                onClose()
              }}
            >
              ลบลิงก์
            </SheetItem>
          </div>
        </>
      )}
    </BottomSheet>
  )
}

function AddLinkSheet({ taskId, open, onClose }: { taskId: string; open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="เพิ่มลิงก์">
      {/* Mounted only while open, so every opening starts with empty fields. */}
      <AddLinkForm taskId={taskId} onClose={onClose} />
    </BottomSheet>
  )
}

function AddLinkForm({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const add = useAddLink(taskId)
  const toast = useToast()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = safeHttpUrl(url)
    if (!clean) {
      setError('ใส่ได้เฉพาะลิงก์ http หรือ https')
      return
    }
    add.mutate(
      { url: clean, title: title.trim() || undefined },
      {
        onSuccess: () => {
          toast({ title: 'เพิ่มลิงก์แล้ว' })
          onClose()
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : 'เพิ่มลิงก์ไม่สำเร็จ'),
      },
    )
  }

  return (
    <form onSubmit={submit} className="px-4 pb-4">
      <label className="block text-[14px] text-ink-3" htmlFor="link-url">ลิงก์</label>
      <div className="relative mt-1.5">
        <input
          id="link-url"
          autoFocus
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={url}
          maxLength={2048}
          onChange={(e) => { setUrl(e.target.value); if (error) setError(null) }}
          aria-invalid={!!error}
          aria-describedby={error ? 'link-error' : undefined}
          className={`h-12 w-full rounded-control border bg-sheet pr-11 pl-3 font-mono text-[14px] ${error ? 'border-error' : 'border-ink'}`}
          placeholder="https://"
        />
        {url && (
          <button type="button" onClick={() => setUrl('')} aria-label="ล้างลิงก์" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-3">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      {error && <p id="link-error" role="alert" className="mt-1.5 text-[14px] text-error">{error}</p>}

      <label className="mt-4 block text-[14px] text-ink-3" htmlFor="link-title">ชื่อ (ไม่บังคับ)</label>
      <input
        id="link-title"
        value={title}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-1.5 h-12 w-full rounded-control border border-rule bg-sheet px-3 text-[16px]"
      />

      <button
        type="submit"
        disabled={add.isPending}
        className="wc-lift mt-5 min-h-12 w-full rounded-control bg-brand-strong text-[16px] font-medium text-on-dark disabled:opacity-55"
      >
        {add.isPending ? 'กำลังเพิ่ม…' : 'เพิ่มลิงก์'}
      </button>
    </form>
  )
}
