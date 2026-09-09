/**
 * /app/upgrade — Figma node 60:1001
 *
 * Every action is deliberately disabled. WorkCatch is in internal trial and
 * billing is off; the page states that reason instead of showing a grey button
 * that silently does nothing.
 *
 * Note there is no colour on this page at all. A pricing page usually reaches
 * for a gradient and an orange "most popular" badge, but colour in this product
 * belongs to time, and nothing here is about time. The recommended tier stands
 * out by sitting on solid ink instead.
 *
 * Dashed borders mean "not yet", the same language the inbox slots and Quick Add
 * use for a field you have not filled in.
 */

const BILLING_ENABLED = false

interface Tier {
  name: string
  badge?: string
  price: string
  period: string
  who: string
  features: string[]
  cta: string
  kind: 'current' | 'recommended' | 'soon'
}

const TIERS: Tier[] = [
  {
    name: 'ฟรี',
    price: '฿0',
    period: 'ตลอดไป',
    who: 'สำหรับคนที่รับงานไม่เยอะ หรืออยากลองก่อนตัดสินใจ',
    features: [
      'งานและโปรเจกต์ไม่จำกัด',
      'เตือนในแอปและ Web Push ไม่จำกัด',
      'LINE สรุปงานวันละครั้ง',
      'ประวัติแจ้งเตือนย้อนหลัง 7 วัน',
      'ไฟล์แนบ 10 MB ต่อไฟล์',
    ],
    cta: 'แผนที่ใช้อยู่',
    kind: 'current',
  },
  {
    name: 'Plus',
    badge: 'แนะนำ',
    price: '฿99',
    period: 'ต่อเดือน · ฿990 ต่อปี ประหยัด 2 เดือน',
    who: 'สำหรับคนที่งานเข้าทั้งวันและพลาดกำหนดส่งไม่ได้',
    features: [
      'ทุกอย่างในแผนฟรี',
      'LINE เตือนทุกงานตามเวลาที่ตั้งเอง',
      'เลื่อนเตือนและปิดงานจากในแชท LINE',
      'ประวัติแจ้งเตือนย้อนหลัง 12 เดือน',
      'ไฟล์แนบ 50 MB ต่อไฟล์',
    ],
    cta: 'อัปเกรดเป็น Plus',
    kind: 'recommended',
  },
  {
    name: 'Pro  ทีม',
    badge: 'ยังไม่เปิด',
    price: '—',
    period: 'ยังไม่กำหนดราคา',
    who: 'สำหรับทีมที่ส่งงานต่อกันและต้องรู้ว่าใครค้างอะไร',
    features: [
      'ทุกอย่างในแผน Plus',
      'พื้นที่ทำงานร่วมกันและมอบหมายงาน',
      'ต่อ LINE OA ของบริษัทเอง ไม่มีเพดานข้อความ',
      'ผู้ดูแลระบบและประวัติการแก้ไข',
      'ขั้นตอนขออนุมัติงาน',
    ],
    cta: 'แจ้งเตือนเมื่อเปิดให้ใช้',
    kind: 'soon',
  },
]

export default function Upgrade() {
  return (
    <>
      <p className="t-caption text-ink-3">ตั้งค่า › แผนการใช้งาน</p>
      <h1 className="t-page-title mt-1">แผนการใช้งาน</h1>
      <p className="t-body mt-2 max-w-[760px] leading-relaxed text-ink-2">
        การเตือนในแอปและ Web Push ฟรีไม่จำกัดเสมอ ไม่ว่าใช้แผนไหน · ส่วนที่คิดเงินคือการเตือนผ่าน LINE
        เพราะ LINE คิดค่าส่งต่อข้อความ
      </p>

      {/* The reason billing is off, stated plainly, plus where the switch lives. */}
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-sheet border border-dashed border-ink-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium">ยังไม่เปิดให้อัปเกรด</p>
          <p className="t-meta mt-0.5 leading-relaxed text-ink-3">
            WorkCatch อยู่ระหว่างทดลองใช้ภายใน ปุ่มอัปเกรดจะทำงานเมื่อเปิดสวิตช์ billing_enabled ในหน้าตั้งค่าระบบ ·
            ราคาด้านล่างเป็นตัวเลขที่ตั้งใจไว้ ยังปรับได้
          </p>
        </div>
        <code className="t-caption shrink-0 text-ink-3">billing_enabled = {String(BILLING_ENABLED)}</code>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-5 rounded-sheet border border-rule bg-sheet px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium">แผนปัจจุบัน  ฟรี</p>
          <p className="t-meta mt-0.5 text-ink-3">
            เดือนนี้ใช้ข้อความ LINE ไป 62 จาก 1,000 · ที่อัตรานี้ยังไม่มีเหตุผลต้องอัปเกรด
          </p>
        </div>
        <div className="h-1.5 w-48 overflow-hidden rounded-pill bg-rule-soft">
          <div className="h-full bg-ink" style={{ width: '6.2%' }} />
        </div>
        <span className="font-mono text-[11px] font-medium text-ink-2">6%</span>
      </div>

      <div className="mt-8 grid items-start gap-4 lg:grid-cols-3">
        {TIERS.map((t) => <Card key={t.name} tier={t} />)}
      </div>
    </>
  )
}

function Card({ tier }: { tier: Tier }) {
  const rec = tier.kind === 'recommended'
  const soon = tier.kind === 'soon'

  return (
    <section
      className={[
        'rounded-sheet px-6 py-6',
        rec ? 'bg-ink text-on-dark' : '',
        soon ? 'border border-dashed border-ink-3' : '',
        tier.kind === 'current' ? 'border border-rule bg-sheet' : '',
      ].join(' ')}
    >
      <header className="flex items-center gap-2.5">
        <h2 className="font-display text-[18px] font-medium leading-tight">{tier.name}</h2>
        {tier.badge && (
          <span className={`t-label rounded-[4px] px-1.5 py-1 ${rec ? 'bg-on-dark/15' : 'bg-ink/[0.07] text-ink-3'}`}>
            {tier.badge}
          </span>
        )}
      </header>

      <p className="mt-3.5 font-display text-[34px] font-semibold leading-none tracking-[-0.9px]">
        {tier.price}
      </p>
      <p className={`t-caption mt-1 leading-relaxed ${rec ? 'opacity-70' : 'text-ink-3'}`}>{tier.period}</p>

      <p className={`mt-3.5 text-[12px] leading-relaxed ${rec ? 'opacity-75' : 'text-ink-2'}`}>{tier.who}</p>

      <div className={`my-5 h-px ${rec ? 'bg-on-dark/20' : 'bg-rule-soft'}`} />

      <ul className="space-y-3.5">
        {tier.features.map((f) => (
          <li key={f} className="flex gap-3">
            <span className={`mt-1.5 size-[5px] shrink-0 ${rec ? 'bg-on-dark/85' : 'bg-ink-2'}`} aria-hidden />
            <span className={`text-[12.5px] leading-relaxed ${rec ? 'opacity-90' : 'text-ink-2'}`}>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={tier.kind !== 'current' && !BILLING_ENABLED}
        className={[
          'mt-6 w-full rounded-control py-3 text-[13px] font-medium',
          tier.kind === 'current'
            ? 'border border-rule text-ink-3'
            : `border border-dashed ${rec ? 'border-on-dark/55 text-on-dark opacity-60' : 'border-ink-3 text-ink-3'}`,
          'disabled:cursor-not-allowed',
        ].join(' ')}
      >
        {tier.cta}
      </button>

      {tier.kind !== 'current' && (
        <p className={`t-caption mt-2 text-center ${rec ? 'opacity-50' : 'text-ink-3'}`}>
          ยังกดไม่ได้ในช่วงทดลองใช้
        </p>
      )}
    </section>
  )
}
