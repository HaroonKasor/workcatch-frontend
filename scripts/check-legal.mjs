#!/usr/bin/env node
/**
 * Refuses a release build while the legal pages still say "[รอข้อมูล: …]".
 *
 * Runs as npm's prebuild hook. The terms, the privacy policy and the contact
 * page draw their facts from src/lib/legal-info.json; a value only the owner can
 * supply (the legal address, the hosting provider, the effective date) is null
 * there until it is filled in, and a public site must not ship with the gap
 * showing. The labels below match REQUIRED in src/lib/legal.ts.
 *
 * ALLOW_INCOMPLETE_LEGAL=1 lets a build through for CI and local checks. Those
 * builds are never deployed; the flag says so out loud rather than the guard
 * quietly not existing.
 */
import { readFileSync } from 'node:fs'

const info = JSON.parse(readFileSync(new URL('../src/lib/legal-info.json', import.meta.url), 'utf8'))

const REQUIRED = {
  hostingProvider: 'ผู้ให้บริการเซิร์ฟเวอร์และประเทศที่ตั้ง',
  effectiveDate: 'วันที่มีผล',
}

const missing = Object.entries(REQUIRED).filter(([key]) => info[key] === null || info[key] === '')

if (missing.length === 0) {
  console.log('legal-info: complete')
  process.exit(0)
}

const names = missing.map(([key, label]) => `  - ${label} (${key})`).join('\n')

if (process.env.ALLOW_INCOMPLETE_LEGAL === '1') {
  console.warn(`legal-info: incomplete, allowed by ALLOW_INCOMPLETE_LEGAL=1 — do not deploy this build\n${names}`)
  process.exit(0)
}

console.error(
  `ยังกรอกข้อมูลในหน้ากฎหมายไม่ครบ จึงยังไม่ build สำหรับเผยแพร่\n${names}\n\n`
    + 'Fill these in src/lib/legal-info.json, or set ALLOW_INCOMPLETE_LEGAL=1 for a build that will not be deployed.',
)
process.exit(1)
