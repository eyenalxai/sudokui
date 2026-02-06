import type { SudokuGrid } from "../../lib/sudoku/grid/sudoku-grid"
import type { DifficultyLevel, Puzzle } from "../../lib/sudoku/puzzle-sets"
import { useKeyboard } from "@opentui/react"
import { Effect } from "effect"
import type { ReactNode } from "react"
import { useCallback, useState } from "react"

import { isComplete, isValid } from "../../lib/sudoku/grid/validation"
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
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null)
  const [, forceUpdate] = useState({})
  const [hasWon, setHasWon] = useState(false)

  const checkForWin = useCallback(() => {
    if (!hasWon && isComplete(grid) && isValid(grid)) {
      setHasWon(true)
      toast.show({
        title: "Puzzle solved",
        message: "Great job! You completed the puzzle.",
        variant: "success",
      })
    }
  }, [grid, hasWon, toast])

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
          }).pipe(
            Effect.ensuring(
              Effect.sync(() => {
                forceUpdate({})
                checkForWin()
              }),
            ),
          ),
        )
        return
      }

      // Set the cell value
      // Silently ignore CellConflictError - conflicting values are allowed
      // and shown visually with error highlighting instead of blocking
      // Use Effect.ensuring to always trigger re-render even on error
      void Effect.runPromise(
        Effect.gen(function* () {
          yield* grid.setCell(selectedCell, value)
        }).pipe(
          Effect.catchTag("CellConflictError", () => Effect.void),
          Effect.ensuring(
            Effect.sync(() => {
              forceUpdate({})
              checkForWin()
            }),
          ),
        ),
      )
    },
    [grid, selectedCell, checkForWin],
  )

  useKeyboard((key) => {
    // Navigation
    if (key.name === "up" || key.name === "w") {
      moveCursor("up")
    } else if (key.name === "down" || key.name === "s") {
      moveCursor("down")
    } else if (key.name === "left" || key.name === "a") {
      moveCursor("left")
    } else if (key.name === "right" || key.name === "d") {
      moveCursor("right")
    }
    // Alt+number to highlight candidates (check before regular number input)
    else if (key.meta) {
      const numpadMap: Record<string, number> = {
        kp1: 1,
        kp2: 2,
        kp3: 3,
        kp4: 4,
        kp5: 5,
        kp6: 6,
        kp7: 7,
        kp8: 8,
        kp9: 9,
      }
      const num =
        numpadMap[key.name] ?? (key.name >= "1" && key.name <= "9" ? parseInt(key.name, 10) : null)
      if (num !== null) {
        setHighlightedNumber((prev) => (prev === num ? null : num))
      }
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
      <SudokuGridDisplay
        grid={grid}
        selectedCell={selectedCell}
        highlightedNumber={highlightedNumber}
      />
      <box height={1} />
      <text fg={theme.textMuted}>
        ↑/↓/←/→ or wasd to move • 1-9 to fill • 0/Del/Back to clear • Alt+1-9 to highlight • Esc/q
        to menu
      </text>
    </box>
  )
}
