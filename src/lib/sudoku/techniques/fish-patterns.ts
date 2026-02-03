import { Effect, Option, ParseResult, Schema } from "effect"

import { CANDIDATE_MASKS, GRID_SIZE } from "../grid/constants.ts"
import { getPeers } from "../grid/helpers.ts"
import { SudokuGrid } from "../grid/sudoku-grid.ts"
import { CellElimination, CellIndex, CellValue, TechniqueMove } from "../technique.ts"

const makeCellIndex = (n: number) => Schema.decodeUnknown(CellIndex)(n)
const makeCellValue = (n: number) => Schema.decodeUnknown(CellValue)(n)

type RawElimination = { index: number; values: readonly number[] }
const makeCellElimination = (
  elimination: RawElimination,
): Effect.Effect<CellElimination, ParseResult.ParseError> =>
  Effect.gen(function* () {
    const index = yield* makeCellIndex(elimination.index)
    const values = yield* Effect.forEach(elimination.values, (value) => makeCellValue(value))
    return { index, values }
  })

const getMask = (value: number): number => CANDIDATE_MASKS[value] ?? 0

/**
 * Find all rows that have exactly N cells with a given candidate
 */
const findRowsWithNCandidates = (
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
      // Return row and first two cell indices
      result.push([row, cells[0], cells[1]])
    }
  }

  return result
}

/**
 * Find all columns that have exactly N cells with a given candidate
 */
const findColsWithNCandidates = (
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
      // Return col and first two cell indices
      result.push([col, cells[0], cells[1]])
    }
  }

  return result
}

/**
 * Check if two cells are in the same column
 */
const sameCol = (idx1: number, idx2: number): boolean => {
  return idx1 % GRID_SIZE === idx2 % GRID_SIZE
}

/**
 * Check if two cells are in the same row
 */
const sameRow = (idx1: number, idx2: number): boolean => {
  return Math.floor(idx1 / GRID_SIZE) === Math.floor(idx2 / GRID_SIZE)
}

/**
 * SKYSCRAPER
 *
 * Algorithm:
 * 1. Find all rows with exactly 2 cells containing a candidate
 * 2. For each pair of such rows:
 *    - Check if one end of each row shares a column
 *    - The other ends ("free ends") must NOT share a column (otherwise it's an X-Wing)
 * 3. Any cell that can see both "free ends" can eliminate that candidate
 */
const findSkyscraperInRows = (
  grid: SudokuGrid,
): Effect.Effect<Option.Option<TechniqueMove>, ParseResult.ParseError> =>
  Effect.gen(function* () {
    for (let digit = 1; digit <= GRID_SIZE; digit++) {
      const mask = getMask(digit)
      if (mask === 0) continue

      // Find all rows with exactly 2 candidates
      const rowsWith2 = findRowsWithNCandidates(grid, digit, 2)
      if (rowsWith2.length < 2) continue

      // Try all combinations of row pairs
      for (let i = 0; i < rowsWith2.length; i++) {
        for (let j = i + 1; j < rowsWith2.length; j++) {
          const rowPair1 = rowsWith2[i]
          const rowPair2 = rowsWith2[j]
          if (rowPair1 === undefined || rowPair2 === undefined) continue
          const [_row1, idx1a, idx1b] = rowPair1
          const [_row2, idx2a, idx2b] = rowPair2

          // Check if they share a column (one of the ends must match)
          let sharedCol = false
          let otherIdx1 = idx1b
          let otherIdx2 = idx2b

          if (sameCol(idx1a, idx2a)) {
            sharedCol = true
            otherIdx1 = idx1b
            otherIdx2 = idx2b
          } else if (sameCol(idx1a, idx2b)) {
            sharedCol = true
            otherIdx1 = idx1b
            otherIdx2 = idx2a
          } else if (sameCol(idx1b, idx2a)) {
            sharedCol = true
            otherIdx1 = idx1a
            otherIdx2 = idx2b
          } else if (sameCol(idx1b, idx2b)) {
            sharedCol = true
            otherIdx1 = idx1a
            otherIdx2 = idx2a
          }

          if (!sharedCol) continue

          // The "free ends" must NOT be in the same column (otherwise it's an X-Wing)
          if (sameCol(otherIdx1, otherIdx2)) continue

          // Try to find eliminations
          const result = yield* findSkyscraperEliminations(grid, otherIdx1, otherIdx2, digit, mask)
          if (Option.isSome(result)) return result
        }
      }
    }

    return Option.none()
  })

/**
 * Find eliminations for a Skyscraper pattern given the two "free ends"
 */
const findSkyscraperEliminations = (
  grid: SudokuGrid,
  end1: number,
  end2: number,
  digit: number,
  mask: number,
): Effect.Effect<Option.Option<TechniqueMove>, ParseResult.ParseError> =>
  Effect.gen(function* () {
    // Get peers of both free ends
    const peers1 = new Set(getPeers(end1))
    const peers2 = new Set(getPeers(end2))

    // Find intersection - cells that can see both free ends
    const eliminations: RawElimination[] = []
    for (const peer of peers1) {
      if (peers2.has(peer) && grid.getCell(peer) === 0 && (grid.getCandidates(peer) & mask) !== 0) {
        eliminations.push({ index: peer, values: [digit] })
      }
    }

    if (eliminations.length > 0) {
      return Option.some<TechniqueMove>({
        technique: "SKYSCRAPER",
        cellIndex: yield* makeCellIndex(end1),
        value: yield* makeCellValue(digit),
        eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
      })
    }

    return Option.none()
  })

/**
 * SKYSCRAPER (column-based)
 * Same algorithm but for columns instead of rows
 */
const findSkyscraperInCols = (
  grid: SudokuGrid,
): Effect.Effect<Option.Option<TechniqueMove>, ParseResult.ParseError> =>
  Effect.gen(function* () {
    for (let digit = 1; digit <= GRID_SIZE; digit++) {
      const mask = getMask(digit)
      if (mask === 0) continue

      // Find all cols with exactly 2 candidates
      const colsWith2 = findColsWithNCandidates(grid, digit, 2)
      if (colsWith2.length < 2) continue

      // Try all combinations of col pairs
      for (let i = 0; i < colsWith2.length; i++) {
        for (let j = i + 1; j < colsWith2.length; j++) {
          const colPair1 = colsWith2[i]
          const colPair2 = colsWith2[j]
          if (colPair1 === undefined || colPair2 === undefined) continue
          const [_col1, idx1a, idx1b] = colPair1
          const [_col2, idx2a, idx2b] = colPair2

          // Check if they share a row (one of the ends must match)
          let sharedRow = false
          let otherIdx1 = idx1b
          let otherIdx2 = idx2b

          if (sameRow(idx1a, idx2a)) {
            sharedRow = true
            otherIdx1 = idx1b
            otherIdx2 = idx2b
          } else if (sameRow(idx1a, idx2b)) {
            sharedRow = true
            otherIdx1 = idx1b
            otherIdx2 = idx2a
          } else if (sameRow(idx1b, idx2a)) {
            sharedRow = true
            otherIdx1 = idx1a
            otherIdx2 = idx2b
          } else if (sameRow(idx1b, idx2b)) {
            sharedRow = true
            otherIdx1 = idx1a
            otherIdx2 = idx2a
          }

          if (!sharedRow) continue

          // The "free ends" must NOT be in the same row (otherwise it's an X-Wing)
          if (sameRow(otherIdx1, otherIdx2)) continue

          // Try to find eliminations
          const result = yield* findSkyscraperEliminations(grid, otherIdx1, otherIdx2, digit, mask)
          if (Option.isSome(result)) return result
        }
      }
    }

    return Option.none()
  })

export const findSkyscraper = Effect.fn("TechniqueFinder.findSkyscraper")(function* (
  grid: SudokuGrid,
) {
  // Try rows first
  const rowResult = yield* findSkyscraperInRows(grid)
  if (Option.isSome(rowResult)) return rowResult

  // Then columns
  return yield* findSkyscraperInCols(grid)
})
