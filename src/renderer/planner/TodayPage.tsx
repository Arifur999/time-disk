import { useEffect, useState, type FormEvent } from 'react'
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarPlus, Check, ChevronRight, GripVertical, Minus, Play, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { dateKey, formatClock, formatCountdown, formatDuration, formatHhmm, plural, timeOnDay } from '../../shared/office'
import { finishedTaskIds, MINUTE, remainingMs } from '../../shared/timer'
import { IDLE_TIMER, TASK_COLORS, type AppState, type Task } from '../../shared/types'
import { buildSchedule, type Slot } from './schedule'

const QUICK_MINUTES = [15, 25, 30, 45, 60, 90]

const NO_TASKS: Task[] = []

interface TodayPageProps {
  /** The day being planned: today or a future day. */
  date: string
  onPickDate: (date: string) => void
  onSeeCompleted: () => void
  state: AppState
  now: number
}

export function TodayPage({ date, onPickDate, onSeeCompleted, state, now }: TodayPageProps) {
  const isToday = date === state.plan.date
  const savedTasks = isToday ? state.plan.tasks : (state.futurePlans[date] ?? NO_TASKS)
  const [draft, setDraft] = useState<Task[]>(savedTasks)
  const [dirty, setDirty] = useState(false)

  // Follow the saved plan until the user starts editing.
  useEffect(() => {
    if (!dirty) setDraft(savedTasks)
  }, [savedTasks, dirty])

  const day = new Date(`${date}T00:00`)
  const finished = isToday ? finishedTaskIds(state.plan) : new Set<string>()
  const upcoming = draft.filter((task) => !finished.has(task.id))
  // Future days are laid out from office start, with nothing running yet.
  const { slots, dayEnd } = isToday
    ? buildSchedule(draft, state, now)
    : buildSchedule(
        draft,
        { ...state, timer: IDLE_TIMER, plan: { ...state.plan, history: [] } },
        timeOnDay(state.settings.officeStart, day).getTime()
      )
  const officeEnd = timeOnDay(state.settings.officeEnd, day).getTime()
  const overflowMs = dayEnd - officeEnd
  const isWorkDay = state.settings.workDays.includes(day.getDay())
  const canStart = isToday && (state.timer.status === 'idle' || state.timer.status === 'done') && upcoming.length > 0
  const plannedMs = upcoming.reduce((sum, task) => sum + task.minutes * MINUTE, 0)
  const focusedMs = state.plan.history.reduce((sum, entry) => sum + entry.actualMs, 0)

  function edit(tasks: Task[]) {
    setDraft(tasks)
    setDirty(true)
  }

  async function save(andStart = false) {
    await window.api.saveTasks(draft, date)
    setDirty(false)
    if (andStart) await window.api.timer('start')
  }

  async function complete(taskId: string) {
    if (dirty) await save()
    await window.api.completeTask(taskId)
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function updateTask(id: string, patch: Partial<Task>) {
    edit(draft.map((task) => (task.id === id ? { ...task, ...patch } : task)))
  }

  function addTask(title: string, minutes: number) {
    const color = TASK_COLORS[draft.length % TASK_COLORS.length]
    edit([...draft, { id: crypto.randomUUID(), title, minutes, color }])
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = draft.findIndex((task) => task.id === active.id)
    const to = draft.findIndex((task) => task.id === over.id)
    edit(arrayMove(draft, from, to))
  }

  const longDate = day.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="mx-auto max-w-[860px] px-8 pt-6 pb-10">
      <DateStrip today={state.plan.date} selected={date} futurePlans={state.futurePlans} onPick={onPickDate} />

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">{dayName(date, state.plan.date)}</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-400">
            {longDate} ·{' '}
            {isWorkDay
              ? `Office ${formatHhmm(state.settings.officeStart)} – ${formatHhmm(state.settings.officeEnd)}`
              : 'Day off'}
            {!isToday && ' · You will get a reminder on this day'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="mr-1 text-[12px] text-warn">● Not saved yet</span>}
          <button
            onClick={() => save()}
            disabled={!dirty}
            className={`flex h-9 items-center gap-2 rounded-xl px-3.5 text-[13px] font-semibold transition disabled:opacity-40 ${
              dirty
                ? 'bg-warn text-ink-950 hover:brightness-110'
                : 'border border-ink-700 text-ink-300'
            }`}
          >
            <Save size={15} /> Save plan
          </button>
          {canStart && (
            <button
              onClick={() => save(true)}
              className="flex h-9 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white shadow-[0_6px_20px_-6px] shadow-accent/60 transition hover:bg-accent-soft"
            >
              <Play size={15} /> Save & start
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Planned" value={formatDuration(plannedMs)} detail={`${plural(upcoming.length, 'task')} to go`} />
        <Stat
          label="Finishes at"
          value={upcoming.length ? formatClock(dayEnd) : '—'}
          detail={
            !upcoming.length
              ? 'Nothing planned'
              : !isWorkDay
                ? 'Day off'
                : overflowMs > 0
                  ? `${formatDuration(overflowMs)} past office hours`
                  : `${formatDuration(-overflowMs)} spare before ${formatHhmm(state.settings.officeEnd)}`
          }
          tone={upcoming.length && isWorkDay && overflowMs > 0 ? 'warn' : 'ok'}
        />
        {isToday ? (
          <Stat label="Done" value={String(state.plan.history.length)} detail={`${formatDuration(focusedMs)} focused`} />
        ) : (
          <Stat
            label="Starts at"
            value={formatHhmm(state.settings.officeStart)}
            detail={isWorkDay ? 'Reminder pops up that morning' : 'Not a working day'}
            tone={isWorkDay ? 'ok' : 'warn'}
          />
        )}
      </div>

      <AddTask defaultMinutes={state.settings.defaultMinutes} onAdd={addTask} />

      <section className="mt-7">
        <h2 className="mb-2.5 flex items-baseline justify-between text-[12px] font-semibold tracking-[0.12em] text-ink-400 uppercase">
          Task list
          {upcoming.length > 1 && (
            <span className="text-[11.5px] font-normal tracking-normal text-ink-500 normal-case">
              Drag ⋮⋮ to change the order · use − + to change the minutes
            </span>
          )}
        </h2>
        <div className="flex flex-col gap-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={upcoming.map((task) => task.id)} strategy={verticalListSortingStrategy}>
              {upcoming.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  slot={slots.get(task.id)}
                  isCurrent={task.id === state.timer.currentTaskId}
                  remaining={task.id === state.timer.currentTaskId ? remainingMs(task, state.timer, now) : null}
                  onChange={(patch) => updateTask(task.id, patch)}
                  onDelete={() => edit(draft.filter((other) => other.id !== task.id))}
                  onComplete={isToday ? () => complete(task.id) : undefined}
                />
              ))}
            </SortableContext>
          </DndContext>
          {upcoming.length === 0 && <EmptyPlan />}
        </div>
      </section>

      {isToday && state.plan.history.length > 0 && (
        <button
          onClick={onSeeCompleted}
          className="mt-5 flex h-11 w-full items-center gap-2.5 rounded-xl border border-ink-800 px-4 text-[13px] text-ink-400 transition hover:border-ink-700 hover:text-ink-100"
        >
          <span className="grid size-5 place-items-center rounded-full bg-mint/15 text-mint">
            <Check size={12} strokeWidth={3} />
          </span>
          {plural(state.plan.history.length, 'task')} completed today
          <span className="ml-auto flex items-center gap-0.5 font-medium text-accent-soft">
            See all <ChevronRight size={14} />
          </span>
        </button>
      )}
    </div>
  )
}

function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00`)
  day.setDate(day.getDate() + days)
  return dateKey(day)
}

function dayName(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === addDays(today, 1)) return 'Tomorrow'
  return new Date(`${date}T00:00`).toLocaleDateString('en-US', { weekday: 'long' })
}

interface DateStripProps {
  today: string
  selected: string
  futurePlans: AppState['futurePlans']
  onPick: (date: string) => void
}

/** Today plus the next two weeks; a dot marks days that already have tasks. */
function DateStrip({ today, selected, futurePlans, onPick }: DateStripProps) {
  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index))
  const fartherDate = selected > days[days.length - 1] ? selected : ''

  return (
    <div className="flex items-center gap-1.5">
      <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
        {days.map((date) => {
          const day = new Date(`${date}T00:00`)
          const active = date === selected
          const hasTasks = date !== today && (futurePlans[date]?.length ?? 0) > 0
          return (
            <button
              key={date}
              onClick={() => onPick(date)}
              className={`relative flex h-14 w-[52px] shrink-0 flex-col items-center justify-center rounded-xl text-center transition ${
                active ? 'bg-accent text-white' : 'bg-ink-850 text-ink-300 hover:bg-ink-800'
              }`}
            >
              <span className={`text-[10.5px] font-semibold uppercase ${active ? 'text-white/80' : 'text-ink-500'}`}>
                {date === today ? 'Today' : day.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="tabular text-[17px] leading-tight font-semibold">{day.getDate()}</span>
              {hasTasks && (
                <span className={`absolute bottom-1.5 size-1 rounded-full ${active ? 'bg-white' : 'bg-mint'}`} />
              )}
            </button>
          )
        })}
      </div>
      <label
        title="Pick a later date"
        className={`relative grid h-14 w-12 shrink-0 cursor-pointer place-items-center rounded-xl transition ${
          fartherDate ? 'bg-accent text-white' : 'bg-ink-850 text-ink-400 hover:bg-ink-800'
        }`}
      >
        <CalendarPlus size={18} />
        <input
          type="date"
          min={today}
          value={fartherDate}
          onChange={(event) => event.target.value && onPick(event.target.value)}
          onClick={(event) => event.currentTarget.showPicker()}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

function Stat({ label, value, detail, tone = 'ok' }: { label: string; value: string; detail: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-850 px-4 py-3.5">
      <p className="text-[12px] font-medium text-ink-400">{label}</p>
      <p className="tabular font-display mt-1 text-[24px] leading-none font-semibold">{value}</p>
      <p className={`mt-1.5 text-[12px] ${tone === 'warn' ? 'text-warn' : 'text-ink-400'}`}>{detail}</p>
    </div>
  )
}

interface TaskRowProps {
  task: Task
  slot?: Slot
  isCurrent: boolean
  remaining: number | null
  onChange: (patch: Partial<Task>) => void
  onDelete: () => void
  /** Only today's tasks can be completed. */
  onComplete?: () => void
}

function TaskRow({ task, slot, isCurrent, remaining, onChange, onDelete, onComplete }: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const nextColor = TASK_COLORS[(TASK_COLORS.indexOf(task.color) + 1) % TASK_COLORS.length]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative flex h-14 items-center gap-2 rounded-2xl border pr-2 pl-1.5 transition-colors ${
        isCurrent ? 'border-accent/40 bg-accent/[0.08]' : 'border-ink-800 bg-ink-850 hover:border-ink-700'
      } ${isDragging ? 'z-10 shadow-2xl shadow-black/50' : ''}`}
    >
      <button {...attributes} {...listeners} title="Drag to reorder" className="cursor-grab p-1 text-ink-600 hover:text-ink-300 active:cursor-grabbing">
        <GripVertical size={16} />
      </button>
      <button
        title="Change colour"
        onClick={() => onChange({ color: nextColor })}
        className="size-3.5 shrink-0 rounded-full ring-4 ring-transparent transition hover:ring-white/10"
        style={{ background: task.color }}
      />
      <input
        value={task.title}
        onChange={(event) => onChange({ title: event.target.value })}
        className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-[14.5px] font-medium outline-none focus:bg-ink-800"
      />
      {isCurrent && (
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-bold tracking-wider text-white uppercase">Now</span>
      )}
      <MinutesStepper value={task.minutes} onChange={(minutes) => onChange({ minutes })} />
      <span className="tabular w-[136px] text-right text-[12.5px] text-ink-400">
        {isCurrent && remaining !== null
          ? `${formatCountdown(remaining)} left`
          : slot && `${formatClock(slot.start)} – ${formatClock(slot.end)}`}
      </span>
      {onComplete && (
        <button
          title="Mark this task as complete"
          onClick={onComplete}
          className="flex h-8 items-center gap-1 rounded-lg bg-mint/10 px-2.5 text-[12px] font-semibold text-mint transition hover:bg-mint/20"
        >
          <Check size={14} strokeWidth={3} /> Done
        </button>
      )}
      <button
        title="Delete task"
        onClick={onDelete}
        className="grid size-8 place-items-center rounded-lg text-ink-600 opacity-0 transition group-hover:opacity-100 hover:bg-danger/15 hover:text-danger"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

function MinutesStepper({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const set = (minutes: number) => onChange(Math.min(600, Math.max(1, minutes)))
  return (
    <div className="flex h-8 items-center rounded-lg border border-ink-700 bg-ink-900">
      <button onClick={() => set(value - 5)} className="grid h-full w-7 place-items-center text-ink-400 hover:text-ink-100">
        <Minus size={13} />
      </button>
      <input
        value={value}
        onChange={(event) => set(Number(event.target.value.replace(/\D/g, '')) || 1)}
        className="tabular w-8 bg-transparent text-center text-[13px] font-semibold outline-none"
      />
      <span className="pr-1 text-[11.5px] text-ink-500">min</span>
      <button onClick={() => set(value + 5)} className="grid h-full w-7 place-items-center text-ink-400 hover:text-ink-100">
        <Plus size={13} />
      </button>
    </div>
  )
}

function AddTask({ defaultMinutes, onAdd }: { defaultMinutes: number; onAdd: (title: string, minutes: number) => void }) {
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState(defaultMinutes)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    onAdd(title.trim(), minutes)
    setTitle('')
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.07] to-transparent p-4">
      <p className="flex items-center gap-2 text-[14.5px] font-semibold">
        <span className="grid size-6 place-items-center rounded-lg bg-accent text-white">
          <Plus size={15} strokeWidth={3} />
        </span>
        Add a new task
      </p>

      <label className="mt-3.5 block text-[12px] font-medium text-ink-400" htmlFor="new-task-title">
        1. What will you work on?
      </label>
      <input
        id="new-task-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="e.g. Reply to client emails"
        className="mt-1.5 h-11 w-full rounded-xl border border-ink-700 bg-ink-950 px-3.5 text-[14.5px] outline-none placeholder:text-ink-500 focus:border-accent"
      />

      <p className="mt-3.5 text-[12px] font-medium text-ink-400">2. How long will it take?</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {QUICK_MINUTES.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => setMinutes(option)}
            className={`h-8 rounded-lg px-3 text-[12.5px] font-semibold transition ${
              minutes === option ? 'bg-accent text-white' : 'bg-ink-800 text-ink-300 hover:bg-ink-700'
            }`}
          >
            {formatDuration(option * MINUTE)}
          </button>
        ))}
        <span className="mx-1 text-[12px] text-ink-500">or</span>
        <MinutesStepper value={minutes} onChange={setMinutes} />

        <button
          type="submit"
          disabled={!title.trim()}
          className="ml-auto flex h-10 items-center gap-1.5 rounded-xl bg-accent px-5 text-[13.5px] font-semibold text-white transition hover:bg-accent-soft disabled:opacity-40"
        >
          <Plus size={16} strokeWidth={3} /> Add task
        </button>
      </div>
      <p className="mt-3 text-[11.5px] text-ink-500">
        Tip: press <b className="text-ink-300">Enter</b> to add quickly. New tasks go to the list below — then press{' '}
        <b className="text-ink-300">Save plan</b> (or <b className="text-ink-300">Save & start</b>).
      </p>
    </form>
  )
}

function EmptyPlan() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink-800 bg-gradient-to-br from-accent/[0.08] to-mint/[0.05] px-5 py-5">
      <span className="grid size-11 place-items-center rounded-xl bg-accent/15 text-accent-soft">
        <Sparkles size={20} />
      </span>
      <div>
        <p className="text-[14.5px] font-semibold">No tasks yet</p>
        <p className="mt-0.5 text-[13px] text-ink-400">
          Use <b className="text-ink-300">Add a new task</b> above. When your list is ready, press{' '}
          <b className="text-ink-300">Save & start</b> and the little timer on the side of your screen will walk you through it.
        </p>
      </div>
    </div>
  )
}
