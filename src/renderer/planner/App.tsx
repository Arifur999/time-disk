import { useState } from 'react'
import { CalendarCheck, CheckCircle2, History, ListTodo, Settings as SettingsIcon, Timer } from 'lucide-react'
import { formatCountdown } from '../../shared/office'
import { currentTask, remainingMs, upcomingTasks } from '../../shared/timer'
import { useAppState, useNow } from '../lib/hooks'
import { CompletedPage } from './CompletedPage'
import { HistoryPage } from './HistoryPage'
import { PendingPage } from './PendingPage'
import { SettingsPage } from './SettingsPage'
import { TodayPage } from './TodayPage'
import icon from '../../../resources/icon.png'

const PAGES = [
  { id: 'today', label: 'Plan', Icon: CalendarCheck },
  { id: 'pending', label: 'Pending', Icon: ListTodo },
  { id: 'completed', label: 'Completed', Icon: CheckCircle2 },
  { id: 'history', label: 'History', Icon: History },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon }
] as const

export type PageId = (typeof PAGES)[number]['id']

export function App() {
  const state = useAppState()
  const now = useNow()
  const [page, setPage] = useState<PageId>('today')
  const [pickedDate, setPickedDate] = useState('')

  if (!state) return null
  const task = currentTask(state.plan, state.timer)
  // Never show a day that has already passed (e.g. after midnight).
  const planDate = pickedDate > state.plan.date ? pickedDate : state.plan.date

  const pendingCount =
    upcomingTasks(state.plan, state.timer).length +
    (task ? 1 : 0) +
    Object.values(state.futurePlans).reduce((sum, tasks) => sum + tasks.length, 0)
  const counts: Partial<Record<PageId, number>> = { pending: pendingCount, completed: state.plan.history.length }

  function openDay(date: string) {
    setPickedDate(date)
    setPage('today')
  }

  return (
    <div className="flex h-full flex-col">
      <header className="drag flex h-11 shrink-0 items-center gap-2.5 px-4">
        <img src={icon} alt="" className="size-5" />
        <span className="text-[13px] font-semibold text-ink-300">Office Focus Timer</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-[216px] shrink-0 flex-col gap-1 px-3 pt-3 pb-4">
          {PAGES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition ${
                page === id ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:bg-ink-900 hover:text-ink-100'
              }`}
            >
              <Icon size={17} className={page === id ? 'text-accent-soft' : ''} />
              <span className="flex-1 text-left">{label}</span>
              {!!counts[id] && (
                <span className="tabular rounded-full bg-ink-700 px-2 py-px text-[11.5px] font-semibold text-ink-300">
                  {counts[id]}
                </span>
              )}
            </button>
          ))}

          <div className="mt-auto rounded-2xl border border-ink-800 bg-ink-900 p-3.5">
            {task ? (
              <>
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-ink-400 uppercase">
                  <span className="size-1.5 rounded-full" style={{ background: task.color }} /> Now
                </p>
                <p className="mt-1 truncate text-[13.5px] font-semibold">{task.title}</p>
                <p className="tabular font-display mt-0.5 text-[22px] font-semibold">
                  {formatCountdown(remainingMs(task, state.timer, now))}
                </p>
              </>
            ) : (
              <p className="text-[12.5px] text-ink-400">No task running right now.</p>
            )}
            <button
              onClick={() => window.api.showWidget()}
              className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-ink-800 text-[12.5px] font-semibold text-ink-300 transition hover:bg-ink-700 hover:text-ink-100"
            >
              <Timer size={14} /> Show timer
            </button>
          </div>
        </nav>

        <main className="min-w-0 flex-1 overflow-y-auto rounded-tl-2xl border-t border-l border-ink-800 bg-ink-900">
          {page === 'today' && (
            <TodayPage
              key={planDate}
              date={planDate}
              onPickDate={setPickedDate}
              onSeeCompleted={() => setPage('completed')}
              state={state}
              now={now}
            />
          )}
          {page === 'pending' && <PendingPage state={state} now={now} onOpenDay={openDay} />}
          {page === 'completed' && <CompletedPage state={state} />}
          {page === 'history' && <HistoryPage state={state} />}
          {page === 'settings' && <SettingsPage settings={state.settings} />}
        </main>
      </div>
    </div>
  )
}
