import type { SudokuGrid } from "../../lib/sudoku/grid/sudoku-grid"
import type { ReactNode } from "react"

import { useTheme } from "../providers/theme"

type SudokuGridDisplayProps = {
  readonly grid: SudokuGrid
  readonly selectedCell: number
}

const BOX_SIZE = 3

export const SudokuGridDisplay = ({ grid, selectedCell }: SudokuGridDisplayProps): ReactNode => {
  const theme = useTheme()

  // 3 rows of 3x3 boxes
  const boxRows: ReactNode[] = []

  for (let boxRow = 0; boxRow < BOX_SIZE; boxRow++) {
    const boxes: ReactNode[] = []

    for (let boxCol = 0; boxCol < BOX_SIZE; boxCol++) {
      // Build 3x3 cells inside this box
      const cellRows: ReactNode[] = []

      for (let cellRow = 0; cellRow < BOX_SIZE; cellRow++) {
        const cells: ReactNode[] = []
        const row = boxRow * BOX_SIZE + cellRow

        for (let cellCol = 0; cellCol < BOX_SIZE; cellCol++) {
          const col = boxCol * BOX_SIZE + cellCol
          const cellIndex = row * 9 + col
          const cell = grid.cells[cellIndex]
          const isSelected = cellIndex === selectedCell
          const isFixed = cell?.fixed ?? false
          const value = cell?.value ?? 0

          cells.push(
            <box
              key={cellIndex}
              width={9}
              height={3}
              alignItems="center"
              justifyContent="center"
              border={true}
              borderStyle="single"
              borderColor={theme.border}
              backgroundColor={isSelected ? theme.primary : theme.background}
            >
              <text
                fg={isSelected ? theme.background : isFixed ? theme.text : theme.secondary}
                attributes={isFixed ? 1 : 0}
              >
                {value === 0 ? " " : value.toString()}
              </text>
            </box>,
          )
        }

        cellRows.push(
          <box key={cellRow} flexDirection="row">
            {cells}
          </box>,
        )
      }

      // Box container with its own border
      boxes.push(
        <box
          key={`box-${boxRow}-${boxCol}`}
          flexDirection="column"
          border={true}
          borderStyle="single"
          borderColor={theme.border}
          padding={0}
        >
          {cellRows}
        </box>,
      )
    }

    // Row of boxes
    boxRows.push(
      <box key={boxRow} flexDirection="row">
        {boxes}
      </box>,
    )
  }

  // Outer container with border
  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="single"
      borderColor={theme.border}
      padding={0}
    >
      {boxRows}
    </box>
  )
}
