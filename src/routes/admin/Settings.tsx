import { useRef, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Skeleton, SkeletonPageHeader, SkeletonScreen } from '../../components/Skeleton'
import { LIST, ListLabel, PageTitle } from './ui'
import { useToast } from '../../components/Toast'
import {
  type AdminSetting,
  type AdminConfig,
  useAdminConfig,
  useAdminMessageTemplates,
  useAdminSettings,
  useUpdateAdminSetting,
} from '../../lib/api'

/**
 * /admin/settings — Figma 53:957 (desktop), 479:2738 (phone), 492:4606 (iPad)
 *
 * The message preview is the part that earns its place. The reason is practical: Thai text
 * wraps differently from English, and LINE only shows the first line in a phone
 * notification. Seeing the rendered bubble is the only way to catch a template
 * that reads fine in the editor and badly on a phone.
 *
 * The configuration is deliberately read-only: these values come from deployed
 * code, so showing an editable-looking table would promise a change this API
 * cannot make.
 */

/**
 * Each template is rendered by the server against a deliberately fake sample.
 * Selecting a row changes the real preview text, so the pane remains useful for
 * checking Thai line wrapping without exposing a user's work.
 */

const FLAG_META: Record<string, { name: string; why: string }> = {
  sending_paused: { name: 'โหมดหยุดส่งชั่วคราว', why: 'เปิดเมื่อโควตาใกล้หมดหรือ LINE ล่ม' },
  secrets_enabled: { name: 'เปิดใช้ข้อมูลเข้าสู่ระบบแบบซ่อนค่า', why: 'อนุญาตให้ใช้ข้อมูลเข้าสู่ระบบที่เข้ารหัสไว้' },
  billing_enabled: { name: 'เปิดหน้าอัปเกรดให้กดได้จริง', why: 'ผู้ใช้กดปุ่มอัปเกรดได้ แต่ยังไม่มีระบบชำระเงินจริง' },
}

const FLAG_NAMES: Record<string, string> = Object.fromEntries(Object.entries(FLAG_META).map(([k, v]) => [k, v.name]))

export default function AdminSettings() {
  const toast = useToast()
  const settings = useAdminSettings()
  const config = useAdminConfig()
  const templates = useAdminMessageTemplates()
  const updateSetting = useUpdateAdminSetting()
  const [confirming, setConfirming] = useState<AdminSetting | null>(null)
  // A template must be previewable. The preview pane is already on this screen,
  // so "ดูตัวอย่าง" selects which
  // template it renders rather than opening yet another window.
  const [previewing, setPreviewing] = useState('')
  const current = templates.data?.find((template) => template.code === previewing) ?? templates.data?.[0]
  const previewRef = useRef<HTMLElement>(null)

  // Below 1280px the preview column stacks under a long settings list, so
  // pressing ดูตัวอย่าง changed something that was off screen — indistinguishable
  // from a dead button. Bring it to the reader instead.
  function showPreview(code: string) {
    setPreviewing(code)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    previewRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' })
  }

  if (settings.isPending && config.isPending && templates.isPending) return <AdminSettingsSkeleton />

  const flags = (settings.data ?? []).filter((setting) => setting.key in FLAG_META)
  const defaults = config.data ? configRows(config.data) : []

  return (
    <>
      <PageTitle>ตั้งค่าระบบ</PageTitle>
      {(settings.isError || config.isError || templates.isError) && (
        <p role="alert" className="mx-4 mb-3 rounded-control border border-error px-4 py-3 text-[13px] text-error min-[900px]:mx-0 min-[900px]:mt-4">
          โหลดการตั้งค่าระบบบางส่วนไม่สำเร็จ
        </p>
      )}

      <div className="grid min-[900px]:mt-4 min-[900px]:grid-cols-2 min-[900px]:items-start min-[900px]:gap-6">
        <div className="min-w-0">
          <Section title="ค่าเริ่มต้นของระบบ">
            {config.isPending && <Skeleton w="100%" h="144px" />}
            {defaults.map(([k, v], i) => (
              <div
                key={k}
                className={`flex min-h-[52px] items-center justify-between gap-4 px-4 py-2 ${
                  i < defaults.length - 1 ? 'border-b border-rule-soft' : ''
                }`}
              >
                <span className="text-[15px] min-[900px]:text-[14px]">{k}</span>
                <span className="text-right font-mono text-[13px] text-ink-2">{v}</span>
              </div>
            ))}
            {!config.data && !config.isPending && (
              <p className="px-4 py-5 text-[14px] text-ink-3">ไม่มีข้อมูลค่าเริ่มต้น</p>
            )}
          </Section>

          <Section title="สวิตช์ฟีเจอร์">
            {settings.isPending && <Skeleton w="100%" h="144px" />}
            {flags.map((f, i) => (
              <div
                key={f.key}
                className={`flex min-h-[52px] items-center justify-between gap-4 px-4 py-2 ${
                  i < flags.length - 1 ? 'border-b border-rule-soft' : ''
                }`}
              >
                <span className="text-[15px] min-[900px]:text-[14px]">{FLAG_NAMES[f.key]}</span>
                <Switch
                  on={f.value === 'true'}
                  label={FLAG_NAMES[f.key]}
                  onChange={() => setConfirming(f)}
                />
              </div>
            ))}
            {flags.length === 0 && !settings.isPending && (
              <p className="px-4 py-5 text-[14px] text-ink-3">ไม่มีสวิตช์ที่ตั้งค่าได้</p>
            )}
          </Section>
        </div>

        <div className="min-w-0">
          <Section title={`แม่แบบข้อความ ${templates.data?.length ?? ''}`}>
            {templates.isPending && <Skeleton w="100%" h="144px" />}
            {(templates.data ?? []).map((t, i) => (
              <div
                key={t.code}
                className={`flex min-h-[52px] items-center gap-3 px-4 py-1 ${
                  i < (templates.data?.length ?? 0) - 1 ? 'border-b border-rule-soft' : ''
                } ${(previewing || current?.code) === t.code ? 'bg-ink/[0.03]' : ''}`}
              >
                <span className="min-w-0 flex-1">
                  <span title={t.description} className="block truncate font-mono text-[13px]">{t.code}</span>
                </span>
                <button
                  type="button"
                  onClick={() => showPreview(t.code)}
                  aria-pressed={(previewing || current?.code) === t.code}
                  className="min-h-11 shrink-0 rounded-control border border-rule bg-sheet px-3 text-[13px] font-medium"
                >
                  ดูตัวอย่าง
                </button>
              </div>
            ))}
            {templates.data?.length === 0 && (
              <p className="px-4 py-5 text-[14px] text-ink-3">ไม่มีแม่แบบข้อความ</p>
            )}
          </Section>

          <section ref={previewRef} className="min-w-0">
            <ListLabel className="flex items-baseline justify-between">
              ตัวอย่างข้อความ
              <span className="font-mono text-[13px] text-ink-3">{current?.code ?? 'ยังไม่มีแม่แบบ'}</span>
            </ListLabel>

            {/* A mock LINE chat. The bubble uses a chat radius rather than the app's
                own 2px sheet radius, because it is simulating someone else's UI. */}
            <div className="bg-line-chat p-4 min-[900px]:rounded-sheet">
              <div className="flex items-start gap-2">
                <span className="size-7 shrink-0 rounded-full bg-ink" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white">WorkCatch</p>
                  <div className="mt-1 rounded-[12px] bg-white px-3.5 py-3">
                    <p className="font-mono text-[13px] leading-[1.8] text-ink-2">
                      {current?.preview.split('\n').map((line, index) => (
                        <span key={index} className="block">
                          {index === 0 ? <strong className="font-medium text-time-today-strong">{line}</strong> : line}
                        </span>
                      ))}
                    </p>
                    {!current && <p className="text-[14px] text-ink-3">ไม่มีตัวอย่างข้อความ</p>}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirming}
        title="ยืนยันการเปลี่ยนสวิตช์"
        subject={confirming ? FLAG_META[confirming.key].name : undefined}
        body="การเปลี่ยนค่านี้มีผลกับระบบทันที"
        consequences={confirming ? [flagConsequence(confirming)] : []}
        confirmLabel="ยืนยัน"
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return
          const next = confirming.value !== 'true'
          updateSetting.mutate({ key: confirming.key, value: next }, {
            onSuccess: () => toast({ title: 'บันทึกการตั้งค่าแล้ว', tone: 'success' }),
            onError: () => toast({ title: 'บันทึกการตั้งค่าไม่สำเร็จ', tone: 'error' }),
          })
        }}
      />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-2 min-[900px]:mb-6">
      <ListLabel>{title}</ListLabel>
      <div className={LIST}>{children}</div>
    </section>
  )
}

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="relative -my-3 -mx-[5px] size-11 shrink-0 focus-visible:[&>span]:outline-2 focus-visible:[&>span]:outline-offset-2 focus-visible:[&>span]:outline-ink"
    >
      <span aria-hidden className={`absolute left-[5px] top-[12px] h-5 w-[34px] rounded-pill transition-colors ${on ? 'bg-brand' : 'bg-rule'}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${on ? 'left-4' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

function configRows(config: AdminConfig): [string, string][] {
  return [
    ['เขตเวลา', config.defaultTimezone],
    ['เตือนก่อนครบกำหนด', config.beforeDueMinutes.map(thaiDuration).join(' และ ')],
    [
      'นโยบายลองส่งใหม่',
      `${config.delivery.retryDelaysSeconds.map((seconds) => (
        seconds % 60 === 0 ? thaiDuration(seconds / 60) : `${seconds} วินาที`
      )).join(', ')} · ` +
        `สูงสุด ${config.delivery.maxAttempts} ครั้ง`,
    ],
    ['เก็บงานที่ลบไว้', `${config.deletedItemRetentionDays} วัน`],
    ['เก็บข้อความ LINE ขาเข้าไว้', `${config.inboundMessageRetentionDays} วัน`],
    ['รหัสปลดล็อก', `สูงสุด ${config.unlockCode.maxAttempts} ครั้ง · ล็อก ${config.unlockCode.lockMinutes} นาที`],
    ['ยืนยันตัวตนซ้ำ', `${config.stepUpMinutes} นาที`],
  ]
}

function thaiDuration(minutes: number) {
  if (minutes % 1_440 === 0) return `${minutes / 1_440} วัน`
  if (minutes % 60 === 0) return `${minutes / 60} ชั่วโมง`
  return `${minutes} นาที`
}

function flagConsequence(setting: AdminSetting) {
  if (setting.key === 'sending_paused') {
    return setting.value === 'true'
      ? 'การเตือนทาง LINE และการตอบกลับของบอทจะกลับมาทำงาน'
      : 'การเตือนทาง LINE และการตอบกลับของบอทจะหยุดจนกว่าจะปิด'
  }
  if (setting.key === 'secrets_enabled') {
    return setting.value === 'true'
      ? 'ผู้ใช้จะเปิดดูและบันทึกข้อมูลเข้าสู่ระบบไม่ได้ ข้อมูลเดิมยังอยู่'
      : 'ผู้ใช้จะเปิดดูและบันทึกข้อมูลเข้าสู่ระบบได้อีกครั้ง'
  }
  return FLAG_META.billing_enabled.why
}

function AdminSettingsSkeleton() {
  return (
    <SkeletonScreen label="กำลังโหลดการตั้งค่าระบบ">
      <SkeletonPageHeader />
      <div className="mt-4 grid gap-6 min-[900px]:grid-cols-2">
        <Skeleton w="100%" h="244px" className="rounded-sheet" />
        <Skeleton w="100%" h="244px" className="rounded-sheet" />
      </div>
    </SkeletonScreen>
  )
}
