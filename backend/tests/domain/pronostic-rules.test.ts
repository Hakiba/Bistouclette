import assert from 'node:assert/strict'
import test from 'node:test'
import { isOpenForPronostics, pointsFor } from '../../src/domain/pronostics/pronostic-rules'

test('un score exact rapporte trois points', () => {
  assert.equal(pointsFor({ scoreHome: 2, scoreAway: 1 }, { scoreHome: 2, scoreAway: 1 }), 3)
})

test('un match se ferme exactement au coup d’envoi', () => {
  const match = { status: 'scheduled' as const, kickoffAt: new Date('2026-10-24T20:00:00') }
  assert.equal(isOpenForPronostics(match, new Date('2026-10-24T19:59:59')), true)
  assert.equal(isOpenForPronostics(match, new Date('2026-10-24T20:00:00')), false)
})
