import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Check, LayoutList, Minus, Pause, Play, Plus, Timer, X } from 'lucide-react'
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

  if (collapsed) return <ClockBubble state={state} task={task} now={now} onExpand={() => toggleCollapsed(false)} />

  return (
    <Card alert={state.timer.status === 'timeUp'}>
      <div className="absolute top-2.5 right-2.5 z-10 flex gap-0.5">
        <IconButton title="Open planner" onClick={() => api().openPlanner()}>
          <LayoutList size={14} />
        </IconButton>
        <IconButton title="Minimize to a small clock" onClick={() => toggleCollapsed(true)}>
          <Minus size={15} />
        </IconButton>
        <IconButton title="Hide the timer (show it again from the tray icon)" onClick={() => api().hideWidget()}>
          <X size={14} />
        </IconButton>
      </div>
      {task ? <ActiveTask state={state} task={task} now={now} /> : <IdleView state={state} />}
    </Card>
  )
}

function Card({ alert, children }: { alert: boolean; children: ReactNode }) {
  return (
    <div
      onPointerDown={dragOrClick(() => {})}
      className="absolute inset-2 cursor-grab overflow-hidden rounded-[22px] border border-white/[0.07] bg-gradient-to-br from-[#1c2030]/[0.97] to-[#111319]/[0.97]">
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
          <div className="mt-2.5 flex gap-2">
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
<Check size={13} strokeWidth={3} /> {following ? 'Done, next' : 'Done'}
            </button>
          </div>
        ) : (
          <div className="mt-2.5 flex gap-1.5">
            <PillButton title={paused ? 'Resume' : 'Pause'} onClick={() => api().timer(paused ? 'resume' : 'pause')}>
              {paused ? <Play size={13} /> : <Pause size={13} />}
            </PillButton>
            <PillButton title="Add 5 minutes" onClick={() => api().timer('addFive')}>
              <Plus size={13} />5m
            </PillButton>
            <button
              title={following ? 'Task done: start the next one' : 'Task done'}
              onClick={() => api().timer('next')}
              className="flex h-7 items-center gap-1 rounded-full bg-mint/15 px-2.5 text-[11.5px] font-semibold text-mint transition hover:bg-mint/25"
            >
              <Check size={13} strokeWidth={3} /> Complete
            </button>
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
        className="mt-3 flex h-8 w-fit items-center gap-1.5 rounded-full bg-accent px-4 text-[12.5px] font-semibold text-white hover:bg-accent-soft"
      >
        {action.label === 'Start' && <Play size={13} />} {action.label}
      </button>
    </div>
  )
}

/**
 * Drag the widget by hand. A CSS drag region (-webkit-app-region) is not
 * used because on Windows it swallows clicks on buttons inside it.
 */
function dragOrClick(onClick: () => void) {
  return (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    const start = { x: event.screenX, y: event.screenY, windowX: window.screenX, windowY: window.screenY }
    let moved = false
    const position = (e: PointerEvent) => [start.windowX + e.screenX - start.x, start.windowY + e.screenY - start.y] as const

    function onMove(e: PointerEvent) {
      if (!moved && Math.hypot(e.screenX - start.x, e.screenY - start.y) < 4) return
      moved = true
      api().moveWidget(...position(e), false)
    }
    function onUp(e: PointerEvent) {
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      if (moved) api().moveWidget(...position(e), true)
      else onClick()
    }
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
  }
}

function ClockBubble({ state, task, now, onExpand }: { state: AppState; task?: Task; now: number; onExpand: () => void }) {
  const { timer } = state
  const timeUp = timer.status === 'timeUp'
  const progress = task ? Math.min(1, elapsedMs(timer, now) / totalMs(task, timer)) : 0
  const color = timeUp ? 'var(--color-warn)' : (task?.color ?? 'var(--color-ink-500)')
  const radius = 37
  const circumference = 2 * Math.PI * radius

  return (
    <div
      title={task ? `${task.title} — click to open, drag to move` : 'Click to open, drag to move'}
      onPointerDown={dragOrClick(onExpand)}
      className={`absolute inset-1.5 grid cursor-pointer place-items-center rounded-full border border-white/[0.08] bg-[#151823]/[0.97] ${
        timeUp ? 'animate-pulse-glow' : ''
      } ${timer.status === 'paused' ? 'opacity-70' : ''}`}
    >
      <svg viewBox="0 0 88 88" className="absolute inset-0 size-full -rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="5" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - (timeUp ? 1 : progress))}
          style={{ transition: 'stroke-dashoffset 0.3s linear' }}
        />
      </svg>
      {task ? (
        <div className="relative flex flex-col items-center leading-none">
          <span className={`tabular text-[15px] font-semibold ${timeUp ? 'text-warn' : ''}`}>
            {formatCountdown(remainingMs(task, timer, now))}
          </span>
          <span className="mt-1 text-[8.5px] font-semibold tracking-[0.12em] text-ink-400 uppercase">
            {timeUp ? 'over' : timer.status === 'paused' ? 'paused' : 'left'}
          </span>
        </div>
      ) : (
        <Timer size={24} className="relative text-ink-300" />
      )}
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
      className="flex h-7 items-center gap-0.5 rounded-full bg-white/[0.07] px-2.5 text-[11.5px] font-semibold whitespace-nowrap text-ink-300 transition hover:bg-white/[0.14] hover:text-ink-100"
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
      className="grid size-7 place-items-center rounded-full text-ink-400 transition hover:bg-white/10 hover:text-ink-100"
    >
      {children}
    </button>
  )
}
