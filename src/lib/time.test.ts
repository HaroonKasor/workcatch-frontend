import { describe, expect, it } from 'vitest'
import { byUrgency, gutterLabel, timeStateOf } from './time'
import type { Task } from './types'

// 8 Sep 2026, 09:41 Bangkok = 02:41 UTC. Every case is anchored to this instant
// so the tests do not drift with the wall clock.
const NOW = new Date('2026-09-08T02:41:00Z')

const task = (over: Partial<Task> = {}): Task => ({
  id: 't', title: 'งาน', status: 'TODO', priority: 'MEDIUM',
  dueAt: null, createdAt: '2026-09-01T00:00:00Z', ...over,
})

describe('timeStateOf', () => {
  it('treats a passed deadline as late', () => {
    expect(timeStateOf(task({ dueAt: '2026-09-05T10:00:00Z' }), NOW)).toBe('late')
  })

  it('uses the Bangkok calendar day, not the UTC day', () => {
    // 17:00 Bangkok on 8 Sep is 10:00 UTC on 8 Sep — same day either way.
    expect(timeStateOf(task({ dueAt: '2026-09-08T10:00:00Z' }), NOW)).toBe('today')
    // 23:30 Bangkok on 8 Sep is 16:30 UTC on 8 Sep, still today locally.
    expect(timeStateOf(task({ dueAt: '2026-09-08T16:30:00Z' }), NOW)).toBe('today')
    // 00:30 Bangkok on 9 Sep is 17:30 UTC on 8 Sep. UTC says today, Bangkok says
    // tomorrow. Getting this wrong would colour tomorrow's work as due now.
    expect(timeStateOf(task({ dueAt: '2026-09-08T17:30:00Z' }), NOW)).toBe('soon')
  })

  it('calls the next seven days soon and anything further neutral', () => {
    expect(timeStateOf(task({ dueAt: '2026-09-12T10:00:00Z' }), NOW)).toBe('soon')
    expect(timeStateOf(task({ dueAt: '2026-10-01T10:00:00Z' }), NOW)).toBe('none')
  })

  it('reports waiting and done regardless of the deadline', () => {
    expect(timeStateOf(task({ status: 'WAITING', dueAt: '2026-09-01T00:00:00Z' }), NOW)).toBe('waiting')
    // A completed task is never late. Showing it in red would be a lie.
    expect(timeStateOf(task({ status: 'DONE', dueAt: '2026-09-01T00:00:00Z' }), NOW)).toBe('done')
    expect(timeStateOf(task({ status: 'CANCELLED', dueAt: '2026-09-01T00:00:00Z' }), NOW)).toBe('done')
  })

  it('has no state to show without a deadline', () => {
    expect(timeStateOf(task(), NOW)).toBe('none')
  })
})

describe('gutterLabel', () => {
  it('counts whole days overdue', () => {
    expect(gutterLabel(task({ dueAt: '2026-09-05T10:00:00Z' }), NOW)).toBe('เกิน 3 วัน')
  })

  it('shows a clock time for today', () => {
    expect(gutterLabel(task({ dueAt: '2026-09-08T10:00:00Z' }), NOW)).toBe('17:00')
  })

  it('names tomorrow rather than printing a date', () => {
    expect(gutterLabel(task({ dueAt: '2026-09-09T02:00:00Z' }), NOW)).toBe('พรุ่งนี้ 09:00')
  })

  it('says there is no deadline instead of leaving the gutter blank', () => {
    expect(gutterLabel(task(), NOW)).toBe('ไม่มีกำหนด')
  })

  it('reports how long a waiting task has left before follow-up', () => {
    expect(gutterLabel(task({ status: 'WAITING', followUpAt: '2026-09-10T02:00:00Z' }), NOW))
      .toBe('รอ 2 วัน')
  })
})

describe('byUrgency', () => {
  it('puts what is late first and what is done last', () => {
    const late = task({ id: 'late', dueAt: '2026-09-05T10:00:00Z' })
    const today = task({ id: 'today', dueAt: '2026-09-08T10:00:00Z' })
    const waiting = task({ id: 'waiting', status: 'WAITING' })
    const done = task({ id: 'done', status: 'DONE' })
    const none = task({ id: 'none' })

    const order = [done, none, waiting, today, late]
      .sort((a, b) => byUrgency(a, b, NOW))
      .map((t) => t.id)

    expect(order).toEqual(['late', 'today', 'none', 'waiting', 'done'])
  })
})
