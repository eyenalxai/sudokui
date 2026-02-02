import { Schema } from "effect"

import { countCandidates, getSingleCandidate } from "../grid/candidates.ts"
import { SudokuGrid } from "../grid/class.ts"
import { BLOCK_SIZE, CANDIDATE_MASKS, GRID_SIZE, TOTAL_CELLS } from "../grid/constants.ts"
import { getRowIndices, getColIndices, getBlockIndices, getPeers } from "../grid/helpers.ts"
import { CellIndex, CellValue, TechniqueMove } from "../technique.ts"

const makeCellIndex = (n: number): CellIndex => Schema.decodeUnknownSync(CellIndex)(n)
const makeCellValue = (n: number): CellValue => Schema.decodeUnknownSync(CellValue)(n)
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

const getMissingValueInUnit = (grid: SudokuGrid, indices: readonly number[]): CellValue | null => {
  const present = new Set<number>()
  let emptyIndex: number | null = null

  for (const idx of indices) {
    const value = grid.getCell(idx)
    if (value === 0) {
      if (emptyIndex !== null) {
        return null
      }
      emptyIndex = idx
    } else {
      present.add(value)
    }
  }

  if (emptyIndex === null || present.size !== 8) {
    return null
  }

  for (let v = 1; v <= GRID_SIZE; v++) {
    if (!present.has(v)) {
      return makeCellValue(v)
    }
  }

  return null
}

export const findFullHouse = (grid: SudokuGrid): TechniqueMove | null => {
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (grid.getCell(i) !== 0) continue

    const units = [getRowIndices(i), getColIndices(i), getBlockIndices(i)]

    for (const unit of units) {
      const missingValue = getMissingValueInUnit(grid, unit)
      if (missingValue !== null) {
        return {
          technique: "FULL_HOUSE",
          cellIndex: makeCellIndex(i),
          value: missingValue,
          eliminations: [],
        }
      }
    }
  }

  return null
}

export const findNakedSingle = (grid: SudokuGrid): TechniqueMove | null => {
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (grid.getCell(i) !== 0) continue

    const candidates = grid.getCandidates(i)
    if (countCandidates(candidates) === 1) {
      const value = getSingleCandidate(candidates)
      // Validate that the single candidate is actually valid (no peer has this value)
      if (value !== null && isValidValue(grid, i, value)) {
        return {
          technique: "NAKED_SINGLE",
          cellIndex: makeCellIndex(i),
          value: makeCellValue(value),
          eliminations: [],
        }
      }
    }
  }

  return null
}

const findHiddenSingleInUnit = (
  grid: SudokuGrid,
  indices: readonly number[],
): TechniqueMove | null => {
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
    // Validate that the hidden single candidate is actually valid (no peer has this value)
    if (idx !== -1 && isValidValue(grid, idx, value)) {
      return {
        technique: "HIDDEN_SINGLE",
        cellIndex: makeCellIndex(idx),
        value: makeCellValue(value),
        eliminations: [],
      }
    }
  }

  return null
}

export const findHiddenSingle = (grid: SudokuGrid): TechniqueMove | null => {
  for (let i = 0; i < GRID_SIZE; i++) {
    const rowStart = i * GRID_SIZE
    const rowIndices = Array.from({ length: GRID_SIZE }, (_, j) => rowStart + j)
    const rowMove = findHiddenSingleInUnit(grid, rowIndices)
    if (rowMove !== null) return rowMove

    const colIndices = Array.from({ length: GRID_SIZE }, (_, j) => j * GRID_SIZE + i)
    const colMove = findHiddenSingleInUnit(grid, colIndices)
    if (colMove !== null) return colMove
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
      const blockMove = findHiddenSingleInUnit(grid, blockIndices)
      if (blockMove !== null) return blockMove
    }
  }

  return null
}
