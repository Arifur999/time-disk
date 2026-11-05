import { app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, powerMonitor, Tray } from 'electron'
import { IPC } from '../shared/api'
import { dateKey, formatHhmm, officePhase, plural, type OfficePhase } from '../shared/office'
import { applyAction, completeTask, currentTask, nextTask, pauseAt, tick, upcomingTasks } from '../shared/timer'
import { IDLE_TIMER, type AppState, type Settings, type Task, type TimerAction } from '../shared/types'
import { loadData, rollOverDay, saveData, type StoredData } from './store'
import { createPlannerWindow, createWidgetWindow, defaultWidgetPosition, WIDGET_SIZE } from './windows'
import icon from '../../resources/icon.png?asset'

const APP_ID = 'com.arif.officefocustimer'
const startedHidden = process.argv.includes('--hidden')

// Keep dev runs from touching the installed app's data.
if (!app.isPackaged) app.setPath('userData', `${app.getPath('appData')}\\Office Focus Timer (dev)`)

// The time-up chime must play even when nobody clicked the widget first.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let data: StoredData
let planner: BrowserWindow | null = null
let widget: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false
let lastPhase: OfficePhase

function appState(): AppState {
  return {
    settings: data.settings,
    plan: data.plan,
    timer: data.timer,
    pastDays: data.archive.slice(0, 14),
    futurePlans: data.futurePlans
  }
}

const HEARTBEAT_MS = 30_000

function notify(title: string, body: string): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title, body, icon })
  notification.on('click', showWidget)
  notification.show()
}

function broadcast(): void {
  const state = appState()
  for (const window of [planner, widget]) {
    if (window && !window.isDestroyed()) window.webContents.send(IPC.state, state)
  }
  refreshTray()
}

function commit(changes: Partial<StoredData>): void {
  data = { ...data, ...changes }
  saveData(data)
  broadcast()
}

function runTimerAction(action: TimerAction): void {
  const { plan, timer } = applyAction(data, action, Date.now())
  commit({ plan, timer })
}

// ---------- windows ----------

function showPlanner(): void {
  if (!planner || planner.isDestroyed()) {
    planner = createPlannerWindow()
    planner.on('close', (event) => {
      if (quitting) return
      event.preventDefault()
      planner?.hide()
    })
  }
  if (planner.webContents.isLoading()) planner.once('ready-to-show', () => planner?.show())
  else planner.show()
  planner.focus()
}

function showWidget(): void {
  if (!widget || widget.isDestroyed()) {
    const { width } = WIDGET_SIZE.expanded
    widget = createWidgetWindow(data.widgetPosition ?? defaultWidgetPosition(data.settings.widgetSide, width))
    widget.on('moved', () => {
      if (!widget) return
      const [x, y] = widget.getPosition()
      commit({ widgetPosition: { x, y } })
    })
    widget.once('ready-to-show', () => widget?.showInactive())
    return
  }
  widget.showInactive()
  widget.moveTop()
}

let hideTipShown = false

function hideWidget(): void {
  widget?.hide()
  if (hideTipShown) return
  hideTipShown = true
  notify('Timer hidden', 'Click the Office Focus Timer icon in the taskbar tray (near the clock) to show it again.')
}

function setWidgetCollapsed(collapsed: boolean): void {
  if (!widget) return
  const size = collapsed ? WIDGET_SIZE.collapsed : WIDGET_SIZE.expanded
  const bounds = widget.getBounds()
  // Keep the widget glued to the right edge when it changes size there.
  const anchoredRight = data.settings.widgetSide === 'right'
  const x = anchoredRight ? bounds.x + bounds.width - size.width : bounds.x
  widget.setBounds({ x, y: bounds.y, ...size })
}

function alertTimeUp(): void {
  showWidget()
  widget?.webContents.send(IPC.timeUp)

  const finished = currentTask(data.plan, data.timer)
  const following = nextTask(data.plan, data.timer)
  if (!finished || !Notification.isSupported()) return
  const notification = new Notification({
    title: `Time's up: ${finished.title}`,
    body: following ? `Next: ${following.title} (${following.minutes} min)` : 'That was the last task for today.',
    icon,
    silent: true
  })
  notification.on('click', showWidget)
  notification.show()
}

// ---------- tray ----------

function refreshTray(): void {
  if (!tray) return
  const task = currentTask(data.plan, data.timer)
  const status = data.timer.status
  tray.setToolTip(task ? `Office Focus Timer: ${task.title}` : 'Office Focus Timer')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show timer', click: showWidget },
      { label: 'Open planner', click: showPlanner },
      { type: 'separator' },
      { label: 'Pause', visible: status === 'running', click: () => runTimerAction('pause') },
      { label: 'Resume', visible: status === 'paused', click: () => runTimerAction('resume') },
      { label: 'Complete current task', visible: !!task, click: () => runTimerAction('next') },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )
}

function createTray(): void {
  tray = new Tray(nativeImage.createFromPath(icon).resize({ width: 16, height: 16, quality: 'best' }))
  tray.on('click', showWidget)
  tray.on('double-click', showPlanner)
  refreshTray()
}

// ---------- background loop ----------

function remindAtOfficeStart(now: Date): void {
  const phase = officePhase(data.settings, now)
  const officeJustOpened = lastPhase === 'before' && phase === 'during'
  lastPhase = phase
  if (!officeJustOpened || data.timer.status !== 'idle') return
  const upcoming = upcomingTasks(data.plan, data.timer)
  if (upcoming.length === 0) return

  if (data.settings.autoStartAtOffice) {
    runTimerAction('start')
    notify('Good morning! Office time.', `Starting: ${upcoming[0].title}`)
  } else {
    notify('Office time!', `${plural(upcoming.length, 'task')} planned. First: ${upcoming[0].title}`)
  }
  showWidget()
}

/** New day: bring in tasks planned ahead and remind about them. */
function startNewDayIfNeeded(now: Date): void {
  const rolled = rollOverDay(data, now)
  if (rolled === data) return
  const today = dateKey(now)
  const plannedAhead = Object.entries(data.futurePlans)
    .filter(([date]) => date <= today)
    .flatMap(([, tasks]) => tasks)
  commit(rolled)

  if (plannedAhead.length > 0) {
    const when = officePhase(data.settings, now) === 'before' ? ` Office starts ${formatHhmm(data.settings.officeStart)}.` : ''
    notify("Today's plan is ready", `${plural(plannedAhead.length, 'task')} planned. First: ${plannedAhead[0].title}.${when}`)
    showWidget()
  }
}

/**
 * If the app was not running for a while (PC off, crash, quit mid-task),
 * pause the task as of the last heartbeat instead of counting the gap.
 */
function recoverFromDowntime(now: number): void {
  if (now - data.lastSeenAt > HEARTBEAT_MS * 3) {
    data = { ...data, timer: pauseAt(data.timer, data.lastSeenAt) }
  }
  data = { ...data, lastSeenAt: now }
  saveData(data)
}

function pauseForSleep(): void {
  const timer = pauseAt(data.timer, Date.now())
  if (timer !== data.timer) commit({ timer })
}

function heartbeat(): void {
  data = { ...data, lastSeenAt: Date.now() }
  saveData(data)
}

function everySecond(): void {
  const now = new Date()
  startNewDayIfNeeded(now)
  remindAtOfficeStart(now)

  const { timer, timeUp } = tick(data, now.getTime())
  if (timeUp) {
    commit({ timer })
    alertTimeUp()
  }
}

// ---------- settings & IPC ----------

function applyLoginItem(settings: Settings): void {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup, args: ['--hidden'] })
}

function saveTasks(tasks: Task[], date: string): void {
  if (date !== data.plan.date) {
    const futurePlans = { ...data.futurePlans, [date]: tasks }
    if (tasks.length === 0) delete futurePlans[date]
    commit({ futurePlans })
    return
  }
  // If the running task was deleted from the plan, stop the timer.
  const timerTaskGone = data.timer.currentTaskId && !tasks.some((task) => task.id === data.timer.currentTaskId)
  commit({ plan: { ...data.plan, tasks }, timer: timerTaskGone ? IDLE_TIMER : data.timer })
}

function saveSettings(patch: Partial<Settings>): void {
  const settings = { ...data.settings, ...patch }
  const sideChanged = patch.widgetSide && patch.widgetSide !== data.settings.widgetSide
  commit({ settings, widgetPosition: sideChanged ? null : data.widgetPosition })
  applyLoginItem(settings)
  lastPhase = officePhase(settings, new Date())

  if (sideChanged && widget) {
    const { x, y } = defaultWidgetPosition(settings.widgetSide, widget.getBounds().width)
    widget.setPosition(x, y)
  }
}

function registerIpc(): void {
  ipcMain.handle(IPC.getState, () => appState())
  ipcMain.handle(IPC.timer, (_event, action: TimerAction) => runTimerAction(action))
  ipcMain.handle(IPC.saveTasks, (_event, tasks: Task[], date: string) => saveTasks(tasks, date))
  ipcMain.handle(IPC.saveSettings, (_event, patch: Partial<Settings>) => saveSettings(patch))
  ipcMain.on(IPC.openPlanner, showPlanner)
  ipcMain.on(IPC.widgetCollapsed, (_event, collapsed: boolean) => setWidgetCollapsed(collapsed))
  ipcMain.handle(IPC.completeTask, (_event, taskId: string) => {
    const { plan, timer } = completeTask(data, taskId, Date.now())
    commit({ plan, timer })
  })
  ipcMain.on(IPC.hideWidget, hideWidget)
  ipcMain.on(IPC.showWidget, showWidget)
  ipcMain.on(IPC.moveWidget, (_event, x: number, y: number, done: boolean) => {
    widget?.setPosition(Math.round(x), Math.round(y))
    if (done) commit({ widgetPosition: { x: Math.round(x), y: Math.round(y) } })
  })
}

// ---------- lifecycle ----------

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showPlanner()
    showWidget()
  })

  app.whenReady().then(() => {
    app.setAppUserModelId(app.isPackaged ? APP_ID : process.execPath)
    data = loadData()
    recoverFromDowntime(Date.now())
    lastPhase = officePhase(data.settings, new Date())

    registerIpc()
    createTray()
    showWidget()
    if (!startedHidden) showPlanner()
    applyLoginItem(data.settings)
    startNewDayIfNeeded(new Date())
    setInterval(everySecond, 1000)
    setInterval(heartbeat, HEARTBEAT_MS)

    powerMonitor.on('suspend', pauseForSleep)
    powerMonitor.on('shutdown', pauseForSleep)
  })

  app.on('before-quit', () => {
    quitting = true
  })

  // The app lives in the tray; closing windows must not quit it.
  app.on('window-all-closed', () => {})
}
