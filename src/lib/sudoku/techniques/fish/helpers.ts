import { CANDIDATE_MASKS, GRID_SIZE } from "../../grid/constants.ts"
import { SudokuGrid } from "../../grid/sudoku-grid.ts"

export {
  makeCellElimination,
  makeCellIndex,
  makeCellValue,
  type RawElimination,
} from "../helpers.ts"

export const getMask = (value: number): number => CANDIDATE_MASKS[value] ?? 0

export interface StrongLink {
  cell1: number
  cell2: number
  unit: "row" | "col" | "box"
}

export const findStrongLinks = (grid: SudokuGrid, digit: number): StrongLink[] => {
  const mask = getMask(digit)
  if (mask === 0) return []

  const links: StrongLink[] = []
  const seen = new Set<string>()

  const addLink = (cell1: number, cell2: number, unit: StrongLink["unit"]) => {
    const key = `${Math.min(cell1, cell2)}-${Math.max(cell1, cell2)}`
    if (!seen.has(key)) {
      seen.add(key)
      links.push({ cell1, cell2, unit })
    }
  }

  const rowsWith2 = findRowsWithNCandidates(grid, digit, 2)
  for (const rowPair of rowsWith2) {
    if (rowPair === undefined) continue
    const [_row, cell1, cell2] = rowPair
    addLink(cell1, cell2, "row")
  }

  const colsWith2 = findColsWithNCandidates(grid, digit, 2)
  for (const colPair of colsWith2) {
    if (colPair === undefined) continue
    const [_col, cell1, cell2] = colPair
    addLink(cell1, cell2, "col")
  }

  for (let box = 0; box < GRID_SIZE; box++) {
    const boxRow = Math.floor(box / 3) * 3
    const boxCol = (box % 3) * 3
    const cells: number[] = []
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const idx = (boxRow + r) * GRID_SIZE + (boxCol + c)
        if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
          cells.push(idx)
        }
      }
    }
    if (cells.length === 2 && cells[0] !== undefined && cells[1] !== undefined) {
      addLink(cells[0], cells[1], "box")
    }
  }

  return links
}

export const findRowsWithNCandidates = (
  grid: SudokuGrid,
  digit: number,
  n: number,
): Array<[number, number, number]> => {
  const mask = getMask(digit)
  if (mask === 0) return []

  const result: Array<[number, number, number]> = []

  for (let row = 0; row < GRID_SIZE; row++) {
    const cells: number[] = []
    for (let col = 0; col < GRID_SIZE; col++) {
      const idx = row * GRID_SIZE + col
      if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
        cells.push(idx)
      }
    }
    if (cells.length === n && n >= 2 && cells[0] !== undefined && cells[1] !== undefined) {
      result.push([row, cells[0], cells[1]])
    }
  }

  return result
}

export const findColsWithNCandidates = (
  grid: SudokuGrid,
  digit: number,
  n: number,
): Array<[number, number, number]> => {
  const mask = getMask(digit)
  if (mask === 0) return []

  const result: Array<[number, number, number]> = []

  for (let col = 0; col < GRID_SIZE; col++) {
    const cells: number[] = []
    for (let row = 0; row < GRID_SIZE; row++) {
      const idx = row * GRID_SIZE + col
      if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
        cells.push(idx)
      }
    }
    if (cells.length === n && n >= 2 && cells[0] !== undefined && cells[1] !== undefined) {
      result.push([col, cells[0], cells[1]])
    }
  }

  return result
}

export const sameCol = (idx1: number, idx2: number): boolean => {
  return idx1 % GRID_SIZE === idx2 % GRID_SIZE
}

export const sameRow = (idx1: number, idx2: number): boolean => {
  return Math.floor(idx1 / GRID_SIZE) === Math.floor(idx2 / GRID_SIZE)
}
