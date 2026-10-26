// Run with `npm test` (node --test). The AI action rules: a status is written
// only if this app knows it, and `final` travels only with EDITED.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isUnusable, outcomeBody, statusToApply } from './aiRules.ts'

test('IN_PROGRESS, TODO and DONE pass straight through', () => {
  assert.equal(statusToApply('IN_PROGRESS'), 'IN_PROGRESS')
  assert.equal(statusToApply('TODO'), 'TODO')
  assert.equal(statusToApply('DONE'), 'DONE')
})

test('an unknown status is refused, not written', () => {
  assert.equal(statusToApply('DOING'), null)
  assert.equal(statusToApply('done'), null)
  assert.equal(statusToApply(undefined), null)
  assert.equal(statusToApply(42), null)
})

test('final is sent only with EDITED', () => {
  assert.deepEqual(outcomeBody('ACCEPTED', { dueAt: '2026-10-27T02:00:00.000Z' }), { outcome: 'ACCEPTED' })
  assert.deepEqual(outcomeBody('DISMISSED'), { outcome: 'DISMISSED' })
  assert.deepEqual(outcomeBody('EDITED', { dueAt: '2026-10-27T03:00:00.000Z' }), {
    outcome: 'EDITED', final: { dueAt: '2026-10-27T03:00:00.000Z' },
  })
  assert.deepEqual(outcomeBody('EDITED'), { outcome: 'EDITED' })
})

test('an action with an unknown status or type cannot be pressed', () => {
  assert.equal(isUnusable({ type: 'SET_STATUS', status: 'IN_PROGRESS' }), false)
  assert.equal(isUnusable({ type: 'SET_STATUS', status: 'DOING' }), true)
  assert.equal(isUnusable({ type: 'DELETE_TASK' }), true)
  assert.equal(isUnusable({ type: 'SET_DUE' }), false)
})
