import { test } from 'node:test'
import assert from 'node:assert/strict'
import { linkify, safeHttpUrl } from './links.ts'

test('only http and https are accepted', () => {
  assert.equal(safeHttpUrl('https://figma.com/x'), 'https://figma.com/x')
  assert.equal(safeHttpUrl('  HTTP://a.co  '), 'HTTP://a.co')
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'file:///c:/a', 'ftp://a.co', 'figma.com', '', 'https://u:p@a.co', 'https://']) {
    assert.equal(safeHttpUrl(bad), null, bad)
  }
})

test('linkify keeps sentence punctuation out of the link', () => {
  const pieces = linkify('ดูที่ https://docs.google.com/q3-template, แล้วส่ง')
  assert.deepEqual(pieces, [
    { text: 'ดูที่ ' },
    { text: 'https://docs.google.com/q3-template', href: 'https://docs.google.com/q3-template' },
    { text: ', แล้วส่ง' },
  ])
})

test('linkify never links an unsafe scheme and leaves markup as text', () => {
  const pieces = linkify('javascript:alert(1) <b>x</b> https://a.co/<script>')
  assert.ok(pieces.every((p) => !p.href || p.href.startsWith('https://')))
  assert.equal(pieces.map((p) => p.text).join(''), 'javascript:alert(1) <b>x</b> https://a.co/<script>')
})
