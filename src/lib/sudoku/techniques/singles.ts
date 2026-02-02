import { Effect, Option, ParseResult, Schema } from "effect"

import { countCandidates, getSingleCandidate } from "../grid/candidates.ts"
import { SudokuGrid } from "../grid/class.ts"
import { BLOCK_SIZE, CANDIDATE_MASKS, GRID_SIZE, TOTAL_CELLS } from "../grid/constants.ts"
import { getRowIndices, getColIndices, getBlockIndices, getPeers } from "../grid/helpers.ts"
import { CellIndex, CellValue, TechniqueMove } from "../technique.ts"

const makeCellIndex = (n: number) => Schema.decodeUnknown(CellIndex)(n)
const makeCellValue = (n: number) => Schema.decodeUnknown(CellValue)(n)
const BLOCK_AREA = GRID_SIZE * BLOCK_SIZE

/**
 * Check if a value is valid for a cell (no peer has this value)
 */
const isValidValue = (grid: SudokuGrid, index: number, value: number): boolean => {
  const peers = getPeers(index)
  for (const peer of peers) {
    if (grid.getCell(peer) === value) {
      return false
    }
  }
  return true
}

const getMissingValueInUnit = (
  grid: SudokuGrid,
  indices: readonly number[],
): Effect.Effect<Option.Option<CellValue>, ParseResult.ParseError> =>
  Effect.gen(function* () {
    const present = new Set<number>()
    let emptyIndex: number | null = null

    for (const idx of indices) {
      const value = grid.getCell(idx)
      if (value === 0) {
        if (emptyIndex !== null) {
          return Option.none()
        }
        emptyIndex = idx
      } else {
        present.add(value)
      }
    }

    if (emptyIndex === null || present.size !== 8) {
      return Option.none()
    }

    for (let v = 1; v <= GRID_SIZE; v++) {
      if (!present.has(v)) {
        return Option.some(yield* makeCellValue(v))
      }
    }

    return Option.none()
  })

export const findFullHouse = Effect.fn("TechniqueFinder.findFullHouse")(function* (
  grid: SudokuGrid,
) {
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (grid.getCell(i) !== 0) continue

    const units = [getRowIndices(i), getColIndices(i), getBlockIndices(i)]

    for (const unit of units) {
      const missingValue = yield* getMissingValueInUnit(grid, unit)
      if (Option.isSome(missingValue)) {
        return Option.some<TechniqueMove>({
          technique: "FULL_HOUSE",
          cellIndex: yield* makeCellIndex(i),
          value: missingValue.value,
          eliminations: [],
        })
      }
    }
  }

  return Option.none()
})

export const findNakedSingle = Effect.fn("TechniqueFinder.findNakedSingle")(function* (
  grid: SudokuGrid,
) {
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (grid.getCell(i) !== 0) continue

    const candidates = grid.getCandidates(i)
    if (countCandidates(candidates) === 1) {
      const value = getSingleCandidate(candidates)
      if (Option.isSome(value) && isValidValue(grid, i, value.value)) {
        return Option.some<TechniqueMove>({
          technique: "NAKED_SINGLE",
          cellIndex: yield* makeCellIndex(i),
          value: yield* makeCellValue(value.value),
          eliminations: [],
        })
      }
    }
  }

  return Option.none()
})

const findHiddenSingleInUnit = (
  grid: SudokuGrid,
  indices: readonly number[],
): Effect.Effect<Option.Option<TechniqueMove>, ParseResult.ParseError> =>
  Effect.gen(function* () {
    const candidatePositions = new Map<number, number>()

    for (const idx of indices) {
      if (grid.getCell(idx) !== 0) continue

      const candidates = grid.getCandidates(idx)
      for (let v = 1; v <= GRID_SIZE; v++) {
        const mask = CANDIDATE_MASKS[v]
        if (mask !== undefined && (candidates & mask) !== 0) {
          if (candidatePositions.has(v)) {
            candidatePositions.set(v, -1)
          } else {
            candidatePositions.set(v, idx)
          }
        }
      }
    }

    for (const [value, idx] of candidatePositions) {
      if (idx !== -1 && isValidValue(grid, idx, value)) {
        return Option.some({
          technique: "HIDDEN_SINGLE",
          cellIndex: yield* makeCellIndex(idx),
          value: yield* makeCellValue(value),
          eliminations: [],
        })
      }
    }

    return Option.none()
  })

export const findHiddenSingle = Effect.fn("TechniqueFinder.findHiddenSingle")(function* (
  grid: SudokuGrid,
) {
  for (let i = 0; i < GRID_SIZE; i++) {
    const rowStart = i * GRID_SIZE
    const rowIndices = Array.from({ length: GRID_SIZE }, (_, j) => rowStart + j)
    const rowMove = yield* findHiddenSingleInUnit(grid, rowIndices)
    if (Option.isSome(rowMove)) return rowMove

    const colIndices = Array.from({ length: GRID_SIZE }, (_, j) => j * GRID_SIZE + i)
    const colMove = yield* findHiddenSingleInUnit(grid, colIndices)
    if (Option.isSome(colMove)) return colMove
  }

  for (let blockRow = 0; blockRow < BLOCK_SIZE; blockRow++) {
    for (let blockCol = 0; blockCol < BLOCK_SIZE; blockCol++) {
      const startIndex = blockRow * BLOCK_AREA + blockCol * BLOCK_SIZE
      const blockIndices = [
        startIndex,
        startIndex + 1,
        startIndex + 2,
        startIndex + GRID_SIZE,
        startIndex + GRID_SIZE + 1,
        startIndex + GRID_SIZE + 2,
        startIndex + GRID_SIZE * 2,
        startIndex + GRID_SIZE * 2 + 1,
        startIndex + GRID_SIZE * 2 + 2,
      ]
      const blockMove = yield* findHiddenSingleInUnit(grid, blockIndices)
      if (Option.isSome(blockMove)) return blockMove
    }
  }

  return Option.none()
})
