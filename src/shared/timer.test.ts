import { describe, expect, it } from 'vitest'
import { applyAction, completeTask, currentTask, MINUTE, nextTask, pauseAt, remainingMs, tick } from './timer'
import { IDLE_TIMER, type DayPlan } from './types'

const plan: DayPlan = {
  date: '2026-11-05',
  tasks: [
    { id: 'a', title: 'Emails', minutes: 10, color: '#000' },
    { id: 'b', title: 'Report', minutes: 30, color: '#000' },
    { id: 'c', title: 'Call', minutes: 15, color: '#000' }
  ],
  history: []
}

const T0 = 1_000_000

function started() {
  return applyAction({ plan, timer: IDLE_TIMER }, 'start', T0)
}

describe('timer engine', () => {
  it('starts the first task and shows the next one', () => {
    const day = started()
    expect(day.timer.status).toBe('running')
    expect(currentTask(day.plan, day.timer)?.id).toBe('a')
    expect(nextTask(day.plan, day.timer)?.id).toBe('b')
    expect(remainingMs(plan.tasks[0], day.timer, T0 + 4 * MINUTE)).toBe(6 * MINUTE)
  })

  it('does not count paused time', () => {
    let day = started()
    day = applyAction(day, 'pause', T0 + 3 * MINUTE)
    day = applyAction(day, 'resume', T0 + 20 * MINUTE)
    expect(remainingMs(plan.tasks[0], day.timer, T0 + 21 * MINUTE)).toBe(6 * MINUTE)
  })

  it('flags time up once and +5 min brings it back to running', () => {
    let day = started()
    const up = tick(day, T0 + 10 * MINUTE)
    expect(up.timeUp).toBe(true)
    day = { ...day, timer: up.timer }
    expect(tick(day, T0 + 11 * MINUTE).timeUp).toBe(false)

    day = applyAction(day, 'addFive', T0 + 11 * MINUTE)
    expect(day.timer.status).toBe('running')
    expect(remainingMs(plan.tasks[0], day.timer, T0 + 11 * MINUTE)).toBe(4 * MINUTE)
  })

  it('next records actual time and starts the following task', () => {
    let day = started()
    day = applyAction(day, 'next', T0 + 12 * MINUTE)
    expect(day.plan.history).toHaveLength(1)
    expect(day.plan.history[0].actualMs).toBe(12 * MINUTE)
    expect(currentTask(day.plan, day.timer)?.id).toBe('b')
    expect(nextTask(day.plan, day.timer)?.id).toBe('c')
  })

  it('finishes the day after the last task', () => {
    let day = started()
    day = applyAction(day, 'next', T0 + MINUTE)
    day = applyAction(day, 'next', T0 + 2 * MINUTE)
    day = applyAction(day, 'next', T0 + 3 * MINUTE)
    expect(day.timer.status).toBe('done')
    expect(day.plan.history.map((h) => h.taskId)).toEqual(['a', 'b', 'c'])
  })

  it('completes a task that is not running without touching the timer', () => {
    const day = started()
    const after = completeTask(day, 'c', T0 + MINUTE)
    expect(after.plan.history.map((h) => [h.taskId, h.actualMs])).toEqual([['c', 0]])
    expect(after.timer).toBe(day.timer)
    expect(nextTask(after.plan, after.timer)?.id).toBe('b')
  })

  it('completing the running task moves on to the next one', () => {
    const after = completeTask(started(), 'a', T0 + 5 * MINUTE)
    expect(after.plan.history[0].actualMs).toBe(5 * MINUTE)
    expect(currentTask(after.plan, after.timer)?.id).toBe('b')
  })

  it('pauses as of the moment the PC went off', () => {
    const day = started()
    const timer = pauseAt(day.timer, T0 + 4 * MINUTE)
    expect(timer.status).toBe('paused')
    expect(remainingMs(plan.tasks[0], timer, T0 + 90 * MINUTE)).toBe(6 * MINUTE)
  })

  it('keeps counting from stored timestamps after a restart', () => {
    const day = started()
    const restored = JSON.parse(JSON.stringify(day))
    expect(remainingMs(plan.tasks[0], restored.timer, T0 + 7 * MINUTE)).toBe(3 * MINUTE)
  })
})
