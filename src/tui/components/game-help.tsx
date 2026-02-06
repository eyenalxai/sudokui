import type { ReactNode } from "react"

import { useTheme } from "../providers/theme"

export const GameHelp = (): ReactNode => {
  const theme = useTheme()

  return (
    <>
      <text fg={theme.textMuted}>↑/↓/←/→ or wasd to move • 1-9 to fill • 0/Del/Back to clear</text>
      <text fg={theme.textMuted}>Alt+1-9 to highlight • Ctrl+1-9 to toggle candidate</text>
      <text fg={theme.textMuted}>Ctrl+Z undo • Ctrl+Shift+Z redo • Esc/q to menu</text>
    </>
  )
}
