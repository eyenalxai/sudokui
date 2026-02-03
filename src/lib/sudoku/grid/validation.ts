import { TOTAL_CELLS } from "./constants.ts"
import { getPeers } from "./helpers.ts"
import { SudokuGrid } from "./sudoku-grid.ts"

export const isComplete = (grid: SudokuGrid): boolean => {
  return grid.cells.every((cell) => cell.value !== 0)
}

export const countEmpty = (grid: SudokuGrid): number => {
  return grid.cells.filter((cell) => cell.value === 0).length
}

export const countGivens = (grid: SudokuGrid): number => {
  return grid.cells.filter((cell) => cell.fixed).length
}

export const isValid = (grid: SudokuGrid): boolean => {
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const cell = grid.cells[i]
    if (cell === undefined) return false
    if (cell.value !== 0) {
      const peers = getPeers(i)
      for (const peer of peers) {
        const peerCell = grid.cells[peer]
        if (peerCell !== undefined && peerCell.value === cell.value) {
          return false
        }
      }
    }
    if (cell.value === 0 && cell.candidates === 0) {
      return false
    }
  }
  return true
}
