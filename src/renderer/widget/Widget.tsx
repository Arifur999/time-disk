import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, LayoutList, Pause, Play, Plus, SkipForward, X } from 'lucide-react'
import { formatCountdown, formatDuration, formatHhmm, officePhase, plural } from '../../shared/office'
import { currentTask, elapsedMs, MINUTE, nextTask, remainingMs, totalMs, upcomingTasks } from '../../shared/timer'
import type { AppState, Task } from '../../shared/types'
import { playChime } from '../lib/chime'
import { useAppState, useNow } from '../lib/hooks'

const api = () => window.api

export function Widget() {
  const state = useAppState()
  const now = useNow(250)
  const [collapsed, setCollapsed] = useState(false)
  const soundOn = useRef(true)
  soundOn.current = state?.settings.sound ?? true

  useEffect(
    () =>
      api().onTimeUp(() => {
        setCollapsed(false)
        api().setWidgetCollapsed(false)
        if (soundOn.current) playChime()
      }),
    []
  )

  function toggleCollapsed(value: boolean) {
    setCollapsed(value)
    api().setWidgetCollapsed(value)
  }

  if (!state) return null
  const task = currentTask(state.plan, state.timer)

  if (collapsed) return <Pill state={state} task={task} now={now} onExpand={() => toggleCollapsed(false)} />

  return (
    <Card alert={state.timer.status === 'timeUp'}>
      <div className="absolute top-2.5 right-2.5 z-10 flex gap-0.5">
        <IconButton title="Open planner" onClick={() => api().openPlanner()}>
          <LayoutList size={14} />
        </IconButton>
        <IconButton title="Make small" onClick={() => toggleCollapsed(true)}>
          <ChevronDown size={15} />
        </IconButton>
        <IconButton title="Hide (open again from the tray)" onClick={() => api().hideWidget()}>
          <X size={14} />
        </IconButton>
      </div>
      {task ? <ActiveTask state={state} task={task} now={now} /> : <IdleView state={state} />}
    </Card>
  )
}

function Card({ alert, children }: { alert: boolean; children: ReactNode }) {
  return (
    <div className="drag absolute inset-2 overflow-hidden rounded-[22px] border border-white/[0.07] bg-gradient-to-br from-[#1c2030]/[0.97] to-[#111319]/[0.97]">
      <div className={`absolute inset-0 rounded-[22px] ${alert ? 'animate-pulse-glow' : ''}`} />
      <div className="relative h-full">{children}</div>
    </div>
  )
}

function ActiveTask({ state, task, now }: { state: AppState; task: Task; now: number }) {
  const { timer, plan } = state
  const remaining = remainingMs(task, timer, now)
  const progress = Math.min(1, elapsedMs(timer, now) / totalMs(task, timer))
  const following = nextTask(plan, timer)
  const timeUp = timer.status === 'timeUp'
  const paused = timer.status === 'paused'
  const ringColor = timeUp ? 'var(--color-warn)' : task.color

  return (
    <div className="flex h-full items-center gap-4 pr-4 pl-4">
      <Ring progress={timeUp ? 1 : progress} color={ringColor} dim={paused}>
        <span className={`tabular font-display text-[19px] font-semibold ${timeUp ? 'text-warn' : ''}`}>
          {formatCountdown(remaining)}
        </span>
        <span className="text-[9.5px] font-medium tracking-[0.12em] text-ink-400 uppercase">
          {timeUp ? 'over' : paused ? 'paused' : 'left'}
        </span>
      </Ring>

      <div className="flex min-w-0 flex-1 flex-col">
        <Label color={timeUp ? 'var(--color-warn)' : task.color}>{timeUp ? "Time's up" : 'Now'}</Label>
        <p className="mt-1 line-clamp-2 text-[15px] leading-snug font-semibold">{task.title}</p>
        <p className="mt-1 truncate text-[11.5px] text-ink-400">
          {following ? (
            <>
              Next · <span className="text-ink-300">{following.title}</span> · {following.minutes}m
            </>
          ) : (
            'Last task of the day'
          )}
        </p>

        {timeUp ? (
          <div className="no-drag mt-2.5 flex gap-2">
            <button
              onClick={() => api().timer('addFive')}
              className="flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-white/10 px-2.5 text-[12px] font-semibold whitespace-nowrap hover:bg-white/15"
            >
              <Plus size={13} /> 5 min
            </button>
            <button
              onClick={() => api().timer('next')}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-2.5 text-[12px] font-semibold whitespace-nowrap text-white hover:bg-accent-soft"
            >
              {following ? 'Start next' : 'Finish day'} <SkipForward size={13} />
            </button>
          </div>
        ) : (
          <div className="no-drag mt-2.5 flex gap-1.5">
            <PillButton title={paused ? 'Resume' : 'Pause'} onClick={() => api().timer(paused ? 'resume' : 'pause')}>
              {paused ? <Play size={13} /> : <Pause size={13} />}
            </PillButton>
            <PillButton title="Add 5 minutes" onClick={() => api().timer('addFive')}>
              <Plus size={13} /> 5
            </PillButton>
            <PillButton title="Done, start next task" onClick={() => api().timer('next')}>
              <SkipForward size={13} /> {following ? 'Next' : 'Done'}
            </PillButton>
          </div>
        )}
      </div>
    </div>
  )
}

function IdleView({ state }: { state: AppState }) {
  const { plan, settings, timer } = state
  const upcoming = upcomingTasks(plan, timer)
  const phase = officePhase(settings, new Date())
  const focusedMs = plan.history.reduce((sum, entry) => sum + entry.actualMs, 0)

  let title: string
  let detail: string
  let action: { label: string; run: () => void }

  if (upcoming.length === 0 && plan.history.length > 0) {
    title = 'All done for today 🎉'
    detail = `${plural(plan.history.length, 'task')} · ${formatDuration(focusedMs)} focused`
    action = { label: 'Plan more', run: () => api().openPlanner() }
  } else if (upcoming.length === 0) {
    title = 'No tasks planned yet'
    detail = `Office hours ${formatHhmm(settings.officeStart)} – ${formatHhmm(settings.officeEnd)}`
    action = { label: 'Plan my day', run: () => api().openPlanner() }
  } else {
    const plannedMs = upcoming.reduce((sum, task) => sum + task.minutes * MINUTE, 0)
    title =
      phase === 'before'
        ? `Office starts at ${formatHhmm(settings.officeStart)}`
        : phase === 'dayOff'
          ? 'Day off — tasks are waiting'
          : 'Ready when you are'
    detail = `${plural(upcoming.length, 'task')} ·${formatDuration(plannedMs)} · first: ${upcoming[0].title}`
    action = { label: 'Start', run: () => api().timer('start') }
  }

  return (
    <div className="flex h-full flex-col justify-center px-5">
      <Label color="var(--color-accent)">Office Focus</Label>
      <p className="mt-1.5 pr-16 text-[16px] leading-snug font-semibold">{title}</p>
      <p className="mt-1 truncate text-[12px] text-ink-400">{detail}</p>
      <button
        onClick={action.run}
        className="no-drag mt-3 flex h-8 w-fit items-center gap-1.5 rounded-full bg-accent px-4 text-[12.5px] font-semibold text-white hover:bg-accent-soft"
      >
        {action.label === 'Start' && <Play size={13} />} {action.label}
      </button>
    </div>
  )
}

function Pill({ state, task, now, onExpand }: { state: AppState; task?: Task; now: number; onExpand: () => void }) {
  const timeUp = state.timer.status === 'timeUp'
  return (
    <div
      className={`drag absolute inset-1.5 flex items-center gap-2.5 rounded-full border border-white/[0.07] bg-[#161925]/[0.97] pr-1.5 pl-4 ${timeUp ? 'animate-pulse-glow' : ''}`}
    >
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: timeUp ? 'var(--color-warn)' : (task?.color ?? 'var(--color-ink-500)') }} />
      {task ? (
        <>
          <span className="tabular text-[15px] font-semibold">{formatCountdown(remainingMs(task, state.timer, now))}</span>
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-400">{task.title}</span>
        </>
      ) : (
        <span className="flex-1 text-[12px] text-ink-300">No task running</span>
      )}
      <IconButton title="Expand" onClick={onExpand}>
        <ChevronLeft size={15} />
      </IconButton>
    </div>
  )
}

function Ring({ progress, color, dim, children }: { progress: number; color: string; dim: boolean; children: ReactNode }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  return (
    <div className={`relative grid size-[104px] shrink-0 place-items-center ${dim ? 'opacity-60' : ''}`}>
      <svg viewBox="0 0 104 104" className="absolute inset-0 -rotate-90">
        <circle cx="52" cy="52" r={radius} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="7" />
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s' }}
        />
      </svg>
      <div className="relative flex flex-col items-center leading-tight">{children}</div>
    </div>
  )
}

function Label({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.14em] uppercase" style={{ color }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  )
}

function PillButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-7 items-center gap-1 rounded-full bg-white/[0.07] px-2.5 text-[11.5px] font-semibold text-ink-300 transition hover:bg-white/[0.14] hover:text-ink-100"
    >
      {children}
    </button>
  )
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="no-drag grid size-7 place-items-center rounded-full text-ink-400 transition hover:bg-white/10 hover:text-ink-100"
    >
      {children}
    </button>
  )
}
