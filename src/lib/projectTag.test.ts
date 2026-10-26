// Run with `npm test` (node --test, which strips the types itself).
// The same sentences as backend ProjectTagTest.java: the web and the LINE bot
// must file a given #tag under the same project.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  extractTag, matchTag, normalizeName, removeSpan, suggestProjects, SUGGESTIONS, tagAtCaret,
} from './projectTag.ts'

const PROJECTS = [
  { id: '1', name: 'รายงานประจำเดือน' },
  { id: '2', name: 'ระบบคลังสินค้า' },
  { id: '3', name: 'งานฝาก ทั่วไป' },
  { id: '4', name: 'Marketing' },
  { id: '5', name: 'Market Research' },
  { id: '6', name: 'ขาย' },
  { id: '7', name: 'ขายส่ง' },
]

const found = (token: string) => {
  const m = matchTag(token, PROJECTS)
  return m.kind === 'FOUND' ? m.project.id : m.kind
}

test('a tag anywhere is taken out of the text', () => {
  assert.deepEqual(extractTag('พรุ่งนี้ 10 โมง #ระบบคลัง ส่งใบเสนอราคา'), {
    token: 'ระบบคลัง', remainder: 'พรุ่งนี้ 10 โมง ส่งใบเสนอราคา',
  })
  assert.deepEqual(extractTag('Send the deck #Marketing.'), { token: 'Marketing', remainder: 'Send the deck' })
})

test('a hash inside a word is text, and only the first tag counts', () => {
  assert.equal(extractTag('สอน C# ที่ห้อง#2').token, null)
  assert.deepEqual(extractTag('#ขาย โทรหาลูกค้า #ด่วน'), { token: 'ขาย', remainder: 'โทรหาลูกค้า #ด่วน' })
  assert.equal(extractTag('ข้อ # สาม').token, null)
})

test('a number is not a tag', () => {
  assert.equal(extractTag('งานข้อ #2 ส่งพรุ่งนี้').token, null)
  assert.equal(extractTag('ข้อ #๑ #ขาย').token, 'ขาย')
  assert.equal(extractTag('#Q3 สรุปยอด').token, 'Q3')
})

test('unicode spaces and format characters are boundaries', () => {
  assert.deepEqual(extractTag('ส่งสไลด์ #ขาย พรุ่งนี้'), { token: 'ขาย', remainder: 'ส่งสไลด์ พรุ่งนี้' })
  assert.equal(extractTag('ส่งสไลด์​#ขาย​ด่วน').token, 'ขาย')
  assert.equal(extractTag('ส่งสไลด์　#ขาย').token, 'ขาย')
})

test('invisible characters and Thai typing order do not matter', () => {
  assert.equal(normalizeName('ระบบ​คลัง﻿'), normalizeName('ระบบคลัง'))
  assert.equal(normalizeName('ท่ี'), normalizeName('ที่'))
  assert.equal(normalizeName('น้ํา'), 'น้ำ')
  assert.equal(normalizeName('นํ้า'), 'น้ำ')
  assert.equal(matchTag('นํ้าดื่ม', [{ id: '9', name: 'น้ำดื่มสำนักงาน' }]).kind, 'FOUND')
})

test('a Thai prefix finds the one project; a spaced name is found without the space', () => {
  assert.equal(found('ระบบคลัง'), '2')
  assert.equal(found('งานฝาก'), '3')
  assert.equal(found('งานฝาก_ทั่วไป'), '3')
})

test('English is case-insensitive', () => {
  assert.equal(found('marketing'), '4')
  assert.equal(found('MARKET-RES'), '5')
})

test('an ambiguous prefix asks rather than guesses', () => {
  const m = matchTag('mark', PROJECTS)
  assert.equal(m.kind, 'AMBIGUOUS')
  assert.deepEqual(m.kind === 'AMBIGUOUS' && m.names, ['Market Research', 'Marketing'])
  assert.equal(found('ร'), 'AMBIGUOUS')
})

test('an exact name beats a longer name with the same prefix', () => {
  assert.equal(found('ขาย'), '6')
  assert.equal(found('ขายส'), '7')
  assert.equal(matchTag('ops', [{ id: 'a', name: 'Ops' }, { id: 'b', name: 'ops' }]).kind, 'AMBIGUOUS')
})

test('not found suggests the three closest names, nearest first', () => {
  const m = matchTag('Marketting', PROJECTS)
  assert.equal(m.kind, 'NOT_FOUND')
  if (m.kind !== 'NOT_FOUND') return
  assert.equal(m.names.length, SUGGESTIONS)
  assert.equal(m.names[0], 'Marketing')

  const thai = matchTag('ระบบคลังสนค้า', PROJECTS)
  assert.equal(thai.kind === 'NOT_FOUND' && thai.names[0], 'ระบบคลังสินค้า')
  assert.deepEqual(matchTag('anything', []), { kind: 'NOT_FOUND', token: 'anything', names: [] })
})

test('the autocomplete follows the tag under the caret', () => {
  const text = 'ส่งสไลด์ #ระบบ พรุ่งนี้'
  const caret = text.indexOf(' พรุ่งนี้')
  assert.deepEqual(tagAtCaret(text, caret), { start: 9, end: caret, query: 'ระบบ' })
  assert.deepEqual(tagAtCaret('งาน #', 5), { start: 4, end: 5, query: '' })
  assert.equal(tagAtCaret('C#', 2), null)
  assert.equal(tagAtCaret('#ระบบ คลัง', 10), null, 'past the space the tag is over')
  assert.equal(removeSpan(text, 9, caret), 'ส่งสไลด์ พรุ่งนี้')
})

test('suggestions put the exact name first, then prefixes by name', () => {
  assert.deepEqual(suggestProjects('ขาย', PROJECTS).map((p) => p.id), ['6', '7'])
  assert.deepEqual(suggestProjects('MARK', PROJECTS).map((p) => p.name), ['Market Research', 'Marketing'])
  assert.equal(suggestProjects('', PROJECTS).length, 6)
})
