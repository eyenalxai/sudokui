import type { DifficultyLevel, Puzzle } from "../../lib/sudoku/puzzle-sets"
import type { SelectRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { Effect } from "effect"
import type { ReactNode } from "react"
import { useMemo, useRef } from "react"

import { SudokuGrid } from "../../lib/sudoku/grid/sudoku-grid"
import {
  getAllDifficulties,
  getPuzzlesByDifficulty,
  getRandomPuzzle,
  isDifficultyLevel,
} from "../../lib/sudoku/puzzle-sets"
import { useExit } from "../providers/exit"
import { useTheme } from "../providers/theme"
import { useToast } from "../providers/toast"

const difficulties = getAllDifficulties()

type DifficultyMenuProps = {
  readonly onSelectDifficulty: (
    difficulty: DifficultyLevel,
    puzzle: Puzzle,
    grid: SudokuGrid,
  ) => void
}

export const DifficultyMenu = ({ onSelectDifficulty }: DifficultyMenuProps): ReactNode => {
  const exit = useExit()
  const theme = useTheme()
  const toast = useToast()
  const selectRef = useRef<SelectRenderable>(null)

  const options = useMemo(() => {
    return difficulties.map((difficulty) => {
      const set = getPuzzlesByDifficulty(difficulty)
      const count = set?.puzzles.length ?? 0
      return {
        name: difficulty,
        description: `${count} puzzle${count === 1 ? "" : "s"}`,
        value: difficulty,
      }
    })
  }, [difficulties])

  useKeyboard((key) => {
    if ((key.name === "q" || key.name === "escape") && !key.ctrl) {
      exit()
    }
  })

  const handleSelect = (difficulty: DifficultyLevel) => {
    const puzzle = getRandomPuzzle(difficulty)
    if (!puzzle) {
      toast.error(new Error(`No puzzles available for ${difficulty}`), "Error")
      return
    }

    void Effect.runPromise(
      Effect.gen(function* () {
        const grid = yield* SudokuGrid.fromString(puzzle.grid)
        onSelectDifficulty(difficulty, puzzle, grid)
      }).pipe(
        Effect.catchTags({
          InvalidPuzzleError: (error) =>
            Effect.sync(() => {
              toast.error(error, "Failed to load puzzle")
            }),
          InvalidCellIndexError: (error) =>
            Effect.sync(() => {
              toast.error(error, "Failed to load puzzle")
            }),
          InvalidCellValueError: (error) =>
            Effect.sync(() => {
              toast.error(error, "Failed to load puzzle")
            }),
          CellConflictError: (error) =>
            Effect.sync(() => {
              toast.error(error, "Failed to load puzzle")
            }),
          NoCandidatesRemainingError: (error) =>
            Effect.sync(() => {
              toast.error(error, "Failed to load puzzle")
            }),
        }),
      ),
    )
  }

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
      gap={1}
      padding={2}
    >
      <text fg={theme.primary} attributes={1}>
        Sudokui
      </text>
      <text fg={theme.textMuted}>Select a difficulty to start</text>
      <box height={1} />
      <select
        ref={selectRef}
        focused={true}
        options={options}
        width={40}
        height={Math.min(options.length + 2, 12)}
        backgroundColor={theme.background}
        focusedBackgroundColor={theme.background}
        textColor={theme.text}
        focusedTextColor={theme.text}
        selectedBackgroundColor={theme.borderSubtle}
        selectedTextColor={theme.text}
        descriptionColor={theme.textMuted}
        selectedDescriptionColor={theme.text}
        showDescription
        showScrollIndicator
        wrapSelection
        onSelect={(_, option) => {
          if (option && typeof option.value === "string" && isDifficultyLevel(option.value)) {
            handleSelect(option.value)
          }
        }}
      />
      <box height={1} />
      <text fg={theme.textMuted}>↑/↓ to navigate, Enter to select, q to quit</text>
    </box>
  )
}
