import type { ReactNode } from "react"

import { useTheme } from "../providers/theme"

export const App = (): ReactNode => {
  const theme = useTheme()

  return (
    <box alignItems="center" justifyContent="center" flexGrow={1} flexDirection="column" gap={1}>
      <text fg={theme.primary} attributes={1}>
        Sudokui
      </text>
      <text fg={theme.textMuted}>Press any key to start...</text>
    </box>
  )
}
