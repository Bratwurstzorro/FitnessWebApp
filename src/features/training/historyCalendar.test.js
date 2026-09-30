import test from 'node:test'
import assert from 'node:assert/strict'
import { historyForMonth, monthCells, monthStart, shiftMonth, trainingDays } from './historyCalendar.js'

test('Month filtering excludes open sessions and other years/months, newest first', () => {
  const sessions = [
    {id: 'old', finished_at: new Date(2026, 8, 1, 10).toISOString()},
    {id: 'new', finished_at: new Date(2026, 8, 30, 10).toISOString()},
    {id: 'aug', finished_at: new Date(2026, 7, 31, 10).toISOString()},
    {id: 'year', finished_at: new Date(2025, 8, 30, 10).toISOString()},
    {id: 'open', finished_at: null},
  ]
  assert.deepEqual(historyForMonth(sessions, new Date(2026, 8, 1)).map(s => s.id), ['new', 'old'])
  assert.deepEqual(historyForMonth(sessions, new Date(2026, 9, 1)), [])
})

test('Calendar starts Monday and handles leap years and six-week months', () => {
  assert.equal(monthCells(new Date(2026, 8, 1))[0], null)
  assert.equal(monthCells(new Date(2026, 8, 1))[1], 1)
  assert.equal(monthCells(new Date(2024, 1, 1)).filter(Boolean).length, 29)
  assert.equal(monthCells(new Date(2026, 2, 1)).length, 42)
  assert.equal(monthCells(new Date(2026, 2, 1))[6], 1)
})

test('Month navigation crosses year boundaries without skipping short months', () => {
  const month = monthStart(new Date(2026, 0, 31))
  assert.equal(shiftMonth(month, 1).getMonth(), 1)
  assert.equal(shiftMonth(month, -1).getFullYear(), 2025)
  assert.equal(shiftMonth(month, -1).getMonth(), 11)
  assert.equal(shiftMonth(new Date(2026, 11, 1), 1).getFullYear(), 2027)
})

test('Several trainings on one day produce a single marker and use local dates', () => {
  assert.deepEqual([...trainingDays([
    {finished_at: new Date(2026, 8, 12, 0, 15).toISOString()},
    {finished_at: new Date(2026, 8, 12, 18).toISOString()},
    {finished_at: null},
  ])], [12])
  assert.equal(historyForMonth([{finished_at: new Date(2026, 8, 1, 0, 15).toISOString()}], new Date(2026, 8, 1)).length, 1)
})
