import { useState } from 'react'
import { ApiError, useAiStatus, useAiSuggestion, useGenerateAiSuggestion, useProjects, type AiAction } from '../lib/api'
import type { Task } from '../lib/types'
import { AiActionButton, AiActionConfirm } from './AiActions'
import { actionSubject, useDecisions } from '../lib/aiDecisions'
import { Skeleton } from './Skeleton'

/**
 * "วันนี้ควรทำอะไรก่อน" — Figma 440:2244, collapsed 440:2398.
 *
 * The first block of the งานวันนี้ card, so the AI's opinion sits beside the
 * facts it is about rather than in a box of its own.
 *
 * Nothing goes to Gemini until somebody presses a button. Opening the overview
 * only asks for TODAY'S CACHED suggestion (`cachedOnly=true`, no model call);
 * when there is none, the card is one small button, ขอคำแนะนำวันนี้. สร้างใหม่
 * asks again. Absent — not empty, absent — when AI is off or unavailable, and
 * after a request that found nothing worth suggesting. "ย่อ" is a per-viewer
 * choice kept in the browser.
 */

const COLLAPSED_KEY = 'wc.ai.suggestionCollapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function AiSuggestionBlock({ tasks }: { tasks: Task[] }) {
  const status = useAiStatus()
  const on = !!status.data?.available && !!status.data?.enabled
  const cached = useAiSuggestion(on)
  const generate = useGenerateAiSuggestion()
  const projects = useProjects()
  const { decided, decide } = useDecisions()
  const [open, setOpen] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const setCollapse = (value: boolean) => {
    setCollapsed(value)
    try {
      localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0')
    } catch {
      // Remembering is a convenience only.
    }
  }

  if (!on) return null
  const error = generate.error ?? cached.error
  const code = error instanceof ApiError ? error.code : undefined
  if (code === 'AI_DISABLED' || code === 'AI_UNAVAILABLE') return null
  const state = cached.data
  if (state?.kind === 'empty') return null

  const busy = generate.isPending
  const ready = !busy && state?.kind === 'ready' ? state.suggestion : undefined
  const actions: AiAction[] = ready?.actions ?? []

  // Nothing generated today: one small button, and no call until it is pressed.
  if (state?.kind === 'none' && !busy && !generate.isError) {
    return (
      <section aria-label="คำแนะนำจาก AI" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule pb-4">
        <span className="text-[14px] font-semibold">วันนี้ควรทำอะไรก่อน</span>
        <button
          type="button"
          onClick={() => generate.mutate('request')}
          className="wc-lift min-h-9 rounded-control border border-rule bg-sheet px-3 text-[12.5px] font-medium"
        >
          ขอคำแนะนำวันนี้
        </button>
        <span className="text-[12px] text-ink-3">สร้างโดย AI · ส่งชื่องานและกำหนดส่งไปที่ Google Gemini เมื่อกด</span>
      </section>
    )
  }

  return (
    <section aria-label="คำแนะนำจาก AI" className="border-b border-rule pb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-[14px] font-semibold">วันนี้ควรทำอะไรก่อน</span>
          <span className="text-[12px] text-ink-3">
            {collapsed && actions.length > 0 ? `${actions.length} ข้อแนะนำ · สร้างโดย AI` : 'สร้างโดย AI · ตรวจก่อนทำ'}
          </span>
        </p>
        <span className="flex gap-5 text-[12.5px] font-medium text-ink-2">
          {!collapsed && (
            <button type="button" disabled={busy || cached.isPending} onClick={() => generate.mutate('refresh')} className="min-h-[32px] hover:text-ink disabled:opacity-55">
              สร้างใหม่
            </button>
          )}
          <button type="button" onClick={() => setCollapse(!collapsed)} aria-expanded={!collapsed} className="min-h-[32px] hover:text-ink">
            {collapsed ? 'แสดง' : 'ย่อ'}
          </button>
        </span>
      </div>

      {!collapsed && (
        <div className="mt-2">
          {(cached.isPending || busy) && (
            <div className="flex flex-col gap-3 py-2" role="status" aria-label="กำลังโหลดคำแนะนำ">
              <Skeleton w="70%" h="12px" />
              <Skeleton w="55%" h="12px" />
              <Skeleton w="62%" h="12px" />
            </div>
          )}

          {error && !busy && (
            <div role="alert" className="flex flex-wrap items-center gap-3 py-2 text-[13px]">
              <span className="text-ink-2">
                {code === 'AI_QUOTA' ? 'ใช้ AI ครบโควตาของวันนี้แล้ว' : code === 'AI_BUSY' ? 'AI ไม่ว่างชั่วคราว' : 'สร้างคำแนะนำไม่สำเร็จ'}
              </span>
              {code !== 'AI_QUOTA' && (
                <button
                  type="button"
                  onClick={() => (cached.isError ? cached.refetch() : generate.mutate(state?.kind === 'ready' ? 'refresh' : 'request'))}
                  className="wc-lift min-h-[32px] rounded-control border border-rule bg-sheet px-2.5 text-[12.5px] font-medium"
                >
                  ลองใหม่
                </button>
              )}
            </div>
          )}

          {ready && (
            <>
              <p className="py-1.5 text-[13px] leading-[1.5] text-ink-2">{ready.text}</p>
              <ol>
                {actions.map((a, i) => {
                  const subject = actionSubject(a, tasks)
                  const missing = a.type !== 'CREATE_TASK' && !subject
                  return (
                    <li key={a.id} className={i < actions.length - 1 ? 'border-b border-rule-soft' : ''}>
                      <div className="flex items-center gap-3 py-2">
                        <span className="w-4 shrink-0 font-mono text-[13px] font-medium text-ink-3">{i + 1}</span>
                        {/* Title, then the AI's reason — a second column on a
                            desktop (440:2244), a second line on a phone. */}
                        <span className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-baseline lg:gap-[18px]">
                          <span className="min-w-0 truncate text-[14px] font-medium lg:w-[360px] lg:shrink-0">{subject ?? 'งานที่ไม่พบแล้ว'}</span>
                          {a.reason && <span className="min-w-0 truncate text-[13px] text-ink-2">{a.reason}</span>}
                        </span>
                        <AiActionButton
                          action={a}
                          decision={decided[a.id]}
                          open={open === a.id}
                          missing={missing}
                          onToggle={() => setOpen(open === a.id ? null : a.id)}
                        />
                      </div>
                      {open === a.id && !decided[a.id] && (
                        <div className="pb-3 pl-[28px]">
                          <AiActionConfirm
                            action={a}
                            tasks={tasks}
                            projects={projects.data ?? []}
                            onCancel={() => setOpen(null)}
                            onDecided={(d) => {
                              decide(a.id, d)
                              setOpen(null)
                            }}
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </>
          )}
        </div>
      )}
    </section>
  )
}
