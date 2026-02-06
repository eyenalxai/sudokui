// oxlint-disable-next-line import/no-unassigned-import: Must load module to register sudokuGrid component with OpenTUI's extend() function
import "./sudoku-grid-renderable"

import type { SudokuGridDisplayProps } from "./sudoku-grid-renderable"
import type { ReactNode } from "react"

import { useTheme } from "../providers/theme"

const GRID_SIZE = 9
const CELL_WIDTH = 5
const CELL_HEIGHT = 3

export const SudokuGridDisplay = ({
  grid,
  selectedCell,
  highlightedNumber,
}: SudokuGridDisplayProps): ReactNode => {
  const theme = useTheme()
  const cellWidth = CELL_WIDTH
  const cellHeight = CELL_HEIGHT
  const gridWidth = GRID_SIZE * (cellWidth + 1) + 1
  const gridHeight = GRID_SIZE * (cellHeight + 1) + 1

  return (
    <sudokuGrid
      grid={grid}
      selectedCell={selectedCell}
      highlightedNumber={highlightedNumber ?? null}
      cellWidth={cellWidth}
      cellHeight={cellHeight}
      width={gridWidth}
      height={gridHeight}
      flexShrink={0}
      gridColor={theme.border}
      boxBorderColor={theme.text}
      highlightColor={theme.secondary}
      backgroundColor={theme.background}
      fixedColor={theme.text}
      valueColor={theme.secondary}
      selectedBackgroundColor={theme.primary}
      selectedTextColor={theme.background}
      candidateColor={theme.textMuted}
    />
  )
}
