import { Effect, Option } from "effect"

import { GRID_SIZE } from "../../grid/constants.ts"
import { SudokuGrid } from "../../grid/sudoku-grid.ts"
import { TechniqueMove } from "../../technique.ts"

import {
  getMask,
  makeCellElimination,
  makeCellIndex,
  makeCellValue,
  type RawElimination,
} from "./helpers.ts"

const findRowsWith2To3Candidates = (grid: SudokuGrid, digit: number): Array<[number, number[]]> => {
  const mask = getMask(digit)
  if (mask === 0) return []

  const result: Array<[number, number[]]> = []

  for (let row = 0; row < GRID_SIZE; row++) {
    const cells: number[] = []
    for (let col = 0; col < GRID_SIZE; col++) {
      const idx = row * GRID_SIZE + col
      if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
        cells.push(idx)
      }
    }
    if (cells.length >= 2 && cells.length <= 3) {
      result.push([row, cells])
    }
  }

  return result
}

const findColsWith2To3Candidates = (grid: SudokuGrid, digit: number): Array<[number, number[]]> => {
  const mask = getMask(digit)
  if (mask === 0) return []

  const result: Array<[number, number[]]> = []

  for (let col = 0; col < GRID_SIZE; col++) {
    const cells: number[] = []
    for (let row = 0; row < GRID_SIZE; row++) {
      const idx = row * GRID_SIZE + col
      if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
        cells.push(idx)
      }
    }
    if (cells.length >= 2 && cells.length <= 3) {
      result.push([col, cells])
    }
  }

  return result
}

const getColumnsFromCells = (cells: number[]): number[] => {
  const cols = new Set<number>()
  for (const cell of cells) {
    cols.add(cell % GRID_SIZE)
  }
  return Array.from(cols).toSorted((a, b) => a - b)
}

const getRowsFromCells = (cells: number[]): number[] => {
  const rows = new Set<number>()
  for (const cell of cells) {
    rows.add(Math.floor(cell / GRID_SIZE))
  }
  return Array.from(rows).toSorted((a, b) => a - b)
}

const findSwordfishInRows = Effect.fn("Swordfish.findInRows")(function* (grid: SudokuGrid) {
  for (let digit = 1; digit <= 9; digit++) {
    const mask = getMask(digit)
    if (mask === 0) continue

    const rowsWithCandidates = findRowsWith2To3Candidates(grid, digit)
    if (rowsWithCandidates.length < 3) continue

    // Try all combinations of 3 rows
    for (let i = 0; i < rowsWithCandidates.length; i++) {
      for (let j = i + 1; j < rowsWithCandidates.length; j++) {
        for (let k = j + 1; k < rowsWithCandidates.length; k++) {
          const row1 = rowsWithCandidates[i]
          const row2 = rowsWithCandidates[j]
          const row3 = rowsWithCandidates[k]

          if (!row1 || !row2 || !row3) continue

          const [_r1, cells1] = row1
          const [_r2, cells2] = row2
          const [_r3, cells3] = row3

          // Union of all columns in these 3 rows
          const allCells = [...cells1, ...cells2, ...cells3]
          const cols = getColumnsFromCells(allCells)

          // Swordfish pattern: exactly 3 columns
          if (cols.length !== 3) continue

          // Found Swordfish - calculate eliminations
          const eliminations: RawElimination[] = []
          const swordfishCells = new Set(allCells)

          for (const col of cols) {
            for (let row = 0; row < GRID_SIZE; row++) {
              const idx = row * GRID_SIZE + col
              if (
                !swordfishCells.has(idx) &&
                grid.getCell(idx) === 0 &&
                (grid.getCandidates(idx) & mask) !== 0
              ) {
                eliminations.push({ index: idx, values: [digit] })
              }
            }
          }

          if (eliminations.length > 0 && allCells.length > 0) {
            const firstCell = allCells[0]
            if (firstCell === undefined) continue
            return Option.some<TechniqueMove>({
              technique: "SWORDFISH",
              cellIndex: yield* makeCellIndex(firstCell),
              value: yield* makeCellValue(digit),
              eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
            })
          }
        }
      }
    }
  }

  return Option.none()
})

const findSwordfishInCols = Effect.fn("Swordfish.findInCols")(function* (grid: SudokuGrid) {
  for (let digit = 1; digit <= 9; digit++) {
    const mask = getMask(digit)
    if (mask === 0) continue

    const colsWithCandidates = findColsWith2To3Candidates(grid, digit)
    if (colsWithCandidates.length < 3) continue

    // Try all combinations of 3 columns
    for (let i = 0; i < colsWithCandidates.length; i++) {
      for (let j = i + 1; j < colsWithCandidates.length; j++) {
        for (let k = j + 1; k < colsWithCandidates.length; k++) {
          const col1 = colsWithCandidates[i]
          const col2 = colsWithCandidates[j]
          const col3 = colsWithCandidates[k]

          if (!col1 || !col2 || !col3) continue

          const [_c1, cells1] = col1
          const [_c2, cells2] = col2
          const [_c3, cells3] = col3

          // Union of all rows in these 3 columns
          const allCells = [...cells1, ...cells2, ...cells3]
          const rows = getRowsFromCells(allCells)

          // Swordfish pattern: exactly 3 rows
          if (rows.length !== 3) continue

          // Found Swordfish - calculate eliminations
          const eliminations: RawElimination[] = []
          const swordfishCells = new Set(allCells)

          for (const row of rows) {
            for (let col = 0; col < GRID_SIZE; col++) {
              const idx = row * GRID_SIZE + col
              if (
                !swordfishCells.has(idx) &&
                grid.getCell(idx) === 0 &&
                (grid.getCandidates(idx) & mask) !== 0
              ) {
                eliminations.push({ index: idx, values: [digit] })
              }
            }
          }

          if (eliminations.length > 0 && allCells.length > 0) {
            const firstCell = allCells[0]
            if (firstCell === undefined) continue
            return Option.some<TechniqueMove>({
              technique: "SWORDFISH",
              cellIndex: yield* makeCellIndex(firstCell),
              value: yield* makeCellValue(digit),
              eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
            })
          }
        }
      }
    }
  }

  return Option.none()
})

export const findSwordfish = Effect.fn("TechniqueFinder.findSwordfish")(function* (
  grid: SudokuGrid,
) {
  const rowResult = yield* findSwordfishInRows(grid)
  if (Option.isSome(rowResult)) return rowResult

  return yield* findSwordfishInCols(grid)
})
