import type { SudokuGrid } from "../../lib/sudoku/grid/sudoku-grid"
import type { DifficultyLevel, Puzzle } from "../../lib/sudoku/puzzle-sets"
import { useKeyboard } from "@opentui/react"
import { Effect } from "effect"
import type { ReactNode } from "react"
import { useCallback, useState } from "react"

import { useTheme } from "../providers/theme"
import { useToast } from "../providers/toast"

import { SudokuGridDisplay } from "./sudoku-grid"

const GRID_SIZE = 9

type GameScreenProps = {
  readonly puzzle: Puzzle
  readonly difficulty: DifficultyLevel
  readonly grid: SudokuGrid
  readonly onReturnToMenu: () => void
}

export const GameScreen = ({ difficulty, grid, onReturnToMenu }: GameScreenProps): ReactNode => {
  const theme = useTheme()
  const toast = useToast()
  const [selectedCell, setSelectedCell] = useState(0)
  const [, forceUpdate] = useState({})

  const moveCursor = useCallback((direction: "up" | "down" | "left" | "right") => {
    setSelectedCell((prev) => {
      const row = Math.floor(prev / GRID_SIZE)
      const col = prev % GRID_SIZE

      switch (direction) {
        case "up":
          return ((row - 1 + GRID_SIZE) % GRID_SIZE) * GRID_SIZE + col
        case "down":
          return ((row + 1) % GRID_SIZE) * GRID_SIZE + col
        case "left":
          return row * GRID_SIZE + ((col - 1 + GRID_SIZE) % GRID_SIZE)
        case "right":
          return row * GRID_SIZE + ((col + 1) % GRID_SIZE)
        default:
          return prev
      }
    })
  }, [])

  const handleInput = useCallback(
    (value: number) => {
      const cell = grid.cells[selectedCell]
      if (!cell || cell.fixed) {
        return
      }

      if (value === 0) {
        // Clear the cell
        void Effect.runPromise(
          Effect.gen(function* () {
            yield* grid.setCell(selectedCell, 0)
            forceUpdate({})
          }).pipe(
            Effect.catchAll((error) =>
              Effect.sync(() => {
                toast.error(error, "Error clearing cell")
              }),
            ),
          ),
        )
        return
      }

      // Set the cell value
      void Effect.runPromise(
        Effect.gen(function* () {
          yield* grid.setCell(selectedCell, value)
          forceUpdate({})
        }).pipe(
          Effect.catchAll((error) =>
            Effect.sync(() => {
              toast.error(error, "Invalid move")
            }),
          ),
        ),
      )
    },
    [grid, selectedCell, toast],
  )

  useKeyboard((key) => {
    // Navigation
    if (key.name === "up" || key.name === "k") {
      moveCursor("up")
    } else if (key.name === "down" || key.name === "j") {
      moveCursor("down")
    } else if (key.name === "left" || key.name === "h") {
      moveCursor("left")
    } else if (key.name === "right" || key.name === "l") {
      moveCursor("right")
    }
    // Number input
    else if (key.name >= "1" && key.name <= "9") {
      handleInput(parseInt(key.name, 10))
    }
    // Clear cell
    else if (key.name === "0" || key.name === "delete" || key.name === "backspace") {
      handleInput(0)
    }
    // Return to menu
    else if (key.name === "escape" || key.name === "q") {
      onReturnToMenu()
    }
  })

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={1}>
      <text fg={theme.primary} attributes={1}>
        Sudokui
      </text>
      <box flexDirection="row" gap={2}>
        <text fg={theme.textMuted}>Difficulty:</text>
        <text fg={theme.text}>{difficulty}</text>
      </box>
      <SudokuGridDisplay grid={grid} selectedCell={selectedCell} />
      <box height={1} />
      <text fg={theme.textMuted}>
        ↑/↓/←/→ or hjkl to move • 1-9 to fill • 0/Del/Back to clear • Esc/q to menu
      </text>
    </box>
  )
}
