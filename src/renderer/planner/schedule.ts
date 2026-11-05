import { officePhase, timeOnDay } from '../../shared/office'
import { elapsedMs, finishedTaskIds, MINUTE, remainingMs } from '../../shared/timer'
import type { AppState, Task } from '../../shared/types'

export interface Slot {
  start: number
  end: number
}

/**
 * Lays the unfinished tasks end to end: the running task first, then the
 * rest in list order, starting now (or at office start if it's earlier).
 */
export function buildSchedule(tasks: Task[], state: AppState, now: number): { slots: Map<string, Slot>; dayEnd: number } {
  const { timer, settings } = state
  const finished = finishedTaskIds(state.plan)
  const slots = new Map<string, Slot>()
  const running = tasks.find((task) => task.id === timer.currentTaskId)

  let cursor = now
  if (running) {
    cursor = now + Math.max(0, remainingMs(running, timer, now))
    slots.set(running.id, { start: now - elapsedMs(timer, now), end: cursor })
  } else if (officePhase(settings, new Date(now)) === 'before') {
    cursor = timeOnDay(settings.officeStart, new Date(now)).getTime()
  }

  for (const task of tasks) {
    if (finished.has(task.id) || task.id === running?.id) continue
    slots.set(task.id, { start: cursor, end: cursor + task.minutes * MINUTE })
    cursor += task.minutes * MINUTE
  }

  return { slots, dayEnd: cursor }
}
