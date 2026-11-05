import { Check, CheckCircle2 } from 'lucide-react'
import { formatClock, formatDuration, plural } from '../../shared/office'
import { MINUTE } from '../../shared/timer'
import type { AppState, HistoryEntry } from '../../shared/types'

/** Finished tasks: today first, then the earlier days, newest first. */
export function CompletedPage({ state }: { state: AppState }) {
  const days = [
    { date: state.plan.date, title: 'Today', history: state.plan.history },
    ...state.pastDays.map((day) => ({
      ...day,
      title: new Date(`${day.date}T00:00`).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
    }))
  ].filter((day) => day.history.length > 0)

  return (
    <div className="mx-auto max-w-[860px] px-8 pt-7 pb-10">
      <h1 className="font-display text-[28px] font-semibold tracking-tight">Completed</h1>
      <p className="mt-0.5 text-[13.5px] text-ink-400">
        {state.plan.history.length
          ? `${plural(state.plan.history.length, 'task')} done today`
          : 'Nothing finished yet today.'}
      </p>

      {days.map((day) => {
        const focusedMs = day.history.reduce((sum, entry) => sum + entry.actualMs, 0)
        return (
          <section key={day.date} className="mt-7">
            <h2 className="mb-2.5 text-[12px] font-semibold tracking-[0.12em] text-ink-400 uppercase">
              {day.title}{' '}
              <span className="ml-1 font-normal tracking-normal normal-case">
                · {plural(day.history.length, 'task')} · {formatDuration(focusedMs)} focused
              </span>
            </h2>
            <div className="flex flex-col gap-1.5">
              {[...day.history].reverse().map((entry) => (
                <DoneRow key={`${entry.taskId}-${entry.finishedAt}`} entry={entry} />
              ))}
            </div>
          </section>
        )
      })}

      {days.length === 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-ink-800 bg-ink-850 px-5 py-5 text-[13.5px] text-ink-400">
          <CheckCircle2 size={20} className="text-mint" /> Finished tasks will show up here.
        </div>
      )}
    </div>
  )
}

function DoneRow({ entry }: { entry: HistoryEntry }) {
  const overMs = entry.actualMs - entry.plannedMinutes * MINUTE
  return (
    <div className="flex h-12 items-center gap-3 rounded-xl border border-ink-800 bg-ink-850 px-4">
      <span className="grid size-5 shrink-0 place-items-center rounded-full" style={{ background: `${entry.color}33`, color: entry.color }}>
        <Check size={12} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] text-ink-300">{entry.title}</span>
      <span className="text-[12px] text-ink-500">
        {entry.actualMs === 0 ? (
          'marked done'
        ) : (
          <>
            planned {formatDuration(entry.plannedMinutes * MINUTE)} · took{' '}
            <span className={overMs > MINUTE ? 'text-warn' : 'text-mint'}>{formatDuration(entry.actualMs)}</span>
          </>
        )}
      </span>
      <span className="tabular w-[70px] text-right text-[12px] text-ink-500">{formatClock(entry.finishedAt)}</span>
    </div>
  )
}
