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

const collectEliminationsForCols = (
  grid: SudokuGrid,
  mask: number,
  digit: number,
  cols: number[],
  swordfishCells: Set<number>,
): RawElimination[] => {
  const eliminations: RawElimination[] = []
  for (const col of cols) {
    for (let row = 0; row < GRID_SIZE; row++) {
      const idx = row * GRID_SIZE + col
      if (swordfishCells.has(idx)) continue
      if (grid.getCell(idx) !== 0) continue
      if ((grid.getCandidates(idx) & mask) === 0) continue
      eliminations.push({ index: idx, values: [digit] })
    }
  }
  return eliminations
}

const collectEliminationsForRows = (
  grid: SudokuGrid,
  mask: number,
  digit: number,
  rows: number[],
  swordfishCells: Set<number>,
): RawElimination[] => {
  const eliminations: RawElimination[] = []
  for (const row of rows) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const idx = row * GRID_SIZE + col
      if (swordfishCells.has(idx)) continue
      if (grid.getCell(idx) !== 0) continue
      if ((grid.getCandidates(idx) & mask) === 0) continue
      eliminations.push({ index: idx, values: [digit] })
    }
  }
  return eliminations
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
  for (let digit = 1; digit <= 9; digit++) {
    const mask = getMask(digit)
    if (mask === 0) continue

    const rowsWithCandidates = findRowsWith2To3Candidates(grid, digit)
    if (rowsWithCandidates.length < 3) continue

    for (const [row1, row2, row3] of getTriplets(rowsWithCandidates)) {
      const combo = getSwordfishColsFromRows(row1, row2, row3)
      if (combo === null) continue
      const swordfishCells = new Set(combo.allCells)
      const eliminations = collectEliminationsForCols(grid, mask, digit, combo.cols, swordfishCells)
      const move = yield* buildSwordfishMove(digit, combo.allCells, eliminations)
      if (Option.isSome(move)) return move
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

    for (const [col1, col2, col3] of getTriplets(colsWithCandidates)) {
      const combo = getSwordfishRowsFromCols(col1, col2, col3)
      if (combo === null) continue
      const swordfishCells = new Set(combo.allCells)
      const eliminations = collectEliminationsForRows(grid, mask, digit, combo.rows, swordfishCells)
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
