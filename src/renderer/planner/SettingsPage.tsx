import type { ReactNode } from 'react'
import { Volume2 } from 'lucide-react'
import type { Settings } from '../../shared/types'
import { playChime } from '../lib/chime'

const WEEK = [
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' }
]

export function SettingsPage({ settings }: { settings: Settings }) {
  const save = (patch: Partial<Settings>) => window.api.saveSettings(patch)

  function toggleDay(day: number) {
    const workDays = settings.workDays.includes(day)
      ? settings.workDays.filter((other) => other !== day)
      : [...settings.workDays, day]
    save({ workDays })
  }

  return (
    <div className="mx-auto max-w-[680px] px-8 pt-7 pb-10">
      <h1 className="font-display text-[28px] font-semibold tracking-tight">Settings</h1>
      <p className="mt-0.5 text-[13.5px] text-ink-400">Changes are saved right away.</p>

      <Section title="Office hours">
        <Row label="Office starts" hint="The widget counts down to this before work begins.">
          <TimeInput value={settings.officeStart} onChange={(officeStart) => save({ officeStart })} />
        </Row>
        <Row label="Office ends" hint="Used to warn you when the plan runs past the day.">
          <TimeInput value={settings.officeEnd} onChange={(officeEnd) => save({ officeEnd })} />
        </Row>
        <Row label="Working days">
          <div className="flex gap-1">
            {WEEK.map(({ day, label }) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`h-8 w-11 rounded-lg text-[12.5px] font-semibold transition ${
                  settings.workDays.includes(day) ? 'bg-accent text-white' : 'bg-ink-800 text-ink-400 hover:text-ink-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Timer">
        <Row label="Default task length" hint="Pre-filled when you add a task.">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={600}
              value={settings.defaultMinutes}
              onChange={(event) => save({ defaultMinutes: Math.max(1, Number(event.target.value) || 1) })}
              className="tabular h-9 w-20 rounded-lg border border-ink-700 bg-ink-850 px-3 text-[13.5px] outline-none focus:border-accent"
            />
            <span className="text-[13px] text-ink-400">min</span>
          </div>
        </Row>
        <Row label="Start automatically at office time" hint="Begins your first task when office hours start.">
          <Toggle on={settings.autoStartAtOffice} onChange={(autoStartAtOffice) => save({ autoStartAtOffice })} />
        </Row>
        <Row label="Chime when time is up">
          <div className="flex items-center gap-3">
            <button onClick={playChime} className="flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-100">
              <Volume2 size={14} /> Test
            </button>
            <Toggle on={settings.sound} onChange={(sound) => save({ sound })} />
          </div>
        </Row>
        <Row label="Timer position" hint="Which side of the screen the mini timer sits on.">
          <div className="flex rounded-lg bg-ink-800 p-0.5">
            {(['left', 'right'] as const).map((side) => (
              <button
                key={side}
                onClick={() => save({ widgetSide: side })}
                className={`h-8 rounded-md px-4 text-[12.5px] font-semibold capitalize transition ${
                  settings.widgetSide === side ? 'bg-ink-600 text-ink-100' : 'text-ink-400'
                }`}
              >
                {side}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Windows">
        <Row label="Launch when Windows starts" hint="Opens quietly with just the mini timer (installed app only).">
          <Toggle on={settings.launchAtStartup} onChange={(launchAtStartup) => save({ launchAtStartup })} />
        </Row>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2.5 text-[12px] font-semibold tracking-[0.12em] text-ink-400 uppercase">{title}</h2>
      <div className="divide-y divide-ink-800 rounded-2xl border border-ink-800 bg-ink-850">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[60px] items-center justify-between gap-6 px-4 py-3">
      <div>
        <p className="text-[14px] font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] text-ink-400">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function TimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(event) => event.target.value && onChange(event.target.value)}
      className="tabular h-9 rounded-lg border border-ink-700 bg-ink-850 px-3 text-[13.5px] outline-none focus:border-accent"
    />
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-accent' : 'bg-ink-600'}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}
