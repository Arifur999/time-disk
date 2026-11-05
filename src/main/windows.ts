import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import icon from '../../resources/icon.png?asset'

export const WIDGET_SIZE = {
  expanded: { width: 348, height: 176 },
  collapsed: { width: 212, height: 56 }
}

const EDGE_GAP = 12

function loadPage(window: BrowserWindow, page: 'planner' | 'widget'): void {
  const devServer = process.env.ELECTRON_RENDERER_URL
  if (devServer) window.loadURL(`${devServer}/${page}.html`)
  else window.loadFile(join(__dirname, `../renderer/${page}.html`))
}

const preload = join(__dirname, '../preload/index.js')

export function createPlannerWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 820,
    minHeight: 560,
    show: false,
    title: 'Office Focus Timer',
    icon,
    backgroundColor: '#0d0f15',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0d0f15', symbolColor: '#9aa3b8', height: 44 },
    webPreferences: { preload, sandbox: false }
  })
  window.removeMenu()
  loadPage(window, 'planner')
  return window
}

/** Default spot: on the chosen screen edge, a little below the top. */
export function defaultWidgetPosition(side: 'left' | 'right', width: number): { x: number; y: number } {
  const area = screen.getPrimaryDisplay().workArea
  const x = side === 'right' ? area.x + area.width - width - EDGE_GAP : area.x + EDGE_GAP
  return { x, y: area.y + 96 }
}

/** Keeps a saved position on screen, e.g. after a monitor was unplugged. */
export function clampToScreen(position: { x: number; y: number }, width: number, height: number) {
  const area = screen.getDisplayNearestPoint(position).workArea
  return {
    x: Math.min(Math.max(position.x, area.x), area.x + area.width - width),
    y: Math.min(Math.max(position.y, area.y), area.y + area.height - height)
  }
}

export function createWidgetWindow(position: { x: number; y: number }): BrowserWindow {
  const { width, height } = WIDGET_SIZE.expanded
  const window = new BrowserWindow({
    ...clampToScreen(position, width, height),
    width,
    height,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    title: 'Focus timer',
    icon,
    webPreferences: { preload, sandbox: false, backgroundThrottling: false }
  })
  window.setAlwaysOnTop(true, 'screen-saver')
  loadPage(window, 'widget')
  return window
}
