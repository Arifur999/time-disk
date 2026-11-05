export interface Task {
  id: string
  title: string
  minutes: number
  color: string
}

export interface Settings {
  /** "HH:mm", 24h */
  officeStart: string
  officeEnd: string
  /** 0 = Sunday ... 6 = Saturday */
  workDays: number[]
  defaultMinutes: number
  sound: boolean
  launchAtStartup: boolean
  autoStartAtOffice: boolean
  widgetSide: 'left' | 'right'
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'timeUp' | 'done'

/**
 * The timer is stored as timestamps rather than a ticking counter,
 * so it stays correct across sleep, lock screen and app restarts.
 */
export interface TimerState {
  status: TimerStatus
  currentTaskId: string | null
  /** When the current running segment began; null while paused or stopped. */
  segmentStartedAt: number | null
  /** Time already spent on the current task before this segment. */
  elapsedBeforeMs: number
  /** Extra time added with "+5 min". */
  extraMs: number
}

export interface HistoryEntry {
  taskId: string
  title: string
  color: string
  plannedMinutes: number
  actualMs: number
  finishedAt: number
}

export interface DayPlan {
  /** "YYYY-MM-DD" */
  date: string
  tasks: Task[]
  history: HistoryEntry[]
}

export interface PastDay {
  date: string
  history: HistoryEntry[]
}

export interface AppState {
  settings: Settings
  plan: DayPlan
  timer: TimerState
  pastDays: PastDay[]
  /** Tasks prepared ahead of time, keyed by "YYYY-MM-DD". */
  futurePlans: Record<string, Task[]>
}

export type TimerAction = 'start' | 'pause' | 'resume' | 'addFive' | 'next' | 'stop'

export const TASK_COLORS = ['#8b6cff', '#22c3a6', '#f5a524', '#f2557a', '#3b9eff', '#d66bf0', '#84cc16']

export const DEFAULT_SETTINGS: Settings = {
  officeStart: '09:00',
  officeEnd: '18:00',
  workDays: [0, 1, 2, 3, 4],
  defaultMinutes: 30,
  sound: true,
  launchAtStartup: false,
  autoStartAtOffice: true,
  widgetSide: 'right'
}

export const IDLE_TIMER: TimerState = {
  status: 'idle',
  currentTaskId: null,
  segmentStartedAt: null,
  elapsedBeforeMs: 0,
  extraMs: 0
}
