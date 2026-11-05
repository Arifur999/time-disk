import { IDLE_TIMER, type DayPlan, type Task, type TimerAction, type TimerState } from './types'

export const MINUTE = 60_000
export const EXTRA_STEP_MS = 5 * MINUTE

export function elapsedMs(timer: TimerState, now: number): number {
  const running = timer.segmentStartedAt === null ? 0 : now - timer.segmentStartedAt
  return timer.elapsedBeforeMs + Math.max(0, running)
}

export function finishedTaskIds(plan: DayPlan): Set<string> {
  return new Set(plan.history.map((entry) => entry.taskId))
}

export function currentTask(plan: DayPlan, timer: TimerState): Task | undefined {
  return plan.tasks.find((task) => task.id === timer.currentTaskId)
}

/** Tasks still to do, in list order, excluding the one on the timer. */
export function upcomingTasks(plan: DayPlan, timer: TimerState): Task[] {
  const finished = finishedTaskIds(plan)
  return plan.tasks.filter((task) => !finished.has(task.id) && task.id !== timer.currentTaskId)
}

export function nextTask(plan: DayPlan, timer: TimerState): Task | undefined {
  return upcomingTasks(plan, timer)[0]
}

export function totalMs(task: Task, timer: TimerState): number {
  return task.minutes * MINUTE + timer.extraMs
}

/** Negative once the task runs over its time. */
export function remainingMs(task: Task, timer: TimerState, now: number): number {
  return totalMs(task, timer) - elapsedMs(timer, now)
}

function startTask(task: Task, now: number): TimerState {
  return { status: 'running', currentTaskId: task.id, segmentStartedAt: now, elapsedBeforeMs: 0, extraMs: 0 }
}

interface Day {
  plan: DayPlan
  timer: TimerState
}

export function applyAction(day: Day, action: TimerAction, now: number): Day {
  const { plan, timer } = day

  switch (action) {
    case 'start': {
      if (timer.status !== 'idle' && timer.status !== 'done') return day
      const first = nextTask(plan, timer)
      return first ? { plan, timer: startTask(first, now) } : day
    }

    case 'pause': {
      if (timer.status !== 'running') return day
      return {
        plan,
        timer: { ...timer, status: 'paused', elapsedBeforeMs: elapsedMs(timer, now), segmentStartedAt: null }
      }
    }

    case 'resume': {
      if (timer.status !== 'paused') return day
      return { plan, timer: { ...timer, status: 'running', segmentStartedAt: now } }
    }

    case 'addFive': {
      if (!timer.currentTaskId) return day
      const status = timer.status === 'timeUp' ? 'running' : timer.status
      return { plan, timer: { ...timer, status, extraMs: timer.extraMs + EXTRA_STEP_MS } }
    }

    case 'next': {
      const task = currentTask(plan, timer)
      if (!task) return day
      const finishedPlan: DayPlan = {
        ...plan,
        history: [
          ...plan.history,
          {
            taskId: task.id,
            title: task.title,
            color: task.color,
            plannedMinutes: task.minutes,
            actualMs: elapsedMs(timer, now),
            finishedAt: now
          }
        ]
      }
      const following = nextTask(finishedPlan, IDLE_TIMER)
      return {
        plan: finishedPlan,
        timer: following ? startTask(following, now) : { ...IDLE_TIMER, status: 'done' }
      }
    }

    case 'stop':
      return { plan, timer: IDLE_TIMER }
  }
}

/**
 * Marks any task done. The running task finishes like "next"; a task that
 * never ran is recorded with no time spent and the timer is left alone.
 */
export function completeTask(day: Day, taskId: string, now: number): Day {
  if (taskId === day.timer.currentTaskId) return applyAction(day, 'next', now)
  const task = day.plan.tasks.find((candidate) => candidate.id === taskId)
  if (!task || finishedTaskIds(day.plan).has(taskId)) return day
  const entry = { taskId, title: task.title, color: task.color, plannedMinutes: task.minutes, actualMs: 0, finishedAt: now }
  return { plan: { ...day.plan, history: [...day.plan.history, entry] }, timer: day.timer }
}

/** Pauses as of `at`, e.g. when the PC went to sleep or was switched off. */
export function pauseAt(timer: TimerState, at: number): TimerState {
  if (timer.status !== 'running' && timer.status !== 'timeUp') return timer
  return { ...timer, status: 'paused', elapsedBeforeMs: elapsedMs(timer, at), segmentStartedAt: null }
}

/** Moves a running task into "time up" once its time is spent. */
export function tick(day: Day, now: number): { timer: TimerState; timeUp: boolean } {
  const { plan, timer } = day
  const task = currentTask(plan, timer)
  if (timer.status !== 'running' || !task || remainingMs(task, timer, now) > 0) {
    return { timer, timeUp: false }
  }
  return { timer: { ...timer, status: 'timeUp' }, timeUp: true }
}
