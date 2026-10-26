import { useState } from 'react'
import { useToast } from '../components/Toast'
import { useLineStatus } from '../lib/api'
import { Icon } from '../components/mobile/Icon'
import { MobileBack } from '../components/mobile/MobileHeader'

/**
 * /app/upgrade — Figma v2 423:2189; v1 60:1001.
 *
 * One table instead of three cards: the question on this page is "what do I get
 * for the money", and a row per feature answers it across all three plans at
 * once, where three cards made the reader hold a list in their head.
 *
 * Every action is deliberately locked. WorkCatch is in internal trial and
 * billing is off; the locked buttons say so instead of swallowing the press.
 *
 * No warm colour anywhere: warm hues in this product mean time, and nothing here
 * is about time. The recommended plan's one mark is the brand wash on its
 * column (v2 423:2189).
 */

const BILLING_ENABLED = false

const PLANS = [
  { key: 'free', name: 'ฟรี', price: '฿0', period: 'ตลอดไป' },
  { key: 'plus', name: 'Plus', badge: 'แนะนำ', price: '฿99', period: 'ต่อเดือน · ฿990 ต่อปี' },
  { key: 'pro', name: 'Pro ทีม', price: '—', period: 'ยังไม่กำหนดราคา' },
] as const

const ROWS: { what: string; values: [string, string, string] }[] = [
  { what: 'งานและโปรเจกต์', values: ['ไม่จำกัด', 'ไม่จำกัด', 'ไม่จำกัด'] },
  { what: 'เตือนในแอปและ Web Push', values: ['ไม่จำกัด', 'ไม่จำกัด', 'ไม่จำกัด'] },
  { what: 'เตือนผ่าน LINE', values: ['สรุปวันละครั้ง', 'ทุกงาน ตามเวลาที่ตั้ง', 'ใช้ LINE OA ของบริษัท'] },
  { what: 'เลื่อนหรือปิดงานจากแชท LINE', values: ['—', 'ได้', 'ได้'] },
  { what: 'ประวัติแจ้งเตือนย้อนหลัง', values: ['7 วัน', '12 เดือน', '12 เดือน'] },
  { what: 'ไฟล์แนบ', values: ['10 MB ต่อไฟล์', '50 MB ต่อไฟล์', '50 MB ต่อไฟล์'] },
  { what: 'มอบหมายงานในทีม', values: ['—', '—', 'ได้'] },
  { what: 'ผู้ดูแลระบบและประวัติการแก้ไข', values: ['—', '—', 'ได้'] },
  { what: 'ขั้นตอนขออนุมัติงาน', values: ['—', '—', 'ได้'] },
]

/** The free plan's monthly LINE allowance the usage bar is drawn against. */
const FREE_LINE_MESSAGES = 300

export default function Upgrade() {
  const line = useLineStatus()
  const toast = useToast()
  const [asked, setAsked] = useState<Record<string, boolean>>({})

  const used = line.data?.usage.sentLast30Days ?? 0
  const share = Math.min(used / FREE_LINE_MESSAGES, 1)

  const ask = (plan: string) => {
    if (BILLING_ENABLED) return
    setAsked((a) => ({ ...a, [plan]: true }))
    toast({ title: 'ยังไม่เปิดให้เติมเงิน', body: `บันทึกความสนใจแผน ${plan} ไว้แล้ว จะแจ้งทาง LINE เมื่อเปิดใช้จริง` })
  }

  return (
    <div className="max-lg:pb-[88px]">
      <MobileBack to="/app/settings" label="ตั้งค่า" />
      <nav aria-label="breadcrumb" className="t-caption text-ink-3 max-lg:hidden">ตั้งค่า › แผนการใช้งาน</nav>
      <h1 className="t-page-title mt-1 max-lg:px-4 max-lg:text-[32px]">แผนการใช้งาน</h1>

      <section className="mt-[33px] flex flex-wrap items-center gap-x-6 gap-y-3 rounded-sheet border border-rule bg-sheet px-5 py-4 max-lg:mx-4 max-lg:mt-4">
        <div className="min-w-0 flex-1 basis-72">
          <p className="text-[13.5px] font-medium max-lg:text-[15px]">แผนปัจจุบัน  ฟรี</p>
          <p className="t-meta mt-0.5 text-ink-3">
            {line.isPending
              ? 'กำลังโหลด…'
              : line.isError
                ? 'โหลดการใช้ข้อความ LINE ไม่สำเร็จ'
                : `ข้อความ LINE ${used} จาก ${FREE_LINE_MESSAGES}`}
          </p>
        </div>
        {!line.isPending && !line.isError && (
          <div className="flex w-full items-center gap-3 sm:w-[160px]">
            <div className="h-1 flex-1 rounded-pill bg-rule-soft">
              <div className="h-full rounded-pill bg-ink" style={{ width: `${share * 100}%` }} />
            </div>
            <span className="font-mono text-[12px] text-ink-2">{Math.round(share * 100)}%</span>
          </div>
        )}
      </section>

      {/* On a phone the three columns do not fit beside the labels, so the table
          scrolls inside its own box rather than pushing the page sideways. */}
      <div className="mx-4 mt-4 space-y-3 lg:hidden">
        {PLANS.map((p, col) => (
          <section key={p.key} aria-label={p.name} className={`rounded-control border bg-sheet px-4 py-4 ${p.key === 'plus' ? 'border-brand' : 'border-rule'}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={`flex items-baseline gap-2 text-[17px] font-semibold ${p.key === 'pro' ? '' : ''}`}>
                {p.name}
                {p.key === 'free' && <span className="text-[13px] font-normal text-ink-3">แผนที่ใช้อยู่</span>}
                {'badge' in p && <span className="text-[13px] font-medium text-brand-strong">{p.badge}</span>}
              </h2>
              <span className="font-display text-[22px] font-semibold">{p.price}</span>
            </div>
            <p className="mt-1 text-[14px] text-ink-3">{p.period}</p>
            <ul className="mt-3 space-y-2">
              {ROWS.filter((r) => r.values[col] !== '—').map((r) => (
                <li key={r.what} className="flex items-start gap-2.5 text-[15px]">
                  <Icon name="check" size={18} className="mt-0.5 text-ink-2" />
                  <span>{r.what}{r.values[col] === 'ได้' ? '' : ` ${r.values[col]}`}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-sheet px-4 pt-3 lg:hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <button type="button" disabled={asked.Plus} onClick={() => ask('Plus')} className="wc-lift flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand-strong text-[16px] font-medium text-on-dark disabled:opacity-55">
          <Icon name="bell" size={20} />{asked.Plus ? 'บันทึกความสนใจแล้ว' : 'แจ้งเตือนเมื่อเปิดอัปเกรด'}
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-sheet border border-rule bg-sheet max-lg:hidden">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <caption className="sr-only">เทียบแผน</caption>
          <thead>
            <tr className="border-b border-rule-soft">
              <th scope="col" className="w-[34%] px-5 py-4 align-top">
                <span className="block text-[15px] font-semibold">เทียบแผน</span>
              </th>
              {PLANS.map((p) => (
                <th key={p.key} scope="col" className={`px-5 py-4 align-top font-normal ${p.key === 'plus' ? 'bg-selected' : ''}`}>
                  <span className="flex items-center gap-2">
                    <span className={`text-[14px] font-semibold ${p.key === 'pro' ? 'text-ink-3' : ''}`}>{p.name}</span>
                    {'badge' in p && <span className="text-[11px] font-medium text-brand-strong">{p.badge}</span>}
                  </span>
                  <span className={`mt-1.5 block font-display text-[26px] font-semibold leading-none ${p.key === 'pro' ? 'text-ink-3' : ''}`}>{p.price}</span>
                  <span className="t-meta mt-1 block text-ink-3">{p.period}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.what} className="border-b border-rule-soft">
                <th scope="row" className="px-5 py-3 text-[13px] font-normal text-ink-2">{r.what}</th>
                {r.values.map((v, i) => (
                  <td key={i} className={`px-5 py-3 text-[13px] ${v === '—' ? 'text-ink-3' : 'font-medium'} ${i === 1 ? 'bg-selected' : ''}`}>{v}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-5 py-4" />
              <td className="px-5 py-4 text-[13px] text-ink-2">แผนที่ใช้อยู่</td>
              <td className="bg-selected px-5 py-4">
                <button
                  type="button"
                  disabled={asked.Plus}
                  onClick={() => ask('Plus')}
                  className="min-h-9 rounded-control bg-ground px-3.5 text-[13px] font-medium text-ink-3 disabled:cursor-not-allowed"
                >
                  {asked.Plus ? 'บันทึกความสนใจแล้ว' : 'อัปเกรดเป็น Plus'}
                </button>
                <span className="t-meta mt-1 block text-ink-3">เปิดให้สมัครเร็ว ๆ นี้</span>
              </td>
              <td className="px-5 py-4">
                <button
                  type="button"
                  disabled={asked['Pro ทีม']}
                  onClick={() => ask('Pro ทีม')}
                  className="wc-lift min-h-9 rounded-control border border-rule bg-sheet px-3.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:text-ink-3"
                >
                  {asked['Pro ทีม'] ? 'บันทึกความสนใจแล้ว' : 'แจ้งเตือนเมื่อเปิดให้ใช้'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
