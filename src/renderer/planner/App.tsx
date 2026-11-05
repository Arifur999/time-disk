import { useState } from 'react'
import { CalendarCheck, History, Settings as SettingsIcon, Timer } from 'lucide-react'
import { formatCountdown } from '../../shared/office'
import { currentTask, remainingMs } from '../../shared/timer'
import { useAppState, useNow } from '../lib/hooks'
import { HistoryPage } from './HistoryPage'
import { SettingsPage } from './SettingsPage'
import { TodayPage } from './TodayPage'
import icon from '../../../resources/icon.png'

const PAGES = [
  { id: 'today', label: 'Plan', Icon: CalendarCheck },
  { id: 'history', label: 'History', Icon: History },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon }
] as const

type PageId = (typeof PAGES)[number]['id']

export function App() {
  const state = useAppState()
  const now = useNow()
  const [page, setPage] = useState<PageId>('today')
  const [pickedDate, setPickedDate] = useState('')

  if (!state) return null
  const task = currentTask(state.plan, state.timer)
  // Never show a day that has already passed (e.g. after midnight).
  const planDate = pickedDate > state.plan.date ? pickedDate : state.plan.date

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
              {label}
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
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-500">
              <Timer size={12} /> Timer lives in the tray
            </p>
          </div>
        </nav>

        <main className="min-w-0 flex-1 overflow-y-auto rounded-tl-2xl border-t border-l border-ink-800 bg-ink-900">
          {page === 'today' && (
            <TodayPage key={planDate} date={planDate} onPickDate={setPickedDate} state={state} now={now} />
          )}
          {page === 'history' && <HistoryPage state={state} />}
          {page === 'settings' && <SettingsPage settings={state.settings} />}
        </main>
      </div>
    </div>
  )
}
