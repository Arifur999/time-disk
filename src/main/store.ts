import { app } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { dateKey } from '../shared/office'
import { DEFAULT_SETTINGS, IDLE_TIMER, type DayPlan, type PastDay, type Settings, type Task,type TimerState } from '../shared/types'

export interface StoredData {
  settings: Settings
  plan: DayPlan
  timer: TimerState
  /** Newest first. */
  archive: PastDay[]
  futurePlans: Record<string, Task[]>
  widgetPosition: { x: number; y: number } | null
  /** Heartbeat, so after a shutdown we know when the app last ran. */
  lastSeenAt: number
}

const ARCHIVE_DAYS = 60

function dataFile(): string {
  return join(app.getPath('userData'), 'data.json')
}

function freshData(): StoredData {
  return {
    settings: DEFAULT_SETTINGS,
    plan: { date: dateKey(new Date()), tasks: [], history: [] },
    timer: IDLE_TIMER,
    archive: [],
    futurePlans: {},
    widgetPosition: null,
    lastSeenAt: Date.now()
  }
}

export function loadData(): StoredData {
  const fresh = freshData()
  if (!existsSync(dataFile())) return fresh
  try {
    const saved = JSON.parse(readFileSync(dataFile(), 'utf8')) as Partial<StoredData>
    return { ...fresh, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings } }
  } catch (error) {
    console.error('Could not read saved data, starting fresh', error)
    return fresh
  }
}

/** Writes to a temp file first so a crash mid-write never corrupts the data. */
export function saveData(data: StoredData): void {
  const target = dataFile()
  writeFileSync(`${target}.tmp`, JSON.stringify(data, null, 2))
  renameSync(`${target}.tmp`, target)
}

/**
 * On a new day: archive yesterday's history, carry unfinished tasks over
 * and bring in anything that was planned ahead for today.
 */
export function rollOverDay(data: StoredData, now: Date): StoredData {
  const today = dateKey(now)
  if (data.plan.date === today) return data

  const finished = new Set(data.plan.history.map((entry) => entry.taskId))
  const archive = data.plan.history.length
    ? [{ date: data.plan.date, history: data.plan.history }, ...data.archive].slice(0, ARCHIVE_DAYS)
    : data.archive

  // Plans for days that are now in the past (PC was off) are carried in too.
  const dueDates = Object.keys(data.futurePlans).filter((date) => date <= today).sort()
  const planned = dueDates.flatMap((date) => data.futurePlans[date])
  const futurePlans = Object.fromEntries(Object.entries(data.futurePlans).filter(([date]) => date > today))
  const carried = data.plan.tasks.filter((task) => !finished.has(task.id))

  return {
    ...data,
    archive,
    futurePlans,
    plan: { date: today, tasks: [...carried, ...planned], history: [] },
    timer: IDLE_TIMER
  }
}
