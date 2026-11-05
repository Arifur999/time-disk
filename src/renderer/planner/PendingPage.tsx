import type { ReactNode } from 'react'
import { Check, ChevronRight, ListTodo } from 'lucide-react'
import { formatCountdown, formatDuration, plural } from '../../shared/office'
import { currentTask, MINUTE, remainingMs, upcomingTasks } from '../../shared/timer'
import type { AppState, Task } from '../../shared/types'

interface PendingPageProps {
  state: AppState
  now: number
  onOpenDay: (date: string) => void
}

function dayLabel(date: string): string {
  return new Date(`${date}T00:00`).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Everything not done yet: today first, then each day planned ahead. */
export function PendingPage({ state, now, onOpenDay }: PendingPageProps) {
  const running = currentTask(state.plan, state.timer)
  const today = [...(running ? [running] : []), ...upcomingTasks(state.plan, state.timer)]
  const laterDays = Object.entries(state.futurePlans)
    .filter(([, tasks]) => tasks.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
  const total = today.length + laterDays.reduce((sum, [, tasks]) => sum + tasks.length, 0)

  return (
    <div className="mx-auto max-w-[860px] px-8 pt-7 pb-10">
      <h1 className="font-display text-[28px] font-semibold tracking-tight">Pending</h1>
      <p className="mt-0.5 text-[13.5px] text-ink-400">
        {total ? `${plural(total, 'task')} still to do` : 'Nothing pending — nice work!'}
      </p>

      <DayGroup
        title="Today"
        tasks={today}
        onOpen={() => onOpenDay(state.plan.date)}
        renderEnd={(task) =>
          task.id === running?.id ? (
            <span className="tabular rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
              NOW · {formatCountdown(remainingMs(task, state.timer, now))}
            </span>
          ) : null
        }
        onComplete={(task) => window.api.completeTask(task.id)}
      />

      {laterDays.map(([date, tasks]) => (
        <DayGroup key={date} title={dayLabel(date)} tasks={tasks} onOpen={() => onOpenDay(date)} />
      ))}

      {total === 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-ink-800 bg-ink-850 px-5 py-5 text-[13.5px] text-ink-400">
          <ListTodo size={20} className="text-mint" /> All tasks are done. Add more on the Plan page.
        </div>
      )}
    </div>
  )
}

interface DayGroupProps {
  title: string
  tasks: Task[]
  onOpen: () => void
  renderEnd?: (task: Task) => ReactNode
  onComplete?: (task: Task) => void
}

function DayGroup({ title, tasks, onOpen, renderEnd, onComplete }: DayGroupProps) {
  if (tasks.length === 0) return null
  const totalMs = tasks.reduce((sum, task) => sum + task.minutes * MINUTE, 0)

  return (
    <section className="mt-7">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[12px] font-semibold tracking-[0.12em] text-ink-400 uppercase">
          {title} <span className="ml-1 font-normal tracking-normal normal-case">· {plural(tasks.length, 'task')} · {formatDuration(totalMs)}</span>
        </h2>
        <button onClick={onOpen} className="flex items-center gap-0.5 text-[12.5px] font-medium text-accent-soft hover:text-ink-100">
          Edit plan <ChevronRight size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {tasks.map((task) => (
          <div key={task.id} className="flex h-12 items-center gap-3 rounded-xl border border-ink-800 bg-ink-850 px-4">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: task.color }} />
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{task.title}</span>
            {renderEnd?.(task)}
            <span className="tabular w-14 text-right text-[12.5px] text-ink-400">{formatDuration(task.minutes * MINUTE)}</span>
            {onComplete && (
              <button
                title="Mark as complete"
                onClick={() => onComplete(task)}
                className="flex h-8 items-center gap-1 rounded-lg bg-mint/10 px-2.5 text-[12px] font-semibold text-mint transition hover:bg-mint/20"
              >
                <Check size={14} strokeWidth={3} /> Done
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
