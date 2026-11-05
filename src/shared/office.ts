import type { Settings } from './types'

export type OfficePhase = 'dayOff' | 'before' | 'during' | 'after'

export function minutesOfDay(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number)
  return hours * 60 + minutes
}

/** The given "HH:mm" on the same calendar day as `reference`. */
export function timeOnDay(hhmm: string, reference: Date): Date {
  const date = new Date(reference)
  date.setHours(0, minutesOfDay(hhmm), 0, 0)
  return date
}

export function officePhase(settings: Settings, now: Date): OfficePhase {
  if (!settings.workDays.includes(now.getDay())) return 'dayOff'
  if (now < timeOnDay(settings.officeStart, now)) return 'before'
  if (now < timeOnDay(settings.officeEnd, now)) return 'during'
  return 'after'
}

export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatClock(date: Date | number): string {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatHhmm(hhmm: string): string {
  return formatClock(timeOnDay(hhmm, new Date()))
}

/** 25:00, 1:05:09, or with a leading "+" for overtime. */
export function formatCountdown(ms: number): string {
  const sign = ms < 0 ? '+' : ''
  const totalSeconds = Math.floor(Math.abs(ms) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  if (hours > 0) return `${sign}${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
  return `${sign}${minutes}:${seconds}`
}

/** "1 task", "3 tasks" */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** "1h 25m", "40m" */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}
