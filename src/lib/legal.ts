import raw from './legal-info.json'

/**
 * What the three public documents say — Figma 292:1820 (terms), 292:1729
 * (privacy), 292:1879 (contact), and their 390px versions.
 *
 * One source for the words and the facts, so the pages, the footer and the
 * contact cards cannot disagree with each other. The facts live in
 * legal-info.json rather than here because a plain script has to read them:
 * scripts/check-legal.mjs refuses a release build while any of them is null,
 * which is what keeps "ยังไม่ได้กรอก" from ever reaching the real site.
 *
 * Every claim about the system is a claim about code that exists, and the
 * comment beside it names that code. Change one, change the other.
 */

export interface LegalInfo {
  operatorName: string
  city: string
  supportEmail: string
  privacyEmail: string
  securityEmail: string
  lineId: string
  lineUrl: string
  lineQr: string
  hours: string
  responseTime: string
  privacyResponseTime: string
  hostingProvider: string | null
  effectiveDate: string | null
  updatedDate: string
  serverLogRetentionDays: number
}

export const info = raw as LegalInfo

/** A run of text, a link, or a value still owed by the owner. */
export type Inline = string | { href: string; text: string } | { missing: string }

export type Block =
  | { kind: 'p'; parts: Inline[] }
  | { kind: 'list'; items: Inline[][] }
  /** What is kept, and what it is kept for — the privacy policy's core table. */
  | { kind: 'uses'; rows: { what: string; why: string }[] }

export interface Section {
  id: string
  title: string
  blocks: Block[]
}

export interface LegalDoc {
  title: string
  lead: string
  sections: Section[]
}

// ------------------------------------------------------------------ helpers

export function mail(address: string, subject?: string): Inline {
  return {
    href: `mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`,
    text: address,
  }
}

const line: Inline = { href: info.lineUrl, text: `LINE ID ${info.lineId}` }

/**
 * Where the operator is, in place of a street address. WorkCatch is run by one
 * person with no office, and email and LINE are the ways to reach them. If paid
 * plans open, e-commerce registration will ask for an address; add one then.
 */
const location = `${info.city} ประเทศไทย · ติดต่อทางอีเมลหรือ LINE`

function orMissing(value: string | null, label: string): Inline {
  return value ?? { missing: label }
}

const p = (...parts: Inline[]): Block => ({ kind: 'p', parts })
const list = (...items: (Inline | Inline[])[]): Block => ({
  kind: 'list',
  items: items.map((i) => (Array.isArray(i) ? i : [i])),
})

/** The values scripts/check-legal.mjs checks, with the words a person reads. */
export const REQUIRED: { key: keyof LegalInfo; label: string }[] = [
  { key: 'hostingProvider', label: 'ผู้ให้บริการเซิร์ฟเวอร์และประเทศที่ตั้ง' },
  { key: 'effectiveDate', label: 'วันที่มีผล' },
]

export const missingInfo = REQUIRED.filter((r) => info[r.key] === null)

// -------------------------------------------------------------------- terms

export const terms: LegalDoc = {
  title: 'ข้อกำหนดการใช้บริการ',
  lead: 'เงื่อนไขการใช้ WorkCatch อ่านก่อนเข้าสู่ระบบ เพราะการเข้าสู่ระบบถือว่ายอมรับเงื่อนไขเหล่านี้',
  sections: [
    {
      id: 'provider',
      title: 'ผู้ให้บริการ',
      blocks: [
        p(`WorkCatch พัฒนาและให้บริการโดย ${info.operatorName} ในนามบุคคลธรรมดา`),
        list(
          ['ที่ตั้ง: ', location],
          ['อีเมล: ', mail(info.supportEmail)],
          ['LINE: ', line],
        ),
      ],
    },
    {
      id: 'account',
      title: 'บัญชีผู้ใช้',
      blocks: [
        p('เข้าสู่ระบบด้วยบัญชี LINE ของคุณเอง หนึ่งบัญชี LINE ต่อหนึ่งบัญชี WorkCatch และคุณรับผิดชอบการเข้าถึงบัญชี LINE ของตัวเอง'),
      ],
    },
    {
      id: 'your-content',
      title: 'ข้อมูลของคุณเป็นของคุณ',
      blocks: [
        p('งาน บันทึก และไฟล์ที่คุณสร้างเป็นของคุณ เราใช้ข้อมูลเหล่านี้เพียงเพื่อให้บริการตามที่คุณสั่ง คือจัดเก็บ แสดงผล และส่งการเตือน'),
        p('เราไม่ขายข้อมูลของคุณ ไม่นำไปฝึกระบบปัญญาประดิษฐ์ และไม่เปิดให้ผู้อื่นดู ขอสำเนาหรือลบข้อมูลได้ตามหัวข้อ “การลบบัญชี” ด้านล่าง'),
      ],
    },
    {
      id: 'reminders',
      title: 'ข้อจำกัดของการเตือน',
      blocks: [
        p('การเตือนส่งผ่าน LINE ซึ่งเป็นบริการของบุคคลที่สาม เราส่งตามเวลาที่คุณตั้งไว้ แต่รับประกันไม่ได้ว่าข้อความจะถึงคุณทุกครั้ง กรณีที่ส่งไม่ถึงเกิดขึ้นได้จริง เช่น คุณบล็อกหรือลบบัญชีทางการออกจากเพื่อน โควตาข้อความรายเดือนหมด LINE ขัดข้อง หรือเครื่องของคุณออฟไลน์'),
        p('WorkCatch เป็นเครื่องมือช่วยจำ ไม่ใช่หลักประกันว่างานจะไม่หลุด ความรับผิดชอบต่อกำหนดส่งยังเป็นของคุณ'),
      ],
    },
    {
      id: 'not-allowed',
      title: 'สิ่งที่ทำไม่ได้',
      blocks: [
        list(
          'ใช้ระบบส่งข้อความที่ผิดกฎหมาย ละเมิดสิทธิ์ผู้อื่น หรือเป็นสแปม',
          'พยายามเข้าถึงข้อมูลของผู้ใช้รายอื่น หรือทดสอบเจาะระบบโดยไม่ได้รับอนุญาต',
          'ใช้บริการในนามผู้อื่นโดยไม่ได้รับความยินยอม',
        ),
      ],
    },
    {
      id: 'pricing',
      title: 'ค่าบริการ',
      blocks: [
        p('แผนฟรีใช้ได้ต่อเนื่องโดยไม่มีกำหนดเวลา แผน Plus ราคา ฿99 ต่อเดือน หรือ ฿990 ต่อปี ขณะนี้ยังไม่เปิดให้ชำระเงิน เมื่อเปิดจะใช้เงื่อนไขต่อไปนี้'),
        list(
          'รอบบิลเป็นรายเดือนหรือรายปี นับจากวันที่ชำระ',
          'ต่ออายุอัตโนมัติเมื่อครบรอบ โดยแจ้งล่วงหน้าอย่างน้อย 7 วันก่อนตัดเงินรอบถัดไป',
          'ยกเลิกได้ทุกเมื่อในหน้าตั้งค่า มีผลเมื่อสิ้นรอบบิลที่ชำระแล้ว และยังใช้ Plus ได้จนถึงวันนั้น',
          'ขอคืนเงินเต็มจำนวนได้ภายใน 7 วันหลังชำระครั้งแรก หลังจากนั้นไม่คืนเงินตามสัดส่วนของรอบที่เหลือ เว้นแต่บริการขัดข้องจากฝั่งเราเป็นเวลานาน หรือกฎหมายกำหนด',
          'เมื่อ Plus สิ้นสุด บัญชีกลับเป็นแผนฟรี งานและบันทึกยังอยู่ครบ',
        ),
      ],
    },
    {
      // AccountService: sessions, credentials, unlock code, LINE connection and
      // pending reminders go at once; DeletedItemPurger sweeps the rest after
      // 30 days and leaves only the anonymous users row.
      id: 'deletion',
      title: 'การลบบัญชีและการระงับบัญชี',
      blocks: [
        p('คุณลบบัญชีได้ทุกเมื่อในหน้าตั้งค่า เมื่อลบแล้ว'),
        list(
          'ทันที: ออกจากระบบทุกเครื่อง ลบข้อมูลเข้าสู่ระบบที่ซ่อนไว้ รหัสปลดล็อก การเชื่อม LINE และการเตือนที่รอส่ง',
          'ภายใน 30 วัน: ลบงาน บันทึก โปรเจกต์ และประวัติทั้งหมดอย่างถาวร',
          'สิ่งที่เหลือ: รหัสบัญชีแบบสุ่มที่ไม่มีชื่อหรือรูปภาพ เพื่อให้บันทึกการทำงานของผู้ดูแลระบบยังถูกต้อง',
        ),
        p('การลบบัญชีกู้คืนไม่ได้ ถ้าเข้าด้วย LINE เดิมอีกครั้งจะได้บัญชีใหม่ที่ว่างเปล่า และการลบบัญชีเป็นคนละเรื่องกับการยกเลิกการเชื่อม LINE'),
        p('เราอาจระงับบัญชีที่ละเมิดข้อกำหนดข้างต้น และจะแจ้งเหตุผล เว้นแต่มีข้อจำกัดทางกฎหมาย บัญชีที่ถูกระงับเข้าสู่ระบบไม่ได้ แต่ยังขอสำเนาหรือขอลบข้อมูลได้ทาง ', mail(info.privacyEmail)),
      ],
    },
    {
      id: 'liability',
      title: 'ขอบเขตความรับผิด',
      blocks: [
        p('เราให้บริการตามสภาพที่เป็นอยู่ และพยายามให้ระบบทำงานต่อเนื่อง แต่ไม่รับผิดต่อความเสียหายทางอ้อม เช่น รายได้หรือโอกาสที่เสียไปจากการพลาดกำหนดส่ง'),
        p('ความรับผิดรวมทั้งหมดไม่เกินค่าบริการที่คุณชำระในช่วง 12 เดือนก่อนเกิดเหตุ ทั้งนี้ไม่จำกัดความรับผิดในกรณีที่กฎหมายไม่อนุญาตให้จำกัด'),
      ],
    },
    {
      id: 'law',
      title: 'กฎหมายที่ใช้บังคับและการร้องเรียน',
      blocks: [
        p('ข้อกำหนดนี้อยู่ภายใต้กฎหมายไทย และข้อพิพาทอยู่ในอำนาจของศาลไทย'),
        p('มีข้อร้องเรียนติดต่อ ', mail(info.supportEmail), ` เราจะตอบกลับ${info.responseTime} ช่องทางอื่นดูได้ที่ `, { href: '/contact', text: 'หน้าติดต่อ' }),
      ],
    },
    {
      id: 'changes',
      title: 'การเปลี่ยนแปลงเงื่อนไข',
      blocks: [
        p('หากแก้ไขข้อกำหนดในสาระสำคัญ จะแจ้งในระบบล่วงหน้าอย่างน้อย 14 วันก่อนมีผลบังคับใช้'),
      ],
    },
  ],
}

// ------------------------------------------------------------------ privacy

export const privacy: LegalDoc = {
  title: 'นโยบายความเป็นส่วนตัว',
  lead: 'WorkCatch เก็บข้อมูลอะไร ใช้ทำอะไร เก็บนานแค่ไหน และคุณสั่งให้ทำอะไรกับมันได้บ้าง',
  sections: [
    {
      id: 'controller',
      title: 'ผู้ควบคุมข้อมูล',
      blocks: [
        p(`${info.operatorName} ผู้พัฒนาและให้บริการ WorkCatch ในนามบุคคลธรรมดา`),
        list(
          ['ที่ตั้ง: ', location],
          ['อีเมลเรื่องข้อมูลส่วนบุคคล: ', mail(info.privacyEmail, '[PDPA] คำขอเกี่ยวกับข้อมูลส่วนบุคคล')],
          ['LINE: ', line],
        ),
      ],
    },
    {
      id: 'collected',
      title: 'ข้อมูลที่เก็บ และใช้ทำอะไร',
      blocks: [
        {
          kind: 'uses',
          rows: [
            { what: 'ชื่อและรูปโปรไฟล์จากบัญชี LINE', why: 'แสดงว่าใครเข้าสู่ระบบอยู่' },
            { what: 'รหัสผู้ใช้ LINE', why: 'เข้าสู่ระบบ และส่งการเตือนหาคุณ' },
            { what: 'งาน บันทึก และโปรเจกต์ที่คุณสร้าง', why: 'ให้บริการตามที่คุณใช้งาน' },
            { what: 'ข้อความที่คุณส่งหาบัญชีทางการของ WorkCatch', why: 'แปลงเป็นงาน และให้คุณตรวจย้อนได้ว่าระบบอ่านถูกไหม' },
            { what: 'บันทึกการส่งการเตือน ว่าส่งเมื่อไหร่และสำเร็จหรือไม่', why: 'แสดงประวัติแจ้งเตือน และหาสาเหตุเมื่อส่งไม่ถึง' },
            { what: 'คำแนะนำที่ผู้ช่วย AI เสนอ และสิ่งที่คุณเลือก (ใช้ แก้ หรือไม่ใช้) เมื่อเปิด "ใช้นิสัยการใช้งาน"', why: 'ให้คำแนะนำครั้งต่อไปเข้ากับวิธีทำงานของคุณ เก็บไม่เกิน 90 วัน ปิดได้ในหน้าตั้งค่า' },
            {
              what: 'บันทึกการใช้งานของระบบ: IP address ชนิดเบราว์เซอร์ เวลาเข้าสู่ระบบและเวลาที่เรียกใช้ และบันทึกข้อผิดพลาด',
              why: 'รักษาความปลอดภัย ป้องกันการใช้งานผิดปกติ และแก้ปัญหา บันทึกข้อผิดพลาดไม่เก็บเนื้อหางาน บันทึก หรือค่าที่ซ่อนไว้',
            },
          ],
        },
        p('ฐานทางกฎหมาย: การให้บริการตามที่ตกลงกับคุณ สำหรับข้อมูลห้าแถวแรก ความยินยอมของคุณ สำหรับข้อมูลผู้ช่วย AI ซึ่งเปิดหรือปิดได้เองในหน้าตั้งค่า และประโยชน์โดยชอบด้วยกฎหมายด้านความปลอดภัย สำหรับบันทึกการใช้งานของระบบ'),
      ],
    },
    {
      id: 'not-collected',
      title: 'ข้อมูลที่ไม่เก็บและไม่เข้าถึง',
      blocks: [
        list(
          'แชทอื่นในบัญชี LINE ของคุณ ระบบเห็นเฉพาะข้อความที่คุณส่งหาบัญชีทางการนี้เท่านั้น',
          'ระบบไม่โพสต์ ไม่ส่งข้อความหาคนอื่น และไม่แก้ไขข้อมูลใด ๆ ในบัญชี LINE ของคุณ',
          'ไม่มีคุกกี้โฆษณาหรือเครื่องมือติดตามของบุคคลที่สาม คุกกี้ที่ใช้มีเพียงคุกกี้เข้าสู่ระบบและคุกกี้กันการปลอมคำขอ',
          'ไม่เก็บข้อมูลบัตรชำระเงิน การชำระเงินยังไม่เปิดใช้',
        ),
      ],
    },
    {
      // SecretCipher (AES-256-GCM, key from WORKCATCH_SECRET_KEY),
      // UnlockCodeService (6 digits, 5 tries, 15 minutes, reset destroys).
      id: 'credentials',
      title: 'ข้อมูลเข้าสู่ระบบที่คุณบันทึกไว้',
      blocks: [
        p('ถ้าคุณเก็บชื่อผู้ใช้และรหัสผ่านของระบบอื่นไว้ในบันทึก ค่าเหล่านั้นถูกเข้ารหัสแบบ AES-256 ก่อนบันทึกลงฐานข้อมูล กุญแจเก็บในสภาพแวดล้อมของเซิร์ฟเวอร์ ไม่อยู่ในฐานข้อมูล และค่าเหล่านี้ไม่ถูกนำไปทำดัชนีค้นหา ไม่ปรากฏในบันทึกของระบบ ไม่อยู่ในประวัติเวอร์ชัน และไม่ถูกส่งผ่าน LINE'),
        p('การเปิดดูต้องใส่รหัสปลดล็อก 6 หลักที่คุณตั้งเอง ใส่ผิด 5 ครั้งจะล็อก 15 นาที ระบบบันทึกว่าเปิดดูรายการไหนเมื่อไหร่ แต่ไม่บันทึกค่าที่เปิดดู ถ้าลืมรหัสต้องตั้งใหม่ และข้อมูลเข้าสู่ระบบที่เก็บไว้เดิมจะถูกลบ'),
      ],
    },
    {
      id: 'retention',
      title: 'ระยะเวลาที่เก็บ',
      blocks: [
        list(
          'งาน บันทึก และโปรเจกต์ที่ลบ เก็บไว้ในถังลบ 30 วัน แล้วลบถาวร',
          'ข้อความต้นฉบับที่ส่งหาบอท ทั้งในบันทึกการรับข้อความและที่แนบกับงานที่สร้างจากข้อความนั้น เก็บไว้ 30 วันนับจากวันที่ได้รับ แล้วลบอัตโนมัติ ส่วนชื่องานและรายละเอียดที่คุณแก้เองอยู่จนกว่าคุณจะลบงาน',
          'ค่าที่ซ่อนไว้ในบันทึก ถูกลบถาวรทันทีที่ลบบันทึก ไม่เข้าถังลบ',
          `บันทึกการใช้งานของระบบ เก็บไม่เกิน ${info.serverLogRetentionDays} วัน`,
          ['เมื่อลบบัญชี ข้อมูลส่วนใหญ่หายทันทีและที่เหลือภายใน 30 วัน รายละเอียดอยู่ใน', { href: '/terms#deletion', text: 'ข้อกำหนดการใช้บริการ' }],
        ),
      ],
    },
    {
      // AdminService and every /api/admin/** response: aggregates only.
      id: 'who-sees',
      title: 'ใครเห็นข้อมูลของคุณ',
      blocks: [
        p('หน้าผู้ดูแลระบบเห็นเฉพาะระดับบัญชีและตัวเลขรวม เช่น จำนวนงาน สถานะการเชื่อม LINE และผลการส่งการเตือน ไม่เห็นชื่องาน เนื้อหาบันทึก ค่าที่ซ่อนไว้ หรือข้อความที่คุณส่งหาบอท ข้อจำกัดนี้บังคับที่ระดับ API ไม่ใช่แค่ซ่อนไว้ในหน้าจอ'),
        p('ผู้ดูแลเซิร์ฟเวอร์เข้าถึงระบบได้เพื่อบำรุงรักษาและแก้ปัญหาเท่านั้น และจะไม่เปิดดูเนื้อหาของคุณ เว้นแต่คุณขอให้ช่วย หรือกฎหมายบังคับ'),
      ],
    },
    {
      id: 'third-parties',
      title: 'ผู้ให้บริการภายนอก',
      blocks: [
        list(
          'LY Corporation ผู้ให้บริการ LINE Login และ LINE Messaging API ได้รับรหัสผู้ใช้ LINE ของคุณ และข้อความเตือนซึ่งมีชื่องานและเวลา การใช้งานส่วนนี้อยู่ภายใต้นโยบายของ LINE ด้วย',
          ['ผู้ให้บริการเซิร์ฟเวอร์ ', orMissing(info.hostingProvider, 'ผู้ให้บริการเซิร์ฟเวอร์และประเทศที่ตั้ง'), ' ใช้เก็บฐานข้อมูลและรันระบบ'],
          // backend/docs/ai-api.md: what the AI endpoints send, and what never.
          'Google ประมวลผลผู้ช่วย AI เฉพาะเมื่อคุณเปิดใช้และกดถามหรือกดขอคำแนะนำ ข้อมูลที่ส่งคือชื่องานที่ยังเปิดอยู่ สถานะ กำหนดส่ง และชื่อโปรเจกต์ของคุณ พร้อมสรุปนิสัยการใช้งานสั้น ๆ ถ้าเปิด "ใช้นิสัยการใช้งาน" ไว้ ไม่ส่งเนื้อหาบันทึก ข้อมูลลับในบันทึก ข้อความต้นฉบับจาก LINE รหัสผู้ใช้ LINE หรือข้อมูลของผู้ใช้คนอื่น ระบบใช้บริการ AI รุ่นฟรีของ Google ซึ่ง Google อาจนำเนื้อหาที่ส่งไปใช้ปรับปรุงบริการของ Google ได้ ปิดผู้ช่วย AI ได้ทุกเมื่อในหน้าตั้งค่า แล้วจะไม่มีข้อมูลส่งไปอีก',
        ),
        p('ขณะนี้ยังไม่ใช้บริการชำระเงิน การแจ้งเตือนผ่านเบราว์เซอร์ หรือบริการเก็บไฟล์ภายนอก เมื่อเริ่มใช้จะเพิ่มในรายการนี้ก่อนเปิดใช้งาน'),
      ],
    },
    {
      id: 'rights',
      title: 'สิทธิ์ของคุณ',
      blocks: [
        p('ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล คุณขอเข้าถึง ขอสำเนา ขอแก้ไข ขอลบ ขอให้ระงับการใช้ข้อมูล และคัดค้านการประมวลผลได้'),
        list(
          ['ส่งคำขอทางอีเมล ', mail(info.privacyEmail, '[PDPA] คำขอเกี่ยวกับข้อมูลส่วนบุคคล'), ' ระบุว่าเป็นคำขอตาม PDPA ใช้ได้แม้เข้า LINE ไม่ได้'],
          `เราตอบคำขอ${info.privacyResponseTime}ตามที่กฎหมายกำหนด`,
          'ถ้าต้องการหยุดใช้บริการและให้ลบข้อมูล ใช้ “ลบบัญชี” ในหน้าตั้งค่าได้ทันที',
          'การยกเลิกการเชื่อม LINE ไม่ใช่การลบบัญชี และตอนนี้ยังทำไม่ได้ เพราะ LINE เป็นวิธีเดียวที่ใช้เข้าสู่ระบบ ถ้ายกเลิกจะกลับเข้าบัญชีไม่ได้อีก',
          'ถ้าเห็นว่าเราไม่ปฏิบัติตามกฎหมาย ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ได้',
        ),
      ],
    },
    {
      id: 'changes',
      title: 'การเปลี่ยนแปลงนโยบาย',
      blocks: [
        p('หากแก้ไขนโยบายในสาระสำคัญ จะแจ้งในระบบล่วงหน้าก่อนมีผลบังคับใช้'),
      ],
    },
  ],
}

// ------------------------------------------------------------------ contact

export interface ContactChannel {
  id: string
  title: string
  body: string
  action: { label: string; href: string }
  secondary?: Inline[]
  /** Offered as a copy button beside the secondary line. */
  copy?: { text: string; what: string }
}

export const contactLead = 'มีคำถาม เจอปัญหา หรือต้องการใช้สิทธิ์ตามกฎหมายคุ้มครองข้อมูล เลือกช่องทางที่ตรงกับเรื่องของคุณ'

export const contactChannels: ContactChannel[] = [
  {
    id: 'help',
    title: 'สอบถามและแจ้งปัญหา',
    body: 'การใช้งาน ปัญหาที่เจอ หรือข้อเสนอแนะ ทัก LINE ได้เร็วที่สุด',
    action: { label: 'แชทผ่าน LINE', href: info.lineUrl },
    secondary: ['หรืออีเมล ', mail(info.supportEmail, 'สอบถาม WorkCatch')],
    // A mailto link does nothing on a computer with no mail app set up, which
    // is most people who use Gmail in a browser. Copying always works.
    copy: { text: info.supportEmail, what: 'อีเมล' },
  },
  // The PDPA and security cards were folded into this one at the owner's
  // request: all three went to the same inbox. Requests LINE cannot carry still
  // have their channel — the email above, and the privacy policy's rights
  // section names it with a [PDPA] subject line.
]

/** The fact sheet under the cards. */
export const contactFacts: { label: string; value: Inline; copy?: string }[] = [
  { label: 'LINE', value: line },
  { label: 'อีเมล', value: mail(info.supportEmail), copy: info.supportEmail },
  { label: 'เวลาทำการ', value: info.hours },
  { label: 'ตอบกลับ', value: info.responseTime },
  { label: 'ผู้ควบคุมข้อมูล', value: info.operatorName },
  { label: 'ที่ตั้ง', value: location },
]
