import { Effect, Option, ParseResult } from "effect"

import { BLOCK_SIZE, GRID_SIZE } from "../grid/constants.ts"
import { getBlockIndices } from "../grid/helpers.ts"
import { SudokuGrid } from "../grid/sudoku-grid.ts"
import { TechniqueMove } from "../technique.ts"

import {
  collectCandidateEliminations,
  getMask,
  makeCellElimination,
  makeCellIndex,
  makeCellValue,
} from "./helpers.ts"

const BLOCK_AREA = GRID_SIZE * BLOCK_SIZE

/**
 * Pointing Pairs/Triples (LOCKED_PAIR, LOCKED_TRIPLE)
 * When a candidate is confined to one row or column within a box,
 * it can be eliminated from that row or column outside the box.
 */
const findPointingInBox = (
  grid: SudokuGrid,
  boxStartIndex: number,
): Effect.Effect<Option.Option<TechniqueMove>, ParseResult.ParseError> =>
  Effect.gen(function* () {
    const boxIndices = getBlockIndices(boxStartIndex)

    for (let value = 1; value <= GRID_SIZE; value++) {
      const mask = getMask(value)
      if (mask === 0) continue

      const cellsWithCandidate: number[] = []

      for (const idx of boxIndices) {
        if (grid.getCell(idx) === 0) {
          const candidates = grid.getCandidates(idx)
          if ((candidates & mask) !== 0) {
            cellsWithCandidate.push(idx)
          }
        }
      }

      if (cellsWithCandidate.length < 2 || cellsWithCandidate.length > 3) continue

      const firstCell = cellsWithCandidate[0]
      if (firstCell === undefined) continue

      const row = Math.floor(firstCell / GRID_SIZE)
      const allInSameRow = cellsWithCandidate.every((idx) => Math.floor(idx / GRID_SIZE) === row)

      if (allInSameRow) {
        const rowIndices = Array.from({ length: GRID_SIZE }, (_, c) => row * GRID_SIZE + c)
        const boxCol = Math.floor((boxStartIndex % GRID_SIZE) / BLOCK_SIZE)
        const exclude = new Set<number>(cellsWithCandidate)
        for (let c = 0; c < GRID_SIZE; c++) {
          const idx = row * GRID_SIZE + c
          if (Math.floor((idx % GRID_SIZE) / BLOCK_SIZE) === boxCol) {
            exclude.add(idx)
          }
        }
        const eliminations = collectCandidateEliminations(grid, rowIndices, value, mask, exclude)

        if (eliminations.length > 0) {
          return Option.some({
            technique: cellsWithCandidate.length === 2 ? "LOCKED_PAIR" : "LOCKED_TRIPLE",
            cellIndex: yield* makeCellIndex(firstCell),
            value: yield* makeCellValue(value),
            eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
          })
        }
      }

      const col = firstCell % GRID_SIZE
      const allInSameCol = cellsWithCandidate.every((idx) => idx % GRID_SIZE === col)

      if (allInSameCol) {
        const colIndices = Array.from({ length: GRID_SIZE }, (_, r) => r * GRID_SIZE + col)
        const boxRow = Math.floor(boxStartIndex / BLOCK_AREA)
        const exclude = new Set<number>(cellsWithCandidate)
        for (let r = 0; r < GRID_SIZE; r++) {
          const idx = r * GRID_SIZE + col
          if (Math.floor(idx / BLOCK_AREA) === boxRow) {
            exclude.add(idx)
          }
        }
        const eliminations = collectCandidateEliminations(grid, colIndices, value, mask, exclude)

        if (eliminations.length > 0) {
          return Option.some({
            technique: cellsWithCandidate.length === 2 ? "LOCKED_PAIR" : "LOCKED_TRIPLE",
            cellIndex: yield* makeCellIndex(firstCell),
            value: yield* makeCellValue(value),
            eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
          })
        }
      }
    }

    return Option.none()
  })

/**
 * Box/Line Reduction (LOCKED_CANDIDATES)
 * When all occurrences of a candidate in a row or column are confined to one box,
 * the candidate can be eliminated from the rest of that box.
 */
const findBoxLineReductionInRow = (
  grid: SudokuGrid,
  row: number,
): Effect.Effect<Option.Option<TechniqueMove>, ParseResult.ParseError> =>
  Effect.gen(function* () {
    for (let value = 1; value <= GRID_SIZE; value++) {
      const mask = getMask(value)
      if (mask === 0) continue

      const cellsWithCandidate: number[] = []

      for (let c = 0; c < GRID_SIZE; c++) {
        const idx = row * GRID_SIZE + c
        if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
          cellsWithCandidate.push(idx)
        }
      }

      if (cellsWithCandidate.length === 0) continue

      const firstCell = cellsWithCandidate[0]
      if (firstCell === undefined) continue

      const boxStart =
        Math.floor(firstCell / BLOCK_AREA) * BLOCK_AREA +
        Math.floor((firstCell % GRID_SIZE) / BLOCK_SIZE) * BLOCK_SIZE
      const allInSameBox = cellsWithCandidate.every((idx) => {
        const cellBoxStart =
          Math.floor(idx / BLOCK_AREA) * BLOCK_AREA +
          Math.floor((idx % GRID_SIZE) / BLOCK_SIZE) * BLOCK_SIZE
        return cellBoxStart === boxStart
      })

      if (!allInSameBox) continue

      const boxIndices = getBlockIndices(firstCell)
      const exclude = new Set<number>(cellsWithCandidate)
      for (const idx of boxIndices) {
        if (Math.floor(idx / GRID_SIZE) === row) {
          exclude.add(idx)
        }
      }
      const eliminations = collectCandidateEliminations(grid, boxIndices, value, mask, exclude)

      if (eliminations.length > 0) {
        return Option.some({
          technique: "LOCKED_CANDIDATES",
          cellIndex: yield* makeCellIndex(firstCell),
          value: yield* makeCellValue(value),
          eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
        })
      }
    }

    return Option.none()
  })

const findBoxLineReductionInCol = (
  grid: SudokuGrid,
  col: number,
): Effect.Effect<Option.Option<TechniqueMove>, ParseResult.ParseError> =>
  Effect.gen(function* () {
    for (let value = 1; value <= GRID_SIZE; value++) {
      const mask = getMask(value)
      if (mask === 0) continue

      const cellsWithCandidate: number[] = []

      for (let r = 0; r < GRID_SIZE; r++) {
        const idx = r * GRID_SIZE + col
        if (grid.getCell(idx) === 0 && (grid.getCandidates(idx) & mask) !== 0) {
          cellsWithCandidate.push(idx)
        }
      }

      if (cellsWithCandidate.length === 0) continue

      const firstCell = cellsWithCandidate[0]
      if (firstCell === undefined) continue

      const boxStart =
        Math.floor(firstCell / BLOCK_AREA) * BLOCK_AREA + Math.floor(col / BLOCK_SIZE) * BLOCK_SIZE
      const allInSameBox = cellsWithCandidate.every((idx) => {
        const cellBoxStart =
          Math.floor(idx / BLOCK_AREA) * BLOCK_AREA +
          Math.floor((idx % GRID_SIZE) / BLOCK_SIZE) * BLOCK_SIZE
        return cellBoxStart === boxStart
      })

      if (!allInSameBox) continue

      const boxIndices = getBlockIndices(firstCell)
      const exclude = new Set<number>(cellsWithCandidate)
      for (const idx of boxIndices) {
        if (idx % GRID_SIZE === col) {
          exclude.add(idx)
        }
      }
      const eliminations = collectCandidateEliminations(grid, boxIndices, value, mask, exclude)

      if (eliminations.length > 0) {
        return Option.some({
          technique: "LOCKED_CANDIDATES",
          cellIndex: yield* makeCellIndex(firstCell),
          value: yield* makeCellValue(value),
          eliminations: yield* Effect.forEach(eliminations, makeCellElimination),
        })
      }
    }

    return Option.none()
  })

/**
 * Find Pointing Pairs or Triples in any box.
 * When a candidate appears in only 2 or 3 cells within a box, and those cells
 * are all in the same row or column, the candidate can be eliminated from
 * that row or column outside the box.
 */
export const findPointingCandidates = Effect.fn("TechniqueFinder.findPointingCandidates")(
  function* (grid: SudokuGrid) {
    for (let blockRow = 0; blockRow < BLOCK_SIZE; blockRow++) {
      for (let blockCol = 0; blockCol < BLOCK_SIZE; blockCol++) {
        const boxStartIndex = blockRow * BLOCK_AREA + blockCol * BLOCK_SIZE
        const result = yield* findPointingInBox(grid, boxStartIndex)
        if (Option.isSome(result)) return result
      }
    }
    return Option.none()
  },
)

/**
 * Find Box/Line Reduction (locked candidates) in rows and columns.
 * When all occurrences of a candidate in a row or column are confined to one box,
 * the candidate can be eliminated from the rest of that box.
 */
export const findLockedCandidates = Effect.fn("TechniqueFinder.findLockedCandidates")(function* (
  grid: SudokuGrid,
) {
  for (let row = 0; row < GRID_SIZE; row++) {
    const result = yield* findBoxLineReductionInRow(grid, row)
    if (Option.isSome(result)) return result
  }

  for (let col = 0; col < GRID_SIZE; col++) {
    const result = yield* findBoxLineReductionInCol(grid, col)
    if (Option.isSome(result)) return result
  }

  return Option.none()
})
