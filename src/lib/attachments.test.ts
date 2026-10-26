// Run with `npm test`. The client pre-check and the refusal messages.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_UPLOAD_BYTES, isPreviewable, precheck, uploadErrorMessage } from './attachments.ts'

test('the allowed types up to 10 MB pass, case-insensitively', () => {
  assert.equal(precheck({ name: 'ใบเสนอราคา.PDF', size: 1000 }), null)
  assert.equal(precheck({ name: 'a.jpeg', size: MAX_UPLOAD_BYTES }), null)
  assert.equal(precheck({ name: 'sheet.xlsx', size: 10 }), null)
})

test('too large or the wrong extension is refused before sending', () => {
  assert.equal(precheck({ name: 'video.mp4', size: 10 }), 'UNSUPPORTED_TYPE')
  assert.equal(precheck({ name: 'page.html', size: 10 }), 'UNSUPPORTED_TYPE')
  assert.equal(precheck({ name: 'no-extension', size: 10 }), 'UNSUPPORTED_TYPE')
  assert.equal(precheck({ name: 'big.pdf', size: MAX_UPLOAD_BYTES + 1 }), 'FILE_TOO_LARGE')
})

test('every server refusal has its own Thai message', () => {
  assert.equal(uploadErrorMessage('UNSUPPORTED_TYPE'), 'รองรับเฉพาะ PDF · DOCX · XLSX · PNG · JPG')
  for (const code of ['FILE_TOO_LARGE', 'TOO_MANY_FILES', 'STORAGE_FULL', 'UPLOAD_RATE']) {
    assert.notEqual(uploadErrorMessage(code), uploadErrorMessage(undefined))
  }
})

test('only PNG and JPEG get a thumbnail', () => {
  assert.equal(isPreviewable('image/png'), true)
  assert.equal(isPreviewable('image/jpeg'), true)
  assert.equal(isPreviewable('image/svg+xml'), false)
  assert.equal(isPreviewable('application/pdf'), false)
})
