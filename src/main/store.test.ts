import { describe, expect, it, vi } from 'vitest'
import { IDLE_TIMER, DEFAULT_SETTINGS } from '../shared/types'
import { rollOverDay, type StoredData } from './store'

vi.mock('electron', () => ({ app: { getPath: () => '' } }))

const task = (id: string) => ({ id, title: id, minutes: 30, color: '#000' })

const yesterday: StoredData = {
  settings: DEFAULT_SETTINGS,
  plan: {
    date: '2026-11-05',
    tasks: [task('done'), task('unfinished')],
    history: [{ taskId: 'done', title: 'done', color: '#000', plannedMinutes: 30, actualMs: 1, finishedAt: 1 }]
  },
  timer: { ...IDLE_TIMER, status: 'paused', currentTaskId: 'unfinished' },
  archive: [],
  futurePlans: {
    '2026-11-06': [task('planned-for-friday')],
    '2026-11-08': [task('planned-for-sunday')],
    '2026-11-20': [task('later')]
  },
  widgetPosition: null,
  lastSeenAt: 0
}

describe('rollOverDay', () => {
  it('does nothing on the same day', () => {
    expect(rollOverDay(yesterday, new Date('2026-11-05T15:00'))).toBe(yesterday)
  })

  it('archives history, carries unfinished tasks and loads the day planned ahead', () => {
    const next = rollOverDay(yesterday, new Date('2026-11-06T08:00'))
    expect(next.plan.date).toBe('2026-11-06')
    expect(next.plan.tasks.map((t) => t.id)).toEqual(['unfinished', 'planned-for-friday'])
    expect(next.archive[0].date).toBe('2026-11-05')
    expect(next.timer).toEqual(IDLE_TIMER)
    expect(Object.keys(next.futurePlans)).toEqual(['2026-11-08', '2026-11-20'])
  })

  it('still brings in plans for days the PC was switched off', () => {
    const next = rollOverDay(yesterday, new Date('2026-11-09T08:00'))
    expect(next.plan.tasks.map((t) => t.id)).toEqual(['unfinished', 'planned-for-friday', 'planned-for-sunday'])
    expect(Object.keys(next.futurePlans)).toEqual(['2026-11-20'])
  })
})
