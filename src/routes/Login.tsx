/**
 * /login — Figma node 32:3
 *
 * The left panel deliberately shows three real overdue rows instead of a feature
 * list. What this product does is make lateness visible; showing that is more
 * honest than describing it.
 *
 * The LINE green on the sign-in button is the ONE documented exception to
 * "colour belongs to time". It is a vendor brand mark, like a Google sign-in
 * button, and this screen has no task ledger for it to compete with.
 */
const LINE_GREEN = '#06C755'

export default function Login() {
  return (
    <div className="min-h-dvh bg-ground lg:grid lg:grid-cols-[620px_1fr]">
      <Pitch />
      <SignIn />
    </div>
  )
}

function Pitch() {
  return (
    <aside className="hidden lg:block bg-ink px-[72px] pt-[72px] text-on-dark">
      <div>
        <p className="t-wordmark">WorkCatch</p>
        <p className="t-meta opacity-50 mt-px">ไม่ให้งานหล่น</p>
      </div>

      <div className="max-w-[452px] mt-[184px]">
        <h1 className="font-display font-medium text-[30px] leading-[1.38] tracking-[-0.5px]">
          งานเข้ามาจากไลน์ อีเมล ห้องประชุม และคำสั่งปากเปล่า
        </h1>
        <p className="text-[15px] leading-[1.6] opacity-60 mt-4">
          WorkCatch รับไว้ที่เดียว แล้วเตือนผ่าน LINE ก่อนถึงกำหนด
        </p>
      </div>

      <div className="max-w-[452px] mt-[101px] rounded-sheet border border-on-dark/10 bg-on-dark/5">
        <p className="t-label opacity-45 px-[18px] pt-3.5 pb-3">สิ่งที่คุณจะเห็นทุกเช้า</p>
        <DemoRow when="เกิน 3 วัน" title="ส่งใบเสนอราคา บ.ทรัพย์เจริญ" tone="text-time-late" strong />
        <DemoRow when="17:00" title="สรุปรายงานยอดขาย Q3 ส่งหัวหน้าฝ่าย" tone="text-time-today" strong />
        <DemoRow when="พรุ่งนี้" title="เตรียมสไลด์ประชุมคณะกรรมการ" tone="text-time-soon" last />
      </div>
    </aside>
  )
}

function DemoRow({ when, title, tone, strong, last }: {
  when: string; title: string; tone: string; strong?: boolean; last?: boolean
}) {
  return (
    <div className={`flex items-center gap-4 px-[18px] py-3.5 ${last ? '' : 'border-b border-on-dark/10'}`}>
      <span className={`${strong ? 't-time-em' : 't-time'} ${tone} w-[76px] shrink-0`}>{when}</span>
      <span className={`text-[12.5px] leading-[1.35] opacity-90 ${strong ? 'font-semibold' : ''}`}>{title}</span>
    </div>
  )
}

function SignIn() {
  return (
    <main className="flex justify-center px-6 py-16 lg:items-start lg:pt-[250px] items-center">
      <div className="w-full max-w-[400px]">
        {/* Shown only where the dark panel is hidden, so the product still has a name. */}
        <div className="lg:hidden mb-10">
          <p className="t-wordmark">WorkCatch</p>
          <p className="t-meta text-ink-3 mt-px">ไม่ให้งานหล่น</p>
        </div>

        <h2 className="font-display font-medium text-[26px] leading-[1.3] tracking-[-0.4px]">
          เข้าใช้งาน
        </h2>
        <p className="text-[13.5px] leading-[1.65] text-ink-2 mt-2.5">
          WorkCatch ใช้บัญชี LINE ของคุณทั้งเข้าระบบและส่งการเตือน
          จึงไม่ต้องตั้งรหัสผ่านและไม่ต้องเชื่อมบัญชีทีหลัง
        </p>

        {/*
          A plain link, not a fetch. The browser must navigate so Spring can issue
          the 302 to LINE and store the OAuth state in the session. The SPA never
          touches the OAuth flow, so no LINE credential reaches this bundle.
        */}
        <a
          href="/api/auth/line/start"
          style={{ backgroundColor: LINE_GREEN }}
          className="mt-6 flex items-center justify-center gap-3 rounded-control py-3.5 font-semibold text-[14px] text-white transition-opacity hover:opacity-90"
        >
          <span
            aria-hidden
            className="grid size-5 place-items-center rounded-[5px] bg-white/20 font-display text-[12px] font-semibold"
          >
            L
          </span>
          เข้าสู่ระบบด้วย LINE
        </a>

        <p className="t-label text-ink-3 mt-5">กดแล้วจะเกิดอะไรขึ้น</p>

        <ol className="mt-3 rounded-sheet border border-rule bg-sheet">
          <Step n="1">LINE ถามว่าอนุญาตให้ WorkCatch เห็นชื่อและรูปโปรไฟล์ไหม</Step>
          <Step n="2" warn last>
            ในหน้าเดียวกันจะมีช่องติ๊ก “เพิ่มเพื่อน” — ต้องติ๊กไว้ ไม่งั้นการเตือนจะส่งไม่ได้
          </Step>
        </ol>

        <p className="text-[11.5px] leading-[1.55] text-ink-3 mt-3.5">
          ไม่ติ๊กเพิ่มเพื่อนก็ยังใช้เว็บได้ แต่จะไม่ได้รับการเตือนผ่าน LINE — เปิดทีหลังได้ในหน้าตั้งค่า
        </p>
      </div>
    </main>
  )
}

function Step({ n, children, warn, last }: {
  n: string; children: React.ReactNode; warn?: boolean; last?: boolean
}) {
  return (
    <li className={`flex gap-3 px-4 py-3.5 ${last ? '' : 'border-b border-rule-soft'}`}>
      <span className="t-caption text-ink-3 w-3 shrink-0">{n}</span>
      <span className={`text-[12.5px] leading-[1.5] ${warn ? 'font-medium text-ink' : 'text-ink-2'}`}>
        {children}
      </span>
    </li>
  )
}
