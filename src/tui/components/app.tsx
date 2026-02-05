import type { DifficultyLevel, Puzzle } from "../../lib/sudoku/puzzle-sets"
import type { ReactNode } from "react"
import { useState } from "react"

import { SudokuGrid } from "../../lib/sudoku/grid/sudoku-grid"

import { DifficultyMenu } from "./difficulty-menu"
import { GameScreen } from "./game-screen"

type AppState =
  | { readonly view: "menu" }
  | {
      readonly view: "game"
      readonly puzzle: Puzzle
      readonly difficulty: DifficultyLevel
      readonly grid: SudokuGrid
    }

export const App = (): ReactNode => {
  const [state, setState] = useState<AppState>({ view: "menu" })

  const handleSelectDifficulty = (
    difficulty: DifficultyLevel,
    puzzle: Puzzle,
    grid: SudokuGrid,
  ) => {
    setState({ view: "game", puzzle, difficulty, grid })
  }

  const handleReturnToMenu = () => {
    setState({ view: "menu" })
  }

  if (state.view === "menu") {
    return <DifficultyMenu onSelectDifficulty={handleSelectDifficulty} />
  }

  return (
    <GameScreen
      puzzle={state.puzzle}
      difficulty={state.difficulty}
      grid={state.grid}
      onReturnToMenu={handleReturnToMenu}
    />
  )
}
