import { createContext, useContext } from 'react'

/** How any button anywhere opens the AI panel (components/AiPanel.tsx). */
export interface AiPanelApi {
  open: () => void
  close: () => void
  toggle: () => void
  isOpen: boolean
}

export const AiPanelContext = createContext<AiPanelApi>({ open: () => {}, close: () => {}, toggle: () => {}, isOpen: false })

export function useAiPanel(): AiPanelApi {
  return useContext(AiPanelContext)
}

/** "⌘J" on a Mac, "Ctrl J" everywhere else — the key that actually works here. */
export function shortcutLabel(key: string): string {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return mac ? `⌘${key}` : `Ctrl ${key}`
}
