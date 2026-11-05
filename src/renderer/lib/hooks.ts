import { useEffect, useState } from 'react'
import type { AppState } from '../../shared/types'

/** Live app state pushed from the main process. */
export function useAppState(): AppState | null {
  const [state, setState] = useState<AppState | null>(null)
  useEffect(() => {
    window.api.getState().then(setState)
    return window.api.onState(setState)
  }, [])
  return state
}

/** Re-renders on an interval so countdowns move. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
