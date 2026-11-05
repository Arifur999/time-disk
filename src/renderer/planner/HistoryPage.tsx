import { formatClock, formatDuration, plural } from '../../shared/office'
import { MINUTE } from '../../shared/timer'
import type { AppState, HistoryEntry } from '../../shared/types'

function focused(history: HistoryEntry[]): number {
  return history.reduce((sum, entry) => sum + entry.actualMs, 0)
}

function onTime(history: HistoryEntry[]): number {
  return history.filter((entry) => entry.actualMs <= entry.plannedMinutes * MINUTE + MINUTE).length
}

export function HistoryPage({ state }: { state: AppState }) {
  const today = state.plan.history

  return (
    <div className="mx-auto max-w-[860px] px-8 pt-7 pb-10">
      <h1 className="font-display text-[28px] font-semibold tracking-tight">History</h1>
      <p className="mt-0.5 text-[13.5px] text-ink-400">Planned time versus the time each task really took.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Focused today" value={formatDuration(focused(today))} />
        <Stat label="Tasks done" value={String(today.length)} />
        <Stat label="On time" value={today.length ? `${onTime(today)}/${today.length}` : '—'} />
      </div>

      <h2 className="mt-8 mb-2.5 text-[12px] font-semibold tracking-[0.12em] text-ink-400 uppercase">Today</h2>
      {today.length === 0 ? (
        <p className="rounded-2xl border border-ink-800 bg-ink-850 px-4 py-5 text-[13.5px] text-ink-400">
          Finished tasks will show up here.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {today.map((entry) => (
            <EntryRow key={entry.taskId} entry={entry} />
          ))}
        </div>
      )}

      {state.pastDays.length > 0 && (
        <>
          <h2 className="mt-8 mb-2.5 text-[12px] font-semibold tracking-[0.12em] text-ink-400 uppercase">Earlier</h2>
          <div className="grid grid-cols-2 gap-2">
            {state.pastDays.map((day) => (
              <div key={day.date} className="rounded-2xl border border-ink-800 bg-ink-850 px-4 py-3">
                <p className="text-[13.5px] font-semibold">
                  {new Date(`${day.date}T00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-400">
                  {plural(day.history.length, 'task')} ·{formatDuration(focused(day.history))} focused · {onTime(day.history)} on time
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-850 px-4 py-3.5">
      <p className="text-[12px] font-medium text-ink-400">{label}</p>
      <p className="tabular font-display mt-1 text-[24px] leading-none font-semibold">{value}</p>
    </div>
  )
}

function EntryRow({ entry }: { entry: HistoryEntry }) {
  const plannedMs = entry.plannedMinutes * MINUTE
  const ratio = Math.min(1.5, entry.actualMs / plannedMs)
  const over = entry.actualMs > plannedMs + MINUTE

  return (
    <div className="flex h-12 items-center gap-3 rounded-xl border border-ink-800 bg-ink-850 px-4">
      <span className="size-2.5 rounded-full" style={{ background: entry.color }} />
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{entry.title}</span>
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-ink-700">
        <div
          className={`h-full rounded-full ${over ? 'bg-warn' : 'bg-mint'}`}
          style={{ width: `${(ratio / 1.5) * 100}%` }}
        />
      </div>
      <span className="tabular w-[120px] text-right text-[12.5px] text-ink-400">
        {formatDuration(entry.actualMs)} / {formatDuration(plannedMs)}
      </span>
      <span className="tabular w-[64px] text-right text-[12px] text-ink-500">{formatClock(entry.finishedAt)}</span>
    </div>
  )
}
