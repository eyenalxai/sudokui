import { Effect, Option } from "effect"

import { GRID_SIZE } from "../../grid/constants.ts"
import { SudokuGrid } from "../../grid/sudoku-grid.ts"
import { TechniqueMove } from "../../technique.ts"
import {
  collectCandidateEliminations,
  getMask,
  makeCellElimination,
  makeCellIndex,
  makeCellValue,
  type RawElimination,
} from "../helpers.ts"

import { findColsWithCandidateRange, findRowsWithCandidateRange } from "./helpers.ts"

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

const getTriplets = <T>(items: T[]): Array<[T, T, T]> => {
  const triplets: Array<[T, T, T]> = []
  for (let i = 0; i < items.length - 2; i++) {
    for (let j = i + 1; j < items.length - 1; j++) {
      for (let k = j + 1; k < items.length; k++) {
        const first = items[i]
        const second = items[j]
        const third = items[k]
        if (first === undefined || second === undefined || third === undefined) continue
        triplets.push([first, second, third])
      }
    }
  }
  return triplets
}

const getSwordfishColsFromRows = (
  row1: [number, number[]],
  row2: [number, number[]],
  row3: [number, number[]],
): { allCells: number[]; cols: number[] } | null => {
  const allCells = [...row1[1], ...row2[1], ...row3[1]]
  const cols = getColumnsFromCells(allCells)
  if (cols.length !== 3) return null
  return { allCells, cols }
}

const getSwordfishRowsFromCols = (
  col1: [number, number[]],
  col2: [number, number[]],
  col3: [number, number[]],
): { allCells: number[]; rows: number[] } | null => {
  const allCells = [...col1[1], ...col2[1], ...col3[1]]
  const rows = getRowsFromCells(allCells)
  if (rows.length !== 3) return null
  return { allCells, rows }
}

const buildSwordfishMove = Effect.fn("Swordfish.buildMove")(function* (
  digit: number,
  allCells: number[],
  eliminations: RawElimination[],
) {
  if (eliminations.length === 0 || allCells.length === 0) return Option.none()
  const firstCell = allCells[0]
  if (firstCell === undefined) return Option.none()
  return Option.some<TechniqueMove>({
    technique: "SWORDFISH",
    cellIndex: yield* makeCellIndex(firstCell),
    value: yield* makeCellValue(digit),
    eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
  })
})

const findSwordfishInRows = Effect.fn("Swordfish.findInRows")(function* (grid: SudokuGrid) {
  for (let digit = 1; digit <= GRID_SIZE; digit++) {
    const mask = getMask(digit)
    if (mask === 0) continue

    const rowsWithCandidates = findRowsWithCandidateRange(grid, digit, 2, 3)
    if (rowsWithCandidates.length < 3) continue

    for (const [row1, row2, row3] of getTriplets(rowsWithCandidates)) {
      const combo = getSwordfishColsFromRows(row1, row2, row3)
      if (combo === null) continue
      const swordfishCells = new Set(combo.allCells)
      const indices: number[] = []
      for (const col of combo.cols) {
        for (let row = 0; row < GRID_SIZE; row++) {
          indices.push(row * GRID_SIZE + col)
        }
      }
      const eliminations = collectCandidateEliminations(grid, indices, digit, mask, swordfishCells)
      const move = yield* buildSwordfishMove(digit, combo.allCells, eliminations)
      if (Option.isSome(move)) return move
    }
  }

  return Option.none()
})

const findSwordfishInCols = Effect.fn("Swordfish.findInCols")(function* (grid: SudokuGrid) {
  for (let digit = 1; digit <= GRID_SIZE; digit++) {
    const mask = getMask(digit)
    if (mask === 0) continue

    const colsWithCandidates = findColsWithCandidateRange(grid, digit, 2, 3)
    if (colsWithCandidates.length < 3) continue

    for (const [col1, col2, col3] of getTriplets(colsWithCandidates)) {
      const combo = getSwordfishRowsFromCols(col1, col2, col3)
      if (combo === null) continue
      const swordfishCells = new Set(combo.allCells)
      const indices: number[] = []
      for (const row of combo.rows) {
        for (let col = 0; col < GRID_SIZE; col++) {
          indices.push(row * GRID_SIZE + col)
        }
      }
      const eliminations = collectCandidateEliminations(grid, indices, digit, mask, swordfishCells)
      const move = yield* buildSwordfishMove(digit, combo.allCells, eliminations)
      if (Option.isSome(move)) return move
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
