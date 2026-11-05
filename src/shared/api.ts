import type { AppState, Settings, Task, TimerAction } from './types'

/** What the preload script exposes to both windows as `window.api`. */
export interface DesktopApi {
  getState(): Promise<AppState>
  onState(listener: (state: AppState) => void): () => void
  /** Fired in the widget when a task's time is up. */
  onTimeUp(listener: () => void): () => void
  timer(action: TimerAction): Promise<void>
  /** Marks a task of today's plan as done. */
  completeTask(taskId: string): Promise<void>
  /** Saves the task list for a day: today's plan or one planned ahead. */
  saveTasks(tasks: Task[], date: string): Promise<void>
  saveSettings(patch: Partial<Settings>): Promise<void>
  openPlanner(): void
  setWidgetCollapsed(collapsed: boolean): void
  hideWidget(): void
  showWidget(): void
  /** Moves the widget while it is dragged by hand; `done` on mouse up. */
  moveWidget(x: number, y: number, done: boolean): void
}

export const IPC = {
  getState: 'state:get',
  state: 'state:changed',
  timeUp: 'timer:time-up',
  timer: 'timer:action',
  completeTask: 'task:complete',
  saveTasks: 'plan:save-tasks',
  saveSettings: 'settings:save',
  openPlanner: 'window:open-planner',
  widgetCollapsed: 'widget:collapsed',
  hideWidget: 'widget:hide',
  showWidget: 'widget:show',
  moveWidget: 'widget:move'
} as const
